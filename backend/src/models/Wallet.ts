import pool from '../db/connection';

export interface Wallet {
  id: string;
  user_id: string;
  name: string;
  created_at: Date;
}

export const WalletModel = {
  async findByUserId(userId: string): Promise<Wallet[]> {
    const result = await pool.query(
      'SELECT * FROM wallets WHERE user_id = $1 ORDER BY created_at ASC',
      [userId]
    );
    return result.rows;
  },

  async create(userId: string, name: string): Promise<Wallet> {
    // Enforce 4 character limit
    const truncatedName = name.slice(0, 4);
    const result = await pool.query(
      `INSERT INTO wallets (user_id, name)
       VALUES ($1, $2)
       RETURNING *`,
      [userId, truncatedName]
    );
    return result.rows[0];
  },

  async update(id: string, userId: string, name: string): Promise<Wallet | null> {
    // Enforce 4 character limit
    const truncatedName = name.slice(0, 4);
    const result = await pool.query(
      `UPDATE wallets SET name = $1 WHERE id = $2 AND user_id = $3 RETURNING *`,
      [truncatedName, id, userId]
    );
    return result.rows[0] || null;
  },

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM wallets WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );
    return result.rowCount !== null && result.rowCount > 0;
  },
};
