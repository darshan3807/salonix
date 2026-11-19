# SALONIX - PROJECT PITCH & PRESENTATION DECK (PPT SCRIPT)
**Project Title:** Salonix – Multi-Role Smart Salon Appointment & Management Platform  
**Developer / Presenter:** Darshan Fulpagar  
**Platform Status:** Live Deployed on Cloud & Local phpMyAdmin Compatible  
**Live URL:** https://ais-pre-dw7wl6e4vlx6mw7mly7ofc-907823050121.asia-east1.run.app  

---

## SLIDE 1: Title & Introduction
- **Header:** SALONIX: Next-Gen Salon Booking & Operations Hub
- **Subtitle:** A Full-Stack Cloud & Relational Platform for Salons and Customers
- **Presenter:** Darshan Fulpagar
- **Project Domain:** Full-Stack Web Application (React, Node.js Express, Relational SQL, phpMyAdmin)
- **Deployment:** Containerized and live in production on Google Cloud Run
- **Evaluation Criteria:** Production-grade architecture, transaction-safe booking, Role-Based Access Control (RBAC), responsive UI.

> **What to Say to Your Teacher:**  
> *"Good morning/afternoon respected teachers and evaluators. Today, I am proud to present Salonix. Unlike simple static websites, Salonix is a production-ready, full-stack appointment scheduling and enterprise management ecosystem. It bridges the gap between walk-in customers seeking zero-wait haircuts and salon owners struggling with manual paper registers and uncoordinated schedules."*

---

## SLIDE 2: Problem Statement & Motivation
- **Customer Problems:**
  - Unpredictable waiting queues: Customers often wait 45 to 90 minutes during peak hours.
  - Lack of upfront price transparency: Service charges and hidden costs are often unclear until billing.
  - Inconvenient scheduling: Inability to check if their preferred stylist is available without awkward phone calls.
- **Salon Owners Problems:**
  - Double-booking chaos: Overlapping bookings made via phone or paper slips.
  - Idle chair hours: No automated visibility into slow weekdays.
  - Lack of digital reach: Small and medium salons cannot afford expensive custom enterprise booking software.

> **What to Say to Your Teacher:**  
> *"In our diploma syllabus and field studies, we observed that salon businesses in India still run on paper diaries or WhatsApp notes. This causes two major pain points: customers experience frustrating wait times, and salon owners lose 20-30% of potential revenue due to double-bookings and unorganized staff hours. Salonix solves both problems simultaneously."*

---

## SLIDE 3: The Salonix Solution (Multi-Role Ecosystem)
Salonix provides three dedicated portals tailored to distinct user personas:
1. **Customer Portal:**
   - City and category-based salon search (Haircut, Spa, Facial, Beard, Bridal).
   - Real-time dynamic slot picker (shows only authentic available slots).
   - One-click booking with instant status tracking (Pending -> Confirmed -> Completed).
2. **Salon Owner Dashboard:**
   - Configure opening/closing timings, slot durations (e.g., 30 mins), and daily break hours.
   - Live revenue analytics and appointment ledger.
   - Accept, reject, or mark bookings as completed.
3. **Super Admin Console:**
   - Platform governance: Approve or suspend registered salons.
   - User account management and role elevation.
   - System-wide revenue, health metrics, and database audit logs.

> **What to Say to Your Teacher:**  
> *"Salonix is not a single-user system. It enforces Role-Based Access Control with 3 distinct interfaces: Customers get an intuitive booking flow, Salon Owners get a full business command center to manage their staff and revenues, and the Platform Admin monitors compliance, security, and verifies new salon registrations."*

---

## SLIDE 4: Technical Architecture & Dual-Database Engine
- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons.
- **Backend:** Node.js, Express.js REST API with middleware architecture.
- **Authentication & Security:** JWT (JSON Web Tokens) with standard 7-day expiration, bcrypt password hashing with salt rounds.
- **Database Engine (Dual-Compatibility):**
  - **Local Development:** MySQL / MariaDB via **phpMyAdmin** on port 3306 (XAMPP / WampServer).
  - **Cloud Production:** Cloud SQL (PostgreSQL) on port 5432.
  - **Dynamic SQL Adapter (`src/db/db.ts`):** Automatically transpiles `$1, $2` parameters into `?` positional queries, allowing zero code modifications between localhost phpMyAdmin and Cloud production!

> **What to Say to Your Teacher:**  
> *"For the technology stack, I used React with Vite and Tailwind CSS on the frontend and Node.js Express for the backend API. An important technical innovation in this project is our dual-database adapter: For local viva and demonstration, it connects directly to MySQL via phpMyAdmin on port 3306, while in production it connects to Cloud SQL. The system automatically converts query parameters without changing any backend code."*

---

## SLIDE 5: Relational Database Schema & phpMyAdmin
Consists of 7 normalized tables ensuring ACID compliance:
1. `users`: Stores user credentials (`id`, `email`, `password_hash`, `role`, `city`, `salon_id`).
2. `salons`: Stores salon profile, timings, slot intervals, break hours, ratings, and owner foreign keys.
3. `services`: Detailed catalog of hair and beauty treatments with durations and prices.
4. `categories`: Groupings for rapid filtering (Haircut, Facial, Spa, Beard, etc.).
5. `appointments`: Central booking table linking customer, salon, service, date, time slot, and status.
6. `notifications`: In-app event alerts for appointments and status updates.
7. `favorites`: Saved bookmark associations per customer.
- **Export Artifact:** Ready-to-import SQL script `salonix_phpmyadmin.sql` (28 KB).

> **What to Say to Your Teacher:**  
> *"Here is the database design in phpMyAdmin. We have 7 relational tables with appropriate primary keys, foreign keys, and indexes. We have also prepared a complete SQL export file called `salonix_phpmyadmin.sql` which can be imported into XAMPP phpMyAdmin in just one click."*

---

## SLIDE 6: Key Engineering Highlights
1. **Dynamic Slot Generation Algorithm:**
   - Computes slots dynamically using: `(Opening Time to Closing Time) - (Break Times) - (Pre-existing Bookings)`.
   - Adapts instantly when an owner updates their operating hours.
2. **Transaction-Safe Concurrency:**
   - Uses SQL transactions to eliminate race conditions when two customers attempt to book the same chair at 3:00 PM.
3. **Enterprise Security:**
   - Zero plaintext passwords; all passwords hashed using bcrypt.
   - HttpOnly-compatible token validation and CORS isolation.

> **What to Say to Your Teacher:**  
> *"From a software engineering perspective, the most complex challenge was concurrency. If two users click book at the same second for the same stylist, our backend uses SQL transaction locks to ensure only one booking succeeds, preventing double-booking errors completely."*

---

## SLIDE 7: Live Demonstration Walkthrough
1. **Demonstration Steps:**
   - Step 1: Open the live URL on screen.
   - Step 2: Browse salons in Pune / Mumbai, filtering by category (e.g. Haircut or Facial).
   - Step 3: Select a salon, view available service items, and click a live time slot.
   - Step 4: Login as customer and confirm the booking.
   - Step 5: Switch to Salon Owner / Admin dashboard to demonstrate live status transition from 'Confirmed' to 'Completed'.

> **What to Say to Your Teacher:**  
> *"The project is 100% functional and live online right now. Let me walk you through a live demonstration of discovering a salon, selecting a haircut, booking a slot, and viewing the notification on the owner's dashboard."*

---

## SLIDE 8: Future Roadmap & Conclusion
- **Future Enhancements:**
  - Online payments via UPI / Razorpay gateway.
  - Automated WhatsApp notifications & SMS reminders 1 hour before appointments.
  - Stylist commission and tips split calculation.
  - Mobile application wrapper with React Native.
- **Conclusion:**
  - Salonix is a complete, scalable, real-world software product that solves genuine business challenges in the grooming industry.

> **What to Say to Your Teacher:**  
> *"In conclusion, Salonix demonstrates full-stack software development, database design with phpMyAdmin, containerized cloud deployment, and real-time business logic. Thank you, respected teachers, for your time and guidance. I am now open to any questions."*
