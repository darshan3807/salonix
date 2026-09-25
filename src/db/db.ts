import pg from 'pg';
import fs from 'fs';

const { Pool } = pg;

let devConfig: Record<string, string> = {};
try {
  if (fs.existsSync('/app/.dev.env.json')) {
    devConfig = JSON.parse(fs.readFileSync('/app/.dev.env.json', 'utf8'));
  }
} catch (e) {
  console.warn('Could not read /app/.dev.env.json:', e);
}

export const pool = new Pool({
  host: process.env.SQL_HOST || devConfig.SQL_HOST || '/app/cloudsql/inductive-sorter-57krv:asia-southeast1:ai-studio-ed584842',
  user: process.env.SQL_USER || devConfig.SQL_USER || 'ai_studio_app_user',
  password: process.env.SQL_PASSWORD || devConfig.SQL_PASSWORD || '/5I]yWp&s;#pJ^L(',
  database: process.env.SQL_DB_NAME || devConfig.SQL_DB_NAME || 'cloud_sql_development_database',
  port: 5432,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  // silent log
  return res;
}

export async function ensureSchema() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        uid TEXT,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        phone TEXT,
        role TEXT DEFAULT 'customer',
        city TEXT DEFAULT 'Pune',
        status TEXT DEFAULT 'pending',
        salon_id TEXT,
        password TEXT DEFAULT 'password123',
        created_at TIMESTAMP DEFAULT NOW()
      );
      ALTER TABLE users ADD COLUMN IF NOT EXISTS password text DEFAULT 'password123';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS role text DEFAULT 'customer';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS city text DEFAULT 'Pune';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS phone text DEFAULT '';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS salon_id text;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS uid text;

      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        target_role TEXT,
        target_user_id TEXT,
        target_salon_id TEXT,
        title TEXT,
        message TEXT,
        type TEXT,
        read BOOLEAN DEFAULT FALSE,
        action_route TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('[DB] Database schema verified & synchronized.');
  } catch (err) {
    console.warn('[DB] ensureSchema notice:', err);
  }
}

// Automatically verify schema on initialization
ensureSchema().catch((err) => console.warn('[DB] Auto schema sync notice:', err));

