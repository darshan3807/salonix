import 'dotenv/config';
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

// Determine database driver: 'mysql' / 'mariadb' (XAMPP / phpMyAdmin) or 'postgres' (PostgreSQL / Cloud SQL)
const rawDriver =
  process.env.DB_DRIVER ||
  ((process.env.DB_PORT || process.env.SQL_PORT) === '3306' ? 'mysql' : '');
export const isMySQL =
  rawDriver.toLowerCase() === 'mysql' ||
  rawDriver.toLowerCase() === 'mariadb' ||
  (!process.env.DB_HOST &&
    !process.env.SQL_HOST &&
    !devConfig.SQL_HOST &&
    !process.env.DATABASE_URL);
export const DB_DRIVER = isMySQL ? 'mysql' : 'postgres';

const host =
  process.env.DB_HOST ||
  process.env.SQL_HOST ||
  devConfig.SQL_HOST ||
  (isMySQL ? '127.0.0.1' : 'localhost');
const port =
  Number(process.env.DB_PORT || process.env.SQL_PORT || devConfig.SQL_PORT) ||
  (isMySQL ? 3306 : 5432);
const user =
  process.env.DB_USER ||
  process.env.SQL_USER ||
  devConfig.SQL_USER ||
  (isMySQL ? 'root' : 'postgres');
const password =
  process.env.DB_PASSWORD !== undefined
    ? process.env.DB_PASSWORD
    : process.env.SQL_PASSWORD !== undefined
      ? process.env.SQL_PASSWORD
      : devConfig.SQL_PASSWORD || '';
const database =
  process.env.DB_NAME ||
  process.env.SQL_DATABASE ||
  process.env.SQL_DB_NAME ||
  devConfig.SQL_DATABASE ||
  devConfig.SQL_DB_NAME ||
  (isMySQL ? 'salonix_db' : 'salonix');

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
    // Keep SQL DATE columns as exact 'YYYY-MM-DD' strings and DECIMAL(10,2) columns as JS numbers
    dateStrings: ['DATE'],
    decimalNumbers: true,
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
      const conn = await mysqlPool.getConnection();
      try {
        await conn.query('SET FOREIGN_KEY_CHECKS = 0');

        await conn.query(`
          CREATE TABLE IF NOT EXISTS categories (
            id VARCHAR(128) NOT NULL,
            name VARCHAR(255) NOT NULL,
            description TEXT DEFAULT NULL,
            icon_name VARCHAR(64) DEFAULT NULL,
            PRIMARY KEY (id),
            UNIQUE KEY uq_categories_name (name)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        await conn.query(`
          CREATE TABLE IF NOT EXISTS users (
            id INT NOT NULL AUTO_INCREMENT,
            uid VARCHAR(128) NOT NULL,
            email VARCHAR(255) NOT NULL,
            name VARCHAR(255) NOT NULL,
            phone VARCHAR(64) NOT NULL DEFAULT '',
            role VARCHAR(32) NOT NULL DEFAULT 'customer',
            city VARCHAR(128) NOT NULL DEFAULT 'Pune',
            status VARCHAR(32) NOT NULL DEFAULT 'active',
            salon_id VARCHAR(128) DEFAULT NULL,
            password TEXT NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uq_users_uid (uid),
            UNIQUE KEY uq_users_email (email),
            KEY idx_users_role (role),
            KEY idx_users_city (city),
            KEY idx_users_salon_id (salon_id),
            CONSTRAINT fk_users_salon FOREIGN KEY (salon_id) REFERENCES salons (id)
              ON DELETE SET NULL ON UPDATE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        await conn.query(`
          CREATE TABLE IF NOT EXISTS salons (
            id VARCHAR(128) NOT NULL,
            owner_id VARCHAR(128) DEFAULT NULL,
            owner_name VARCHAR(255) DEFAULT NULL,
            name VARCHAR(255) NOT NULL,
            tagline VARCHAR(255) DEFAULT NULL,
            description TEXT DEFAULT NULL,
            about TEXT DEFAULT NULL,
            address TEXT DEFAULT NULL,
            city VARCHAR(128) NOT NULL DEFAULT 'Pune',
            state VARCHAR(128) DEFAULT NULL,
            pincode VARCHAR(32) DEFAULT NULL,
            phone VARCHAR(64) DEFAULT NULL,
            email VARCHAR(255) DEFAULT NULL,
            opening_time VARCHAR(16) NOT NULL DEFAULT '09:00',
            closing_time VARCHAR(16) NOT NULL DEFAULT '20:00',
            slot_duration_minutes INT NOT NULL DEFAULT 30,
            break_start_time VARCHAR(16) DEFAULT NULL,
            break_end_time VARCHAR(16) DEFAULT NULL,
            working_days JSON DEFAULT NULL,
            rating DECIMAL(3,2) NOT NULL DEFAULT 0.00,
            review_count INT NOT NULL DEFAULT 0,
            starting_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
            featured TINYINT(1) NOT NULL DEFAULT 0,
            status VARCHAR(32) NOT NULL DEFAULT 'active',
            accent_color VARCHAR(32) NOT NULL DEFAULT '#b45309',
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_salons_owner_id (owner_id),
            KEY idx_salons_city_status (city, status),
            KEY idx_salons_featured (featured),
            CONSTRAINT fk_salons_owner FOREIGN KEY (owner_id) REFERENCES users (uid)
              ON DELETE RESTRICT ON UPDATE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        await conn.query(`
          CREATE TABLE IF NOT EXISTS services (
            id VARCHAR(128) NOT NULL,
            salon_id VARCHAR(128) NOT NULL,
            category_id VARCHAR(128) DEFAULT NULL,
            name VARCHAR(255) NOT NULL,
            description TEXT DEFAULT NULL,
            price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
            duration INT NOT NULL DEFAULT 30,
            status VARCHAR(32) NOT NULL DEFAULT 'active',
            PRIMARY KEY (id),
            KEY idx_services_salon_id (salon_id),
            KEY idx_services_category_id (category_id),
            KEY idx_services_status (status),
            CONSTRAINT fk_services_salon FOREIGN KEY (salon_id) REFERENCES salons (id)
              ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT fk_services_category FOREIGN KEY (category_id) REFERENCES categories (id)
              ON DELETE RESTRICT ON UPDATE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        await conn.query(`
          CREATE TABLE IF NOT EXISTS appointments (
            id VARCHAR(128) NOT NULL,
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
            date DATE NOT NULL,
            start_time VARCHAR(16) NOT NULL,
            end_time VARCHAR(16) NOT NULL,
            duration_minutes INT NOT NULL DEFAULT 30,
            price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
            status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
            notes TEXT DEFAULT NULL,
            rejection_reason TEXT DEFAULT NULL,
            cancellation_reason TEXT DEFAULT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_appointments_customer_id (customer_id),
            KEY idx_appointments_salon_date (salon_id, date),
            KEY idx_appointments_service_id (service_id),
            KEY idx_appointments_status (status),
            CONSTRAINT fk_appointments_customer FOREIGN KEY (customer_id) REFERENCES users (uid)
              ON DELETE RESTRICT ON UPDATE CASCADE,
            CONSTRAINT fk_appointments_salon FOREIGN KEY (salon_id) REFERENCES salons (id)
              ON DELETE RESTRICT ON UPDATE CASCADE,
            CONSTRAINT fk_appointments_service FOREIGN KEY (service_id) REFERENCES services (id)
              ON DELETE RESTRICT ON UPDATE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        await conn.query(`
          CREATE TABLE IF NOT EXISTS notifications (
            id VARCHAR(128) NOT NULL,
            target_role VARCHAR(32) DEFAULT NULL,
            target_user_id VARCHAR(128) DEFAULT NULL,
            target_salon_id VARCHAR(128) DEFAULT NULL,
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            type VARCHAR(64) NOT NULL DEFAULT 'general',
            \`read\` TINYINT(1) NOT NULL DEFAULT 0,
            action_route VARCHAR(255) DEFAULT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_notifications_user_read (target_user_id, \`read\`),
            KEY idx_notifications_salon_id (target_salon_id),
            KEY idx_notifications_role (target_role),
            CONSTRAINT fk_notifications_user FOREIGN KEY (target_user_id) REFERENCES users (uid)
              ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT fk_notifications_salon FOREIGN KEY (target_salon_id) REFERENCES salons (id)
              ON DELETE CASCADE ON UPDATE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        await conn.query(`
          CREATE TABLE IF NOT EXISTS favorites (
            id INT NOT NULL AUTO_INCREMENT,
            user_id VARCHAR(128) NOT NULL,
            salon_id VARCHAR(128) NOT NULL,
            PRIMARY KEY (id),
            UNIQUE KEY uq_favorites_user_salon (user_id, salon_id),
            KEY idx_favorites_salon_id (salon_id),
            CONSTRAINT fk_favorites_user FOREIGN KEY (user_id) REFERENCES users (uid)
              ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT fk_favorites_salon FOREIGN KEY (salon_id) REFERENCES salons (id)
              ON DELETE CASCADE ON UPDATE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
      } finally {
        await conn.query('SET FOREIGN_KEY_CHECKS = 1');
        conn.release();
      }

      // Non-destructively ensure critical columns exist on pre-existing phpMyAdmin imports
      await ensureMySQLColumn('users', 'uid', 'VARCHAR(128) DEFAULT NULL');
      await ensureMySQLColumn('users', 'password', 'TEXT DEFAULT NULL');
      await ensureMySQLColumn('users', 'status', "VARCHAR(32) DEFAULT 'active'");
      await ensureMySQLColumn('users', 'phone', "VARCHAR(64) DEFAULT ''");
      await ensureMySQLColumn('users', 'city', "VARCHAR(128) DEFAULT 'Pune'");
      await ensureMySQLColumn('users', 'salon_id', 'VARCHAR(128) DEFAULT NULL');
      await ensureMySQLColumn('salons', 'break_start_time', 'VARCHAR(16) DEFAULT NULL');
      await ensureMySQLColumn('salons', 'break_end_time', 'VARCHAR(16) DEFAULT NULL');
      await ensureMySQLColumn('salons', 'working_days', 'JSON DEFAULT NULL');
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
