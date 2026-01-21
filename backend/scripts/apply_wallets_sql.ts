import pool from '../src/db/connection';

const applyWalletsSQL = async () => {
  try {
    console.log('Applying wallets table SQL to Supabase...');

    // Create wallets table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS wallets (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(4) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Created wallets table');

    // Create index
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
    `);
    console.log('✅ Created index on wallets.user_id');

    // Enable RLS (if not already enabled)
    try {
      await pool.query(`ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;`);
      console.log('✅ Enabled Row Level Security');
    } catch (err: any) {
      if (err.message.includes('already enabled')) {
        console.log('ℹ️  RLS already enabled');
      } else {
        throw err;
      }
    }

    // Drop existing policies if they exist (to avoid conflicts)
    await pool.query(`
      DROP POLICY IF EXISTS "Users can read their own wallets" ON wallets;
      DROP POLICY IF EXISTS "Users can insert their own wallets" ON wallets;
      DROP POLICY IF EXISTS "Users can update their own wallets" ON wallets;
      DROP POLICY IF EXISTS "Users can delete their own wallets" ON wallets;
    `);

    // Create RLS policies
    await pool.query(`
      CREATE POLICY "Users can read their own wallets" ON wallets
        FOR SELECT USING (auth.uid() = user_id);
    `);
    console.log('✅ Created SELECT policy');

    await pool.query(`
      CREATE POLICY "Users can insert their own wallets" ON wallets
        FOR INSERT WITH CHECK (auth.uid() = user_id);
    `);
    console.log('✅ Created INSERT policy');

    await pool.query(`
      CREATE POLICY "Users can update their own wallets" ON wallets
        FOR UPDATE USING (auth.uid() = user_id);
    `);
    console.log('✅ Created UPDATE policy');

    await pool.query(`
      CREATE POLICY "Users can delete their own wallets" ON wallets
        FOR DELETE USING (auth.uid() = user_id);
    `);
    console.log('✅ Created DELETE policy');

    console.log('\n✅ Successfully applied wallets table SQL to Supabase!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error applying SQL:', error);
    process.exit(1);
  }
};

applyWalletsSQL();

