import fs from 'fs';
import bcrypt from 'bcryptjs';
import pg from 'pg';
import mysql from 'mysql2/promise';

let devConfig: Record<string, string> = {};
try {
  if (fs.existsSync('/app/.dev.env.json')) {
    devConfig = JSON.parse(fs.readFileSync('/app/.dev.env.json', 'utf8'));
  }
} catch {
  // Silent fallback
}

// Determine database driver: 'mysql' (MariaDB / MySQL / phpMyAdmin / XAMPP) or 'postgres' (PostgreSQL / Cloud SQL)
const rawDriver = process.env.DB_DRIVER || (process.env.SQL_PORT === '3306' ? 'mysql' : '');
export const isMySQL =
  rawDriver.toLowerCase() === 'mysql' ||
  rawDriver.toLowerCase() === 'mariadb' ||
  (!process.env.SQL_HOST && !devConfig.SQL_HOST && !process.env.DATABASE_URL);

const host = process.env.SQL_HOST || devConfig.SQL_HOST || 'localhost';
const port = Number(process.env.SQL_PORT || devConfig.SQL_PORT) || (isMySQL ? 3306 : 5432);
const user = process.env.SQL_USER || devConfig.SQL_USER || (isMySQL ? 'root' : 'postgres');
const password =
  process.env.SQL_PASSWORD !== undefined
    ? process.env.SQL_PASSWORD
    : devConfig.SQL_PASSWORD || '';
const database =
  process.env.SQL_DATABASE ||
  process.env.SQL_DB_NAME ||
  devConfig.SQL_DATABASE ||
  devConfig.SQL_DB_NAME ||
  'salonix';

// Create connection pools for PostgreSQL or MySQL/MariaDB
let pgPool: pg.Pool | null = null;
let mysqlPool: mysql.Pool | null = null;

if (isMySQL) {
  mysqlPool = mysql.createPool({
    host,
    port,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
  });
  console.log(`[DB] Connected with MySQL / MariaDB driver on ${host}:${port}/${database}`);
} else {
  const { Pool } = pg;
  pgPool = new Pool({
    host,
    port,
    user,
    password,
    database,
    max: 10,
    idleTimeoutMillis: 15000,
    connectionTimeoutMillis: 15000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
  });
  pgPool.on('error', (err: any) => {
    const msg = String(err?.message || '');
    const isTransientIdleDrop =
      msg.includes('Connection terminated unexpectedly') ||
      msg.includes('ECONNRESET') ||
      msg.includes('EPIPE') ||
      err?.code === '57P01';
    if (isTransientIdleDrop) {
      // Cloud SQL scale-to-zero closes idle sockets; pg.Pool automatically replaces the client on next query.
      console.warn('[DB] Idle PostgreSQL connection closed by server; pool will reconnect on next query.');
      return;
    }
    console.error('[DB] Unexpected PostgreSQL pool error:', msg);
  });
  console.log(`[DB] Connected with PostgreSQL driver on ${host}:${port}/${database}`);
}

export const pool = isMySQL ? (mysqlPool as any) : (pgPool as any);

export interface QueryResult {
  rows: any[];
  rowCount: number;
  insertId?: number;
}

export interface DbClient {
  query: (text: string, params?: any[]) => Promise<QueryResult>;
  release: () => void;
}

/**
 * Safely returns non-sensitive database metadata for admin overview & diagnostics.
 */
export function getDbConfigInfo() {
  return {
    engine: isMySQL ? 'MariaDB / MySQL' : 'PostgreSQL',
    driver: isMySQL ? 'mysql2/promise' : 'pg (node-postgres)',
    database,
    connectionTarget: host.startsWith('/') ? 'Cloud SQL Unix Socket' : `${host}:${port}`,
    isMySQL,
  };
}

/**
 * Detects transaction control statements that MUST NOT be sent through
 * MariaDB/MySQL prepared statement protocol (COM_STMT_PREPARE).
 */
export function detectTransactionCommand(sql: string): 'BEGIN' | 'COMMIT' | 'ROLLBACK' | null {
  const trimmed = sql.trim().replace(/;+$/, '').trim().toUpperCase();
  if (trimmed === 'BEGIN' || trimmed === 'START TRANSACTION') return 'BEGIN';
  if (trimmed === 'COMMIT') return 'COMMIT';
  if (trimmed === 'ROLLBACK') return 'ROLLBACK';
  return null;
}

/**
 * Converts PostgreSQL-style parameterized SQL ($1, $2, ...) to MySQL/MariaDB (?, ?, ...):
 * - Expands repeated or out-of-order positional placeholders accurately into ordered values
 * - Strips PostgreSQL-only type casts (e.g. ::timestamptz)
 * - Translates FOR SHARE -> LOCK IN SHARE MODE
 * - Quotes MySQL/MariaDB reserved keyword `read` on notifications table queries
 */
export function convertPgToMySQL(
  text: string,
  params: any[] = []
): { sql: string; values: any[] } {
  const values: any[] = [];
  let sql = text.replace(/\$(\d+)/g, (_match, numStr) => {
    const idx = Number(numStr) - 1;
    values.push(params[idx] === undefined ? null : params[idx]);
    return '?';
  });

  // Remove PostgreSQL-only explicit casts (e.g. $1::timestamptz)
  sql = sql.replace(/::[a-zA-Z0-9_]+/g, '');

  // Convert PostgreSQL row share lock to MariaDB/MySQL compatible syntax
  sql = sql.replace(/\bFOR\s+SHARE\b/gi, 'LOCK IN SHARE MODE');

  // Safely quote `read` column in notifications table (reserved keyword in MariaDB/MySQL)
  if (/\bnotifications\b/i.test(sql)) {
    sql = sql
      .replace(/(\(\s*[^)]*?,\s*)read(\s*,|\s*\))/gi, '$1`read`$2')
      .replace(/(\bSET\s+)read(\s*=)/gi, '$1`read`$2')
      .replace(/(\bWHERE\s+|\bAND\s+|\bOR\s+)read(\s*=)/gi, '$1`read`$2');
  }

  return { sql, values };
}

function isTransientConnectionError(err: any): boolean {
  const msg = String(err?.message || '');
  return (
    msg.includes('Connection terminated unexpectedly') ||
    msg.includes('ECONNRESET') ||
    msg.includes('EPIPE') ||
    err?.code === '57P01' ||
    err?.code === '57P03'
  );
}

/**
 * Universal parameterized query runner supporting both PostgreSQL and MariaDB/MySQL.
 */
export async function query(text: string, params?: any[]): Promise<QueryResult> {
  if (isMySQL && mysqlPool) {
    const txCmd = detectTransactionCommand(text);
    if (txCmd) {
      await mysqlPool.query(txCmd);
      return { rows: [], rowCount: 0 };
    }

    const { sql, values } = convertPgToMySQL(text, params || []);
    const [rows] = await mysqlPool.execute(sql, values);
    const rowList = Array.isArray(rows) ? (rows as any[]) : [];
    const meta = rows as any;
    return {
      rows: rowList,
      rowCount: Array.isArray(rows) ? rowList.length : meta?.affectedRows || 0,
      insertId: meta?.insertId,
    };
  } else if (pgPool) {
    const isReadOnlySelect =
      /^\s*SELECT\b/i.test(text) && !/\bFOR\s+(UPDATE|SHARE)\b/i.test(text);
    try {
      const res = await pgPool.query(text, params);
      return {
        rows: res.rows,
        rowCount: res.rowCount || 0,
      };
    } catch (err: any) {
      if (isReadOnlySelect && isTransientConnectionError(err)) {
        // Safe retry strictly for read-only SELECT queries after idle server disconnect (never retries writes)
        const retryRes = await pgPool.query(text, params);
        return {
          rows: retryRes.rows,
          rowCount: retryRes.rowCount || 0,
        };
      }
      throw err;
    }
  }

  throw new Error('Database pool is not initialized');
}

/**
 * Acquire a dedicated connection client supporting ACID transactions for both MariaDB/MySQL and PostgreSQL.
 * On MariaDB/MySQL, BEGIN/COMMIT/ROLLBACK execute via native transaction methods (never prepared statements).
 */
export async function getClient(): Promise<DbClient> {
  if (isMySQL && mysqlPool) {
    const conn = await mysqlPool.getConnection();
    return {
      query: async (text: string, params?: any[]) => {
        const txCmd = detectTransactionCommand(text);
        if (txCmd === 'BEGIN') {
          await conn.beginTransaction();
          return { rows: [], rowCount: 0 };
        }
        if (txCmd === 'COMMIT') {
          await conn.commit();
          return { rows: [], rowCount: 0 };
        }
        if (txCmd === 'ROLLBACK') {
          await conn.rollback();
          return { rows: [], rowCount: 0 };
        }

        const { sql, values } = convertPgToMySQL(text, params || []);
        const [rows] = await conn.execute(sql, values);
        const rowList = Array.isArray(rows) ? (rows as any[]) : [];
        const meta = rows as any;
        return {
          rows: rowList,
          rowCount: Array.isArray(rows) ? rowList.length : meta?.affectedRows || 0,
          insertId: meta?.insertId,
        };
      },
      release: () => {
        conn.release();
      },
    };
  } else if (pgPool) {
    const client = await pgPool.connect();
    return {
      query: async (text: string, params?: any[]) => {
        const res = await client.query(text, params);
        return {
          rows: res.rows,
          rowCount: res.rowCount || 0,
        };
      },
      release: () => {
        client.release();
      },
    };
  }

  throw new Error('Database pool is not initialized');
}

let schemaInitPromise: Promise<void> | null = null;

/**
 * Verifies or bootstraps tables for both MySQL/MariaDB (phpMyAdmin) and PostgreSQL.
 * Never drops, resets, or deletes existing data.
 */
export async function ensureSchema(): Promise<void> {
  if (schemaInitPromise) return schemaInitPromise;
  schemaInitPromise = runEnsureSchema();
  return schemaInitPromise;
}

async function ensureMySQLColumn(table: string, column: string, definition: string) {
  if (!mysqlPool) return;
  const [cols] = await mysqlPool.query(
    `SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
    [table, column]
  );
  if (Array.isArray(cols) && cols.length === 0) {
    await mysqlPool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
  }
}

async function runEnsureSchema(): Promise<void> {
  try {
    if (isMySQL && mysqlPool) {
      await mysqlPool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          uid VARCHAR(128) DEFAULT NULL,
          email VARCHAR(255) NOT NULL UNIQUE,
          name VARCHAR(255) NOT NULL,
          phone VARCHAR(64) DEFAULT '',
          role VARCHAR(32) DEFAULT 'customer',
          city VARCHAR(128) DEFAULT 'Pune',
          status VARCHAR(32) DEFAULT 'active',
          salon_id VARCHAR(128) DEFAULT NULL,
          password TEXT DEFAULT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          INDEX (email),
          INDEX (role)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await mysqlPool.query(`
        CREATE TABLE IF NOT EXISTS categories (
          id VARCHAR(128) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT DEFAULT NULL,
          icon_name VARCHAR(64) DEFAULT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await mysqlPool.query(`
        CREATE TABLE IF NOT EXISTS salons (
          id VARCHAR(128) PRIMARY KEY,
          owner_id VARCHAR(128) DEFAULT NULL,
          owner_name VARCHAR(255) DEFAULT NULL,
          name VARCHAR(255) NOT NULL,
          tagline VARCHAR(255) DEFAULT NULL,
          description TEXT DEFAULT NULL,
          about TEXT DEFAULT NULL,
          address TEXT DEFAULT NULL,
          city VARCHAR(128) DEFAULT NULL,
          state VARCHAR(128) DEFAULT NULL,
          pincode VARCHAR(32) DEFAULT NULL,
          phone VARCHAR(64) DEFAULT NULL,
          email VARCHAR(255) DEFAULT NULL,
          opening_time VARCHAR(16) DEFAULT NULL,
          closing_time VARCHAR(16) DEFAULT NULL,
          slot_duration_minutes INT DEFAULT 30,
          break_start_time VARCHAR(16) DEFAULT NULL,
          break_end_time VARCHAR(16) DEFAULT NULL,
          working_days TEXT DEFAULT NULL,
          rating FLOAT DEFAULT 0,
          review_count INT DEFAULT 0,
          starting_price INT DEFAULT 0,
          featured TINYINT(1) DEFAULT 0,
          status VARCHAR(32) DEFAULT 'active',
          accent_color VARCHAR(32) DEFAULT '#b45309',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          INDEX (city),
          INDEX (owner_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await mysqlPool.query(`
        CREATE TABLE IF NOT EXISTS services (
          id VARCHAR(128) PRIMARY KEY,
          salon_id VARCHAR(128) NOT NULL,
          category_id VARCHAR(128) DEFAULT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT DEFAULT NULL,
          price INT NOT NULL DEFAULT 0,
          duration INT NOT NULL DEFAULT 30,
          status VARCHAR(32) DEFAULT 'active',
          INDEX (salon_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await mysqlPool.query(`
        CREATE TABLE IF NOT EXISTS appointments (
          id VARCHAR(128) PRIMARY KEY,
          customer_id VARCHAR(128) NOT NULL,
          customer_name VARCHAR(255) NOT NULL,
          customer_phone VARCHAR(64) DEFAULT NULL,
          customer_email VARCHAR(255) DEFAULT NULL,
          salon_id VARCHAR(128) NOT NULL,
          salon_name VARCHAR(255) DEFAULT NULL,
          salon_city VARCHAR(128) DEFAULT NULL,
          salon_address TEXT DEFAULT NULL,
          service_id VARCHAR(128) NOT NULL,
          service_name VARCHAR(255) DEFAULT NULL,
          date VARCHAR(32) NOT NULL,
          start_time VARCHAR(16) NOT NULL,
          end_time VARCHAR(16) NOT NULL,
          duration_minutes INT NOT NULL DEFAULT 30,
          price INT NOT NULL DEFAULT 0,
          status VARCHAR(32) NOT NULL DEFAULT 'pending',
          notes TEXT DEFAULT NULL,
          rejection_reason TEXT DEFAULT NULL,
          cancellation_reason TEXT DEFAULT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          INDEX (customer_id),
          INDEX (salon_id),
          INDEX (date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await mysqlPool.query(`
        CREATE TABLE IF NOT EXISTS notifications (
          id VARCHAR(128) PRIMARY KEY,
          target_role VARCHAR(32) DEFAULT NULL,
          target_user_id VARCHAR(128) DEFAULT NULL,
          target_salon_id VARCHAR(128) DEFAULT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          type VARCHAR(64) DEFAULT 'general',
          \`read\` TINYINT(1) DEFAULT 0,
          action_route VARCHAR(255) DEFAULT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          INDEX (target_user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await mysqlPool.query(`
        CREATE TABLE IF NOT EXISTS favorites (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id VARCHAR(128) NOT NULL,
          salon_id VARCHAR(128) NOT NULL,
          UNIQUE KEY uniq_user_salon (user_id, salon_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // Non-destructively ensure critical columns exist on pre-existing phpMyAdmin imports
      await ensureMySQLColumn('users', 'uid', 'VARCHAR(128) DEFAULT NULL');
      await ensureMySQLColumn('users', 'password', 'TEXT DEFAULT NULL');
      await ensureMySQLColumn('users', 'status', "VARCHAR(32) DEFAULT 'active'");
      await ensureMySQLColumn('users', 'phone', "VARCHAR(64) DEFAULT ''");
      await ensureMySQLColumn('users', 'city', "VARCHAR(128) DEFAULT 'Pune'");
      await ensureMySQLColumn('users', 'salon_id', 'VARCHAR(128) DEFAULT NULL');
      await ensureMySQLColumn('salons', 'break_start_time', 'VARCHAR(16) DEFAULT NULL');
      await ensureMySQLColumn('salons', 'break_end_time', 'VARCHAR(16) DEFAULT NULL');
      await ensureMySQLColumn('salons', 'working_days', 'TEXT DEFAULT NULL');
      await ensureMySQLColumn('salons', 'slot_duration_minutes', 'INT DEFAULT 30');
      await ensureMySQLColumn('appointments', 'rejection_reason', 'TEXT DEFAULT NULL');
      await ensureMySQLColumn('appointments', 'cancellation_reason', 'TEXT DEFAULT NULL');
      await ensureMySQLColumn('appointments', 'duration_minutes', 'INT NOT NULL DEFAULT 30');

      return;
    }

    // PostgreSQL path
    const check = await query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users';
    `);

    if (check.rows.length === 0) {
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
      return;
    }
    console.warn('[DB] ensureSchema notice:', err.message || err);
  }
}

/**
 * Migration converting any plaintext passwords to standard bcrypt hashes.
 */
export async function migratePlaintextPasswords() {
  try {
    const res = await query('SELECT id, email, password FROM users');
    let migrated = 0;
    for (const u of res.rows) {
      if (!u.password) {
        const hash = await bcrypt.hash('password123', 10);
        await query('UPDATE users SET password = $1 WHERE id = $2', [hash, u.id]);
        migrated++;
      } else {
        const isBcrypt =
          u.password.startsWith('$2a$') ||
          u.password.startsWith('$2b$') ||
          u.password.startsWith('$2y$');
        if (!isBcrypt) {
          const hash = await bcrypt.hash(u.password, 10);
          await query('UPDATE users SET password = $1 WHERE id = $2', [hash, u.id]);
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
