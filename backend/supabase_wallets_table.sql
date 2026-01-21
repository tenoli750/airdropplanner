-- Create wallets table for Supabase
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/YOUR_PROJECT/sql

CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(4) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own wallets
CREATE POLICY "Users can read their own wallets" ON wallets
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own wallets
CREATE POLICY "Users can insert their own wallets" ON wallets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own wallets
CREATE POLICY "Users can update their own wallets" ON wallets
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own wallets
CREATE POLICY "Users can delete their own wallets" ON wallets
  FOR DELETE USING (auth.uid() = user_id);


-- Create task_wallets junction table
CREATE TABLE IF NOT EXISTS task_wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(task_id, wallet_id, user_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_task_wallets_task_id ON task_wallets(task_id);
CREATE INDEX IF NOT EXISTS idx_task_wallets_wallet_id ON task_wallets(wallet_id);
CREATE INDEX IF NOT EXISTS idx_task_wallets_user_id ON task_wallets(user_id);

-- Enable Row Level Security
ALTER TABLE task_wallets ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own task_wallets
CREATE POLICY "Users can read their own task_wallets" ON task_wallets
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own task_wallets
CREATE POLICY "Users can insert their own task_wallets" ON task_wallets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own task_wallets
CREATE POLICY "Users can delete their own task_wallets" ON task_wallets
  FOR DELETE USING (auth.uid() = user_id);
