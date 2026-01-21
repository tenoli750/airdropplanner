import { Pool } from 'pg';
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import * as dns from 'dns';

// Load .env file only if it exists (won't override existing env vars)
dotenv.config();

// Validate DATABASE_URL is set
const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('❌ DATABASE_URL environment variable is not set!');
  console.error('   Please set DATABASE_URL in your environment variables or .env file');
  throw new Error('DATABASE_URL is required');
}

// Force IPv4 DNS resolution to avoid ENETUNREACH errors on Railway
// Railway's network doesn't support IPv6, so we need to prefer IPv4
// Use setDefaultResultOrder to make DNS lookups prefer IPv4 (Node.js 17+)
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
  console.log('DNS resolution set to prefer IPv4');
} else {
  console.warn('⚠️  Node.js version does not support setDefaultResultOrder, may encounter IPv6 issues on Railway');
}

// Use original connection string - DNS resolution will prefer IPv4 due to setDefaultResultOrder above
const resolvedDbUrl = dbUrl;

// Check if using Supabase (connection string contains 'supabase' or 'pooler.supabase')
const isSupabase = dbUrl.includes('supabase') || 
                   dbUrl.includes('pooler.supabase') ||
                   dbUrl.includes('dfwcemqhritblsvoicem');

const isProduction = process.env.NODE_ENV === 'production';

console.log(`Database URL detected: ${dbUrl.substring(0, 50)}... (Supabase: ${isSupabase}, Production: ${isProduction})`);

// Parse connection string and configure SSL for Supabase
// Use resolved URL (IPv4) instead of original to avoid IPv6 issues
const poolConfig: any = {
  connectionString: resolvedDbUrl,
};

if (isSupabase) {
  if (isProduction) {
    // Production: Use proper SSL certificate verification
    const certPath = process.env.SUPABASE_SSL_CERT_PATH || path.join(__dirname, '../../supabase-ca-cert.crt');
    
    if (fs.existsSync(certPath)) {
      // Use Supabase CA certificate for verification
      poolConfig.ssl = {
        rejectUnauthorized: true,
        ca: fs.readFileSync(certPath).toString(),
      };
      console.log(`Supabase SSL configured for production: Using CA certificate from ${certPath}`);
    } else {
      // Check if NODE_TLS_REJECT_UNAUTHORIZED is set to '0' (allow self-signed certs)
      const tlsRejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
      const allowSelfSigned = tlsRejectUnauthorized === '0' || tlsRejectUnauthorized === 'false';
      
      if (allowSelfSigned) {
        // Fallback: Allow self-signed certificates if explicitly configured
        poolConfig.ssl = {
          rejectUnauthorized: false,
        };
        console.warn(`⚠️  Supabase CA certificate not found at ${certPath}`);
        console.warn('   NODE_TLS_REJECT_UNAUTHORIZED=0 is set, allowing self-signed certificates');
        console.warn('   For better security, download the certificate from:');
        console.warn('   https://supabase.com/dashboard/project/dfwcemqhritblsvoicem/settings/database');
        console.warn('   And set SUPABASE_SSL_CERT_PATH environment variable.');
      } else {
        // Try system CA certificates (works if Supabase cert is in system trust store)
        poolConfig.ssl = {
          rejectUnauthorized: true,
        };
        console.warn(`⚠️  Supabase CA certificate not found at ${certPath}`);
        console.warn('   Using system CA certificates. For better security, download the certificate from:');
        console.warn('   https://supabase.com/dashboard/project/dfwcemqhritblsvoicem/settings/database');
        console.warn('   Or set NODE_TLS_REJECT_UNAUTHORIZED=0 to allow self-signed certificates.');
      }
    }
  } else {
    // Development: Allow self-signed certificates
    poolConfig.ssl = {
      rejectUnauthorized: false,
    };
    console.log('Supabase SSL configured for development: rejectUnauthorized=false');
    
    // Also set Node.js TLS option for development
    if (!process.env.NODE_TLS_REJECT_UNAUTHORIZED) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }
  }
}

const pool = new Pool(poolConfig);

pool.on('connect', () => {
  console.log(`Connected to ${isSupabase ? 'Supabase' : 'PostgreSQL'} database`);
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export const initializeDatabase = async (): Promise<void> => {
  // Skip schema initialization for Supabase (tables managed via migrations)
  if (isSupabase) {
    console.log('Using Supabase - schema managed via Supabase migrations');
    // Just verify connection works
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      console.log('Supabase connection verified');
    } finally {
      client.release();
    }
    return;
  }

  // Local development: create tables if not exists
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

      CREATE TABLE IF NOT EXISTS articles (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        project_name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'one-time')),
        link_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        is_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS telegram_links (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        telegram_id BIGINT UNIQUE NOT NULL,
        telegram_username VARCHAR(100),
        linked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS telegram_link_codes (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        code VARCHAR(6) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS user_plans (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed BOOLEAN DEFAULT FALSE,
        completed_at TIMESTAMP,
        cost NUMERIC(10, 2),
        UNIQUE(user_id, task_id)
      );

      -- Betting system tables
      CREATE TABLE IF NOT EXISTS betting_races (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        race_date DATE UNIQUE NOT NULL,
        status VARCHAR(20) DEFAULT 'betting' CHECK (status IN ('betting', 'racing', 'completed')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS betting_race_coins (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        race_id UUID NOT NULL REFERENCES betting_races(id) ON DELETE CASCADE,
        coin_id VARCHAR(100) NOT NULL,
        coin_name VARCHAR(100) NOT NULL,
        coin_symbol VARCHAR(20) NOT NULL,
        coin_image VARCHAR(500),
        start_price NUMERIC(20, 8),
        end_price NUMERIC(20, 8),
        percent_change NUMERIC(10, 4),
        is_winner BOOLEAN DEFAULT FALSE
      );

      CREATE TABLE IF NOT EXISTS betting_bets (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        race_id UUID NOT NULL REFERENCES betting_races(id) ON DELETE CASCADE,
        coin_id VARCHAR(100) NOT NULL,
        stake INTEGER NOT NULL CHECK (stake > 0 AND stake <= 1000),
        payout INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'won', 'lost')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, race_id)
      );

      CREATE TABLE IF NOT EXISTS blog_posts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title VARCHAR(500) NOT NULL,
        content TEXT NOT NULL,
        image_url TEXT,
        author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS wallets (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(4) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_article_id ON tasks(article_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_frequency ON tasks(frequency);
      CREATE INDEX IF NOT EXISTS idx_user_plans_user_id ON user_plans(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_plans_task_id ON user_plans(task_id);
      CREATE INDEX IF NOT EXISTS idx_telegram_links_telegram_id ON telegram_links(telegram_id);
      CREATE INDEX IF NOT EXISTS idx_telegram_link_codes_code ON telegram_link_codes(code);
      CREATE INDEX IF NOT EXISTS idx_betting_races_date ON betting_races(race_date);
      CREATE INDEX IF NOT EXISTS idx_betting_race_coins_race_id ON betting_race_coins(race_id);
      CREATE INDEX IF NOT EXISTS idx_betting_bets_user_id ON betting_bets(user_id);
      CREATE INDEX IF NOT EXISTS idx_betting_bets_race_id ON betting_bets(race_id);
      CREATE INDEX IF NOT EXISTS idx_blog_posts_author_id ON blog_posts(author_id);
      CREATE INDEX IF NOT EXISTS idx_blog_posts_created_at ON blog_posts(created_at DESC);
    `);
    console.log('Database schema initialized successfully');
  } catch (error) {
    console.error('Error initializing database schema:', error);
    throw error;
  } finally {
    client.release();
  }
};

export default pool;
