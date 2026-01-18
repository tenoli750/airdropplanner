import pool from '../db/connection';

export interface UserPlan {
  id: string;
  user_id: string;
  task_id: string;
  added_at: Date;
  completed: boolean;
  completed_at: Date | null;
  cost: number | null;
}

export interface UserPlanWithTask extends UserPlan {
  task: {
    id: string;
    article_id: string;
    title: string;
    description: string | null;
    frequency: 'daily' | 'weekly' | 'one-time';
    link_url: string | null;
  };
  article: {
    id: string;
    title: string;
    project_name: string;
  };
}

// Point values by task frequency
export const POINTS_BY_FREQUENCY = {
  'daily': 100,
  'weekly': 500,
  'one-time': 1000,
} as const;

export const UserPlanModel = {
  async findByUserId(userId: string): Promise<UserPlanWithTask[]> {
    const result = await pool.query(
      `SELECT
        up.*,
        t.id as task_id,
        t.article_id,
        t.title as task_title,
        t.description as task_description,
        t.frequency,
        t.link_url,
        a.id as article_id,
        a.title as article_title,
        a.project_name
      FROM user_plans up
      JOIN tasks t ON up.task_id = t.id
      JOIN articles a ON t.article_id = a.id
      WHERE up.user_id = $1
      ORDER BY up.added_at DESC`,
      [userId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      task_id: row.task_id,
      added_at: row.added_at,
      completed: row.completed,
      completed_at: row.completed_at,
      cost: row.cost,
      task: {
        id: row.task_id,
        article_id: row.article_id,
        title: row.task_title,
        description: row.task_description,
        frequency: row.frequency,
        link_url: row.link_url,
      },
      article: {
        id: row.article_id,
        title: row.article_title,
        project_name: row.project_name,
      },
    }));
  },

  async addTask(userId: string, taskId: string): Promise<UserPlan> {
    const result = await pool.query(
      `INSERT INTO user_plans (user_id, task_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, task_id) DO NOTHING
       RETURNING *`,
      [userId, taskId]
    );

    if (result.rows.length === 0) {
      const existingResult = await pool.query(
        'SELECT * FROM user_plans WHERE user_id = $1 AND task_id = $2',
        [userId, taskId]
      );
      return existingResult.rows[0];
    }

    return result.rows[0];
  },

  async removeTask(userId: string, taskId: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM user_plans WHERE user_id = $1 AND task_id = $2 RETURNING *',
      [userId, taskId]
    );
    return result.rowCount !== null && result.rowCount > 0;
  },

  async toggleComplete(userId: string, taskId: string): Promise<UserPlan | null> {
    // Store completion time as current UTC timestamp
    // Date comparisons will use KST boundaries converted to UTC
    const now = new Date();
    const result = await pool.query(
      `UPDATE user_plans
       SET completed = NOT completed,
           completed_at = CASE WHEN NOT completed THEN $3 ELSE NULL END
       WHERE user_id = $1 AND task_id = $2
       RETURNING *`,
      [userId, taskId, now]
    );
    return result.rows[0] || null;
  },

  // Complete task with cost input and award points
  async completeTask(userId: string, taskId: string, cost?: number): Promise<{ plan: UserPlan; pointsAwarded: number } | null> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get task frequency to calculate points
      const taskResult = await client.query(
        'SELECT frequency FROM tasks WHERE id = $1',
        [taskId]
      );
      if (taskResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      const frequency = taskResult.rows[0].frequency as keyof typeof POINTS_BY_FREQUENCY;
      const points = POINTS_BY_FREQUENCY[frequency] || 0;

      // Check if already completed
      const checkResult = await client.query(
        'SELECT completed FROM user_plans WHERE user_id = $1 AND task_id = $2',
        [userId, taskId]
      );
      if (checkResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      const wasCompleted = checkResult.rows[0].completed;

      // Update plan with completion and cost
      // Store completion time as current UTC timestamp
      // Date comparisons will use KST boundaries converted to UTC
      const now = new Date();
      const updateResult = await client.query(
        `UPDATE user_plans
         SET completed = TRUE,
             completed_at = $3,
             cost = $4
         WHERE user_id = $1 AND task_id = $2
         RETURNING *`,
        [userId, taskId, now, cost ?? null]
      );

      // If not previously completed, award points
      let pointsAwarded = 0;
      if (!wasCompleted) {
        pointsAwarded = points;

        // Update user's total points
        await client.query(
          'UPDATE users SET total_points = total_points + $1 WHERE id = $2',
          [points, userId]
        );

        // Add point history
        await client.query(
          `INSERT INTO point_history (user_id, task_id, points, reason)
           VALUES ($1, $2, $3, $4)`,
          [userId, taskId, points, `Task completed (${frequency})`]
        );
      }

      await client.query('COMMIT');
      return { plan: updateResult.rows[0], pointsAwarded };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  // Uncomplete task (remove points)
  async uncompleteTask(userId: string, taskId: string): Promise<UserPlan | null> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get task frequency to calculate points to remove
      const taskResult = await client.query(
        'SELECT frequency FROM tasks WHERE id = $1',
        [taskId]
      );
      if (taskResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      const frequency = taskResult.rows[0].frequency as keyof typeof POINTS_BY_FREQUENCY;
      const points = POINTS_BY_FREQUENCY[frequency] || 0;

      // Check if was completed
      const checkResult = await client.query(
        'SELECT completed FROM user_plans WHERE user_id = $1 AND task_id = $2',
        [userId, taskId]
      );
      if (checkResult.rows.length === 0 || !checkResult.rows[0].completed) {
        await client.query('ROLLBACK');
        return null;
      }

      // Update plan
      const updateResult = await client.query(
        `UPDATE user_plans
         SET completed = FALSE,
             completed_at = NULL,
             cost = NULL
         WHERE user_id = $1 AND task_id = $2
         RETURNING *`,
        [userId, taskId]
      );

      // Remove points
      await client.query(
        'UPDATE users SET total_points = GREATEST(0, total_points - $1) WHERE id = $2',
        [points, userId]
      );

      // Add negative point history
      await client.query(
        `INSERT INTO point_history (user_id, task_id, points, reason)
         VALUES ($1, $2, $3, $4)`,
        [userId, taskId, -points, `Task uncompleted (${frequency})`]
      );

      await client.query('COMMIT');
      return updateResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async isTaskInPlan(userId: string, taskId: string): Promise<boolean> {
    const result = await pool.query(
      'SELECT 1 FROM user_plans WHERE user_id = $1 AND task_id = $2',
      [userId, taskId]
    );
    return result.rows.length > 0;
  },

  async getTaskIdsInPlan(userId: string): Promise<string[]> {
    const result = await pool.query(
      'SELECT task_id FROM user_plans WHERE user_id = $1',
      [userId]
    );
    return result.rows.map((row) => row.task_id);
  },

  // Get calendar data (tasks by date)
  // Dates are interpreted in KST timezone
  async getCalendarData(userId: string, year: number, month: number): Promise<any[]> {
    // Create KST date boundaries for the month
    // Start: First day of month at 00:00:00 KST
    // End: Last day of month at 23:59:59 KST
    const startDateKST = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    // Subtract 9 hours to get UTC equivalent (KST = UTC+9)
    const startDateUTC = new Date(startDateKST.getTime() - (9 * 60 * 60 * 1000));
    
    // End date: last day of month at 23:59:59 KST
    const lastDay = new Date(year, month, 0).getDate();
    const endDateKST = new Date(Date.UTC(year, month - 1, lastDay, 23, 59, 59, 999));
    // Subtract 9 hours to get UTC equivalent
    const endDateUTC = new Date(endDateKST.getTime() - (9 * 60 * 60 * 1000));

    const result = await pool.query(
      `SELECT 
        up.id,
        up.task_id,
        up.completed,
        up.completed_at,
        up.cost,
        up.added_at,
        t.title as task_title,
        t.frequency,
        a.project_name
      FROM user_plans up
      JOIN tasks t ON up.task_id = t.id
      JOIN articles a ON t.article_id = a.id
      WHERE up.user_id = $1
        AND (
          (up.completed = TRUE AND up.completed_at BETWEEN $2 AND $3)
          OR (t.frequency = 'daily' AND up.added_at <= $3)
          OR (t.frequency = 'weekly' AND up.added_at <= $3)
        )
      ORDER BY up.completed_at DESC NULLS LAST`,
      [userId, startDateUTC, endDateUTC]
    );

    return result.rows;
  },

  // Get user stats (total points, total cost, etc.)
  async getUserStats(userId: string): Promise<{ totalPoints: number; totalCost: number; completedCount: number }> {
    const result = await pool.query(
      `SELECT 
        COALESCE(u.total_points, 0) as total_points,
        COALESCE(SUM(up.cost), 0) as total_cost,
        COUNT(CASE WHEN up.completed THEN 1 END) as completed_count
      FROM users u
      LEFT JOIN user_plans up ON u.id = up.user_id
      WHERE u.id = $1
      GROUP BY u.id, u.total_points`,
      [userId]
    );

    if (result.rows.length === 0) {
      return { totalPoints: 0, totalCost: 0, completedCount: 0 };
    }

    return {
      totalPoints: parseInt(result.rows[0].total_points) || 0,
      totalCost: parseFloat(result.rows[0].total_cost) || 0,
      completedCount: parseInt(result.rows[0].completed_count) || 0,
    };
  },
};
