# SALONIX — Relational Database ER Diagram (`salonix_db`)

This Entity-Relationship Diagram documents the exact MySQL/MariaDB (`InnoDB`, `utf8mb4_unicode_ci`) schema used by **SALONIX** in XAMPP / phpMyAdmin (`database/salonix_mysql.sql`).

## Mermaid ER Diagram

```mermaid
erDiagram
    categories ||--o{ services : "classifies (fk_services_category)"
    users ||--o{ salons : "owns (fk_salons_owner)"
    salons |o--o{ users : "assigned_to (fk_users_salon)"
    salons ||--o{ services : "offers (fk_services_salon)"
    users ||--o{ appointments : "books (fk_appointments_customer)"
    salons ||--o{ appointments : "hosts (fk_appointments_salon)"
    services ||--o{ appointments : "booked_for (fk_appointments_service)"
    users |o--o{ notifications : "receives (fk_notifications_user)"
    salons |o--o{ notifications : "targeted_by (fk_notifications_salon)"
    users ||--o{ favorites : "saves (fk_favorites_user)"
    salons ||--o{ favorites : "saved_in (fk_favorites_salon)"

    categories {
        VARCHAR(128) id PK
        VARCHAR(255) name UK
        TEXT description
        VARCHAR(64) icon_name
    }

    users {
        INT id PK "AUTO_INCREMENT"
        VARCHAR(128) uid UK "Business UID referenced by FKs"
        VARCHAR(255) email UK "Login identifier"
        VARCHAR(255) name
        VARCHAR(64) phone
        VARCHAR(32) role "customer | owner | admin"
        VARCHAR(128) city
        VARCHAR(32) status "active | suspended"
        VARCHAR(128) salon_id FK "NULL for customers/admins"
        TEXT password "bcrypt hash"
        DATETIME created_at
    }

    salons {
        VARCHAR(128) id PK
        VARCHAR(128) owner_id FK "REFERENCES users(uid)"
        VARCHAR(255) owner_name
        VARCHAR(255) name
        VARCHAR(255) tagline
        TEXT description
        TEXT about
        TEXT address
        VARCHAR(128) city
        VARCHAR(128) state
        VARCHAR(32) pincode
        VARCHAR(64) phone
        VARCHAR(255) email
        VARCHAR(16) opening_time
        VARCHAR(16) closing_time
        INT slot_duration_minutes
        VARCHAR(16) break_start_time
        VARCHAR(16) break_end_time
        JSON working_days
        DECIMAL(3_2) rating
        INT review_count
        DECIMAL(10_2) starting_price
        TINYINT(1) featured
        VARCHAR(32) status
        VARCHAR(32) accent_color
        DATETIME created_at
    }

    services {
        VARCHAR(128) id PK
        VARCHAR(128) salon_id FK "REFERENCES salons(id)"
        VARCHAR(128) category_id FK "REFERENCES categories(id)"
        VARCHAR(255) name
        TEXT description
        DECIMAL(10_2) price
        INT duration "Minutes"
        VARCHAR(32) status "active | inactive"
    }

    appointments {
        VARCHAR(128) id PK
        VARCHAR(128) customer_id FK "REFERENCES users(uid)"
        VARCHAR(255) customer_name
        VARCHAR(64) customer_phone
        VARCHAR(255) customer_email
        VARCHAR(128) salon_id FK "REFERENCES salons(id)"
        VARCHAR(255) salon_name
        VARCHAR(128) salon_city
        TEXT salon_address
        VARCHAR(128) service_id FK "REFERENCES services(id)"
        VARCHAR(255) service_name
        DATE date "YYYY-MM-DD"
        VARCHAR(16) start_time "e.g. 10:30 AM"
        VARCHAR(16) end_time "e.g. 11:15 AM"
        INT duration_minutes
        DECIMAL(10_2) price "Snapshot at booking time"
        VARCHAR(32) status "PENDING | CONFIRMED | REJECTED | CANCELLED | COMPLETED | NO_SHOW"
        TEXT notes
        TEXT rejection_reason
        TEXT cancellation_reason
        DATETIME created_at
    }

    notifications {
        VARCHAR(128) id PK
        VARCHAR(32) target_role "customer | owner | admin"
        VARCHAR(128) target_user_id FK "REFERENCES users(uid)"
        VARCHAR(128) target_salon_id FK "REFERENCES salons(id)"
        VARCHAR(255) title
        TEXT message
        VARCHAR(64) type
        TINYINT(1) read "0 = unread, 1 = read"
        VARCHAR(255) action_route
        DATETIME created_at
    }

    favorites {
        INT id PK "AUTO_INCREMENT"
        VARCHAR(128) user_id FK "REFERENCES users(uid), UK with salon_id"
        VARCHAR(128) salon_id FK "REFERENCES salons(id), UK with user_id"
    }
```

## Foreign Key & Cardinality Reference (All 11 InnoDB Constraints)

| # | Constraint Name | Child Table & Column | Parent Table & Column | Cardinality | On Delete | On Update | Business Meaning |
|---|---|---|---|---|---|---|---|
| 1 | `fk_salons_owner` | `salons.owner_id` | `users.uid` | 1:N (Owner → Salon) | `RESTRICT` | `CASCADE` | Prevents deleting an owner account that still owns a salon. |
| 2 | `fk_users_salon` | `users.salon_id` | `salons.id` | 0..1:1 (Salon → Owner User) | `SET NULL` | `CASCADE` | Links a salon owner's account to their primary salon (`NULL` for customers & admins). |
| 3 | `fk_services_salon` | `services.salon_id` | `salons.id` | 1:N (Salon → Services) | `CASCADE` | `CASCADE` | Every service belongs to one salon. |
| 4 | `fk_services_category` | `services.category_id` | `categories.id` | 1:N (Category → Services) | `RESTRICT` | `CASCADE` | Prevents removing a category still used by salon services. |
| 5 | `fk_appointments_customer` | `appointments.customer_id` | `users.uid` | 1:N (Customer → Appointments) | `RESTRICT` | `CASCADE` | Preserves customer booking audit history. |
| 6 | `fk_appointments_salon` | `appointments.salon_id` | `salons.id` | 1:N (Salon → Appointments) | `RESTRICT` | `CASCADE` | Preserves salon booking audit history. |
| 7 | `fk_appointments_service` | `appointments.service_id` | `services.id` | 1:N (Service → Appointments) | `RESTRICT` | `CASCADE` | Prevents deleting a service that already has booked appointments (API also returns HTTP 409). |
| 8 | `fk_notifications_user` | `notifications.target_user_id` | `users.uid` | 1:N (User → Notifications) | `CASCADE` | `CASCADE` | Routes booking status alerts to the target user. |
| 9 | `fk_notifications_salon` | `notifications.target_salon_id` | `salons.id` | 1:N (Salon → Notifications) | `CASCADE` | `CASCADE` | Routes new booking requests to the target salon's owner. |
| 10 | `fk_favorites_user` | `favorites.user_id` | `users.uid` | M:N Bridge (via `favorites`) | `CASCADE` | `CASCADE` | Customer's bookmarked salons (`UNIQUE(user_id, salon_id)` prevents duplicates). |
| 11 | `fk_favorites_salon` | `favorites.salon_id` | `salons.id` | M:N Bridge (via `favorites`) | `CASCADE` | `CASCADE` | Links bookmarked salon record. |

## Viewing This Diagram Live in phpMyAdmin

1. Open **http://localhost/phpmyadmin** in your browser.
2. Click **`salonix_db`** in the left sidebar.
3. Click the **More → Designer** tab in the top navigation bar.
4. phpMyAdmin will automatically draw all 7 tables and all 11 InnoDB foreign-key relationship lines directly from `salonix_db` for your live college demonstration.
