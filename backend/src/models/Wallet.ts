import pool from '../db/connection';

export interface Wallet {
  id: string;
  user_id: string;
  name: string; // 4-character wallet identifier
  created_at: Date;
}

export interface TaskWallet {
  id: string;
  task_id: string;
  wallet_id: string;
  user_id: string;
  created_at: Date;
}

export interface TaskWalletWithDetails extends TaskWallet {
  wallet: Wallet;
}

export const WalletModel = {
  // Get all wallets for a user
  async findByUserId(userId: string): Promise<Wallet[]> {
    const result = await pool.query(
      'SELECT * FROM wallets WHERE user_id = $1 ORDER BY created_at ASC',
      [userId]
    );
    // Map name to address for backward compatibility
    return result.rows.map(row => ({
      ...row,
      address: row.name,
      label: null,
    }));
  },

  // Find wallet by name (for upsert logic)
  async findByName(userId: string, name: string): Promise<Wallet | null> {
    const normalizedName = name.trim().toUpperCase();
    const result = await pool.query(
      'SELECT * FROM wallets WHERE user_id = $1 AND UPPER(name) = $2',
      [userId, normalizedName]
    );
    if (result.rows.length === 0) return null;
    // Map name to address for backward compatibility
    return {
      ...result.rows[0],
      address: result.rows[0].name,
      label: null,
    };
  },

  // Create a new wallet
  async create(userId: string, name: string): Promise<Wallet> {
    const normalizedName = name.trim().toUpperCase().slice(0, 4);
    const result = await pool.query(
      `INSERT INTO wallets (user_id, name)
       VALUES ($1, $2)
       RETURNING *`,
      [userId, normalizedName]
    );
    // Map name to address for backward compatibility
    return {
      ...result.rows[0],
      address: result.rows[0].name,
      label: null,
    };
  },

  // Upsert: Find existing or create new wallet
  async upsertByName(userId: string, name: string): Promise<{ wallet: Wallet; created: boolean }> {
    const existing = await this.findByName(userId, name);
    if (existing) {
      return { wallet: existing, created: false };
    }
    const wallet = await this.create(userId, name);
    return { wallet, created: true };
  },

  // Update wallet
  async update(id: string, userId: string, name: string): Promise<Wallet | null> {
    const normalizedName = name.trim().toUpperCase().slice(0, 4);
    const result = await pool.query(
      `UPDATE wallets SET name = $1 WHERE id = $2 AND user_id = $3 RETURNING *`,
      [normalizedName, id, userId]
    );
    if (result.rows.length === 0) return null;
    // Map name to address for backward compatibility
    return {
      ...result.rows[0],
      address: result.rows[0].name,
      label: null,
    };
  },

  // Delete wallet (also removes task_wallets entries due to CASCADE)
  async delete(id: string, userId: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM wallets WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );
    return result.rowCount !== null && result.rowCount > 0;
  },
};

export const TaskWalletModel = {
  // Get all wallets assigned to a task
  async findByTaskId(taskId: string, userId: string): Promise<TaskWalletWithDetails[]> {
    const result = await pool.query(
      `SELECT tw.*,
              w.name as wallet_name,
              w.created_at as wallet_created_at
       FROM task_wallets tw
       JOIN wallets w ON tw.wallet_id = w.id
       WHERE tw.task_id = $1 AND tw.user_id = $2
       ORDER BY tw.created_at ASC`,
      [taskId, userId]
    );
    return result.rows.map(row => ({
      id: row.id,
      task_id: row.task_id,
      wallet_id: row.wallet_id,
      user_id: row.user_id,
      created_at: row.created_at,
      wallet: {
        id: row.wallet_id,
        user_id: row.user_id,
        name: row.wallet_name,
        created_at: row.wallet_created_at,
        address: row.wallet_name, // Map name to address for backward compatibility
        label: null,
      },
    }));
  },

  // Get all task-wallet assignments for a user (for bulk loading)
  async findByUserId(userId: string): Promise<TaskWalletWithDetails[]> {
    const result = await pool.query(
      `SELECT tw.*,
              w.name as wallet_name,
              w.created_at as wallet_created_at
       FROM task_wallets tw
       JOIN wallets w ON tw.wallet_id = w.id
       WHERE tw.user_id = $1
       ORDER BY tw.task_id, tw.created_at ASC`,
      [userId]
    );
    return result.rows.map(row => ({
      id: row.id,
      task_id: row.task_id,
      wallet_id: row.wallet_id,
      user_id: row.user_id,
      created_at: row.created_at,
      wallet: {
        id: row.wallet_id,
        user_id: row.user_id,
        name: row.wallet_name,
        created_at: row.wallet_created_at,
        address: row.wallet_name, // Map name to address for backward compatibility
        label: null,
      },
    }));
  },

  // Add a single wallet to a task
  async addWalletToTask(taskId: string, walletId: string, userId: string): Promise<TaskWallet> {
    const result = await pool.query(
      `INSERT INTO task_wallets (task_id, wallet_id, user_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (task_id, wallet_id, user_id) DO NOTHING
       RETURNING *`,
      [taskId, walletId, userId]
    );
    // If already exists, fetch it
    if (result.rows.length === 0) {
      const existing = await pool.query(
        'SELECT * FROM task_wallets WHERE task_id = $1 AND wallet_id = $2 AND user_id = $3',
        [taskId, walletId, userId]
      );
      return existing.rows[0];
    }
    return result.rows[0];
  },

  // Add multiple wallets to a task
  async addWalletsToTask(taskId: string, walletIds: string[], userId: string): Promise<TaskWallet[]> {
    if (walletIds.length === 0) return [];

    const results: TaskWallet[] = [];
    for (const walletId of walletIds) {
      const result = await this.addWalletToTask(taskId, walletId, userId);
      results.push(result);
    }
    return results;
  },

  // Remove a wallet from a task
  async removeWalletFromTask(taskId: string, walletId: string, userId: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM task_wallets WHERE task_id = $1 AND wallet_id = $2 AND user_id = $3 RETURNING id',
      [taskId, walletId, userId]
    );
    return result.rowCount !== null && result.rowCount > 0;
  },

  // Remove all wallets from a task
  async removeAllWalletsFromTask(taskId: string, userId: string): Promise<number> {
    const result = await pool.query(
      'DELETE FROM task_wallets WHERE task_id = $1 AND user_id = $2',
      [taskId, userId]
    );
    return result.rowCount || 0;
  },

  // Check if a wallet is assigned to a task
  async isWalletAssignedToTask(taskId: string, walletId: string, userId: string): Promise<boolean> {
    const result = await pool.query(
      'SELECT 1 FROM task_wallets WHERE task_id = $1 AND wallet_id = $2 AND user_id = $3',
      [taskId, walletId, userId]
    );
    return result.rows.length > 0;
  },
};
