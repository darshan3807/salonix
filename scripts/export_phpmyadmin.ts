import fs from 'fs';
import pg from 'pg';

async function generatePhpMyAdminSql() {
  const cfg = JSON.parse(fs.readFileSync('/app/.dev.env.json', 'utf8'));
  const pool = new pg.Pool({
    host: cfg.SQL_HOST,
    user: cfg.SQL_USER,
    password: cfg.SQL_PASSWORD,
    database: cfg.SQL_DB_NAME,
    port: 5432,
  });

  function escapeSql(val: any): string {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'boolean') return val ? '1' : '0';
    if (typeof val === 'number') return String(val);
    if (val instanceof Date) {
      return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
    }
    const str = String(val).replace(/[\0\x08\x09\x1a\n\r"'\\]/g, (char) => {
      switch (char) {
        case '\0': return '\\0';
        case '\x08': return '\\b';
        case '\x09': return '\\t';
        case '\x1a': return '\\z';
        case '\n': return '\\n';
        case '\r': return '\\r';
        case '"':
        case "'":
        case '\\': return '\\' + char;
        default: return char;
      }
    });
    return `'${str}'`;
  }

  let out = '';
  out += '-- =========================================================\n';
  out += '-- Salonix MySQL / phpMyAdmin Full Schema & Seed Data\n';
  out += '-- Compatible with phpMyAdmin, XAMPP, WampServer, MAMP, MySQL 5.7+ & 8.0+\n';
  out += '-- =========================================================\n\n';
  out += 'SET FOREIGN_KEY_CHECKS = 0;\n';
  out += 'SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";\n';
  out += 'START TRANSACTION;\n';
  out += 'SET time_zone = "+00:00";\n\n';
  out += 'CREATE DATABASE IF NOT EXISTS `salonix` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\n';
  out += 'USE `salonix`;\n\n';

  out += '-- --------------------------------------------------------\n';
  out += '-- Table structure for table `users`\n';
  out += '-- --------------------------------------------------------\n';
  out += 'DROP TABLE IF EXISTS `users`;\n';
  out += 'CREATE TABLE `users` (\n';
  out += '  `id` int(11) NOT NULL AUTO_INCREMENT,\n';
  out += '  `uid` varchar(128) DEFAULT NULL,\n';
  out += '  `email` varchar(255) NOT NULL UNIQUE,\n';
  out += '  `name` varchar(255) NOT NULL,\n';
  out += '  `phone` varchar(64) DEFAULT \'\',\n';
  out += '  `role` varchar(32) DEFAULT \'customer\',\n';
  out += '  `city` varchar(128) DEFAULT \'Pune\',\n';
  out += '  `status` varchar(32) DEFAULT \'active\',\n';
  out += '  `salon_id` varchar(128) DEFAULT NULL,\n';
  out += '  `password` text DEFAULT NULL,\n';
  out += '  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,\n';
  out += '  PRIMARY KEY (`id`),\n';
  out += '  KEY `idx_users_email` (`email`),\n';
  out += '  KEY `idx_users_role` (`role`),\n';
  out += '  KEY `idx_users_salon_id` (`salon_id`)\n';
  out += ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n';

  out += '-- --------------------------------------------------------\n';
  out += '-- Table structure for table `categories`\n';
  out += '-- --------------------------------------------------------\n';
  out += 'DROP TABLE IF EXISTS `categories`;\n';
  out += 'CREATE TABLE `categories` (\n';
  out += '  `id` varchar(128) NOT NULL,\n';
  out += '  `name` varchar(255) NOT NULL,\n';
  out += '  `description` text DEFAULT NULL,\n';
  out += '  `icon_name` varchar(64) DEFAULT NULL,\n';
  out += '  PRIMARY KEY (`id`)\n';
  out += ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n';

  out += '-- --------------------------------------------------------\n';
  out += '-- Table structure for table `salons`\n';
  out += '-- --------------------------------------------------------\n';
  out += 'DROP TABLE IF EXISTS `salons`;\n';
  out += 'CREATE TABLE `salons` (\n';
  out += '  `id` varchar(128) NOT NULL,\n';
  out += '  `owner_id` varchar(128) DEFAULT NULL,\n';
  out += '  `owner_name` varchar(255) DEFAULT NULL,\n';
  out += '  `name` varchar(255) NOT NULL,\n';
  out += '  `tagline` varchar(255) DEFAULT NULL,\n';
  out += '  `description` text DEFAULT NULL,\n';
  out += '  `about` text DEFAULT NULL,\n';
  out += '  `address` text DEFAULT NULL,\n';
  out += '  `city` varchar(128) DEFAULT NULL,\n';
  out += '  `state` varchar(128) DEFAULT NULL,\n';
  out += '  `pincode` varchar(32) DEFAULT NULL,\n';
  out += '  `phone` varchar(64) DEFAULT NULL,\n';
  out += '  `email` varchar(255) DEFAULT NULL,\n';
  out += '  `opening_time` varchar(16) DEFAULT NULL,\n';
  out += '  `closing_time` varchar(16) DEFAULT NULL,\n';
  out += '  `slot_duration_minutes` int(11) DEFAULT 30,\n';
  out += '  `break_start_time` varchar(16) DEFAULT NULL,\n';
  out += '  `break_end_time` varchar(16) DEFAULT NULL,\n';
  out += '  `working_days` text DEFAULT NULL,\n';
  out += '  `rating` float DEFAULT 0,\n';
  out += '  `review_count` int(11) DEFAULT 0,\n';
  out += '  `starting_price` int(11) DEFAULT 0,\n';
  out += '  `featured` tinyint(1) DEFAULT 0,\n';
  out += '  `status` varchar(32) DEFAULT \'active\',\n';
  out += '  `accent_color` varchar(32) DEFAULT \'#b45309\',\n';
  out += '  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,\n';
  out += '  PRIMARY KEY (`id`),\n';
  out += '  KEY `idx_salons_city` (`city`),\n';
  out += '  KEY `idx_salons_owner` (`owner_id`)\n';
  out += ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n';

  out += '-- --------------------------------------------------------\n';
  out += '-- Table structure for table `services`\n';
  out += '-- --------------------------------------------------------\n';
  out += 'DROP TABLE IF EXISTS `services`;\n';
  out += 'CREATE TABLE `services` (\n';
  out += '  `id` varchar(128) NOT NULL,\n';
  out += '  `salon_id` varchar(128) NOT NULL,\n';
  out += '  `category_id` varchar(128) DEFAULT NULL,\n';
  out += '  `name` varchar(255) NOT NULL,\n';
  out += '  `description` text DEFAULT NULL,\n';
  out += '  `price` int(11) NOT NULL DEFAULT 0,\n';
  out += '  `duration` int(11) NOT NULL DEFAULT 30,\n';
  out += '  `status` varchar(32) DEFAULT \'active\',\n';
  out += '  PRIMARY KEY (`id`),\n';
  out += '  KEY `idx_services_salon` (`salon_id`),\n';
  out += '  KEY `idx_services_category` (`category_id`)\n';
  out += ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n';

  out += '-- --------------------------------------------------------\n';
  out += '-- Table structure for table `appointments`\n';
  out += '-- --------------------------------------------------------\n';
  out += 'DROP TABLE IF EXISTS `appointments`;\n';
  out += 'CREATE TABLE `appointments` (\n';
  out += '  `id` varchar(128) NOT NULL,\n';
  out += '  `customer_id` varchar(128) NOT NULL,\n';
  out += '  `customer_name` varchar(255) NOT NULL,\n';
  out += '  `customer_phone` varchar(64) DEFAULT NULL,\n';
  out += '  `customer_email` varchar(255) DEFAULT NULL,\n';
  out += '  `salon_id` varchar(128) NOT NULL,\n';
  out += '  `salon_name` varchar(255) DEFAULT NULL,\n';
  out += '  `salon_city` varchar(128) DEFAULT NULL,\n';
  out += '  `salon_address` text DEFAULT NULL,\n';
  out += '  `service_id` varchar(128) NOT NULL,\n';
  out += '  `service_name` varchar(255) DEFAULT NULL,\n';
  out += '  `date` varchar(32) NOT NULL,\n';
  out += '  `start_time` varchar(16) NOT NULL,\n';
  out += '  `end_time` varchar(16) NOT NULL,\n';
  out += '  `duration_minutes` int(11) NOT NULL DEFAULT 30,\n';
  out += '  `price` int(11) NOT NULL DEFAULT 0,\n';
  out += '  `status` varchar(32) NOT NULL DEFAULT \'pending\',\n';
  out += '  `notes` text DEFAULT NULL,\n';
  out += '  `rejection_reason` text DEFAULT NULL,\n';
  out += '  `cancellation_reason` text DEFAULT NULL,\n';
  out += '  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,\n';
  out += '  PRIMARY KEY (`id`),\n';
  out += '  KEY `idx_appointments_customer` (`customer_id`),\n';
  out += '  KEY `idx_appointments_salon` (`salon_id`),\n';
  out += '  KEY `idx_appointments_date` (`date`)\n';
  out += ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n';

  out += '-- --------------------------------------------------------\n';
  out += '-- Table structure for table `notifications`\n';
  out += '-- --------------------------------------------------------\n';
  out += 'DROP TABLE IF EXISTS `notifications`;\n';
  out += 'CREATE TABLE `notifications` (\n';
  out += '  `id` varchar(128) NOT NULL,\n';
  out += '  `target_role` varchar(32) DEFAULT NULL,\n';
  out += '  `target_user_id` varchar(128) DEFAULT NULL,\n';
  out += '  `target_salon_id` varchar(128) DEFAULT NULL,\n';
  out += '  `title` varchar(255) NOT NULL,\n';
  out += '  `message` text NOT NULL,\n';
  out += '  `type` varchar(64) DEFAULT \'general\',\n';
  out += '  `read` tinyint(1) DEFAULT 0,\n';
  out += '  `action_route` varchar(255) DEFAULT NULL,\n';
  out += '  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,\n';
  out += '  PRIMARY KEY (`id`),\n';
  out += '  KEY `idx_notifications_user` (`target_user_id`),\n';
  out += '  KEY `idx_notifications_salon` (`target_salon_id`)\n';
  out += ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n';

  out += '-- --------------------------------------------------------\n';
  out += '-- Table structure for table `favorites`\n';
  out += '-- --------------------------------------------------------\n';
  out += 'DROP TABLE IF EXISTS `favorites`;\n';
  out += 'CREATE TABLE `favorites` (\n';
  out += '  `id` int(11) NOT NULL AUTO_INCREMENT,\n';
  out += '  `user_id` varchar(128) NOT NULL,\n';
  out += '  `salon_id` varchar(128) NOT NULL,\n';
  out += '  PRIMARY KEY (`id`),\n';
  out += '  UNIQUE KEY `idx_fav_unique` (`user_id`, `salon_id`)\n';
  out += ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n';

  // Dump tables with real data
  const dumpTables = ['categories', 'users', 'salons', 'services', 'appointments', 'notifications', 'favorites'];
  for (const t of dumpTables) {
    const res = await pool.query('SELECT * FROM ' + t + ' ORDER BY 1 ASC');
    if (res.rows.length === 0) continue;
    out += '-- --------------------------------------------------------\n';
    out += '-- Dumping data for table `' + t + '` (' + res.rows.length + ' rows)\n';
    out += '-- --------------------------------------------------------\n';
    const cols = Object.keys(res.rows[0]);
    const colList = cols.map((c) => '`' + c + '`').join(', ');

    out += 'INSERT INTO `' + t + '` (' + colList + ') VALUES\n';
    const rowStrings = res.rows.map((row) => {
      const vals = cols.map((c) => escapeSql(row[c]));
      return '  (' + vals.join(', ') + ')';
    });
    out += rowStrings.join(',\n') + ';\n\n';
  }

  out += 'SET FOREIGN_KEY_CHECKS = 1;\n';
  out += 'COMMIT;\n';

  fs.writeFileSync('salonix_phpmyadmin.sql', out, 'utf8');
  console.log('Successfully wrote salonix_phpmyadmin.sql (size: ' + out.length + ' bytes)');
  await pool.end();
}

generatePhpMyAdminSql().catch(console.error);
