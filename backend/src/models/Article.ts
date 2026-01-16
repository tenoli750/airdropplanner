import pool from '../db/connection';

export interface Article {
  id: string;
  title: string;
  description: string | null;
  project_name: string;
  created_at: Date;
}

export interface ArticleWithTasks extends Article {
  tasks: Task[];
}

export interface Task {
  id: string;
  article_id: string;
  title: string;
  description: string | null;
  frequency: 'daily' | 'weekly' | 'one-time';
  link_url: string | null;
  created_at: Date;
}

export const ArticleModel = {
  async findAll(): Promise<Article[]> {
    const result = await pool.query(
      'SELECT * FROM articles ORDER BY created_at DESC'
    );
    return result.rows;
  },

  async findById(id: string): Promise<Article | null> {
    const result = await pool.query(
      'SELECT * FROM articles WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  async findByIdWithTasks(id: string): Promise<ArticleWithTasks | null> {
    const articleResult = await pool.query(
      'SELECT * FROM articles WHERE id = $1',
      [id]
    );

    if (articleResult.rows.length === 0) {
      return null;
    }

    const article = articleResult.rows[0];

    const tasksResult = await pool.query(
      'SELECT * FROM tasks WHERE article_id = $1 ORDER BY frequency, created_at',
      [id]
    );

    return {
      ...article,
      tasks: tasksResult.rows,
    };
  },

  async findAllWithTasks(): Promise<ArticleWithTasks[]> {
    const articles = await this.findAll();
    const articlesWithTasks: ArticleWithTasks[] = [];

    for (const article of articles) {
      const tasksResult = await pool.query(
        'SELECT * FROM tasks WHERE article_id = $1 ORDER BY frequency, created_at',
        [article.id]
      );
      articlesWithTasks.push({
        ...article,
        tasks: tasksResult.rows,
      });
    }

    return articlesWithTasks;
  },

  async create(article: Omit<Article, 'id' | 'created_at'>): Promise<Article> {
    const result = await pool.query(
      `INSERT INTO articles (title, description, project_name)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [article.title, article.description, article.project_name]
    );
    return result.rows[0];
  },
};
