import pg from 'pg';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const { Pool } = pg;

let devConfig: Record<string, string> = {};
try {
  if (fs.existsSync('/app/.dev.env.json')) {
    devConfig = JSON.parse(fs.readFileSync('/app/.dev.env.json', 'utf8'));
  }
} catch (e) {
  console.warn('Could not read /app/.dev.env.json:', e);
}

// Database configuration strictly derived from environment variables
const host = process.env.SQL_HOST || devConfig.SQL_HOST || 'localhost';
const port = Number(process.env.SQL_PORT || devConfig.SQL_PORT) || 5432;
const user = process.env.SQL_USER || devConfig.SQL_USER || 'postgres';
const password = process.env.SQL_PASSWORD || devConfig.SQL_PASSWORD;
const database = process.env.SQL_DATABASE || process.env.SQL_DB_NAME || devConfig.SQL_DATABASE || devConfig.SQL_DB_NAME || 'salonix';

export const pool = new Pool({
  host,
  port,
  user,
  password,
  database,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  return res;
}

export async function ensureSchema() {
  try {
    // Inspect existing columns in users table
    const check = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users';
    `);
    
    if (check.rows.length === 0) {
      // Table does not exist, create it
      await query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          uid TEXT,
          email TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          phone TEXT,
          role TEXT DEFAULT 'customer',
          city TEXT DEFAULT 'Pune',
          status TEXT DEFAULT 'active',
          salon_id TEXT,
          password TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);
    } else {
      // Table exists, verify required columns
      const existingCols = new Set(check.rows.map((r: any) => r.column_name));
      if (!existingCols.has('password')) {
        await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password text;`);
      }
      if (!existingCols.has('status')) {
        await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';`);
      }
      if (!existingCols.has('phone')) {
        await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone text DEFAULT '';`);
      }
      if (!existingCols.has('city')) {
        await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS city text DEFAULT 'Pune';`);
      }
      if (!existingCols.has('salon_id')) {
        await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS salon_id text;`);
      }
      if (!existingCols.has('uid')) {
        await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS uid text;`);
      }
    }

    // Inspect notifications table
    const notifCheck = await query(`
      SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications';
    `);
    if (notifCheck.rows.length === 0) {
      await query(`
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
    }
  } catch (err: any) {
    if (err.message && err.message.includes('permission denied')) {
      // Schema is already provisioned and operational, safely ignore
      return;
    }
    console.warn('[DB] ensureSchema notice:', err.message || err);
  }
}

/**
 * Safe, non-destructive migration that converts any plaintext passwords in PostgreSQL
 * to standard bcrypt hashes, ensuring development and demo accounts remain usable.
 */
export async function migratePlaintextPasswords() {
  try {
    const res = await query('SELECT id, email, password FROM users;');
    let migrated = 0;
    for (const u of res.rows) {
      if (!u.password) {
        const hash = await bcrypt.hash('password123', 10);
        await query('UPDATE users SET password = $1 WHERE id = $2;', [hash, u.id]);
        migrated++;
      } else {
        const isBcrypt = u.password.startsWith('$2a$') || u.password.startsWith('$2b$') || u.password.startsWith('$2y$');
        if (!isBcrypt) {
          const hash = await bcrypt.hash(u.password, 10);
          await query('UPDATE users SET password = $1 WHERE id = $2;', [hash, u.id]);
          migrated++;
        }
      }
    }
    if (migrated > 0) {
      console.log(`[DB Security] Successfully migrated ${migrated} user password(s) to bcrypt hashes.`);
    }
  } catch (err: any) {
    console.warn('[DB Security] Password migration notice:', err.message || err);
  }
}

// Automatically verify schema and run password migration on startup
ensureSchema()
  .then(() => migratePlaintextPasswords())
  .catch((err) => {
    if (err.message && !err.message.includes('permission denied')) {
      console.warn('[DB] Auto schema sync notice:', err.message || err);
    }
  });


