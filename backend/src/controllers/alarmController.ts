import { Request, Response } from 'express';
import pool from '../db/connection';

export interface AlarmSettings {
  id: string;
  user_id: string;
  enabled: boolean;
  alarm_time: string;
  timezone: string;
}

export const alarmController = {
  // Get user's alarm settings
  async getSettings(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId as string;

      const result = await pool.query(
        'SELECT * FROM user_alarm_settings WHERE user_id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        // Return default settings if not set
        res.json({
          alarm_enabled: false,
          alarm_time: '09:00',
          timezone: 'Asia/Seoul',
        });
        return;
      }

      const settings = result.rows[0];
      res.json({
        alarm_enabled: settings.alarm_enabled ?? settings.enabled ?? false,
        alarm_time: settings.alarm_time.substring(0, 5), // Format HH:MM
        timezone: settings.timezone,
      });
    } catch (error) {
      console.error('Error fetching alarm settings:', error);
      res.status(500).json({ error: 'Failed to fetch alarm settings' });
    }
  },

  // Update alarm settings
  async updateSettings(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId as string;
      const { alarm_enabled, enabled, alarm_time, timezone } = req.body;
      const alarmEnabled = alarm_enabled ?? enabled ?? false;

      const result = await pool.query(
        `INSERT INTO user_alarm_settings (user_id, alarm_enabled, alarm_time, timezone)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id) DO UPDATE SET
           alarm_enabled = EXCLUDED.alarm_enabled,
           alarm_time = EXCLUDED.alarm_time,
           timezone = EXCLUDED.timezone,
           updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [userId, alarmEnabled, alarm_time ?? '09:00', timezone ?? 'Asia/Seoul']
      );

      const settings = result.rows[0];
      res.json({
        alarm_enabled: settings.alarm_enabled ?? settings.enabled ?? false,
        alarm_time: settings.alarm_time.substring(0, 5),
        timezone: settings.timezone,
        message: alarmEnabled ? 'Alarm enabled' : 'Alarm disabled',
      });
    } catch (error) {
      console.error('Error updating alarm settings:', error);
      res.status(500).json({ error: 'Failed to update alarm settings' });
    }
  },

  // Get all users with alarms due (for cron job)
  async getUsersForAlarm(): Promise<any[]> {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const result = await pool.query(
      `SELECT 
        uas.user_id,
        uas.alarm_time,
        uas.timezone,
        tl.telegram_id,
        tl.telegram_username,
        u.username
      FROM user_alarm_settings uas
      JOIN users u ON uas.user_id = u.id
      JOIN telegram_links tl ON u.id = tl.user_id
      WHERE uas.alarm_enabled = TRUE
        AND uas.alarm_time = $1`,
      [currentTime + ':00']
    );

    return result.rows;
  },

  // Get incomplete tasks for a user
  async getIncompleteTasks(userId: string): Promise<any[]> {
    const result = await pool.query(
      `SELECT 
        t.id,
        t.title,
        t.frequency,
        a.project_name
      FROM user_plans up
      JOIN tasks t ON up.task_id = t.id
      JOIN articles a ON t.article_id = a.id
      WHERE up.user_id = $1
        AND up.completed = FALSE
        AND (
          t.frequency = 'daily'
          OR (t.frequency = 'weekly' AND EXTRACT(DOW FROM CURRENT_DATE) = 1)
          OR t.frequency = 'one-time'
        )
      ORDER BY t.frequency, a.project_name`,
      [userId]
    );

    return result.rows;
  },
};
