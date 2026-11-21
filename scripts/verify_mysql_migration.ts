import { query, pool, DB_DRIVER, getDbConfigInfo } from '../src/db/db.ts';

const EXPECTED_BASELINE_COUNTS: Record<string, number> = {
  categories: 7,
  users: 22,
  salons: 8,
  services: 26,
  appointments: 13,
  notifications: 11,
  favorites: 0,
};

async function verifyDatabase() {
  const info = getDbConfigInfo();
  const verRes = await query('SELECT VERSION() AS version');
  const version = String(verRes.rows[0]?.version || 'unknown');
  console.log('\n=== SALONIX Database Integrity & Migration Verification ===');
  console.log(`Active Driver  : ${DB_DRIVER}`);
  console.log(`Engine         : ${info.engine} (${info.driver})`);
  console.log(`Database Name  : ${info.database}`);
  console.log(`Target         : ${info.connectionTarget}`);
  console.log(`Version        : ${version}\n`);

  const tables = Object.keys(EXPECTED_BASELINE_COUNTS);
  const actualCounts: Record<string, number> = {};
  let hasError = false;

  console.log('1) Table Existence & Row Count Comparison (Baseline PostgreSQL vs Active DB):');
  for (const table of tables) {
    try {
      const res = await query(`SELECT COUNT(*) AS count FROM ${table}`);
      const count = Number(res.rows[0]?.count ?? 0);
      actualCounts[table] = count;
      const expected = EXPECTED_BASELINE_COUNTS[table];
      const note = count >= expected ? 'OK' : `BELOW BASELINE (expected >= ${expected})`;
      if (count < expected) hasError = true;
      console.log(`   - ${table.padEnd(15)} actual=${String(count).padStart(3)} | baseline=${String(expected).padStart(3)} | ${note}`);
    } catch (err: any) {
      hasError = true;
      console.log(`   - ${table.padEnd(15)} MISSING OR ERROR: ${err.message}`);
    }
  }

  console.log('\n2) Uniqueness & Conflict Checks (Duplicates / Null Keys):');
  const dupChecks = [
    { label: 'Duplicate user emails', sql: 'SELECT LOWER(email) AS val, COUNT(*) AS count FROM users GROUP BY LOWER(email) HAVING COUNT(*) > 1' },
    { label: 'Duplicate user UIDs', sql: 'SELECT uid AS val, COUNT(*) AS count FROM users GROUP BY uid HAVING COUNT(*) > 1' },
    { label: 'Users missing UID', sql: "SELECT id AS val FROM users WHERE uid IS NULL OR uid = ''" },
    { label: 'Users missing password hash', sql: "SELECT id AS val FROM users WHERE password IS NULL OR password = ''" },
  ];
  for (const check of dupChecks) {
    const res = await query(check.sql);
    const status = res.rows.length === 0 ? 'PASS (0 issues)' : `FAIL (${res.rows.length} issues)`;
    if (res.rows.length > 0) hasError = true;
    console.log(`   - ${check.label.padEnd(30)}: ${status}`);
  }

  console.log('\n3) Referential Integrity Checks (All 11 Logical/Physical Foreign Keys):');
  const fkChecks = [
    { label: 'salons.owner_id -> users.uid', sql: 'SELECT s.id FROM salons s LEFT JOIN users u ON s.owner_id = u.uid WHERE s.owner_id IS NOT NULL AND u.uid IS NULL' },
    { label: 'users.salon_id -> salons.id', sql: 'SELECT u.uid FROM users u LEFT JOIN salons s ON u.salon_id = s.id WHERE u.salon_id IS NOT NULL AND s.id IS NULL' },
    { label: 'services.salon_id -> salons.id', sql: 'SELECT sv.id FROM services sv LEFT JOIN salons s ON sv.salon_id = s.id WHERE s.id IS NULL' },
    { label: 'services.category_id -> categories.id', sql: 'SELECT sv.id FROM services sv LEFT JOIN categories c ON sv.category_id = c.id WHERE sv.category_id IS NOT NULL AND c.id IS NULL' },
    { label: 'appointments.customer_id -> users.uid', sql: 'SELECT a.id FROM appointments a LEFT JOIN users u ON a.customer_id = u.uid WHERE u.uid IS NULL' },
    { label: 'appointments.salon_id -> salons.id', sql: 'SELECT a.id FROM appointments a LEFT JOIN salons s ON a.salon_id = s.id WHERE s.id IS NULL' },
    { label: 'appointments.service_id -> services.id', sql: 'SELECT a.id FROM appointments a LEFT JOIN services sv ON a.service_id = sv.id WHERE sv.id IS NULL' },
    { label: 'notifications.target_user_id -> users.uid', sql: 'SELECT n.id FROM notifications n LEFT JOIN users u ON n.target_user_id = u.uid WHERE n.target_user_id IS NOT NULL AND u.uid IS NULL' },
    { label: 'notifications.target_salon_id -> salons.id', sql: 'SELECT n.id FROM notifications n LEFT JOIN salons s ON n.target_salon_id = s.id WHERE n.target_salon_id IS NOT NULL AND s.id IS NULL' },
    { label: 'favorites.user_id -> users.uid', sql: 'SELECT f.id FROM favorites f LEFT JOIN users u ON f.user_id = u.uid WHERE u.uid IS NULL' },
    { label: 'favorites.salon_id -> salons.id', sql: 'SELECT f.id FROM favorites f LEFT JOIN salons s ON f.salon_id = s.id WHERE s.id IS NULL' },
  ];

  for (const check of fkChecks) {
    const res = await query(check.sql);
    const status = res.rows.length === 0 ? 'PASS (0 orphans)' : `FAIL (${res.rows.length} orphans)`;
    if (res.rows.length > 0) hasError = true;
    console.log(`   - ${check.label.padEnd(44)}: ${status}`);
  }

  // On MySQL/MariaDB, also verify physical InnoDB foreign key constraints in information_schema
  if (DB_DRIVER === 'mysql') {
    console.log('\n4) Physical InnoDB Foreign Key Constraints (information_schema):');
    const fkMeta = await query(
      `SELECT CONSTRAINT_NAME, TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
       FROM information_schema.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL
       ORDER BY TABLE_NAME, CONSTRAINT_NAME`
    );
    console.log(`   Found ${fkMeta.rows.length} enforced InnoDB foreign key constraint(s):`);
    for (const row of fkMeta.rows) {
      console.log(
        `   - ${row.CONSTRAINT_NAME}: ${row.TABLE_NAME}.${row.COLUMN_NAME} -> ${row.REFERENCED_TABLE_NAME}.${row.REFERENCED_COLUMN_NAME}`
      );
    }
    if (fkMeta.rows.length < 11) {
      hasError = true;
      console.log(`   WARNING: Expected 11 InnoDB foreign keys, found ${fkMeta.rows.length}. Re-import database/salonix_mysql.sql.`);
    }
  }

  console.log('\nResult:', hasError ? 'FAILED — see warnings above.' : 'ALL CHECKS PASSED (read-only verification complete).');

  if (pool && typeof (pool as any).end === 'function') {
    await (pool as any).end();
  }
  if (hasError) process.exit(1);
}

verifyDatabase().catch(async (err) => {
  console.error('[Verify] Database verification error:', err.message || err);
  if (pool && typeof (pool as any).end === 'function') {
    await (pool as any).end();
  }
  process.exit(1);
});
