import { UserPlanModel } from '../models/UserPlan';
import pool from '../db/connection';

/**
 * Daily Task Reset Job
 * 
 * Resets daily tasks at 00:00 KST (Korean Standard Time = UTC+9)
 * This means it runs at 15:00 UTC of the previous day
 * 
 * Example: When it's 00:00 KST on Jan 17, it's 15:00 UTC on Jan 16
 */

let lastResetDateStr = '';

/**
 * Get current date string in KST (Korean Standard Time = UTC+9)
 * Returns YYYY-MM-DD format
 */
function getKSTDateString(): string {
  const now = new Date();
  // Convert UTC to KST by adding 9 hours
  const kstMs = now.getTime() + (9 * 60 * 60 * 1000);
  const kstDate = new Date(kstMs);
  return kstDate.toISOString().split('T')[0];
}

/**
 * Get KST hour and minute from current UTC time
 */
function getKSTTime(): { hour: number; minute: number } {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcMinute = now.getUTCMinutes();
  
  // KST = UTC + 9 hours
  let kstHour = utcHour + 9;
  if (kstHour >= 24) {
    kstHour -= 24;
  }
  
  return { hour: kstHour, minute: utcMinute };
}

/**
 * Get current day of week in KST (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
 */
function getKSTDayOfWeek(): number {
  const now = new Date();
  // Convert UTC to KST by adding 9 hours
  const kstMs = now.getTime() + (9 * 60 * 60 * 1000);
  const kstDate = new Date(kstMs);
  return kstDate.getUTCDay(); // 0 = Sunday, 6 = Saturday
}

/**
 * Check if it's 00:00 KST and reset daily tasks
 */
export const checkAndRunDailyTaskReset = async (): Promise<void> => {
  const { hour: kstHour, minute: kstMinute } = getKSTTime();
  const todayKSTStr = getKSTDateString();

  // Only run at 00:00-00:05 KST and if we haven't run today (KST)
  if (kstHour === 0 && kstMinute < 5 && lastResetDateStr !== todayKSTStr) {
    console.log(`[Daily Task Reset] Running at 00:00 KST (${todayKSTStr})...`);
    lastResetDateStr = todayKSTStr;
    await runDailyTaskReset();
  }
};

/**
 * Reset all daily and weekly tasks
 * - Daily tasks: Reset every day at 00:00 KST
 * - Weekly tasks: Reset every Sunday at 00:00 KST
 */
export async function runDailyTaskReset(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('[Daily Task Reset] Starting task reset...');

    const todayKSTStr = getKSTDateString();
    const isSunday = getKSTDayOfWeek() === 0; // 0 = Sunday
    
    // Reset daily tasks (every day)
    const dailyTasksToReset = await client.query(
      `SELECT up.id, up.user_id, up.task_id, t.frequency
       FROM user_plans up
       JOIN tasks t ON up.task_id = t.id
       WHERE t.frequency = 'daily'
         AND up.completed = TRUE
         AND (up.completed_at AT TIME ZONE 'Asia/Seoul')::date < $1::date`,
      [todayKSTStr]
    );

    console.log(`[Daily Task Reset] Found ${dailyTasksToReset.rows.length} daily tasks to reset`);

    // Reset weekly tasks (only on Sundays)
    let weeklyTasksToReset: any[] = [];
    if (isSunday) {
      const weeklyResult = await client.query(
        `SELECT up.id, up.user_id, up.task_id, t.frequency
         FROM user_plans up
         JOIN tasks t ON up.task_id = t.id
         WHERE t.frequency = 'weekly'
           AND up.completed = TRUE
           AND (up.completed_at AT TIME ZONE 'Asia/Seoul')::date < $1::date`,
        [todayKSTStr]
      );
      weeklyTasksToReset = weeklyResult.rows;
      console.log(`[Daily Task Reset] Found ${weeklyTasksToReset.length} weekly tasks to reset (Sunday reset)`);
    } else {
      console.log(`[Daily Task Reset] Not Sunday - skipping weekly task reset`);
    }

    // Combine both task lists
    const allTasksToReset = [...dailyTasksToReset.rows, ...weeklyTasksToReset];

    // Reset each task: uncomplete and remove points
    let resetCount = 0;
    for (const task of allTasksToReset) {
      try {
        // Get points to remove based on frequency
        const points = task.frequency === 'daily' ? 100 : 500; // Daily = 100, Weekly = 500

        // Uncomplete the task
        await client.query(
          `UPDATE user_plans
           SET completed = FALSE,
               completed_at = NULL,
               cost = NULL
           WHERE id = $1`,
          [task.id]
        );

        // Remove points (with safety check to not go below 0)
        await client.query(
          `UPDATE users 
           SET total_points = GREATEST(0, total_points - $1) 
           WHERE id = $2`,
          [points, task.user_id]
        );

        resetCount++;
      } catch (err) {
        console.error(`[Daily Task Reset] Error resetting task ${task.id}:`, err);
      }
    }

    await client.query('COMMIT');
    const taskTypes = isSunday ? 'daily and weekly' : 'daily';
    console.log(`[Daily Task Reset] Successfully reset ${resetCount} ${taskTypes} tasks`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Daily Task Reset] Error:', error);
  } finally {
    client.release();
  }
}

