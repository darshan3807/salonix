import fs from 'fs';
import path from 'path';
import { query, pool, DB_DRIVER } from '../src/db/db.ts';

function escapeSql(val: any): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? '1' : '0';
  if (typeof val === 'number') return Number.isFinite(val) ? String(val) : 'NULL';
  if (val instanceof Date) {
    return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
  }
  const str = String(val).replace(/[\0\x08\x09\x1a\n\r'\\]/g, (char) => {
    switch (char) {
      case '\0': return '\\0';
      case '\x08': return '\\b';
      case '\x09': return '\\t';
      case '\x1a': return '\\z';
      case '\n': return '\\n';
      case '\r': return '\\r';
      case "'":
      case '\\': return '\\' + char;
      default: return char;
    }
  });
  return `'${str}'`;
}

function formatJsonColumn(val: any): string {
  if (val === null || val === undefined || val === '') return 'NULL';
  if (Array.isArray(val)) return escapeSql(JSON.stringify(val));
  const raw = String(val).trim();
  try {
    const parsed = JSON.parse(raw);
    return escapeSql(JSON.stringify(parsed));
  } catch {
    return escapeSql(JSON.stringify(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']));
  }
}

function formatDateOnly(val: any): string {
  if (val instanceof Date) {
    return `'${val.toISOString().slice(0, 10)}'`;
  }
  const str = String(val || '').trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return `'${str.slice(0, 10)}'`;
  }
  return escapeSql(str);
}

async function generateMysqlSchemaAndMigration() {
  console.log(`[Export] Reading live Salonix records via active driver (${DB_DRIVER})...`);

  const categoriesRes = await query('SELECT id, name, description, icon_name FROM categories ORDER BY id ASC');
  const usersRes = await query(
    'SELECT id, uid, email, name, phone, role, city, status, salon_id, password, created_at FROM users ORDER BY id ASC'
  );
  const salonsRes = await query(
    `SELECT id, owner_id, owner_name, name, tagline, description, about, address, city, state, pincode,
            phone, email, opening_time, closing_time, slot_duration_minutes, break_start_time, break_end_time,
            working_days, rating, review_count, starting_price, featured, status, accent_color, created_at
     FROM salons ORDER BY id ASC`
  );
  const servicesRes = await query(
    'SELECT id, salon_id, category_id, name, description, price, duration, status FROM services ORDER BY salon_id ASC, id ASC'
  );
  const appointmentsRes = await query(
    `SELECT id, customer_id, customer_name, customer_phone, customer_email, salon_id, salon_name, salon_city,
            salon_address, service_id, service_name, date, start_time, end_time, duration_minutes, price, status,
            notes, rejection_reason, cancellation_reason, created_at
     FROM appointments ORDER BY date ASC, created_at ASC, id ASC`
  );
  const notificationsRes = await query(
    `SELECT id, target_role, target_user_id, target_salon_id, title, message, type, read, action_route, created_at
     FROM notifications ORDER BY created_at ASC, id ASC`
  );
  const favoritesRes = await query('SELECT id, user_id, salon_id FROM favorites ORDER BY id ASC');

  // Pre-export referential integrity audit
  const userUids = new Set(usersRes.rows.map((u: any) => u.uid));
  const salonIds = new Set(salonsRes.rows.map((s: any) => s.id));
  const categoryIds = new Set(categoriesRes.rows.map((c: any) => c.id));
  const serviceIds = new Set(servicesRes.rows.map((s: any) => s.id));

  const issues: string[] = [];
  for (const s of salonsRes.rows) {
    if (s.owner_id && !userUids.has(s.owner_id)) issues.push(`Salon ${s.id} has missing owner_id ${s.owner_id}`);
  }
  for (const u of usersRes.rows) {
    if (u.salon_id && !salonIds.has(u.salon_id)) issues.push(`User ${u.uid} has missing salon_id ${u.salon_id}`);
  }
  for (const svc of servicesRes.rows) {
    if (!salonIds.has(svc.salon_id)) issues.push(`Service ${svc.id} has missing salon_id ${svc.salon_id}`);
    if (svc.category_id && !categoryIds.has(svc.category_id)) issues.push(`Service ${svc.id} has missing category_id ${svc.category_id}`);
  }
  for (const a of appointmentsRes.rows) {
    if (!userUids.has(a.customer_id)) issues.push(`Appointment ${a.id} has missing customer_id ${a.customer_id}`);
    if (!salonIds.has(a.salon_id)) issues.push(`Appointment ${a.id} has missing salon_id ${a.salon_id}`);
    if (!serviceIds.has(a.service_id)) issues.push(`Appointment ${a.id} has missing service_id ${a.service_id}`);
  }
  for (const n of notificationsRes.rows) {
    if (n.target_user_id && !userUids.has(n.target_user_id)) issues.push(`Notification ${n.id} has missing target_user_id ${n.target_user_id}`);
    if (n.target_salon_id && !salonIds.has(n.target_salon_id)) issues.push(`Notification ${n.id} has missing target_salon_id ${n.target_salon_id}`);
  }
  for (const f of favoritesRes.rows) {
    if (!userUids.has(f.user_id)) issues.push(`Favorite ${f.id} has missing user_id ${f.user_id}`);
    if (!salonIds.has(f.salon_id)) issues.push(`Favorite ${f.id} has missing salon_id ${f.salon_id}`);
  }

  if (issues.length > 0) {
    throw new Error(`Referential integrity audit failed:\n- ${issues.join('\n- ')}`);
  }

  const maxUserId = usersRes.rows.reduce((max: number, u: any) => Math.max(max, Number(u.id) || 0), 0);
  const maxFavId = favoritesRes.rows.reduce((max: number, f: any) => Math.max(max, Number(f.id) || 0), 0);

  let out = '';
  out += '-- ==========================================================================\n';
  out += '-- SALONIX — Complete XAMPP MySQL / MariaDB Relational Database & Migration\n';
  out += '-- ==========================================================================\n';
  out += '-- Target Database : salonix_db\n';
  out += '-- Engine          : InnoDB (ACID transactions + enforced Foreign Keys)\n';
  out += '-- Charset/Collate : utf8mb4 / utf8mb4_unicode_ci\n';
  out += '-- Compatibility   : XAMPP MariaDB 10.4+, MySQL 8.0+, phpMyAdmin Import\n';
  out += '-- Safety          : Non-destructive (CREATE DATABASE/TABLE IF NOT EXISTS,\n';
  out += '--                   INSERT IGNORE). Safe to import without dropping data.\n';
  out += '-- ==========================================================================\n\n';

  out += 'SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";\n';
  out += 'SET time_zone = "+00:00";\n';
  out += 'SET NAMES utf8mb4;\n\n';

  out += 'CREATE DATABASE IF NOT EXISTS `salonix_db`\n';
  out += '  DEFAULT CHARACTER SET utf8mb4\n';
  out += '  COLLATE utf8mb4_unicode_ci;\n\n';
  out += 'USE `salonix_db`;\n\n';

  out += '-- Temporarily disable FK checks ONLY during DDL creation so the mutual\n';
  out += '-- owner <-> salon relationship (users.salon_id <-> salons.owner_id) can\n';
  out += '-- be declared cleanly inside CREATE TABLE IF NOT EXISTS.\n';
  out += 'SET FOREIGN_KEY_CHECKS = 0;\n\n';

  // 1. categories
  out += '-- --------------------------------------------------------------------------\n';
  out += '-- 1. Table `categories` (Lookup table for salon service categories)\n';
  out += '-- --------------------------------------------------------------------------\n';
  out += 'CREATE TABLE IF NOT EXISTS `categories` (\n';
  out += '  `id` VARCHAR(128) NOT NULL,\n';
  out += '  `name` VARCHAR(255) NOT NULL,\n';
  out += '  `description` TEXT DEFAULT NULL,\n';
  out += '  `icon_name` VARCHAR(64) DEFAULT NULL,\n';
  out += '  PRIMARY KEY (`id`),\n';
  out += '  UNIQUE KEY `uq_categories_name` (`name`)\n';
  out += ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n';

  // 2. users
  out += '-- --------------------------------------------------------------------------\n';
  out += '-- 2. Table `users` (Customers, Salon Owners / Partners, and Admins)\n';
  out += '-- --------------------------------------------------------------------------\n';
  out += 'CREATE TABLE IF NOT EXISTS `users` (\n';
  out += '  `id` INT NOT NULL AUTO_INCREMENT,\n';
  out += '  `uid` VARCHAR(128) NOT NULL,\n';
  out += '  `email` VARCHAR(255) NOT NULL,\n';
  out += '  `name` VARCHAR(255) NOT NULL,\n';
  out += '  `phone` VARCHAR(64) NOT NULL DEFAULT \'\',\n';
  out += '  `role` VARCHAR(32) NOT NULL DEFAULT \'customer\',\n';
  out += '  `city` VARCHAR(128) NOT NULL DEFAULT \'Pune\',\n';
  out += '  `status` VARCHAR(32) NOT NULL DEFAULT \'active\',\n';
  out += '  `salon_id` VARCHAR(128) DEFAULT NULL,\n';
  out += '  `password` TEXT NOT NULL,\n';
  out += '  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,\n';
  out += '  PRIMARY KEY (`id`),\n';
  out += '  UNIQUE KEY `uq_users_uid` (`uid`),\n';
  out += '  UNIQUE KEY `uq_users_email` (`email`),\n';
  out += '  KEY `idx_users_role` (`role`),\n';
  out += '  KEY `idx_users_city` (`city`),\n';
  out += '  KEY `idx_users_salon_id` (`salon_id`),\n';
  out += '  CONSTRAINT `fk_users_salon`\n';
  out += '    FOREIGN KEY (`salon_id`) REFERENCES `salons` (`id`)\n';
  out += '    ON DELETE SET NULL ON UPDATE CASCADE\n';
  out += ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n';

  // 3. salons
  out += '-- --------------------------------------------------------------------------\n';
  out += '-- 3. Table `salons` (Salon profiles, schedules, break windows, pricing)\n';
  out += '-- --------------------------------------------------------------------------\n';
  out += 'CREATE TABLE IF NOT EXISTS `salons` (\n';
  out += '  `id` VARCHAR(128) NOT NULL,\n';
  out += '  `owner_id` VARCHAR(128) DEFAULT NULL,\n';
  out += '  `owner_name` VARCHAR(255) DEFAULT NULL,\n';
  out += '  `name` VARCHAR(255) NOT NULL,\n';
  out += '  `tagline` VARCHAR(255) DEFAULT NULL,\n';
  out += '  `description` TEXT DEFAULT NULL,\n';
  out += '  `about` TEXT DEFAULT NULL,\n';
  out += '  `address` TEXT DEFAULT NULL,\n';
  out += '  `city` VARCHAR(128) NOT NULL DEFAULT \'Pune\',\n';
  out += '  `state` VARCHAR(128) DEFAULT NULL,\n';
  out += '  `pincode` VARCHAR(32) DEFAULT NULL,\n';
  out += '  `phone` VARCHAR(64) DEFAULT NULL,\n';
  out += '  `email` VARCHAR(255) DEFAULT NULL,\n';
  out += '  `opening_time` VARCHAR(16) NOT NULL DEFAULT \'09:00\',\n';
  out += '  `closing_time` VARCHAR(16) NOT NULL DEFAULT \'20:00\',\n';
  out += '  `slot_duration_minutes` INT NOT NULL DEFAULT 30,\n';
  out += '  `break_start_time` VARCHAR(16) DEFAULT NULL,\n';
  out += '  `break_end_time` VARCHAR(16) DEFAULT NULL,\n';
  out += '  `working_days` JSON DEFAULT NULL,\n';
  out += '  `rating` DECIMAL(3,2) NOT NULL DEFAULT 0.00,\n';
  out += '  `review_count` INT NOT NULL DEFAULT 0,\n';
  out += '  `starting_price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,\n';
  out += '  `featured` TINYINT(1) NOT NULL DEFAULT 0,\n';
  out += '  `status` VARCHAR(32) NOT NULL DEFAULT \'active\',\n';
  out += '  `accent_color` VARCHAR(32) NOT NULL DEFAULT \'#b45309\',\n';
  out += '  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,\n';
  out += '  PRIMARY KEY (`id`),\n';
  out += '  KEY `idx_salons_owner_id` (`owner_id`),\n';
  out += '  KEY `idx_salons_city_status` (`city`, `status`),\n';
  out += '  KEY `idx_salons_featured` (`featured`),\n';
  out += '  CONSTRAINT `fk_salons_owner`\n';
  out += '    FOREIGN KEY (`owner_id`) REFERENCES `users` (`uid`)\n';
  out += '    ON DELETE RESTRICT ON UPDATE CASCADE\n';
  out += ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n';

  // 4. services
  out += '-- --------------------------------------------------------------------------\n';
  out += '-- 4. Table `services` (Salon service catalogs linked to salons & categories)\n';
  out += '-- --------------------------------------------------------------------------\n';
  out += 'CREATE TABLE IF NOT EXISTS `services` (\n';
  out += '  `id` VARCHAR(128) NOT NULL,\n';
  out += '  `salon_id` VARCHAR(128) NOT NULL,\n';
  out += '  `category_id` VARCHAR(128) DEFAULT NULL,\n';
  out += '  `name` VARCHAR(255) NOT NULL,\n';
  out += '  `description` TEXT DEFAULT NULL,\n';
  out += '  `price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,\n';
  out += '  `duration` INT NOT NULL DEFAULT 30,\n';
  out += '  `status` VARCHAR(32) NOT NULL DEFAULT \'active\',\n';
  out += '  PRIMARY KEY (`id`),\n';
  out += '  KEY `idx_services_salon_id` (`salon_id`),\n';
  out += '  KEY `idx_services_category_id` (`category_id`),\n';
  out += '  KEY `idx_services_status` (`status`),\n';
  out += '  CONSTRAINT `fk_services_salon`\n';
  out += '    FOREIGN KEY (`salon_id`) REFERENCES `salons` (`id`)\n';
  out += '    ON DELETE CASCADE ON UPDATE CASCADE,\n';
  out += '  CONSTRAINT `fk_services_category`\n';
  out += '    FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`)\n';
  out += '    ON DELETE RESTRICT ON UPDATE CASCADE\n';
  out += ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n';

  // 5. appointments
  out += '-- --------------------------------------------------------------------------\n';
  out += '-- 5. Table `appointments` (Customer bookings, pending/approval lifecycle)\n';
  out += '-- --------------------------------------------------------------------------\n';
  out += 'CREATE TABLE IF NOT EXISTS `appointments` (\n';
  out += '  `id` VARCHAR(128) NOT NULL,\n';
  out += '  `customer_id` VARCHAR(128) NOT NULL,\n';
  out += '  `customer_name` VARCHAR(255) NOT NULL,\n';
  out += '  `customer_phone` VARCHAR(64) DEFAULT NULL,\n';
  out += '  `customer_email` VARCHAR(255) DEFAULT NULL,\n';
  out += '  `salon_id` VARCHAR(128) NOT NULL,\n';
  out += '  `salon_name` VARCHAR(255) DEFAULT NULL,\n';
  out += '  `salon_city` VARCHAR(128) DEFAULT NULL,\n';
  out += '  `salon_address` TEXT DEFAULT NULL,\n';
  out += '  `service_id` VARCHAR(128) NOT NULL,\n';
  out += '  `service_name` VARCHAR(255) DEFAULT NULL,\n';
  out += '  `date` DATE NOT NULL,\n';
  out += '  `start_time` VARCHAR(16) NOT NULL,\n';
  out += '  `end_time` VARCHAR(16) NOT NULL,\n';
  out += '  `duration_minutes` INT NOT NULL DEFAULT 30,\n';
  out += '  `price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,\n';
  out += '  `status` VARCHAR(32) NOT NULL DEFAULT \'PENDING\',\n';
  out += '  `notes` TEXT DEFAULT NULL,\n';
  out += '  `rejection_reason` TEXT DEFAULT NULL,\n';
  out += '  `cancellation_reason` TEXT DEFAULT NULL,\n';
  out += '  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,\n';
  out += '  PRIMARY KEY (`id`),\n';
  out += '  KEY `idx_appointments_customer_id` (`customer_id`),\n';
  out += '  KEY `idx_appointments_salon_date` (`salon_id`, `date`),\n';
  out += '  KEY `idx_appointments_service_id` (`service_id`),\n';
  out += '  KEY `idx_appointments_status` (`status`),\n';
  out += '  CONSTRAINT `fk_appointments_customer`\n';
  out += '    FOREIGN KEY (`customer_id`) REFERENCES `users` (`uid`)\n';
  out += '    ON DELETE RESTRICT ON UPDATE CASCADE,\n';
  out += '  CONSTRAINT `fk_appointments_salon`\n';
  out += '    FOREIGN KEY (`salon_id`) REFERENCES `salons` (`id`)\n';
  out += '    ON DELETE RESTRICT ON UPDATE CASCADE,\n';
  out += '  CONSTRAINT `fk_appointments_service`\n';
  out += '    FOREIGN KEY (`service_id`) REFERENCES `services` (`id`)\n';
  out += '    ON DELETE RESTRICT ON UPDATE CASCADE\n';
  out += ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n';

  // 6. notifications
  out += '-- --------------------------------------------------------------------------\n';
  out += '-- 6. Table `notifications` (Booking alerts for customers, owners & admins)\n';
  out += '-- --------------------------------------------------------------------------\n';
  out += 'CREATE TABLE IF NOT EXISTS `notifications` (\n';
  out += '  `id` VARCHAR(128) NOT NULL,\n';
  out += '  `target_role` VARCHAR(32) DEFAULT NULL,\n';
  out += '  `target_user_id` VARCHAR(128) DEFAULT NULL,\n';
  out += '  `target_salon_id` VARCHAR(128) DEFAULT NULL,\n';
  out += '  `title` VARCHAR(255) NOT NULL,\n';
  out += '  `message` TEXT NOT NULL,\n';
  out += '  `type` VARCHAR(64) NOT NULL DEFAULT \'general\',\n';
  out += '  `read` TINYINT(1) NOT NULL DEFAULT 0,\n';
  out += '  `action_route` VARCHAR(255) DEFAULT NULL,\n';
  out += '  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,\n';
  out += '  PRIMARY KEY (`id`),\n';
  out += '  KEY `idx_notifications_user_read` (`target_user_id`, `read`),\n';
  out += '  KEY `idx_notifications_salon_id` (`target_salon_id`),\n';
  out += '  KEY `idx_notifications_role` (`target_role`),\n';
  out += '  CONSTRAINT `fk_notifications_user`\n';
  out += '    FOREIGN KEY (`target_user_id`) REFERENCES `users` (`uid`)\n';
  out += '    ON DELETE CASCADE ON UPDATE CASCADE,\n';
  out += '  CONSTRAINT `fk_notifications_salon`\n';
  out += '    FOREIGN KEY (`target_salon_id`) REFERENCES `salons` (`id`)\n';
  out += '    ON DELETE CASCADE ON UPDATE CASCADE\n';
  out += ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n';

  // 7. favorites
  out += '-- --------------------------------------------------------------------------\n';
  out += '-- 7. Table `favorites` (Many-to-Many bridge between customers and salons)\n';
  out += '-- --------------------------------------------------------------------------\n';
  out += 'CREATE TABLE IF NOT EXISTS `favorites` (\n';
  out += '  `id` INT NOT NULL AUTO_INCREMENT,\n';
  out += '  `user_id` VARCHAR(128) NOT NULL,\n';
  out += '  `salon_id` VARCHAR(128) NOT NULL,\n';
  out += '  PRIMARY KEY (`id`),\n';
  out += '  UNIQUE KEY `uq_favorites_user_salon` (`user_id`, `salon_id`),\n';
  out += '  KEY `idx_favorites_salon_id` (`salon_id`),\n';
  out += '  CONSTRAINT `fk_favorites_user`\n';
  out += '    FOREIGN KEY (`user_id`) REFERENCES `users` (`uid`)\n';
  out += '    ON DELETE CASCADE ON UPDATE CASCADE,\n';
  out += '  CONSTRAINT `fk_favorites_salon`\n';
  out += '    FOREIGN KEY (`salon_id`) REFERENCES `salons` (`id`)\n';
  out += '    ON DELETE CASCADE ON UPDATE CASCADE\n';
  out += ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n';

  out += '-- Re-enable strict Foreign Key checks BEFORE loading migrated data\n';
  out += '-- so InnoDB validates every single migrated relationship during import.\n';
  out += 'SET FOREIGN_KEY_CHECKS = 1;\n\n';
  out += 'START TRANSACTION;\n\n';

  // Step 1: categories
  if (categoriesRes.rows.length > 0) {
    out += `-- Step 1: Migrated categories (${categoriesRes.rows.length} rows)\n`;
    out += 'INSERT IGNORE INTO `categories` (`id`, `name`, `description`, `icon_name`) VALUES\n';
    out += categoriesRes.rows
      .map((r: any) => `  (${escapeSql(r.id)}, ${escapeSql(r.name)}, ${escapeSql(r.description)}, ${escapeSql(r.icon_name)})`)
      .join(',\n') + ';\n\n';
  }

  // Step 2: users (insert with salon_id = NULL first to satisfy fk_users_salon)
  if (usersRes.rows.length > 0) {
    out += `-- Step 2: Migrated users (${usersRes.rows.length} rows; salon_id linked in Step 4 after salons exist)\n`;
    out += 'INSERT IGNORE INTO `users` (`id`, `uid`, `email`, `name`, `phone`, `role`, `city`, `status`, `salon_id`, `password`, `created_at`) VALUES\n';
    out += usersRes.rows
      .map(
        (r: any) =>
          `  (${escapeSql(r.id)}, ${escapeSql(r.uid)}, ${escapeSql(r.email)}, ${escapeSql(r.name)}, ${escapeSql(r.phone ?? '')}, ${escapeSql(r.role ?? 'customer')}, ${escapeSql(r.city ?? 'Pune')}, ${escapeSql(r.status ?? 'active')}, NULL, ${escapeSql(r.password)}, ${escapeSql(r.created_at)})`
      )
      .join(',\n') + ';\n\n';
  }

  // Step 3: salons
  if (salonsRes.rows.length > 0) {
    out += `-- Step 3: Migrated salons (${salonsRes.rows.length} rows)\n`;
    out += 'INSERT IGNORE INTO `salons` (`id`, `owner_id`, `owner_name`, `name`, `tagline`, `description`, `about`, `address`, `city`, `state`, `pincode`, `phone`, `email`, `opening_time`, `closing_time`, `slot_duration_minutes`, `break_start_time`, `break_end_time`, `working_days`, `rating`, `review_count`, `starting_price`, `featured`, `status`, `accent_color`, `created_at`) VALUES\n';
    out += salonsRes.rows
      .map(
        (r: any) =>
          `  (${escapeSql(r.id)}, ${escapeSql(r.owner_id)}, ${escapeSql(r.owner_name)}, ${escapeSql(r.name)}, ${escapeSql(r.tagline)}, ${escapeSql(r.description)}, ${escapeSql(r.about)}, ${escapeSql(r.address)}, ${escapeSql(r.city ?? 'Pune')}, ${escapeSql(r.state)}, ${escapeSql(r.pincode)}, ${escapeSql(r.phone)}, ${escapeSql(r.email)}, ${escapeSql(r.opening_time ?? '09:00')}, ${escapeSql(r.closing_time ?? '20:00')}, ${escapeSql(Number(r.slot_duration_minutes ?? 30))}, ${escapeSql(r.break_start_time)}, ${escapeSql(r.break_end_time)}, ${formatJsonColumn(r.working_days)}, ${escapeSql(Number(r.rating ?? 0))}, ${escapeSql(Number(r.review_count ?? 0))}, ${escapeSql(Number(r.starting_price ?? 0))}, ${r.featured ? '1' : '0'}, ${escapeSql(r.status ?? 'active')}, ${escapeSql(r.accent_color ?? '#b45309')}, ${escapeSql(r.created_at)})`
      )
      .join(',\n') + ';\n\n';
  }

  // Step 4: link salon owners' users.salon_id -> salons.id
  const ownersWithSalon = usersRes.rows.filter((u: any) => u.salon_id);
  if (ownersWithSalon.length > 0) {
    out += `-- Step 4: Link salon owners to their salons (${ownersWithSalon.length} rows)\n`;
    for (const u of ownersWithSalon) {
      out += `UPDATE \`users\` SET \`salon_id\` = ${escapeSql(u.salon_id)} WHERE \`uid\` = ${escapeSql(u.uid)} AND \`salon_id\` IS NULL;\n`;
    }
    out += '\n';
  }

  // Step 5: services
  if (servicesRes.rows.length > 0) {
    out += `-- Step 5: Migrated services (${servicesRes.rows.length} rows)\n`;
    out += 'INSERT IGNORE INTO `services` (`id`, `salon_id`, `category_id`, `name`, `description`, `price`, `duration`, `status`) VALUES\n';
    out += servicesRes.rows
      .map(
        (r: any) =>
          `  (${escapeSql(r.id)}, ${escapeSql(r.salon_id)}, ${escapeSql(r.category_id)}, ${escapeSql(r.name)}, ${escapeSql(r.description)}, ${escapeSql(Number(r.price ?? 0))}, ${escapeSql(Number(r.duration ?? 30))}, ${escapeSql(r.status ?? 'active')})`
      )
      .join(',\n') + ';\n\n';
  }

  // Step 6: appointments
  if (appointmentsRes.rows.length > 0) {
    out += `-- Step 6: Migrated appointments (${appointmentsRes.rows.length} rows)\n`;
    out += 'INSERT IGNORE INTO `appointments` (`id`, `customer_id`, `customer_name`, `customer_phone`, `customer_email`, `salon_id`, `salon_name`, `salon_city`, `salon_address`, `service_id`, `service_name`, `date`, `start_time`, `end_time`, `duration_minutes`, `price`, `status`, `notes`, `rejection_reason`, `cancellation_reason`, `created_at`) VALUES\n';
    out += appointmentsRes.rows
      .map(
        (r: any) =>
          `  (${escapeSql(r.id)}, ${escapeSql(r.customer_id)}, ${escapeSql(r.customer_name)}, ${escapeSql(r.customer_phone)}, ${escapeSql(r.customer_email)}, ${escapeSql(r.salon_id)}, ${escapeSql(r.salon_name)}, ${escapeSql(r.salon_city)}, ${escapeSql(r.salon_address)}, ${escapeSql(r.service_id)}, ${escapeSql(r.service_name)}, ${formatDateOnly(r.date)}, ${escapeSql(r.start_time)}, ${escapeSql(r.end_time)}, ${escapeSql(Number(r.duration_minutes ?? 30))}, ${escapeSql(Number(r.price ?? 0))}, ${escapeSql(r.status ?? 'PENDING')}, ${escapeSql(r.notes)}, ${escapeSql(r.rejection_reason)}, ${escapeSql(r.cancellation_reason)}, ${escapeSql(r.created_at)})`
      )
      .join(',\n') + ';\n\n';
  }

  // Step 7: notifications
  if (notificationsRes.rows.length > 0) {
    out += `-- Step 7: Migrated notifications (${notificationsRes.rows.length} rows)\n`;
    out += 'INSERT IGNORE INTO `notifications` (`id`, `target_role`, `target_user_id`, `target_salon_id`, `title`, `message`, `type`, `read`, `action_route`, `created_at`) VALUES\n';
    out += notificationsRes.rows
      .map(
        (r: any) =>
          `  (${escapeSql(r.id)}, ${escapeSql(r.target_role)}, ${escapeSql(r.target_user_id)}, ${escapeSql(r.target_salon_id)}, ${escapeSql(r.title)}, ${escapeSql(r.message)}, ${escapeSql(r.type ?? 'general')}, ${r.read ? '1' : '0'}, ${escapeSql(r.action_route)}, ${escapeSql(r.created_at)})`
      )
      .join(',\n') + ';\n\n';
  }

  // Step 8: favorites
  if (favoritesRes.rows.length > 0) {
    out += `-- Step 8: Migrated favorites (${favoritesRes.rows.length} rows)\n`;
    out += 'INSERT IGNORE INTO `favorites` (`id`, `user_id`, `salon_id`) VALUES\n';
    out += favoritesRes.rows
      .map((r: any) => `  (${escapeSql(r.id)}, ${escapeSql(r.user_id)}, ${escapeSql(r.salon_id)})`)
      .join(',\n') + ';\n\n';
  }

  out += `-- Align AUTO_INCREMENT counters safely above migrated primary keys\n`;
  out += `ALTER TABLE \`users\` AUTO_INCREMENT = ${maxUserId + 1};\n`;
  out += `ALTER TABLE \`favorites\` AUTO_INCREMENT = ${maxFavId + 1};\n\n`;
  out += 'COMMIT;\n';

  const dbDir = path.resolve(process.cwd(), 'database');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  const outputPath = path.join(dbDir, 'salonix_mysql.sql');
  fs.writeFileSync(outputPath, out, 'utf8');

  console.log(`[Export] Successfully wrote database/salonix_mysql.sql (${out.length} bytes)`);
  console.log('[Export] Verified row counts (0 referential integrity issues):');
  console.table({
    categories: categoriesRes.rows.length,
    users: usersRes.rows.length,
    salons: salonsRes.rows.length,
    services: servicesRes.rows.length,
    appointments: appointmentsRes.rows.length,
    notifications: notificationsRes.rows.length,
    favorites: favoritesRes.rows.length,
  });

  if (pool && typeof (pool as any).end === 'function') {
    await (pool as any).end();
  }
}

generateMysqlSchemaAndMigration().catch(async (err) => {
  console.error('[Export] Failed:', err.message || err);
  if (pool && typeof (pool as any).end === 'function') {
    await (pool as any).end();
  }
  process.exit(1);
});
