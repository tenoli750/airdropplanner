import { Request, Response } from 'express';
import { getTodayPrices, getYesterdayPrices, RACE_COINS } from '../services/cryptoService';
import pool from '../db/connection';

const MAX_BET = 1000;
const MULTIPLIER = 4;

// Helper to get date string
function getDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

export const bettingController = {
  /**
   * Get all betting data for the page
   * Uses Binance API for all price data
   * DB only stores race metadata and bet results
   */
  async getBettingData(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;

      // Fetch live prices from Binance
      const [todayPrices, yesterdayPrices] = await Promise.all([
        getTodayPrices(),
        getYesterdayPrices(),
      ]);

      // Get today's date
      const today = new Date();
      const todayStr = getDateString(today);
      
      // Yesterday's date
      const yesterday = new Date(today);
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      const yesterdayStr = getDateString(yesterday);
      
      // Tomorrow's date
      const tomorrow = new Date(today);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      const tomorrowStr = getDateString(tomorrow);

      // Build active race (today) - live data from Binance
      const activeRace = {
        id: `race-${todayStr}`,
        race_date: todayStr,
        status: 'racing' as const,
        coins: todayPrices.map((price, index) => ({
          id: `coin-${todayStr}-${price.id}`,
          race_id: `race-${todayStr}`,
          coin_id: price.id,
          coin_name: price.name,
          coin_symbol: price.symbol,
          coin_image: price.image,
          start_price: price.openPrice,
          current_price: price.currentPrice,
          live_change: price.percentChange,
          end_price: null,
          percent_change: price.percentChange,
          is_winner: false,
        })),
      };

      // Determine current leader
      const sortedCoins = [...activeRace.coins].sort((a, b) => b.percent_change - a.percent_change);
      if (sortedCoins.length > 0) {
        const leaderId = sortedCoins[0].coin_id;
        activeRace.coins = activeRace.coins.map(c => ({
          ...c,
          is_winner: c.coin_id === leaderId,
        }));
      }

      // Build yesterday's race - data from Binance
      const yesterdaySortedPrices = [...yesterdayPrices].sort((a, b) => b.percentChange - a.percentChange);
      const winnerId = yesterdaySortedPrices.length > 0 ? yesterdaySortedPrices[0].id : null;
      
      const yesterdayRace = {
        id: `race-${yesterdayStr}`,
        race_date: yesterdayStr,
        status: 'completed' as const,
        coins: yesterdayPrices.map(price => ({
          id: `coin-${yesterdayStr}-${price.id}`,
          race_id: `race-${yesterdayStr}`,
          coin_id: price.id,
          coin_name: price.name,
          coin_symbol: price.symbol,
          coin_image: price.image,
          start_price: price.openPrice,
          current_price: price.closePrice || price.currentPrice,
          end_price: price.closePrice || price.currentPrice,
          percent_change: price.percentChange,
          live_change: price.percentChange,
          is_winner: price.id === winnerId,
        })),
      };

      // Build betting race (tomorrow) - same coins, no prices yet
      const bettingRace = {
        id: `race-${tomorrowStr}`,
        race_date: tomorrowStr,
        status: 'upcoming' as const,
        multiplier: MULTIPLIER,
        max_bet: MAX_BET,
        coins: RACE_COINS.map(coin => ({
          id: `coin-${tomorrowStr}-${coin.id}`,
          race_id: `race-${tomorrowStr}`,
          coin_id: coin.id,
          coin_name: coin.name,
          coin_symbol: coin.symbol,
          coin_image: coin.image,
          start_price: null,
          current_price: null,
          end_price: null,
          percent_change: null,
          live_change: null,
          is_winner: false,
        })),
      };

      // Get user's bet for tomorrow's race from DB
      let userBet = null;
      if (userId) {
        const betResult = await pool.query(
          `SELECT * FROM betting_bets WHERE user_id = $1 AND race_date = $2`,
          [userId, tomorrowStr]
        );
        if (betResult.rows.length > 0) {
          const bet = betResult.rows[0];
          const coin = RACE_COINS.find(c => c.id === bet.coin_id);
          userBet = {
            ...bet,
            coin_symbol: coin?.symbol || bet.coin_id,
          };
        }
      }

      // Get user's bet history
      let userBetHistory: any[] = [];
      if (userId) {
        const historyResult = await pool.query(
          `SELECT * FROM betting_bets WHERE user_id = $1 ORDER BY race_date DESC LIMIT 20`,
          [userId]
        );
        userBetHistory = historyResult.rows.map(bet => {
          const coin = RACE_COINS.find(c => c.id === bet.coin_id);
          return {
            ...bet,
            coin_symbol: coin?.symbol || bet.coin_id,
            coin_name: coin?.name || bet.coin_id,
          };
        });
      }

      // Get user balance
      let balance = 0;
      if (userId) {
        const userResult = await pool.query(
          'SELECT total_points FROM users WHERE id = $1',
          [userId]
        );
        balance = userResult.rows[0]?.total_points || 0;
      }

      res.json({
        activeRace,
        bettingRace,
        yesterdayRace,
        completedRaces: [yesterdayRace], // For backward compatibility
        userBet,
        userBetHistory,
        balance,
        multiplier: MULTIPLIER,
        maxBet: MAX_BET,
      });
    } catch (error: any) {
      console.error('Error fetching betting data:', error?.message || error);
      console.error('Stack:', error?.stack);
      res.status(500).json({ error: 'Failed to fetch betting data', details: error?.message });
    }
  },

  /**
   * Place a bet on tomorrow's race
   */
  async placeBet(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { coin_id, stake } = req.body;

      // Validate stake
      if (!stake || typeof stake !== 'number' || stake <= 0) {
        res.status(400).json({ error: 'Invalid stake amount' });
        return;
      }

      if (stake > MAX_BET) {
        res.status(400).json({ error: `Maximum bet is ${MAX_BET} points` });
        return;
      }

      // Validate coin
      const validCoin = RACE_COINS.find(c => c.id === coin_id);
      if (!validCoin) {
        res.status(400).json({ error: 'Invalid coin' });
        return;
      }

      // Get tomorrow's date
      const tomorrow = new Date();
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      const tomorrowStr = getDateString(tomorrow);

      // Check user's balance
      const userResult = await pool.query(
        'SELECT total_points FROM users WHERE id = $1',
        [userId]
      );
      
      const currentPoints = userResult.rows[0]?.total_points || 0;
      if (currentPoints < stake) {
        res.status(400).json({ error: 'Insufficient points' });
        return;
      }

      // Check if user already has a bet for tomorrow
      const existingBet = await pool.query(
        'SELECT id FROM betting_bets WHERE user_id = $1 AND race_date = $2',
        [userId, tomorrowStr]
      );
      
      if (existingBet.rows.length > 0) {
        res.status(400).json({ error: 'You already have a bet for tomorrow' });
        return;
      }

      // Create bet and deduct points
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Deduct points
        await client.query(
          'UPDATE users SET total_points = total_points - $1 WHERE id = $2',
          [stake, userId]
        );

        // Create bet
        const betResult = await client.query(
          `INSERT INTO betting_bets (user_id, race_date, coin_id, stake, status)
           VALUES ($1, $2, $3, $4, 'pending')
           RETURNING *`,
          [userId, tomorrowStr, coin_id, stake]
        );

        await client.query('COMMIT');

        const bet = betResult.rows[0];
        res.json({
          message: 'Bet placed successfully',
          bet: {
            ...bet,
            coin_symbol: validCoin.symbol,
          },
          remaining_points: currentPoints - stake,
          potential_payout: stake * MULTIPLIER,
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error('Error placing bet:', error);
      res.status(500).json({ error: error.message || 'Failed to place bet' });
    }
  },

  /**
   * Settle yesterday's bets - called by cron job at 00:00 UTC
   */
  async settleYesterdayBets(): Promise<void> {
    try {
      const yesterday = new Date();
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      const yesterdayStr = getDateString(yesterday);

      // Get yesterday's prices from Binance
      const prices = await getYesterdayPrices();
      
      // Find winner (highest % change)
      const sorted = [...prices].sort((a, b) => b.percentChange - a.percentChange);
      const winnerId = sorted.length > 0 ? sorted[0].id : null;

      if (!winnerId) {
        console.log('[Settlement] No winner found for', yesterdayStr);
        return;
      }

      console.log(`[Settlement] Winner for ${yesterdayStr}: ${winnerId} (${sorted[0].percentChange.toFixed(2)}%)`);

      // Get all pending bets for yesterday
      const betsResult = await pool.query(
        `SELECT * FROM betting_bets WHERE race_date = $1 AND status = 'pending'`,
        [yesterdayStr]
      );

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        for (const bet of betsResult.rows) {
          const won = bet.coin_id === winnerId;
          const payout = won ? bet.stake * MULTIPLIER : 0;

          // Update bet status
          await client.query(
            `UPDATE betting_bets SET status = $1, payout = $2 WHERE id = $3`,
            [won ? 'won' : 'lost', payout, bet.id]
          );

          // Add payout to winner's balance
          if (won) {
            await client.query(
              'UPDATE users SET total_points = total_points + $1 WHERE id = $2',
              [payout, bet.user_id]
            );
            console.log(`[Settlement] User ${bet.user_id} won ${payout} points`);
          }
        }

        await client.query('COMMIT');
        console.log(`[Settlement] Settled ${betsResult.rows.length} bets for ${yesterdayStr}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('[Settlement] Error settling bets:', error);
    }
  },

  /**
   * Get user's balance
   */
  async getBalance(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const result = await pool.query(
        'SELECT total_points FROM users WHERE id = $1',
        [userId]
      );

      const points = result.rows[0]?.total_points || 0;
      res.json({ points });
    } catch (error) {
      console.error('Error fetching balance:', error);
      res.status(500).json({ error: 'Failed to fetch balance' });
    }
  },

  /**
   * Initialize - nothing to do since we use Binance API for prices
   */
  async initializeRaces(): Promise<void> {
    console.log('[Betting] Using Binance API for all price data');
  },

  /**
   * Get leaderboard - users ranked by total points
   */
  async getLeaderboard(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

      // Get top users by total_points
      const result = await pool.query(
        `SELECT
          id,
          username,
          total_points,
          created_at,
          ROW_NUMBER() OVER (ORDER BY total_points DESC) as rank
        FROM users
        WHERE total_points > 0
        ORDER BY total_points DESC
        LIMIT $1`,
        [limit]
      );

      // Get betting stats for each user
      const leaderboard = await Promise.all(
        result.rows.map(async (user) => {
          const statsResult = await pool.query(
            `SELECT
              COUNT(*) as total_bets,
              COUNT(CASE WHEN status = 'won' THEN 1 END) as wins,
              COUNT(CASE WHEN status = 'lost' THEN 1 END) as losses,
              COALESCE(SUM(CASE WHEN status = 'won' THEN payout ELSE 0 END), 0) as total_winnings
            FROM betting_bets
            WHERE user_id = $1`,
            [user.id]
          );

          const stats = statsResult.rows[0];
          const totalBets = parseInt(stats.total_bets) || 0;
          const wins = parseInt(stats.wins) || 0;

          return {
            rank: parseInt(user.rank),
            userId: user.id,
            username: user.username,
            totalPoints: user.total_points || 0,
            totalBets,
            wins,
            losses: parseInt(stats.losses) || 0,
            winRate: totalBets > 0 ? Math.round((wins / totalBets) * 100) : 0,
            totalWinnings: parseInt(stats.total_winnings) || 0,
            joinedAt: user.created_at,
            isCurrentUser: user.id === userId,
          };
        })
      );

      // Get current user's rank if not in top list
      let currentUserRank = null;
      if (userId) {
        const userInList = leaderboard.find(u => u.isCurrentUser);
        if (!userInList) {
          const userRankResult = await pool.query(
            `SELECT rank FROM (
              SELECT id, ROW_NUMBER() OVER (ORDER BY total_points DESC) as rank
              FROM users
              WHERE total_points > 0
            ) ranked
            WHERE id = $1`,
            [userId]
          );

          if (userRankResult.rows.length > 0) {
            const userDataResult = await pool.query(
              `SELECT id, username, total_points, created_at FROM users WHERE id = $1`,
              [userId]
            );

            if (userDataResult.rows.length > 0) {
              const userData = userDataResult.rows[0];
              const userStatsResult = await pool.query(
                `SELECT
                  COUNT(*) as total_bets,
                  COUNT(CASE WHEN status = 'won' THEN 1 END) as wins,
                  COUNT(CASE WHEN status = 'lost' THEN 1 END) as losses,
                  COALESCE(SUM(CASE WHEN status = 'won' THEN payout ELSE 0 END), 0) as total_winnings
                FROM betting_bets
                WHERE user_id = $1`,
                [userId]
              );

              const userStats = userStatsResult.rows[0];
              const totalBets = parseInt(userStats.total_bets) || 0;
              const wins = parseInt(userStats.wins) || 0;

              currentUserRank = {
                rank: parseInt(userRankResult.rows[0].rank),
                userId: userData.id,
                username: userData.username,
                totalPoints: userData.total_points || 0,
                totalBets,
                wins,
                losses: parseInt(userStats.losses) || 0,
                winRate: totalBets > 0 ? Math.round((wins / totalBets) * 100) : 0,
                totalWinnings: parseInt(userStats.total_winnings) || 0,
                joinedAt: userData.created_at,
                isCurrentUser: true,
              };
            }
          }
        }
      }

      // Get total user count
      const countResult = await pool.query(
        'SELECT COUNT(*) as count FROM users WHERE total_points > 0'
      );

      res.json({
        leaderboard,
        currentUserRank,
        totalUsers: parseInt(countResult.rows[0].count) || 0,
      });
    } catch (error: any) {
      console.error('Error fetching leaderboard:', error);
      res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
  },
};
