import pool from '../db/connection';

export interface Task {
  id: string;
  article_id: string;
  title: string;
  description: string | null;
  frequency: 'daily' | 'weekly' | 'one-time';
  link_url: string | null;
  created_at: Date;
}

export const TaskModel = {
  async findAll(): Promise<Task[]> {
    const result = await pool.query(
      'SELECT * FROM tasks ORDER BY frequency, created_at'
    );
    return result.rows;
  },

  async findById(id: string): Promise<Task | null> {
    const result = await pool.query(
      'SELECT * FROM tasks WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  async findByArticleId(articleId: string): Promise<Task[]> {
    const result = await pool.query(
      'SELECT * FROM tasks WHERE article_id = $1 ORDER BY frequency, created_at',
      [articleId]
    );
    return result.rows;
  },

  async findByFrequency(frequency: Task['frequency']): Promise<Task[]> {
    const result = await pool.query(
      'SELECT * FROM tasks WHERE frequency = $1 ORDER BY created_at',
      [frequency]
    );
    return result.rows;
  },

  async create(task: Omit<Task, 'id' | 'created_at'>): Promise<Task> {
    const result = await pool.query(
      `INSERT INTO tasks (article_id, title, description, frequency, link_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [task.article_id, task.title, task.description, task.frequency, task.link_url]
    );
    return result.rows[0];
  },
};
