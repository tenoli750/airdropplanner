import pool from '../db/connection';

export interface BettingRace {
  id: string;
  race_date: string; // Date string YYYY-MM-DD
  status: 'upcoming' | 'racing' | 'completed';
  created_at: Date;
}

export interface BettingRaceCoin {
  id: string;
  race_id: string;
  coin_id: string;
  coin_name: string;
  coin_symbol: string;
  coin_image: string | null;
  start_price: number | null;
  end_price: number | null;
  percent_change: number | null;
  is_winner: boolean;
}

export interface BettingBet {
  id: string;
  user_id: string;
  race_id: string;
  coin_id: string;
  stake: number;
  payout: number;
  status: 'pending' | 'won' | 'lost';
  created_at: Date;
}

export interface RaceWithCoins extends BettingRace {
  coins: BettingRaceCoin[];
}

export interface BetWithDetails extends BettingBet {
  coin_name: string;
  coin_symbol: string;
}

const MULTIPLIER = 4;

// Helper to get date string in YYYY-MM-DD format (UTC)
function getDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Helper to get today's date at 00:00 UTC
function getTodayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

// Helper to get tomorrow's date at 00:00 UTC
function getTomorrowUTC(): Date {
  const today = getTodayUTC();
  today.setUTCDate(today.getUTCDate() + 1);
  return today;
}

// Helper to get yesterday's date at 00:00 UTC
function getYesterdayUTC(): Date {
  const today = getTodayUTC();
  today.setUTCDate(today.getUTCDate() - 1);
  return today;
}

export const BettingRaceModel = {
  /**
   * Get race by date string
   */
  async getRaceByDate(dateStr: string): Promise<RaceWithCoins | null> {
    const raceResult = await pool.query(
      'SELECT * FROM betting_races WHERE race_date = $1',
      [dateStr]
    );

    if (raceResult.rows.length === 0) {
      return null;
    }

    const race = raceResult.rows[0];
    
    const coinsResult = await pool.query(
      'SELECT * FROM betting_race_coins WHERE race_id = $1 ORDER BY coin_symbol',
      [race.id]
    );

    return {
      ...race,
      coins: coinsResult.rows,
    };
  },

  /**
   * Get the currently active race (status = 'racing')
   * This is today's race that started at 00:00 UTC
   */
  async getActiveRace(): Promise<RaceWithCoins | null> {
    const today = getDateString(getTodayUTC());
    const race = await this.getRaceByDate(today);
    
    if (race && race.status === 'racing') {
      return race;
    }
    return null;
  },

  /**
   * Get race available for betting (status = 'upcoming')
   * This is tomorrow's race
   */
  async getBettingRace(): Promise<RaceWithCoins | null> {
    const tomorrow = getDateString(getTomorrowUTC());
    const race = await this.getRaceByDate(tomorrow);
    
    if (race && race.status === 'upcoming') {
      return race;
    }
    return null;
  },

  /**
   * Get yesterday's race (should be completed)
   */
  async getYesterdayRace(): Promise<RaceWithCoins | null> {
    const yesterday = getDateString(getYesterdayUTC());
    return this.getRaceByDate(yesterday);
  },

  /**
   * Get completed races for history
   */
  async getCompletedRaces(limit = 10): Promise<RaceWithCoins[]> {
    const result = await pool.query(
      `SELECT * FROM betting_races 
       WHERE status = 'completed' 
       ORDER BY race_date DESC 
       LIMIT $1`,
      [limit]
    );

    const races: RaceWithCoins[] = [];
    for (const race of result.rows) {
      const coinsResult = await pool.query(
        'SELECT * FROM betting_race_coins WHERE race_id = $1 ORDER BY percent_change DESC NULLS LAST',
        [race.id]
      );
      races.push({ ...race, coins: coinsResult.rows });
    }

    return races;
  },

  /**
   * Create a new race for a specific date (status = 'upcoming')
   */
  async createRace(
    raceDate: Date,
    coins: { id: string; name: string; symbol: string; image: string; price: number }[]
  ): Promise<RaceWithCoins> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const dateStr = getDateString(raceDate);
      
      // Check if race already exists
      const existingRace = await client.query(
        'SELECT id FROM betting_races WHERE race_date = $1',
        [dateStr]
      );
      
      if (existingRace.rows.length > 0) {
        throw new Error(`Race already exists for ${dateStr}`);
      }

      // Create race with 'upcoming' status (betting open)
      const raceResult = await client.query(
        `INSERT INTO betting_races (race_date, status)
         VALUES ($1, 'upcoming')
         RETURNING *`,
        [dateStr]
      );
      const race = raceResult.rows[0];

      // Insert coins (start_price will be set when race starts)
      const coinRows: BettingRaceCoin[] = [];
      for (const coin of coins) {
        const coinResult = await client.query(
          `INSERT INTO betting_race_coins 
           (race_id, coin_id, coin_name, coin_symbol, coin_image)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [race.id, coin.id, coin.name, coin.symbol.toUpperCase(), coin.image]
        );
        coinRows.push(coinResult.rows[0]);
      }

      await client.query('COMMIT');

      return {
        ...race,
        coins: coinRows,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * Start a race - set status to 'racing' and record start prices
   */
  async startRace(raceId: string, startPrices: Record<string, number>): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Update race status
      await client.query(
        `UPDATE betting_races SET status = 'racing' WHERE id = $1`,
        [raceId]
      );

      // Update coin start prices
      for (const [coinId, price] of Object.entries(startPrices)) {
        await client.query(
          `UPDATE betting_race_coins 
           SET start_price = $1
           WHERE race_id = $2 AND coin_id = $3`,
          [price, raceId, coinId]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * End a race - record end prices, determine winner, settle bets
   */
  async settleRace(raceId: string, endPrices: Record<string, number>): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get coins for this race
      const coinsResult = await client.query(
        'SELECT * FROM betting_race_coins WHERE race_id = $1',
        [raceId]
      );
      const coins = coinsResult.rows as BettingRaceCoin[];

      // Calculate percent changes and find winner
      let maxChange = -Infinity;
      let winnerId = '';

      for (const coin of coins) {
        const endPrice = endPrices[coin.coin_id];
        if (endPrice && coin.start_price) {
          const percentChange = ((endPrice - Number(coin.start_price)) / Number(coin.start_price)) * 100;
          
          await client.query(
            `UPDATE betting_race_coins 
             SET end_price = $1, percent_change = $2
             WHERE id = $3`,
            [endPrice, percentChange, coin.id]
          );

          if (percentChange > maxChange) {
            maxChange = percentChange;
            winnerId = coin.coin_id;
          }
        }
      }

      // Mark winner
      if (winnerId) {
        await client.query(
          `UPDATE betting_race_coins 
           SET is_winner = TRUE
           WHERE race_id = $1 AND coin_id = $2`,
          [raceId, winnerId]
        );
      }

      // Process bets
      const betsResult = await client.query(
        'SELECT * FROM betting_bets WHERE race_id = $1 AND status = $2',
        [raceId, 'pending']
      );

      for (const bet of betsResult.rows) {
        const won = bet.coin_id === winnerId;
        const payout = won ? bet.stake * MULTIPLIER : 0;
        const newStatus = won ? 'won' : 'lost';

        await client.query(
          `UPDATE betting_bets 
           SET status = $1, payout = $2
           WHERE id = $3`,
          [newStatus, payout, bet.id]
        );

        // Add payout to winner's balance
        if (won) {
          await client.query(
            'UPDATE users SET total_points = total_points + $1 WHERE id = $2',
            [payout, bet.user_id]
          );
        }
      }

      // Mark race as completed
      await client.query(
        `UPDATE betting_races SET status = 'completed' WHERE id = $1`,
        [raceId]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * Place a bet on an upcoming race
   */
  async placeBet(userId: string, raceId: string, coinId: string, stake: number): Promise<BettingBet> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Check if race is still accepting bets (status = 'upcoming')
      const raceResult = await client.query(
        'SELECT status FROM betting_races WHERE id = $1',
        [raceId]
      );
      
      if (raceResult.rows.length === 0) {
        throw new Error('Race not found');
      }
      
      if (raceResult.rows[0].status !== 'upcoming') {
        throw new Error('Race is no longer accepting bets');
      }

      // Check if user has enough points
      const userResult = await client.query(
        'SELECT total_points FROM users WHERE id = $1',
        [userId]
      );
      
      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }
      
      const userPoints = userResult.rows[0].total_points || 0;
      if (userPoints < stake) {
        throw new Error('Insufficient points');
      }

      // Check if coin is valid for this race
      const coinResult = await client.query(
        'SELECT 1 FROM betting_race_coins WHERE race_id = $1 AND coin_id = $2',
        [raceId, coinId]
      );
      
      if (coinResult.rows.length === 0) {
        throw new Error('Invalid coin for this race');
      }

      // Check if user already has a bet on this race
      const existingBet = await client.query(
        'SELECT id FROM betting_bets WHERE user_id = $1 AND race_id = $2',
        [userId, raceId]
      );
      
      if (existingBet.rows.length > 0) {
        throw new Error('You already have a bet on this race');
      }

      // Deduct points from user
      await client.query(
        'UPDATE users SET total_points = total_points - $1 WHERE id = $2',
        [stake, userId]
      );

      // Create bet
      const betResult = await client.query(
        `INSERT INTO betting_bets (user_id, race_id, coin_id, stake, status)
         VALUES ($1, $2, $3, $4, 'pending')
         RETURNING *`,
        [userId, raceId, coinId, stake]
      );

      await client.query('COMMIT');
      
      return betResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * Get user's bet for a race
   */
  async getUserBet(userId: string, raceId: string): Promise<BetWithDetails | null> {
    const result = await pool.query(
      `SELECT b.*, c.coin_name, c.coin_symbol
       FROM betting_bets b
       JOIN betting_race_coins c ON b.race_id = c.race_id AND b.coin_id = c.coin_id
       WHERE b.user_id = $1 AND b.race_id = $2`,
      [userId, raceId]
    );
    
    return result.rows[0] || null;
  },

  /**
   * Get user's betting history
   */
  async getUserBetHistory(userId: string, limit = 20): Promise<any[]> {
    const result = await pool.query(
      `SELECT 
         b.*,
         c.coin_name,
         c.coin_symbol,
         c.percent_change,
         c.is_winner as coin_won,
         r.race_date,
         r.status as race_status
       FROM betting_bets b
       JOIN betting_races r ON b.race_id = r.id
       JOIN betting_race_coins c ON b.race_id = c.race_id AND b.coin_id = c.coin_id
       WHERE b.user_id = $1
       ORDER BY r.race_date DESC
       LIMIT $2`,
      [userId, limit]
    );
    
    return result.rows;
  },

  /**
   * Check if tomorrow's race exists
   */
  async tomorrowRaceExists(): Promise<boolean> {
    const tomorrow = getDateString(getTomorrowUTC());
    const result = await pool.query(
      'SELECT 1 FROM betting_races WHERE race_date = $1',
      [tomorrow]
    );
    return result.rows.length > 0;
  },

  /**
   * Check if today's race exists
   */
  async todayRaceExists(): Promise<boolean> {
    const today = getDateString(getTodayUTC());
    const result = await pool.query(
      'SELECT 1 FROM betting_races WHERE race_date = $1',
      [today]
    );
    return result.rows.length > 0;
  },

  /**
   * Get race that needs to be started (today's race with 'upcoming' status)
   */
  async getRaceToStart(): Promise<RaceWithCoins | null> {
    const today = getDateString(getTodayUTC());
    const race = await this.getRaceByDate(today);
    
    if (race && race.status === 'upcoming') {
      return race;
    }
    return null;
  },

  /**
   * Get race that needs to be settled (yesterday's race with 'racing' status)
   */
  async getRaceToSettle(): Promise<RaceWithCoins | null> {
    const yesterday = getDateString(getYesterdayUTC());
    const race = await this.getRaceByDate(yesterday);
    
    if (race && race.status === 'racing') {
      return race;
    }
    return null;
  },
};
