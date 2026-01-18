import { Request, Response } from 'express';
import pool from '../db/connection';
import { v4 as uuidv4 } from 'uuid';

// Ensure blog_posts table exists
async function ensureBlogTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS blog_posts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title VARCHAR(500) NOT NULL,
        content TEXT NOT NULL,
        images TEXT[],
        author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    // Add images column if it doesn't exist (for existing tables)
    await pool.query(`
      ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS images TEXT[]
    `).catch(() => {});
  } catch (error) {
    console.error('Error ensuring blog table:', error);
  }
}

// Initialize table on module load
ensureBlogTable();

export const blogController = {
  // Get all blog posts
  async getPosts(req: Request, res: Response): Promise<void> {
    try {
      const result = await pool.query(
        `SELECT bp.*, u.username as author
         FROM blog_posts bp
         JOIN users u ON bp.author_id = u.id
         ORDER BY bp.created_at DESC`
      );
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching blog posts:', error);
      res.status(500).json({ error: 'Failed to fetch blog posts' });
    }
  },

  // Get single blog post
  async getPost(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await pool.query(
        `SELECT bp.*, u.username as author
         FROM blog_posts bp
         JOIN users u ON bp.author_id = u.id
         WHERE bp.id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Post not found' });
        return;
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error fetching blog post:', error);
      res.status(500).json({ error: 'Failed to fetch blog post' });
    }
  },

  // Create blog post (admin only)
  async createPost(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { title, content, images } = req.body;

      if (!title || !content) {
        res.status(400).json({ error: 'Title and content are required' });
        return;
      }

      // Check if user is admin
      const userResult = await pool.query(
        'SELECT is_admin FROM users WHERE id = $1',
        [userId]
      );

      if (!userResult.rows[0]?.is_admin) {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }

      const id = uuidv4();
      const imagesArray = Array.isArray(images) ? images : [];
      const result = await pool.query(
        `INSERT INTO blog_posts (id, title, content, images, author_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING *`,
        [id, title, content, imagesArray, userId]
      );

      // Get author name
      const post = result.rows[0];
      const authorResult = await pool.query(
        'SELECT username FROM users WHERE id = $1',
        [userId]
      );
      post.author = authorResult.rows[0]?.username;

      res.status(201).json(post);
    } catch (error) {
      console.error('Error creating blog post:', error);
      res.status(500).json({ error: 'Failed to create blog post' });
    }
  },

  // Update blog post (admin only)
  async updatePost(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { id } = req.params;
      const { title, content, images } = req.body;

      if (!title || !content) {
        res.status(400).json({ error: 'Title and content are required' });
        return;
      }

      // Check if user is admin
      const userResult = await pool.query(
        'SELECT is_admin FROM users WHERE id = $1',
        [userId]
      );

      if (!userResult.rows[0]?.is_admin) {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }

      const imagesArray = Array.isArray(images) ? images : [];
      const result = await pool.query(
        `UPDATE blog_posts
         SET title = $1, content = $2, images = $3, updated_at = NOW()
         WHERE id = $4
         RETURNING *`,
        [title, content, imagesArray, id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Post not found' });
        return;
      }

      // Get author name
      const post = result.rows[0];
      const authorResult = await pool.query(
        'SELECT username FROM users WHERE id = $1',
        [post.author_id]
      );
      post.author = authorResult.rows[0]?.username;

      res.json(post);
    } catch (error) {
      console.error('Error updating blog post:', error);
      res.status(500).json({ error: 'Failed to update blog post' });
    }
  },

  // Delete blog post (admin only)
  async deletePost(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { id } = req.params;

      // Check if user is admin
      const userResult = await pool.query(
        'SELECT is_admin FROM users WHERE id = $1',
        [userId]
      );

      if (!userResult.rows[0]?.is_admin) {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }

      const result = await pool.query(
        'DELETE FROM blog_posts WHERE id = $1 RETURNING *',
        [id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Post not found' });
        return;
      }

      res.json({ message: 'Post deleted successfully' });
    } catch (error) {
      console.error('Error deleting blog post:', error);
      res.status(500).json({ error: 'Failed to delete blog post' });
    }
  },
};
