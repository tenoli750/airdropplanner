import { bettingController } from '../controllers/bettingController';

/**
 * Daily Race Job - Simplified version
 * 
 * Since we use Binance API for all price data, this job only needs to:
 * - Settle yesterday's bets at 00:00 UTC
 */

let lastRunDateStr = '';

/**
 * Check if it's 00:00 UTC and run the daily job
 */
export const checkAndRunDailyRaceJob = async (): Promise<void> => {
  const now = new Date();
  const currentHour = now.getUTCHours();
  const currentMinute = now.getUTCMinutes();
  const todayStr = now.toISOString().split('T')[0];

  // Only run at 00:00-00:05 UTC and if we haven't run today
  if (currentHour === 0 && currentMinute < 5 && lastRunDateStr !== todayStr) {
    console.log('[Daily Race Job] Running at 00:00 UTC...');
    lastRunDateStr = todayStr;
    await runDailyRaceJob();
  }
};

/**
 * Run the daily race job - settle yesterday's bets
 */
async function runDailyRaceJob(): Promise<void> {
  try {
    await bettingController.settleYesterdayBets();
    console.log('[Daily Race Job] Completed successfully');
  } catch (error) {
    console.error('[Daily Race Job] Error:', error);
  }
}

/**
 * Initial setup on server start - nothing needed since Binance API is used
 */
export const runInitialSetup = async (): Promise<void> => {
  console.log('[Betting] Using Binance API for all price data - no DB setup needed');
};

export { runDailyRaceJob };
