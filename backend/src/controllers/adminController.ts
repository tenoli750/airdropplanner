import { Request, Response } from 'express';
import pool from '../db/connection';

export const adminController = {
  // Articles CRUD
  async createArticle(req: Request, res: Response): Promise<void> {
    try {
      const { title, description, project_name } = req.body;

      if (!title || !project_name) {
        res.status(400).json({ error: 'Title and project_name are required' });
        return;
      }

      const result = await pool.query(
        `INSERT INTO articles (title, description, project_name)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [title, description, project_name]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error creating article:', error);
      res.status(500).json({ error: 'Failed to create article' });
    }
  },

  async updateArticle(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const { title, description, project_name } = req.body;

      const result = await pool.query(
        `UPDATE articles
         SET title = COALESCE($1, title),
             description = COALESCE($2, description),
             project_name = COALESCE($3, project_name)
         WHERE id = $4
         RETURNING *`,
        [title, description, project_name, id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Article not found' });
        return;
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating article:', error);
      res.status(500).json({ error: 'Failed to update article' });
    }
  },

  async deleteArticle(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;

      const result = await pool.query(
        'DELETE FROM articles WHERE id = $1 RETURNING *',
        [id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Article not found' });
        return;
      }

      res.json({ message: 'Article deleted successfully' });
    } catch (error) {
      console.error('Error deleting article:', error);
      res.status(500).json({ error: 'Failed to delete article' });
    }
  },

  // Tasks CRUD
  async createTask(req: Request, res: Response): Promise<void> {
    try {
      const { article_id, title, description, frequency, link_url } = req.body;

      if (!article_id || !title || !frequency) {
        res.status(400).json({ error: 'article_id, title, and frequency are required' });
        return;
      }

      if (!['daily', 'weekly', 'one-time'].includes(frequency)) {
        res.status(400).json({ error: 'frequency must be daily, weekly, or one-time' });
        return;
      }

      const result = await pool.query(
        `INSERT INTO tasks (article_id, title, description, frequency, link_url)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [article_id, title, description, frequency, link_url]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error creating task:', error);
      res.status(500).json({ error: 'Failed to create task' });
    }
  },

  async updateTask(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const { title, description, frequency, link_url } = req.body;

      if (frequency && !['daily', 'weekly', 'one-time'].includes(frequency)) {
        res.status(400).json({ error: 'frequency must be daily, weekly, or one-time' });
        return;
      }

      const result = await pool.query(
        `UPDATE tasks
         SET title = COALESCE($1, title),
             description = COALESCE($2, description),
             frequency = COALESCE($3, frequency),
             link_url = COALESCE($4, link_url)
         WHERE id = $5
         RETURNING *`,
        [title, description, frequency, link_url, id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating task:', error);
      res.status(500).json({ error: 'Failed to update task' });
    }
  },

  async deleteTask(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;

      const result = await pool.query(
        'DELETE FROM tasks WHERE id = $1 RETURNING *',
        [id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }

      res.json({ message: 'Task deleted successfully' });
    } catch (error) {
      console.error('Error deleting task:', error);
      res.status(500).json({ error: 'Failed to delete task' });
    }
  },

  async getTask(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;

      const result = await pool.query(
        'SELECT * FROM tasks WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error fetching task:', error);
      res.status(500).json({ error: 'Failed to fetch task' });
    }
  },
};
