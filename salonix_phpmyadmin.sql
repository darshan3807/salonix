-- =========================================================
-- Salonix MySQL / phpMyAdmin Full Schema & Seed Data
-- Compatible with phpMyAdmin, XAMPP, WampServer, MAMP, MySQL 5.7+ & 8.0+
-- =========================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

CREATE DATABASE IF NOT EXISTS `salonix` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `salonix`;

-- --------------------------------------------------------
-- Table structure for table `users`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uid` varchar(128) DEFAULT NULL,
  `email` varchar(255) NOT NULL UNIQUE,
  `name` varchar(255) NOT NULL,
  `phone` varchar(64) DEFAULT '',
  `role` varchar(32) DEFAULT 'customer',
  `city` varchar(128) DEFAULT 'Pune',
  `status` varchar(32) DEFAULT 'active',
  `salon_id` varchar(128) DEFAULT NULL,
  `password` text DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_users_email` (`email`),
  KEY `idx_users_role` (`role`),
  KEY `idx_users_salon_id` (`salon_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `categories`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `categories`;
CREATE TABLE `categories` (
  `id` varchar(128) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `icon_name` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `salons`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `salons`;
CREATE TABLE `salons` (
  `id` varchar(128) NOT NULL,
  `owner_id` varchar(128) DEFAULT NULL,
  `owner_name` varchar(255) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `tagline` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `about` text DEFAULT NULL,
  `address` text DEFAULT NULL,
  `city` varchar(128) DEFAULT NULL,
  `state` varchar(128) DEFAULT NULL,
  `pincode` varchar(32) DEFAULT NULL,
  `phone` varchar(64) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `opening_time` varchar(16) DEFAULT NULL,
  `closing_time` varchar(16) DEFAULT NULL,
  `slot_duration_minutes` int(11) DEFAULT 30,
  `break_start_time` varchar(16) DEFAULT NULL,
  `break_end_time` varchar(16) DEFAULT NULL,
  `working_days` text DEFAULT NULL,
  `rating` float DEFAULT 0,
  `review_count` int(11) DEFAULT 0,
  `starting_price` int(11) DEFAULT 0,
  `featured` tinyint(1) DEFAULT 0,
  `status` varchar(32) DEFAULT 'active',
  `accent_color` varchar(32) DEFAULT '#b45309',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_salons_city` (`city`),
  KEY `idx_salons_owner` (`owner_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `services`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `services`;
CREATE TABLE `services` (
  `id` varchar(128) NOT NULL,
  `salon_id` varchar(128) NOT NULL,
  `category_id` varchar(128) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `price` int(11) NOT NULL DEFAULT 0,
  `duration` int(11) NOT NULL DEFAULT 30,
  `status` varchar(32) DEFAULT 'active',
  PRIMARY KEY (`id`),
  KEY `idx_services_salon` (`salon_id`),
  KEY `idx_services_category` (`category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `appointments`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `appointments`;
CREATE TABLE `appointments` (
  `id` varchar(128) NOT NULL,
  `customer_id` varchar(128) NOT NULL,
  `customer_name` varchar(255) NOT NULL,
  `customer_phone` varchar(64) DEFAULT NULL,
  `customer_email` varchar(255) DEFAULT NULL,
  `salon_id` varchar(128) NOT NULL,
  `salon_name` varchar(255) DEFAULT NULL,
  `salon_city` varchar(128) DEFAULT NULL,
  `salon_address` text DEFAULT NULL,
  `service_id` varchar(128) NOT NULL,
  `service_name` varchar(255) DEFAULT NULL,
  `date` varchar(32) NOT NULL,
  `start_time` varchar(16) NOT NULL,
  `end_time` varchar(16) NOT NULL,
  `duration_minutes` int(11) NOT NULL DEFAULT 30,
  `price` int(11) NOT NULL DEFAULT 0,
  `status` varchar(32) NOT NULL DEFAULT 'confirmed',
  `notes` text DEFAULT NULL,
  `rejection_reason` text DEFAULT NULL,
  `cancellation_reason` text DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_appointments_customer` (`customer_id`),
  KEY `idx_appointments_salon` (`salon_id`),
  KEY `idx_appointments_date` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `notifications`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
  `id` varchar(128) NOT NULL,
  `target_role` varchar(32) DEFAULT NULL,
  `target_user_id` varchar(128) DEFAULT NULL,
  `target_salon_id` varchar(128) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `type` varchar(64) DEFAULT 'general',
  `read` tinyint(1) DEFAULT 0,
  `action_route` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notifications_user` (`target_user_id`),
  KEY `idx_notifications_salon` (`target_salon_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `favorites`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `favorites`;
CREATE TABLE `favorites` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` varchar(128) NOT NULL,
  `salon_id` varchar(128) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_fav_unique` (`user_id`, `salon_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Dumping data for table `categories` (7 rows)
-- --------------------------------------------------------
INSERT INTO `categories` (`id`, `name`, `description`, `icon_name`) VALUES
  ('cat-beard', 'Beard & Grooming', 'Beard trimming, royal hot towel shave and mustache styling', 'UserCheck'),
  ('cat-bridal', 'Bridal & Makeup', 'Bridal makeup, pre-wedding packages and party glam', 'Heart'),
  ('cat-color', 'Hair Coloring', 'Balayage, highlights, global color and ammonia-free tints', 'Palette'),
  ('cat-facial', 'Facial & Skin Care', 'Hydrating facials, cleanups, detan and skin rejuvenation', 'Smile'),
  ('cat-hair', 'Haircut & Styling', 'Precision haircuts, blow-drys, fade cuts and styling', 'Scissors'),
  ('cat-hands-feet', 'Manicure & Pedicure', 'Express and luxury nail care, foot massage and scrub', 'Hand'),
  ('cat-spa', 'Hair Spa & Care', 'Deep conditioning, keratin treatments and hair rituals', 'Sparkles');

-- --------------------------------------------------------
-- Dumping data for table `users` (20 rows)
-- --------------------------------------------------------
INSERT INTO `users` (`id`, `uid`, `email`, `name`, `phone`, `role`, `city`, `status`, `salon_id`, `created_at`, `password`) VALUES
  (1, 'usr-admin-1', 'admin@salonix.com', 'Rajesh Kulkarni', '+91 98220 11223', 'admin', 'Pune', 'active', NULL, '2026-09-25 07:19:50', '$2b$10$UdCZebJdWfv2m0SXxXqxpuQFOrgW4PDthHO7B9BMv9RJhjdfumsgO'),
  (2, 'usr-owner-1', 'owner@salonix.com', 'Vikram Singhania', '+91 98901 23456', 'owner', 'Pune', 'active', 'salon-1', '2026-09-25 07:19:50', '$2b$10$IoKxZh5WBslleXh1EY7dh.1GsyoqMC9psUPpv.mpJ0PRwH90utdJC'),
  (3, 'usr-owner-2', 'ananya@blushbloom.com', 'Ananya Deshmukh', '+91 97654 32109', 'owner', 'Mumbai', 'active', 'salon-2', '2026-09-25 07:19:50', '$2b$10$K1oBc2GGfkxuGRr0TcNKyuNovlx4/NwSB.ycYl2ew.JuZiV.Pilmq'),
  (4, 'usr-owner-3', 'sanjay@truegroom.com', 'Sanjay Patil', '+91 94231 87654', 'owner', 'Nashik', 'active', 'salon-3', '2026-09-25 07:19:50', '$2b$10$gE09DAa.2e0tcPf9b6xnw.6AMKRls.J8bpAGpIGmL/kQEo4OY8Hcy'),
  (5, 'usr-owner-4', 'meera@luxeglow.com', 'Meera Chordia', '+91 91580 44332', 'owner', 'Jalgaon', 'active', 'salon-4', '2026-09-25 07:19:50', '$2b$10$xgARBexvoiQr/Q3rzlLAc.hqgQCLg57xX.xWDp6d3dZnb7NkbtXiu'),
  (6, 'usr-owner-5', 'rahul@envi.com', 'Rahul Joshi', '+91 99887 66554', 'owner', 'Navi Mumbai', 'active', 'salon-5', '2026-09-25 07:19:50', '$2b$10$Mi.7YZVEfgBvwDj3SLFo1eroLyQFdiu1haqflKOcUTcHMuWj4my3i'),
  (7, 'usr-cust-1', 'user@salonix.com', 'Pooja Sharma', '+91 98234 56780', 'customer', 'Pune', 'active', NULL, '2026-09-25 07:19:50', '$2b$10$csGjDIlIRnySrfwmb0rI9uJPkYVz3P4ggJL3RdmitfsbAUCXX6bce'),
  (8, 'usr-cust-2', 'rohan.mehta@example.com', 'Rohan Mehta', '+91 98112 34567', 'customer', 'Pune', 'active', NULL, '2026-09-25 07:19:50', '$2b$10$AnuOZ3qi2cjfxtGzMQYEf.3rVyFygqdgwhdSvL5kkCD9WjlYLFDLK'),
  (9, 'usr-cust-3', 'sneha.shinde@example.com', 'Sneha Shinde', '+91 98450 12345', 'customer', 'Mumbai', 'active', NULL, '2026-09-25 07:19:50', '$2b$10$3UuR8Cs1XKUG9oBTgnOp8.XcCM0pewWGzxAED8bg36cLkS86IS1HW'),
  (10, 'usr-cust-4', 'aditya.v@example.com', 'Aditya Verma', '+91 97665 43210', 'customer', 'Mumbai', 'active', NULL, '2026-09-25 07:19:50', '$2b$10$R5Y7Ct9ceUtQOQUV/Ydbb.lJWWBK/mIAhJ.FUqi5/0HxYT7vxQ0uS'),
  (11, 'usr-cust-5', 'tanvi.g@example.com', 'Tanvi Gaikwad', '+91 94220 98765', 'customer', 'Nashik', 'active', NULL, '2026-09-25 07:19:50', '$2b$10$z/pHhlsIA8pGWdJhRiW8SeRNQDlcaLIxoU/LHHUnOaL9dhCTNZSWK'),
  (12, 'usr-cust-6', 'amitabh.m@example.com', 'Amitabh More', '+91 91582 34567', 'customer', 'Pune', 'active', NULL, '2026-09-25 07:19:50', '$2b$10$JUyU8nGM8PeztuawEpaGteQ72sZCv2bEwerJBcY7J5lsliaD6//G6'),
  (13, 'usr-cust-7', 'priyanka.c@example.com', 'Priyanka Chavan', '+91 98900 11223', 'customer', 'Navi Mumbai', 'active', NULL, '2026-09-25 07:19:50', '$2b$10$Z.dfuwEXXAS6EngKizY7deet01jTVduAJkXdrIsd4gnnBJJvDG8Nm'),
  (14, 'usr-cust-8', 'nikhil.rane@example.com', 'Nikhil Rane', '+91 98201 55667', 'customer', 'Pune', 'active', NULL, '2026-09-25 07:19:50', '$2b$10$z5tJxKrrNfby3eydLBA3VeEZbh3pVwDmjE.R3oKmmMTSSUdLIowuy'),
  (15, 'usr-cust-9', 'divya.n@example.com', 'Divya Nair', '+91 97643 88990', 'customer', 'Mumbai', 'active', NULL, '2026-09-25 07:19:51', '$2b$10$N07Oqhg2u0MHhxmrK43aIeiAAc8j6fsKU3uf/bnKtsJhuDmkdEaCy'),
  (16, 'usr-cust-10', 'kunal.b@example.com', 'Kunal Bhagat', '+91 94235 66778', 'customer', 'Jalgaon', 'active', NULL, '2026-09-25 07:19:51', '$2b$10$e34G/6GhRGEcc7URUmJhT.Po2weTYzRNajYV0kepzLJvLXYgnYQSa'),
  (21, 'usr-owner-6', 'kavita@elitelounge.com', 'Kavita Joshi', '+91 98234 56789', 'owner', 'Pune', 'active', 'salon-6', '2026-09-25 07:40:05', '$2b$10$qyV7C6PeyrglV5ZD7w0wUOyqrKGDzVt.uAKIANjSLWl4WoMfSlnuK'),
  (22, 'usr-cust-11', 'arjun.k@example.com', 'Arjun Kapoor', '+91 97654 32109', 'customer', 'Mumbai', 'active', NULL, '2026-09-25 07:40:05', '$2b$10$0wG0jWmj12Z6zzTvt9hI4uS0REB.YXSNjUrgmdf9wa2ulzSCMXi3e'),
  (23, 'usr-owner-7', 'shubham@velvetstudio.in', 'Shubham Patil', '+91 99221 44556', 'owner', 'Pune', 'active', 'salon-7', '2026-09-25 07:44:09', '$2b$10$GfdaHdQefgx7ctX6iigRb.RCUOD7/j8QESu.tBuw7jREBuCw0iVhm'),
  (29, 'usr-cust-248946', 'darshan@salonix.com', 'Darshan Mahesh Fulpagar', '8788762713', 'customer', 'Pune', 'active', NULL, '2026-09-27 14:27:28', '$2b$10$wJvfTPNiQl7rcZYcaVTxvucuzDN.J8X3LW8509MimDad29eK/7M..');

-- --------------------------------------------------------
-- Dumping data for table `salons` (7 rows)
-- --------------------------------------------------------
INSERT INTO `salons` (`id`, `owner_id`, `owner_name`, `name`, `tagline`, `description`, `about`, `address`, `city`, `state`, `pincode`, `phone`, `email`, `opening_time`, `closing_time`, `slot_duration_minutes`, `break_start_time`, `break_end_time`, `working_days`, `rating`, `review_count`, `starting_price`, `featured`, `status`, `accent_color`, `created_at`) VALUES
  ('salon-1', 'usr-owner-1', 'Vikram Singhania', 'Aura Luxury Salon & Spa', 'High-end styling and rejuvenating wellness in Koregaon Park', 'A premier luxury unisex salon offering customized hair rituals, international styling, certified organic facials, and bridal studio services.', 'Established in 2021 in the heart of Koregaon Park, Aura Luxury Salon & Spa blends bespoke European styling techniques with calming Ayurvedic touches. Our senior stylists and therapists bring over 12 years of craftsmanship to ensure every visit is relaxing, pristine, and transformative.', 'Lane 7, Near North Main Road, Koregaon Park', 'Pune', 'Maharashtra', '411001', '+91 98901 23456', 'concierge@aurasalon.in', '10:00', '20:30', 30, '13:30', '14:30', '[\"Mon\",\"Tue\",\"Wed\",\"Thu\",\"Fri\",\"Sat\",\"Sun\"]', 4.8, 342, 350, 1, 'approved', '#6B21A8', '2026-09-25 07:19:50'),
  ('salon-2', 'usr-owner-2', 'Ananya Deshmukh', 'Blush & Bloom Unisex Salon', 'Contemporary aesthetic salon & bridal makeup studio', 'Trendy, bright and welcoming aesthetic salon catering to all genders with signature hair transformations and luxury manicures.', 'Blush & Bloom brings Bandra elegance to life with an airy, botanical interior and certified technicians. Whether you need a crisp fade, a trending balayage, or a therapeutic botanical facial, our team delivers personalized attention.', 'Pali Hill Road, Bandra West', 'Mumbai', 'Maharashtra', '400050', '+91 97654 32109', 'hello@blushandbloom.in', '09:30', '20:00', 30, '13:00', '14:00', '[\"Tue\",\"Wed\",\"Thu\",\"Fri\",\"Sat\",\"Sun\"]', 4.7, 289, 300, 1, 'approved', '#9333EA', '2026-09-25 07:19:50'),
  ('salon-3', 'usr-owner-3', 'Sanjay Patil', 'TrueGroom Men\'s Lounge', 'Classic gentleman barbering and modern beard architecture', 'Exclusive men\'s grooming lounge offering traditional hot towel wet shaves, precision fades, charcoal facials, and beard sculpting.', 'TrueGroom redefines the classic barbering ritual with plush leather chairs, heritage woodwork, and artisanal grooming products. Located in Nashik\'s prestigious College Road, we offer busy professionals a sanctuary for sharp cuts and relaxing head massages.', 'Opposite Big Bazaar, College Road', 'Nashik', 'Maharashtra', '422005', '+91 94231 87654', 'service@truegroom.in', '09:00', '21:00', 30, '13:00', '14:00', '[\"Mon\",\"Tue\",\"Wed\",\"Thu\",\"Fri\",\"Sat\",\"Sun\"]', 4.6, 215, 200, 0, 'approved', '#7E22CE', '2026-09-25 07:19:50'),
  ('salon-4', 'usr-owner-4', 'Meera Chordia', 'Luxe Glow Beauty Bar', 'Holistic skin rejuvenation, nail art and hair spa', 'Warm and inviting beauty bar specializing in gold facials, nail extensions, hair keratin treatments, and bridal party grooming.', 'Founded by aesthetician Meera Chordia, Luxe Glow has been Jalgaon’s favorite beauty destination for over five years. We prioritize hygiene, using single-use kits and dermatologist-tested organic formulations.', 'Near Old Bus Stand, Court Road', 'Jalgaon', 'Maharashtra', '425001', '+91 91580 44332', 'info@luxeglow.in', '10:00', '19:30', 30, '13:30', '14:30', '[\"Mon\",\"Tue\",\"Wed\",\"Thu\",\"Fri\",\"Sat\"]', 4.5, 178, 220, 0, 'approved', '#A855F7', '2026-09-25 07:19:50'),
  ('salon-5', 'usr-owner-5', 'Rahul Joshi', 'Envi Salon & Studio', 'High-fashion editorial hair transformations & bridal glam', 'Modern salon chain studio featuring L’Oréal professionally trained colorists, Moroccan oil hair spa rituals, and festive makeup.', 'Located in Palm Beach Galleria, Envi Salon & Studio provides a sleek, metropolitan setting with expert hairdressers, hygienic pedicure spas, and custom skin consults.', 'Floor 1, Palm Beach Galleria, Vashi', 'Navi Mumbai', 'Maharashtra', '400703', '+91 99887 66554', 'vashi@envisalon.in', '10:00', '21:00', 30, '14:00', '15:00', '[\"Mon\",\"Tue\",\"Wed\",\"Thu\",\"Fri\",\"Sat\",\"Sun\"]', 4.7, 310, 320, 1, 'approved', '#581C87', '2026-09-25 07:19:50'),
  ('salon-6', 'usr-owner-6', 'Kavita Shirole', 'Kavita Elite Hair & Skin Lounge', 'Boutique bridal studio & creative haircutting in FC Road', 'Chic, newly opened boutique salon known for gentle scalp detox and natural bridal glows.', 'Kavita Elite Lounge is a newly registered salon designed for modern youth and wedding parties seeking high standard hygiene and artistic hairstyling.', 'Above Starbucks, FC Road, Shivajinagar', 'Pune', 'Maharashtra', '411005', '+91 98223 99887', 'kavita@elitelounge.in', '10:00', '20:00', 30, '13:00', '14:00', '[\"Mon\",\"Tue\",\"Wed\",\"Thu\",\"Fri\",\"Sat\"]', 4.9, 42, 280, 0, 'approved', '#7C3AED', '2026-09-25 07:19:50'),
  ('salon-7', 'usr-owner-7', 'Shubham Patil', 'Velvet Touch Unisex Salon', 'Contemporary styling and aesthetic spa treatments', 'Premium salon located in Viman Nagar', '', 'Shop 12, Phoenix Marketcity Road, Viman Nagar', 'Pune', 'Maharashtra', '411014', '+91 99221 44556', 'shubham@velvetstudio.in', '09:30 AM', '08:30 PM', 30, '13:00', '14:00', '[\"Mon\",\"Tue\",\"Wed\",\"Thu\",\"Fri\",\"Sat\"]', 5, 0, 300, 0, 'pending', '#0f172a', '2026-09-25 07:44:09');

-- --------------------------------------------------------
-- Dumping data for table `services` (23 rows)
-- --------------------------------------------------------
INSERT INTO `services` (`id`, `salon_id`, `category_id`, `name`, `description`, `price`, `duration`, `status`) VALUES
  ('srv-101', 'salon-1', 'cat-hair', 'Signature Precision Haircut & Styling', 'Includes hair wash, expert consultation, precision haircut, and blowout styling.', 350, 30, 'active'),
  ('srv-102', 'salon-1', 'cat-spa', 'Keratin Deep Moisture Hair Spa', 'Nutrient-infused scalp massage, deep hydration mask, steam therapy, and serum finish.', 750, 60, 'active'),
  ('srv-103', 'salon-1', 'cat-facial', 'O3+ Whitening & Glow Facial', '7-step premium brightening facial with brightening peel-off mask and lymphatic massage.', 1200, 60, 'active'),
  ('srv-104', 'salon-1', 'cat-facial', 'Instant Fruit Cleanup & Detan', 'Gentle exfoliating scrub, blackhead extraction, soothing aloe vera pack, and sun protection.', 500, 30, 'active'),
  ('srv-105', 'salon-1', 'cat-beard', 'Royal Hot Towel Beard Sculpting', 'Aromatic warm towel therapy, razor sharp edge alignment, and organic beard oil treatment.', 250, 25, 'active'),
  ('srv-106', 'salon-1', 'cat-hands-feet', 'Deluxe Rose Petal Pedicure', 'Epsom salt soak, dead skin buffing, cuticle care, rose foot scrub, and relaxing massage.', 650, 45, 'active'),
  ('srv-107', 'salon-1', 'cat-color', 'Ammonia-Free Global Hair Color', 'Rich vibrant coverage with L’Oréal Inoa ammonia-free gloss and color locking treatment.', 2400, 90, 'active'),
  ('srv-108', 'salon-1', 'cat-bridal', 'HD Bridal Makeup & Hair Styling', 'Complete high-definition camera makeup, lash application, saree draping, and elaborate hairstyle.', 6500, 120, 'active'),
  ('srv-201', 'salon-2', 'cat-hair', 'Haircut & Volumizing Blowdry', 'Customized hair styling to match face shape, finished with high-gloss heat protectant.', 300, 30, 'active'),
  ('srv-202', 'salon-2', 'cat-spa', 'Moroccan Argan Oil Hair Spa', 'Intense repair treatment for frizzy hair using authentic Moroccan argan oil.', 800, 60, 'active'),
  ('srv-203', 'salon-2', 'cat-facial', 'Hydra-Dew Botanical Facial', 'Deep moisture replenishment for dull urban skin with cooling jade roller finish.', 950, 45, 'active'),
  ('srv-204', 'salon-2', 'cat-hands-feet', 'Gel Polish Manicure & Hand Mask', 'Cuticle restoration, smoothing scrub, paraffin wax dip, and long-lasting UV gel color.', 600, 45, 'active'),
  ('srv-205', 'salon-2', 'cat-color', 'Sun-Kissed Caramel Balayage', 'Hand-painted dimensional highlights with bonding treatment for zero breakage.', 3200, 120, 'active'),
  ('srv-301', 'salon-3', 'cat-hair', 'Classic Men\'s Haircut & Head Wash', 'Scissor and clipper precision cut with invigorating cooling menthol shampoo.', 200, 30, 'active'),
  ('srv-302', 'salon-3', 'cat-beard', 'Signature Beard Trim & Mustache Wax', 'Shaping along natural cheek lines, electric clipper trimming, and styling wax.', 150, 20, 'active'),
  ('srv-303', 'salon-3', 'cat-facial', 'Activated Charcoal Deep Pore Detan', 'Targeted for outdoor grime and sun damage; extracts impurities and cleans pores.', 450, 30, 'active'),
  ('srv-304', 'salon-3', 'cat-spa', 'Anti-Dandruff Scalp Detox Ritual', 'Tea-tree therapeutic scalp treatment with steam and 15-minute neck tension release.', 600, 45, 'active'),
  ('srv-401', 'salon-4', 'cat-hair', 'Split Ends Removal & Layered Haircut', 'Clean trim and modern multi-layered styling with blowout finish.', 220, 30, 'active'),
  ('srv-402', 'salon-4', 'cat-facial', '24K Gold Radiant Glow Facial', 'Enriched with gold flakes and collagen boosters for celebratory occasions.', 850, 50, 'active'),
  ('srv-403', 'salon-4', 'cat-spa', 'Protein Hair Spa Treatment', 'Strengthens weak hair strands and smoothens rough cuticles.', 550, 45, 'active'),
  ('srv-501', 'salon-5', 'cat-hair', 'Creative Cut & Texture Finish', 'Bespoke cut by master stylist with feathering and styling paste.', 320, 30, 'active'),
  ('srv-502', 'salon-5', 'cat-spa', 'L’Oréal Absolut Repair Hair Spa', 'Infused with gold quinoa + protein for damaged cuticles.', 700, 50, 'active'),
  ('srv-503', 'salon-5', 'cat-facial', 'Vitamin C Brightening Facial', 'Potent antioxidant booster that evens tone and restores elasticity.', 1100, 60, 'active');

-- --------------------------------------------------------
-- Dumping data for table `appointments` (12 rows)
-- --------------------------------------------------------
INSERT INTO `appointments` (`id`, `customer_id`, `customer_name`, `customer_phone`, `customer_email`, `salon_id`, `salon_name`, `salon_city`, `salon_address`, `service_id`, `service_name`, `date`, `start_time`, `end_time`, `duration_minutes`, `price`, `status`, `notes`, `rejection_reason`, `cancellation_reason`, `created_at`) VALUES
  ('apt-1001', 'usr-cust-1', 'Pooja Sharma', '+91 98234 56780', 'user@salonix.com', 'salon-1', 'Aura Luxury Salon & Spa', 'Pune', 'Lane 7, Koregaon Park', 'srv-101', 'Signature Precision Haircut & Styling', '2026-09-25', '11:00 AM', '11:30 AM', 30, 350, 'confirmed', 'Please recommend a style for shoulder-length hair.', NULL, NULL, '2026-09-25 07:19:51'),
  ('apt-1002', 'usr-cust-2', 'Rohan Mehta', '+91 98112 34567', 'rohan.mehta@example.com', 'salon-1', 'Aura Luxury Salon & Spa', 'Pune', 'Lane 7, Koregaon Park', 'srv-105', 'Royal Hot Towel Beard Sculpting', '2026-09-25', '04:00 PM', '04:25 PM', 25, 250, 'PENDING', 'Need crisp contouring for wedding tomorrow.', NULL, NULL, '2026-09-25 07:19:51'),
  ('apt-1003', 'usr-cust-1', 'Pooja Sharma', '+91 98234 56780', 'user@salonix.com', 'salon-1', 'Aura Luxury Salon & Spa', 'Pune', 'Lane 7, Koregaon Park', 'srv-103', 'O3+ Whitening & Glow Facial', '2026-09-27', '02:30 PM', '03:30 PM', 60, 1200, 'CONFIRMED', 'Skin sensitive to harsh exfoliants.', NULL, NULL, '2026-09-25 07:19:51'),
  ('apt-1004', 'usr-cust-6', 'Amitabh More', '+91 91582 34567', 'amitabh.m@example.com', 'salon-1', 'Aura Luxury Salon & Spa', 'Pune', 'Lane 7, Koregaon Park', 'srv-102', 'Keratin Deep Moisture Hair Spa', '2026-09-25', '05:30 PM', '06:30 PM', 60, 750, 'CONFIRMED', NULL, NULL, NULL, '2026-09-25 07:19:51'),
  ('apt-1005', 'usr-cust-1', 'Pooja Sharma', '+91 98234 56780', 'user@salonix.com', 'salon-1', 'Aura Luxury Salon & Spa', 'Pune', 'Lane 7, Koregaon Park', 'srv-104', 'Instant Fruit Cleanup & Detan', '2026-09-15', '03:00 PM', '03:30 PM', 30, 500, 'COMPLETED', NULL, NULL, NULL, '2026-09-25 07:19:51'),
  ('apt-1006', 'usr-cust-1', 'Pooja Sharma', '+91 98234 56780', 'user@salonix.com', 'salon-2', 'Blush & Bloom Unisex Salon', 'Mumbai', 'Pali Hill Road, Bandra', 'srv-204', 'Gel Polish Manicure & Hand Mask', '2026-08-28', '01:00 PM', '01:45 PM', 45, 600, 'COMPLETED', NULL, NULL, NULL, '2026-09-25 07:19:51'),
  ('apt-1007', 'usr-cust-1', 'Pooja Sharma', '+91 98234 56780', 'user@salonix.com', 'salon-1', 'Aura Luxury Salon & Spa', 'Pune', 'Lane 7, Koregaon Park', 'srv-106', 'Deluxe Rose Petal Pedicure', '2026-09-10', '04:00 PM', '04:45 PM', 45, 650, 'CANCELLED', NULL, NULL, NULL, '2026-09-25 07:19:51'),
  ('apt-1008', 'usr-cust-8', 'Nikhil Rane', '+91 98201 55667', 'nikhil.rane@example.com', 'salon-1', 'Aura Luxury Salon & Spa', 'Pune', 'Lane 7, Koregaon Park', 'srv-107', 'Ammonia-Free Global Hair Color', '2026-09-20', '07:30 PM', '09:00 PM', 90, 2400, 'REJECTED', NULL, NULL, NULL, '2026-09-25 07:19:51'),
  ('apt-1009', 'usr-cust-5', 'Tanvi Gaikwad', '+91 94220 98765', 'tanvi.g@example.com', 'salon-3', 'TrueGroom Men\'s Lounge', 'Nashik', 'College Road', 'srv-301', 'Classic Men\'s Haircut & Head Wash', '2026-09-26', '10:30 AM', '11:00 AM', 30, 200, 'CONFIRMED', NULL, NULL, NULL, '2026-09-25 07:19:51'),
  ('apt-1010', 'usr-cust-7', 'Priyanka Chavan', '+91 98900 11223', 'priyanka.c@example.com', 'salon-5', 'Envi Salon & Studio', 'Navi Mumbai', 'Palm Beach Galleria, Vashi', 'srv-503', 'Vitamin C Brightening Facial', '2026-09-21', '02:00 PM', '03:00 PM', 60, 1100, 'COMPLETED', NULL, NULL, NULL, '2026-09-25 07:19:51'),
  ('apt-1011', 'usr-cust-2', 'Rohan Mehta', '+91 98112 34567', 'rohan.mehta@example.com', 'salon-1', 'Aura Luxury Salon & Spa', 'Pune', 'Lane 7, Koregaon Park', 'srv-101', 'Signature Precision Haircut & Styling', '2026-09-18', '01:00 PM', '01:30 PM', 30, 350, 'NO_SHOW', NULL, NULL, NULL, '2026-09-25 07:19:51'),
  ('apt-1790519305855', 'usr-cust-248946', 'Darshan Mahesh Fulpagar', '8788762713', 'darshan@salonix.com', 'salon-1', 'Aura Luxury Salon & Spa', 'Pune', 'Lane 7, Near North Main Road, Koregaon Park', 'srv-101', 'Signature Precision Haircut & Styling', '2026-09-30', '01:00 PM', '01:30 PM', 30, 350, 'confirmed', '', NULL, NULL, '2026-09-27 14:28:25');

-- --------------------------------------------------------
-- Dumping data for table `notifications` (9 rows)
-- --------------------------------------------------------
INSERT INTO `notifications` (`id`, `target_role`, `target_user_id`, `target_salon_id`, `title`, `message`, `type`, `read`, `action_route`, `created_at`) VALUES
  ('notif-1', 'customer', 'usr-cust-1', NULL, 'Appointment Request Submitted', 'Your booking for Precision Haircut at Aura Luxury Salon & Spa is pending owner confirmation.', 'info', 0, NULL, '2026-09-25 07:19:51'),
  ('notif-1790323959597', 'admin', NULL, NULL, 'New Customer Pending Approval', 'Darshan Mahesh Fulpagar (test_darshan@gmail.com) registered as a Customer and is awaiting verification.', 'approval_request', 0, '/admin/approvals', '2026-09-25 08:12:39'),
  ('notif-1790323980117', 'admin', NULL, NULL, 'New Customer Pending Approval', 'Darshan Mahesh Fulpagar (darshan@gmail.com) registered as a Customer and is awaiting verification.', 'approval_request', 0, '/admin/approvals', '2026-09-25 08:13:00'),
  ('notif-1790324080656', 'admin', NULL, NULL, 'New Customer Pending Approval', 'Test User (test_verify_99@example.com) registered as a Customer and is awaiting verification.', 'approval_request', 0, '/admin/approvals', '2026-09-25 08:14:40'),
  ('notif-1790324838669', 'admin', NULL, NULL, 'New Customer Registered', 'Darshan Fulpagar (darshan.test@gmail.com) joined as a Customer.', 'new_user', 0, '/admin/approvals', '2026-09-25 08:27:18'),
  ('notif-1790411000695', 'admin', NULL, NULL, 'New Customer Registered', 'Test Customer (testcust@salonix.com) joined as a Customer.', 'new_user', 0, '/admin/approvals', '2026-09-26 08:23:20'),
  ('notif-1790519248946', 'admin', NULL, NULL, 'New Customer Registered', 'Darshan Mahesh Fulpagar (darshan@salonix.com) joined as a Customer.', 'new_user', 0, '/admin/approvals', '2026-09-27 14:27:28'),
  ('notif-2', 'owner', NULL, 'salon-1', 'New Appointment Request', 'Pooja Sharma requested Signature Haircut for Sep 25, 11:00 AM. Please review.', 'alert', 0, NULL, '2026-09-25 07:19:51'),
  ('notif-3', 'admin', NULL, NULL, 'New Salon Registration', 'Kavita Elite Hair & Skin Lounge in Pune has registered and is awaiting admin approval.', 'warning', 0, NULL, '2026-09-25 07:19:51');

SET FOREIGN_KEY_CHECKS = 1;
COMMIT;
