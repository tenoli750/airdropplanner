import { Request, Response } from 'express';
import { ArticleModel } from '../models/Article';
import { TaskModel } from '../models/Task';

export const articleController = {
  async getAllArticles(req: Request, res: Response): Promise<void> {
    try {
      const articles = await ArticleModel.findAllWithTasks();
      res.json(articles);
    } catch (error) {
      console.error('Error fetching articles:', error);
      res.status(500).json({ error: 'Failed to fetch articles' });
    }
  },

  async getArticleById(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const article = await ArticleModel.findByIdWithTasks(id);

      if (!article) {
        res.status(404).json({ error: 'Article not found' });
        return;
      }

      res.json(article);
    } catch (error) {
      console.error('Error fetching article:', error);
      res.status(500).json({ error: 'Failed to fetch article' });
    }
  },

  async getTasksByArticleId(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const frequency = req.query.frequency as string | undefined;

      let tasks = await TaskModel.findByArticleId(id);

      if (frequency && typeof frequency === 'string') {
        tasks = tasks.filter((task) => task.frequency === frequency);
      }

      res.json(tasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      res.status(500).json({ error: 'Failed to fetch tasks' });
    }
  },
};
