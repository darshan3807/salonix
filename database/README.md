# SALONIX — XAMPP MySQL / MariaDB & phpMyAdmin Database Guide

This guide explains how to run **SALONIX** locally with **XAMPP MySQL / MariaDB** managed through **phpMyAdmin**, safely migrate existing PostgreSQL records without losing data, back up and restore your database, and demonstrate the relational architecture to your college teacher.

---

## 1. Architecture Summary

- **Database Engine (Local Primary):** MariaDB / MySQL via XAMPP (`InnoDB`, `utf8mb4_unicode_ci`)
- **Database Name:** `salonix_db`
- **Node.js Driver:** `mysql2` (`mysql2/promise` connection pool)
- **Required Environment Variable:** `DB_DRIVER=mysql` (also accepts `mariadb`; use `DB_DRIVER=postgres` for PostgreSQL / Cloud SQL)
- **Tables (7):** `categories`, `users`, `salons`, `services`, `appointments`, `notifications`, `favorites`
- **Enforced InnoDB Foreign Keys:** 11 constraints (visible in phpMyAdmin **Designer** view)

---

## 2. Step-by-Step XAMPP & phpMyAdmin Setup (Windows)

### Step 1: Start XAMPP Services
1. Open **XAMPP Control Panel**.
2. Click **Start** next to **Apache** (for phpMyAdmin) and **Start** next to **MySQL** (MariaDB on port `3306`).
3. Verify both show green status badges (`Apache` and `MySQL`).

### Step 2: Import `database/salonix_mysql.sql` in phpMyAdmin
1. Open **http://localhost/phpmyadmin** in your browser.
2. Click the **Import** tab at the top (you do **not** even need to create `salonix_db` manually — the script runs `CREATE DATABASE IF NOT EXISTS salonix_db` safely, though creating `salonix_db` with `utf8mb4_unicode_ci` first also works).
3. Click **Choose File** and select:
   ```
   database/salonix_mysql.sql
   ```
4. Leave format as **SQL** and click **Import** (or **Go**) at the bottom.
5. Confirm the green success banner appears. In the left sidebar, click **`salonix_db`** and verify all 7 tables are listed with migrated records:
   - `categories` (7)
   - `users` (22)
   - `salons` (8)
   - `services` (26)
   - `appointments` (13)
   - `notifications` (11)
   - `favorites` (0)
6. Optional visual check: Click **More → Designer** inside `salonix_db` to inspect all 11 relational foreign-key connections visually.

### Step 3: Configure Local `.env`
Copy `.env.example` to `.env` in your project root (`C:\Users\DELL\salonix\.env`) and configure:

```env
DB_DRIVER=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=salonix_db
DB_USER=root
DB_PASSWORD=

JWT_SECRET=replace-with-a-strong-local-secret
PORT=3000
NODE_ENV=development
```

> **Note:** Default XAMPP MySQL on Windows has user `root` and an empty password (`DB_PASSWORD=`). If you set a root password in XAMPP, enter it in `.env` (never commit `.env` to Git).

### Step 4: Start the App & Verify Everything Locally
Open **two PowerShell terminals** in `C:\Users\DELL\salonix`:

**Terminal 1 — Start the Salonix backend + frontend server (port 3000):**
```powershell
npm install
npm run dev
```
Wait until you see:
```
[DB] Connected with MySQL / MariaDB driver on 127.0.0.1:3306/salonix_db
Salonix Server running on http://localhost:3000 (API + Frontend active)
```

**Terminal 2 — Run read-only DB integrity check + full automated test suites:**
```powershell
npm run db:verify
npm test
npx tsx scripts/test_phase4.ts
```

> **Important:** Always keep `npm run dev` running in Terminal 1 when running `npm test`, otherwise tests will fail with `ECONNREFUSED 127.0.0.1:3000`.

---

## 3. Safe Migration Plan (PostgreSQL → XAMPP MySQL/MariaDB)

To guarantee zero data loss when moving from PostgreSQL to XAMPP MySQL/MariaDB:

1. **Back up the source PostgreSQL database first** (read-only export; never drop or reset PostgreSQL):
   ```bash
   pg_dump -h <PG_HOST> -U <PG_USER> -d <PG_DB_NAME> -F p -f backup_salonix_postgres.sql
   ```
2. **Back up any existing local XAMPP database before importing** (if `salonix_db` already exists):
   ```powershell
   C:\xampp\mysql\bin\mysqldump.exe -u root salonix_db > backup_salonix_mysql_before.sql
   ```
3. **Generate or refresh the migration SQL** (when connected to PostgreSQL):
   ```bash
   npm run db:export-mysql
   ```
   This script automatically audits all 11 foreign-key relationships (0 orphan rows allowed) before writing `database/salonix_mysql.sql`.
4. **Non-destructive import design:**
   - Uses `CREATE DATABASE IF NOT EXISTS` and `CREATE TABLE IF NOT EXISTS` (never `DROP TABLE`).
   - Loads data with `SET FOREIGN_KEY_CHECKS = 1` inside a `START TRANSACTION ... COMMIT` block using `INSERT IGNORE` in strict parent-before-child order:
     1. `categories`
     2. `users` (with `salon_id = NULL` first)
     3. `salons` (referencing `users.uid`)
     4. `UPDATE users SET salon_id = ...` (linking owners back to `salons.id`)
     5. `services`
     6. `appointments`
     7. `notifications`
     8. `favorites`
   - Preserves all primary keys, UIDs, bcrypt password hashes, appointment statuses, prices, timestamps, and notifications.
5. **Post-migration verification:**
   Run `npm run db:verify` to confirm:
   - Row counts match or exceed the PostgreSQL baseline (`7, 22, 8, 26, 13, 11, 0`).
   - 0 duplicate emails, 0 duplicate UIDs, 0 missing password hashes.
   - 0 orphan rows across all 11 relationships.
   - All 11 physical InnoDB foreign key constraints exist in `information_schema.KEY_COLUMN_USAGE`.

---

## 4. Backup & Restore Instructions

### Backup `salonix_db` (CLI via XAMPP `mysqldump`)
```powershell
C:\xampp\mysql\bin\mysqldump.exe -u root --routines --triggers --single-transaction salonix_db > salonix_db_backup.sql
```

### Backup `salonix_db` (via phpMyAdmin UI)
1. Select **`salonix_db`** in phpMyAdmin.
2. Click the **Export** tab → select **Quick** → Format **SQL** → click **Export**.

### Restore `salonix_db` (CLI via XAMPP `mysql`)
```powershell
C:\xampp\mysql\bin\mysql.exe -u root -e "CREATE DATABASE IF NOT EXISTS salonix_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
C:\xampp\mysql\bin\mysql.exe -u root salonix_db < salonix_db_backup.sql
```

### Restore `salonix_db` (via phpMyAdmin UI)
1. Select **`salonix_db`** → **Import** tab → choose `salonix_db_backup.sql` → click **Import**.

---

## 5. Teacher-Friendly Database Explanation (Viva & Demo Reference)

- **Why MySQL / MariaDB (XAMPP)?**
  Salonix is an OLTP appointment-booking application with strict relational rules (customers, salons, services, time-slot bookings, and notifications). MariaDB/MySQL with the **InnoDB** storage engine provides **ACID transactions**, **row-level locking** (`FOR UPDATE` / `LOCK IN SHARE MODE`), and **enforced foreign keys** so double-booking is prevented at the database level.
- **What is phpMyAdmin?**
  phpMyAdmin is a web-based administration tool bundled with XAMPP that lets us inspect tables, browse live rows, run `SELECT` queries, import/export SQL backups, and visualize foreign keys in the **Designer** view.
- **Primary Keys & Foreign Keys:**
  Every table has a Primary Key (`id`) to uniquely identify each row, plus unique constraints (`users.email`, `users.uid`, `favorites(user_id, salon_id)`). Eleven InnoDB Foreign Keys link child tables (`salons`, `services`, `appointments`, `notifications`, `favorites`) to their parent records so invalid/orphan IDs are rejected automatically.
- **One-to-Many (1:N) & Many-to-Many (M:N) Relationships:**
  - 1 Salon Owner → N Salons (`salons.owner_id → users.uid`)
  - 1 Salon → N Services (`services.salon_id → salons.id`)
  - 1 Category → N Services (`services.category_id → categories.id`)
  - 1 Customer / 1 Salon / 1 Service → N Appointments
  - Customers ↔ Salons (M:N saved bookmarks) resolved via the `favorites` junction table.
- **How Registration Works:**
  The backend hashes passwords with **bcrypt** (never plaintext), validates email uniqueness, and runs a single **ACID transaction**: inserts the user first (`salon_id = NULL`), creates their salon (if `role = 'owner'`) referencing `users.uid`, updates `users.salon_id`, creates 3 starter services, inserts an admin notification, and commits atomically.
- **How Booking, Conflict Prevention & Notifications Work:**
  1. Customer submits a booking (`POST /api/appointments`).
  2. Backend opens an InnoDB transaction (`BEGIN`), locks the salon row (`LOCK IN SHARE MODE`), locks existing appointments for that salon & date (`FOR UPDATE`), checks for overlapping active slots (`PENDING`/`CONFIRMED`), and rejects conflicts with **HTTP 409 Conflict**.
  3. If available, it inserts the appointment with status **`PENDING`** and creates a notification for the salon owner (`target_salon_id`), then commits.
  4. When the salon owner approves or rejects the booking (`PATCH /api/appointments/:id/status`), the appointment status updates to **`CONFIRMED`** or **`REJECTED`**, and a customer notification (`target_user_id`) is inserted so the customer sees the decision immediately.

---

## 6. Safe Read-Only SQL Queries for Live Teacher Demonstration

Run any of these read-only `SELECT` queries inside phpMyAdmin (**`salonix_db` → SQL tab**). None of them expose password hashes or modify data.

### Q1. List Users Without Exposing Password Hashes
```sql
SELECT id, uid, name, email, phone, role, city, status, salon_id, created_at
FROM users
ORDER BY role, id;
```

### Q2. Show Salons with Their Owner Account Details (INNER JOIN)
```sql
SELECT
  s.id AS salon_id,
  s.name AS salon_name,
  s.city,
  s.starting_price,
  s.opening_time,
  s.closing_time,
  s.slot_duration_minutes,
  u.name AS owner_name,
  u.email AS owner_email
FROM salons s
JOIN users u ON s.owner_id = u.uid
ORDER BY s.city, s.name;
```

### Q3. Show Services Grouped with Salon Name and Category (3-Table JOIN)
```sql
SELECT
  s.name AS salon_name,
  c.name AS category_name,
  sv.name AS service_name,
  sv.duration AS duration_mins,
  sv.price
FROM services sv
JOIN salons s ON sv.salon_id = s.id
LEFT JOIN categories c ON sv.category_id = c.id
ORDER BY s.name, sv.price ASC;
```

### Q4. Full Appointment Booking Report (4-Table Relational JOIN)
```sql
SELECT
  a.id AS booking_id,
  a.date,
  a.start_time,
  a.end_time,
  a.status,
  a.price,
  u.name AS customer_name,
  s.name AS salon_name,
  sv.name AS service_name
FROM appointments a
JOIN users u ON a.customer_id = u.uid
JOIN salons s ON a.salon_id = s.id
JOIN services sv ON a.service_id = sv.id
ORDER BY a.date DESC, a.created_at DESC;
```

### Q5. Appointment Summary by Status (GROUP BY & Aggregate Functions)
```sql
SELECT
  UPPER(status) AS booking_status,
  COUNT(*) AS total_bookings,
  SUM(price) AS total_value
FROM appointments
GROUP BY UPPER(status)
ORDER BY total_bookings DESC;
```

### Q6. Recent Notifications Linked to Users & Salons
```sql
SELECT
  n.id,
  n.target_role,
  COALESCE(u.name, s.name, 'Admin') AS recipient,
  n.title,
  n.type,
  n.`read` AS is_read,
  n.created_at
FROM notifications n
LEFT JOIN users u ON n.target_user_id = u.uid
LEFT JOIN salons s ON n.target_salon_id = s.id
ORDER BY n.created_at DESC
LIMIT 15;
```

### Q7. Prove All 11 Physical InnoDB Foreign Key Constraints Exist
```sql
SELECT
  CONSTRAINT_NAME,
  TABLE_NAME,
  COLUMN_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'salonix_db'
  AND REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY TABLE_NAME, CONSTRAINT_NAME;
```
