import pool from '../db/connection';
import { RACE_COINS, fetchCoinPrices } from '../services/cryptoService';

async function resetRaces() {
  const client = await pool.connect();

  try {
    console.log('🔄 Resetting races with fixed 4 memecoins...\n');

    await client.query('BEGIN');

    // 1. Refund all pending bets
    console.log('1. Refunding pending bets...');
    const pendingBets = await client.query(
      `SELECT user_id, stake FROM betting_bets WHERE status = 'pending'`
    );

    for (const bet of pendingBets.rows) {
      await client.query(
        'UPDATE users SET total_points = total_points + $1 WHERE id = $2',
        [bet.stake, bet.user_id]
      );
    }
    console.log(`   Refunded ${pendingBets.rows.length} bets`);

    // 2. Delete all bets
    console.log('2. Deleting all bets...');
    await client.query('DELETE FROM betting_bets');

    // 3. Delete all race coins
    console.log('3. Deleting all race coins...');
    await client.query('DELETE FROM betting_race_coins');

    // 4. Delete all races
    console.log('4. Deleting all races...');
    await client.query('DELETE FROM betting_races');

    await client.query('COMMIT');
    console.log('\n✅ Old data cleared!\n');

    // 5. Fetch current prices for the fixed coins
    console.log('5. Fetching live prices from DEXScreener...');
    const coinIds = RACE_COINS.map(c => c.id);
    const prices = await fetchCoinPrices(coinIds);

    console.log('   Prices:', Object.entries(prices).map(([k, v]) => `${k}=$${v}`).join(', '));

    // Create today's race (racing status)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    console.log(`\n6. Creating today's race (${todayStr})...`);
    const todayRace = await client.query(
      `INSERT INTO betting_races (race_date, status) VALUES ($1, 'racing') RETURNING *`,
      [todayStr]
    );

    // Insert all 4 coins for today with images
    for (const coin of RACE_COINS) {
      const startPrice = prices[coin.id] || 0;
      await client.query(
        `INSERT INTO betting_race_coins (race_id, coin_id, coin_name, coin_symbol, coin_image, start_price)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [todayRace.rows[0].id, coin.id, coin.name, coin.symbol, coin.image, startPrice]
      );
    }
    console.log('   ✅ Today\'s race created with coins:', RACE_COINS.map(c => c.symbol).join(', '));

    // Create tomorrow's race (upcoming status for betting)
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    console.log(`\n7. Creating tomorrow's race (${tomorrowStr})...`);
    const tomorrowRace = await client.query(
      `INSERT INTO betting_races (race_date, status) VALUES ($1, 'upcoming') RETURNING *`,
      [tomorrowStr]
    );

    // Insert all 4 coins for tomorrow (same coins, no start price yet)
    for (const coin of RACE_COINS) {
      await client.query(
        `INSERT INTO betting_race_coins (race_id, coin_id, coin_name, coin_symbol, coin_image)
         VALUES ($1, $2, $3, $4, $5)`,
        [tomorrowRace.rows[0].id, coin.id, coin.name, coin.symbol, coin.image]
      );
    }
    console.log('   ✅ Tomorrow\'s race created');

    console.log('\n🎉 Reset complete! Fixed coins: PEPE, SHIB, BONK, TRUMP');
    console.log('   Refresh your browser to see the new races with live prices.\n');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

resetRaces();
