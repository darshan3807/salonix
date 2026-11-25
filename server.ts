import dotenv from 'dotenv';
import fs from 'fs';

// 1. Load standard .env if present
dotenv.config();

// 2. Load Cloud Run / AI Studio environment file (/app/.dev.env.json) if present
try {
  if (fs.existsSync('/app/.dev.env.json')) {
    const devEnv = JSON.parse(fs.readFileSync('/app/.dev.env.json', 'utf8'));
    for (const [key, value] of Object.entries(devEnv)) {
      if (!process.env[key] && typeof value === 'string') {
        process.env[key] = value;
      }
    }
  }
} catch (e) {
  // Silent catch
}

import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { pool, query, getClient, ensureSchema, migratePlaintextPasswords, getDbConfigInfo } from './src/db/db.ts';
import { generateToken, requireAuth, requireRole, requireAdmin, requireSalonOwner, requireCustomer } from './src/middleware/auth.ts';
import { serializeUser } from './src/lib/userSerializer.ts';
import {
  timeStringToMinutes,
  minutesToDisplayTime,
  minutesTo24HTime,
  isSalonOpenOnDate,
  isStatusBlocking,
  intervalsOverlap,
  generateAvailableSlots,
  getLocalDateString,
  isSlotInPast,
  type BookedInterval,
} from './src/lib/slotUtils.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

// Health Check Endpoints for Cloud Run / Container Probes
app.get(['/healthz', '/api/health'], (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: getDbConfigInfo(),
  });
});

// Helper: Create persistent PostgreSQL notification
async function createNotification(
  executor: { query: (text: string, params?: any[]) => Promise<any> },
  params: {
    targetRole: 'customer' | 'owner' | 'admin';
    targetUserId?: string | null;
    targetSalonId?: string | null;
    title: string;
    message: string;
    type: string;
    actionRoute?: string;
  }
) {
  const notifId = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  await executor.query(
    `INSERT INTO notifications (
      id, target_role, target_user_id, target_salon_id,
      title, message, type, read, action_route, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, false, $8, NOW())`,
    [
      notifId,
      params.targetRole,
      params.targetUserId || null,
      params.targetSalonId || null,
      params.title,
      params.message,
      params.type,
      params.actionRoute || null,
    ]
  );
  return notifId;
}

// API Routes

// 1. Auth: Login
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await query(
      'SELECT * FROM users WHERE LOWER(email) = LOWER($1)',
      [email.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'No account found with this email. Please check your credentials or sign up.' });
    }

    const user = result.rows[0];

    // Secure password verification with bcrypt (no master password bypass)
    if (!user.password) {
      return res.status(401).json({ error: 'Incorrect email or password. Please try again.' });
    }

    const isBcrypt = user.password.startsWith('$2a$') || user.password.startsWith('$2b$') || user.password.startsWith('$2y$');
    let passwordValid = false;

    if (isBcrypt) {
      passwordValid = await bcrypt.compare(password, user.password);
    } else {
      // Safe fallback for unmigrated record: strictly check user's OWN password, then upgrade to bcrypt hash
      if (user.password === password) {
        passwordValid = true;
        const newHash = await bcrypt.hash(password, 10);
        await query('UPDATE users SET password = $1 WHERE id = $2', [newHash, user.id]);
      }
    }

    if (!passwordValid) {
      return res.status(401).json({ error: 'Incorrect email or password. Please try again.' });
    }

    // Check account status
    if (user.status === 'rejected') {
      return res.status(403).json({
        error: 'account_rejected',
        message: 'Your account was reviewed and deactivated by the administrator. Please contact support at support@salonix.com.',
        user: {
          name: user.name,
          email: user.email,
          role: user.role,
          status: 'rejected'
        }
      });
    }

    // If salon owner, attach salon details if available
    let salon = null;
    let actualSalonId = user.salon_id;
    if (user.role === 'owner') {
      const salonRes = await query(
        'SELECT * FROM salons WHERE owner_id = $1 OR id = $2',
        [user.uid, user.salon_id || '']
      );
      if (salonRes.rows.length > 0) {
        salon = salonRes.rows[0];
        actualSalonId = salon.id;
      }
    }

    const safeUser = serializeUser(user, salon);

    const token = generateToken({
      id: user.id,
      uid: user.uid,
      email: user.email,
      role: user.role,
      salonId: actualSalonId,
    });

    return res.json({
      success: true,
      token,
      user: safeUser,
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error during login: ' + err.message });
  }
});

// 1b. Auth: Get Current Authenticated User (GET /api/auth/me)
app.get('/api/auth/me', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized. Token missing or invalid.' });
    }

    const result = await query(
      'SELECT id, uid, name, email, phone, role, city, status, salon_id, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    const user = result.rows[0];

    if (user.status === 'rejected') {
      return res.status(403).json({ error: 'account_rejected', message: 'Account is deactivated.' });
    }

    let salon = null;
    if (user.role === 'owner') {
      const salonRes = await query(
        'SELECT * FROM salons WHERE owner_id = $1 OR id = $2',
        [user.uid, user.salon_id || '']
      );
      if (salonRes.rows.length > 0) {
        salon = salonRes.rows[0];
      }
    }

    const safeUser = serializeUser(user, salon);
    return res.json({
      success: true,
      user: safeUser,
    });
  } catch (err: any) {
    console.error('Auth check error:', err);
    return res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

// 1c. Auth: Update Authenticated User Profile (PATCH /api/auth/profile)
app.patch('/api/auth/profile', requireAuth, async (req: Request, res: Response) => {
  try {
    const authUser = req.user!;
    const { name, phone, city, currentPassword, newPassword } = req.body;

    const userRes = await query('SELECT * FROM users WHERE id = $1', [authUser.id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User account not found.' });
    }
    const currentUser = userRes.rows[0];

    const updates: Record<string, any> = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length < 2) {
        return res.status(400).json({ error: 'Full name must be at least 2 characters.' });
      }
      if (name.trim().length > 100) {
        return res.status(400).json({ error: 'Full name must not exceed 100 characters.' });
      }
      updates.name = name.trim();
    }

    if (phone !== undefined) {
      const trimmedPhone = typeof phone === 'string' ? phone.trim() : '';
      if (trimmedPhone.length > 0 && trimmedPhone.length < 6) {
        return res.status(400).json({ error: 'Please enter a valid phone number (at least 6 digits).' });
      }
      updates.phone = trimmedPhone;
    }

    if (city !== undefined) {
      if (typeof city !== 'string' || city.trim().length === 0) {
        return res.status(400).json({ error: 'City cannot be empty.' });
      }
      updates.city = city.trim();
    }

    // Optional password change with current password verification
    if (newPassword !== undefined && newPassword !== '') {
      if (typeof newPassword !== 'string' || newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
      }
      if (!currentPassword || typeof currentPassword !== 'string') {
        return res.status(400).json({ error: 'Current password is required to set a new password.' });
      }

      const isBcrypt =
        currentUser.password &&
        (currentUser.password.startsWith('$2a$') ||
          currentUser.password.startsWith('$2b$') ||
          currentUser.password.startsWith('$2y$'));
      const validCurrent = isBcrypt
        ? await bcrypt.compare(currentPassword, currentUser.password)
        : currentUser.password === currentPassword;

      if (!validCurrent) {
        return res.status(400).json({ error: 'Current password is incorrect.' });
      }

      updates.password = await bcrypt.hash(newPassword, 10);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid profile fields provided to update.' });
    }

    const setClauses: string[] = [];
    const params: any[] = [];
    Object.entries(updates).forEach(([col, val]) => {
      params.push(val);
      setClauses.push(`${col} = $${params.length}`);
    });
    params.push(authUser.id);

    await query(
      `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${params.length}`,
      params
    );

    const updatedRes = await query(
      'SELECT id, uid, name, email, phone, role, city, status, salon_id, created_at FROM users WHERE id = $1',
      [authUser.id]
    );
    const updatedUser = updatedRes.rows[0];
    let salon = null;
    if (updatedUser.role === 'owner') {
      const salonRes = await query(
        'SELECT * FROM salons WHERE owner_id = $1 OR id = $2',
        [updatedUser.uid, updatedUser.salon_id || '']
      );
      if (salonRes.rows.length > 0) salon = salonRes.rows[0];
    }

    return res.json({
      success: true,
      user: serializeUser(updatedUser, salon),
      message: 'Profile updated successfully.',
    });
  } catch (err: any) {
    console.error('Update profile error:', err);
    return res.status(500).json({ error: 'Failed to update profile: ' + err.message });
  }
});

// 2. Auth: Register (Cross-DB portable PostgreSQL & MariaDB/MySQL, transaction-safe)
app.post('/api/auth/register', async (req: Request, res: Response) => {
  const client = await getClient();
  let inTransaction = false;
  try {
    const {
      name,
      email,
      phone,
      city,
      password,
      role = 'customer',
      salonName,
      salonAddress,
      openingTime,
      closingTime,
      startingPrice,
      aboutSalon,
    } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ error: 'Full name is required (at least 2 characters).' });
    }
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const assignedRole = role === 'owner' ? 'owner' : 'customer';
    if (assignedRole === 'owner' && salonName !== undefined && typeof salonName === 'string' && salonName.trim().length === 0) {
      return res.status(400).json({ error: 'Salon business name cannot be empty.' });
    }

    const normalizedEmail = email.trim();
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if email already registered
    const existing = await client.query(
      'SELECT id, status, role FROM users WHERE LOWER(email) = LOWER($1)',
      [normalizedEmail]
    );

    if (existing.rows.length > 0) {
      const existingUser = existing.rows[0];
      if (existingUser.status === 'pending') {
        return res.status(409).json({
          error: 'An account with this email is already registered and awaiting administrator approval.'
        });
      }
      return res.status(409).json({
        error: 'An account with this email already exists. Please log in instead.'
      });
    }

    const timestamp = Date.now();
    const randSuffix = Math.random().toString(36).slice(2, 6);
    const newUid = `usr-${assignedRole === 'owner' ? 'owner' : 'cust'}-${timestamp.toString().slice(-6)}-${randSuffix}`;
    let assignedSalonId: string | null = null;

    // Normalize owner operating hours to standard 24h format (matching schema & slot engine)
    const parsedOpenMin = timeStringToMinutes(openingTime) ?? timeStringToMinutes('09:00')!;
    const parsedCloseMin = timeStringToMinutes(closingTime) ?? timeStringToMinutes('20:00')!;
    const normalizedOpen = parsedOpenMin < parsedCloseMin ? minutesTo24HTime(parsedOpenMin) : '09:00';
    const normalizedClose = parsedOpenMin < parsedCloseMin ? minutesTo24HTime(parsedCloseMin) : '20:00';

    await client.query('BEGIN');
    inTransaction = true;

    // 1. Insert user FIRST with salon_id = NULL so fk_salons_owner (salons.owner_id -> users.uid) is always satisfied
    await client.query(
      `INSERT INTO users (
        uid, email, name, phone, role, city, status, salon_id, password, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
      [
        newUid,
        normalizedEmail,
        name.trim(),
        phone ? String(phone).trim() : '',
        assignedRole,
        city ? String(city).trim() : 'Pune',
        'active',
        null,
        hashedPassword,
      ]
    );

    // 2. If salon owner, create salon entry + link users.salon_id + 3 starter services atomically
    if (assignedRole === 'owner') {
      assignedSalonId = `salon-${timestamp.toString().slice(-6)}-${randSuffix}`;
      await client.query(
        `INSERT INTO salons (
          id, owner_id, owner_name, name, tagline, description, about,
          address, city, state, pincode, phone, email,
          opening_time, closing_time, slot_duration_minutes, working_days,
          rating, review_count, starting_price, featured, status, accent_color, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12, $13,
          $14, $15, $16, $17,
          $18, $19, $20, $21, $22, $23, NOW()
        )`,
        [
          assignedSalonId,
          newUid,
          name.trim(),
          salonName && typeof salonName === 'string' && salonName.trim()
            ? salonName.trim()
            : `${name.trim()}'s Salon`,
          'Premium Hair, Beauty & Grooming Experience',
          aboutSalon || 'Professional salon offering haircuts, styling, skincare and grooming services.',
          aboutSalon || 'Book slots online with verified experienced stylists and aesthetic specialists.',
          salonAddress && typeof salonAddress === 'string' && salonAddress.trim()
            ? salonAddress.trim()
            : `${city || 'City Center'}, Main Road`,
          city ? String(city).trim() : 'Pune',
          'Maharashtra',
          '411001',
          phone ? String(phone).trim() : '+91 98000 00000',
          normalizedEmail,
          normalizedOpen,
          normalizedClose,
          30,
          JSON.stringify(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']),
          5.0,
          0,
          Math.max(0, Number(startingPrice) || 250),
          false,
          'pending',
          '#0f172a',
        ]
      );

      // Link owner user record to the newly created salon (satisfies fk_users_salon)
      await client.query(
        'UPDATE users SET salon_id = $1 WHERE uid = $2',
        [assignedSalonId, newUid]
      );

      // Add 3 default services for this new salon
      await client.query(
        `INSERT INTO services (id, salon_id, category_id, name, description, price, duration, status)
         VALUES 
          ($1, $2, 'cat-hair', 'Signature Haircut & Styling', 'Custom haircut with wash and blow dry styling', 350, 30, 'active'),
          ($3, $2, 'cat-beard', 'Royal Beard Shaping & Trim', 'Precision beard trim with hot towel finish', 200, 20, 'active'),
          ($4, $2, 'cat-facial', 'Glow Facial & Clean-Up', 'Deep cleansing and skin rejuvenation', 550, 45, 'active')`,
        [
          `srv-${timestamp}-${randSuffix}-1`,
          assignedSalonId,
          `srv-${timestamp}-${randSuffix}-2`,
          `srv-${timestamp}-${randSuffix}-3`,
        ]
      );
    }

    const userSelect = await client.query(
      'SELECT id, uid, name, email, phone, role, city, status, salon_id, created_at FROM users WHERE uid = $1',
      [newUid]
    );

    if (userSelect.rows.length === 0) {
      throw new Error('Failed to retrieve newly created user record.');
    }

    const newUser = userSelect.rows[0];

    // Create admin notification
    await createNotification(client, {
      targetRole: 'admin',
      targetUserId: null,
      targetSalonId: assignedSalonId,
      title: `New ${assignedRole === 'owner' ? 'Salon Owner' : 'Customer'} Registered`,
      message: `${newUser.name} (${newUser.email}) joined as a ${assignedRole === 'owner' ? 'Salon Partner' : 'Customer'}.`,
      type: 'new_user',
      actionRoute: 'admin-dashboard',
    });

    let salonData = null;
    if (assignedSalonId) {
      const sRes = await client.query('SELECT * FROM salons WHERE id = $1', [assignedSalonId]);
      if (sRes.rows.length > 0) salonData = sRes.rows[0];
    }

    await client.query('COMMIT');
    inTransaction = false;

    const safeUser = serializeUser(newUser, salonData);
    const token = generateToken({
      id: newUser.id,
      uid: newUser.uid,
      email: newUser.email,
      role: newUser.role,
      salonId: assignedSalonId,
    });

    return res.status(201).json({
      success: true,
      status: 'active',
      token,
      message: 'Account registered successfully! Welcome to Salonix.',
      user: safeUser,
    });
  } catch (err: any) {
    if (inTransaction) {
      try {
        await client.query('ROLLBACK');
      } catch {}
    }
    // Handle concurrent duplicate email insertion cleanly across PostgreSQL (23505) & MariaDB/MySQL (ER_DUP_ENTRY)
    if (err?.code === '23505' || err?.code === 'ER_DUP_ENTRY' || err?.errno === 1062) {
      return res.status(409).json({
        error: 'An account with this email already exists. Please log in instead.',
      });
    }
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Server error during registration: ' + err.message });
  } finally {
    client.release();
  }
});

// 3. Admin: Pending Approvals
app.get('/api/admin/pending', requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const pendingUsers = await query(
      `SELECT u.id, u.uid, u.name, u.email, u.phone, u.role, u.city, u.status, u.salon_id, u.created_at,
              s.name AS salon_name, s.address AS salon_address
       FROM users u
       LEFT JOIN salons s ON u.salon_id = s.id
       WHERE u.status = 'pending'
       ORDER BY u.created_at DESC`
    );

    const pendingSalons = await query(
      `SELECT s.*, u.name AS owner_name, u.email AS owner_email, u.phone AS owner_phone
       FROM salons s
       LEFT JOIN users u ON s.owner_id = u.uid
       WHERE s.status = 'pending'
       ORDER BY s.created_at DESC`
    );

    return res.json({
      pendingUsers: pendingUsers.rows,
      pendingSalons: pendingSalons.rows,
      totalPending: pendingUsers.rows.length,
    });
  } catch (err: any) {
    console.error('Pending approvals fetch error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 4. Admin: Approve or Reject User
app.post('/api/admin/users/:id/action', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'approve' | 'reject'

    if (action !== 'approve' && action !== 'reject') {
      return res.status(400).json({ error: 'Action must be approve or reject' });
    }

    // Prevent admin from deactivating their own account
    if (action === 'reject' && String(req.user?.id) === String(id)) {
      return res.status(400).json({ error: 'You cannot deactivate your own admin account.' });
    }

    const newStatus = action === 'approve' ? 'active' : 'rejected';

    const existingUserRes = await query('SELECT id FROM users WHERE id = $1', [id]);
    if (existingUserRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    await query(`UPDATE users SET status = $1 WHERE id = $2`, [newStatus, id]);
    const userRes = await query('SELECT * FROM users WHERE id = $1', [id]);
    const updatedUser = userRes.rows[0];

    // If salon owner, also update the salon status
    if (updatedUser.role === 'owner') {
      const salonStatus = action === 'approve' ? 'approved' : 'rejected';
      await query(
        `UPDATE salons SET status = $1 WHERE owner_id = $2 OR id = $3`,
        [salonStatus, updatedUser.uid, updatedUser.salon_id || '']
      );
    }

    return res.json({
      success: true,
      action,
      user: serializeUser(updatedUser),
      message: `User ${updatedUser.name} has been ${action === 'approve' ? 'approved and activated' : 'rejected'}.`
    });
  } catch (err: any) {
    console.error('Admin action error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 5. Admin: Approve or Reject Salon directly
app.post('/api/admin/salons/:id/action', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'approve' | 'reject'

    const existingSalonRes = await query('SELECT id FROM salons WHERE id = $1', [id]);
    if (existingSalonRes.rows.length === 0) {
      return res.status(404).json({ error: 'Salon not found' });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    await query(`UPDATE salons SET status = $1 WHERE id = $2`, [newStatus, id]);
    const salonRes = await query('SELECT * FROM salons WHERE id = $1', [id]);

    // Also update owner status if needed
    if (action === 'approve' && salonRes.rows[0].owner_id) {
      await query(
        `UPDATE users SET status = 'active' WHERE uid = $1`,
        [salonRes.rows[0].owner_id]
      );
    }

    return res.json({
      success: true,
      salon: salonRes.rows[0],
      message: `Salon has been ${action === 'approve' ? 'approved' : 'rejected'}.`
    });
  } catch (err: any) {
    console.error('Salon action error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 6. Admin: All Users
app.get('/api/admin/users', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { status, role } = req.query;
    let sql = `SELECT u.id, u.uid, u.name, u.email, u.phone, u.role, u.city, u.status, u.salon_id, u.created_at,
                      s.name AS salon_name
               FROM users u
               LEFT JOIN salons s ON u.salon_id = s.id
               WHERE 1=1`;
    const params: any[] = [];

    if (status && status !== 'all') {
      params.push(status);
      sql += ` AND u.status = $${params.length}`;
    }
    if (role && role !== 'all') {
      params.push(role);
      sql += ` AND u.role = $${params.length}`;
    }

    sql += ' ORDER BY u.created_at DESC';
    const result = await query(sql, params);
    return res.json({ users: result.rows });
  } catch (err: any) {
    console.error('Admin all users error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 7. Admin: Platform Stats
app.get('/api/admin/stats', requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const [pendingRes, usersRes, salonsRes, appointmentsRes] = await Promise.all([
      query(`SELECT COUNT(*) AS count FROM users WHERE status = 'pending'`),
      query(`SELECT COUNT(*) AS count FROM users WHERE status = 'active'`),
      query(`SELECT COUNT(*) AS count FROM salons WHERE status = 'approved'`),
      query(`SELECT COUNT(*) AS count FROM appointments`),
    ]);

    return res.json({
      pendingApprovals: parseInt(pendingRes.rows[0]?.count || '0', 10),
      activeUsers: parseInt(usersRes.rows[0]?.count || '0', 10),
      approvedSalons: parseInt(salonsRes.rows[0]?.count || '0', 10),
      totalAppointments: parseInt(appointmentsRes.rows[0]?.count || '0', 10),
    });
  } catch (err: any) {
    console.error('Stats error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 8. Public / Customer: Salons List (with category filter, sorting & active services summary)
app.get('/api/salons', async (req: Request, res: Response) => {
  try {
    const { city, search, all, categoryId, sort } = req.query;
    let sql = `SELECT * FROM salons WHERE 1=1`;
    const params: any[] = [];

    // Filter to only approved salons unless requested with all=true
    if (all !== 'true') {
      sql += ` AND status = 'approved'`;
    }

    if (city && city !== 'all' && city !== 'All') {
      params.push(city);
      sql += ` AND LOWER(city) = LOWER($${params.length})`;
    }

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (LOWER(name) LIKE LOWER($${params.length}) OR LOWER(description) LIKE LOWER($${params.length}) OR LOWER(address) LIKE LOWER($${params.length}) OR LOWER(city) LIKE LOWER($${params.length}))`;
    }

    if (categoryId && categoryId !== 'all' && categoryId !== 'All') {
      params.push(categoryId);
      sql += ` AND EXISTS (SELECT 1 FROM services sv WHERE sv.salon_id = salons.id AND sv.status = 'active' AND sv.category_id = $${params.length})`;
    }

    if (sort === 'price_asc') {
      sql += ' ORDER BY starting_price ASC, rating DESC';
    } else if (sort === 'price_desc') {
      sql += ' ORDER BY starting_price DESC, rating DESC';
    } else {
      sql += ' ORDER BY rating DESC, review_count DESC';
    }

    const [salonsResult, servicesResult] = await Promise.all([
      query(sql, params),
      query(
        `SELECT s.id, s.salon_id, s.category_id, s.name, s.description, s.price, s.duration,
                c.name AS category_name
         FROM services s
         LEFT JOIN categories c ON s.category_id = c.id
         WHERE s.status = 'active'
         ORDER BY s.price ASC`
      ),
    ]);

    const servicesBySalon = new Map<string, any[]>();
    for (const srv of servicesResult.rows) {
      const list = servicesBySalon.get(srv.salon_id) || [];
      list.push(srv);
      servicesBySalon.set(srv.salon_id, list);
    }

    const enrichedSalons = salonsResult.rows.map((salon: any) => {
      const salonServices = servicesBySalon.get(salon.id) || [];
      const categoryIds = Array.from(new Set(salonServices.map((s) => s.category_id).filter(Boolean)));
      const minServicePrice = salonServices.length > 0
        ? Math.min(...salonServices.map((s) => Number(s.price)))
        : Number(salon.starting_price || 0);

      return {
        ...salon,
        featured: Boolean(salon.featured),
        services: salonServices,
        category_ids: categoryIds,
        service_count: salonServices.length,
        min_service_price: minServicePrice,
      };
    });

    return res.json({ salons: enrichedSalons });
  } catch (err: any) {
    console.error('Salons fetch error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 9. Single Salon Details + Services
app.get('/api/salons/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const salonRes = await query('SELECT * FROM salons WHERE id = $1', [id]);
    if (salonRes.rows.length === 0) {
      return res.status(404).json({ error: 'Salon not found' });
    }

    const servicesRes = await query(
      `SELECT s.*, c.name AS category_name, c.icon_name AS category_icon
       FROM services s
       LEFT JOIN categories c ON s.category_id = c.id
       WHERE s.salon_id = $1 AND s.status = 'active'
       ORDER BY s.price ASC`,
      [id]
    );

    return res.json({
      salon: { ...salonRes.rows[0], featured: Boolean(salonRes.rows[0].featured) },
      services: servicesRes.rows,
    });
  } catch (err: any) {
    console.error('Salon details error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 9a. Update Salon Profile & Operating Hours (Owner of that salon or Admin only)
app.patch('/api/salons/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const authUser = req.user!;

    // 1. Fetch current salon to verify existence and check authorization
    const salonRes = await query('SELECT * FROM salons WHERE id = $1', [id]);
    if (salonRes.rows.length === 0) {
      return res.status(404).json({ error: 'Salon not found.' });
    }
    const currentSalon = salonRes.rows[0];

    // 2. Strict authorization: Only assigned owner or Admin
    if (authUser.role === 'customer') {
      return res.status(403).json({ error: 'Forbidden. Customers cannot edit salon details.' });
    }

    if (authUser.role === 'owner') {
      const isOwner = (authUser.salonId && authUser.salonId === id) || (currentSalon.owner_id === authUser.uid);
      if (!isOwner) {
        return res.status(403).json({ error: 'Forbidden. You can only update your own salon.' });
      }
    } else if (authUser.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden. Unauthorized access.' });
    }

    // 3. Extract supported fields - strictly ignore id, owner_id, status, role, rating, review_count
    const {
      name,
      tagline,
      description,
      about,
      address,
      city,
      state,
      pincode,
      phone,
      email,
      openingTime,
      closingTime,
      opening_time,
      closing_time,
      breakStartTime,
      breakEndTime,
      break_start_time,
      break_end_time,
      workingDays,
      working_days,
      slotDurationMinutes,
      slot_duration_minutes,
      startingPrice,
      starting_price,
    } = req.body;

    const updates: Record<string, any> = {};

    // Validate name (if provided)
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'Salon name cannot be empty.' });
      }
      if (name.trim().length > 150) {
        return res.status(400).json({ error: 'Salon name must not exceed 150 characters.' });
      }
      updates.name = name.trim();
    }

    // Validate tagline, description, about
    if (tagline !== undefined) {
      updates.tagline = typeof tagline === 'string' ? tagline.trim() : null;
    }
    if (description !== undefined) {
      updates.description = typeof description === 'string' ? description.trim() : null;
    }
    if (about !== undefined) {
      updates.about = typeof about === 'string' ? about.trim() : null;
    }

    // Validate address & location
    if (address !== undefined) {
      if (typeof address !== 'string' || address.trim().length === 0) {
        return res.status(400).json({ error: 'Salon address cannot be empty.' });
      }
      updates.address = address.trim();
    }
    if (city !== undefined) {
      if (typeof city !== 'string' || city.trim().length === 0) {
        return res.status(400).json({ error: 'City cannot be empty.' });
      }
      updates.city = city.trim();
    }
    if (state !== undefined) {
      updates.state = typeof state === 'string' ? state.trim() : null;
    }
    if (pincode !== undefined) {
      updates.pincode = typeof pincode === 'string' ? pincode.trim() : null;
    }

    // Validate contact info
    if (phone !== undefined) {
      if (typeof phone !== 'string' || phone.trim().length < 6) {
        return res.status(400).json({ error: 'Please provide a valid phone number (at least 6 characters).' });
      }
      updates.phone = phone.trim();
    }
    if (email !== undefined) {
      if (typeof email !== 'string' || !email.includes('@')) {
        return res.status(400).json({ error: 'Please provide a valid email address.' });
      }
      updates.email = email.trim();
    }

    // Validate starting price
    const finalStartingPrice = startingPrice !== undefined ? startingPrice : starting_price;
    if (finalStartingPrice !== undefined) {
      const priceNum = Number(finalStartingPrice);
      if (isNaN(priceNum) || priceNum < 0) {
        return res.status(400).json({ error: 'Starting price must be a non-negative number.' });
      }
      updates.starting_price = Math.round(priceNum);
    }

    // Validate slot duration
    const finalSlotDuration = slotDurationMinutes !== undefined ? slotDurationMinutes : slot_duration_minutes;
    if (finalSlotDuration !== undefined) {
      const durationNum = Number(finalSlotDuration);
      if (isNaN(durationNum) || durationNum < 10 || durationNum > 240) {
        return res.status(400).json({ error: 'Slot duration must be between 10 and 240 minutes.' });
      }
      updates.slot_duration_minutes = Math.round(durationNum);
    }

    // Operating hours calculation & validation
    const candidateOpeningStr = openingTime !== undefined ? openingTime : (opening_time !== undefined ? opening_time : currentSalon.opening_time);
    const candidateClosingStr = closingTime !== undefined ? closingTime : (closing_time !== undefined ? closing_time : currentSalon.closing_time);

    const openMin = timeStringToMinutes(candidateOpeningStr);
    const closeMin = timeStringToMinutes(candidateClosingStr);

    if (openMin === null) {
      return res.status(400).json({ error: 'Invalid opening time format. Expected 24h (e.g. "09:00") or 12h (e.g. "09:00 AM").' });
    }
    if (closeMin === null) {
      return res.status(400).json({ error: 'Invalid closing time format. Expected 24h (e.g. "20:00") or 12h (e.g. "08:00 PM").' });
    }
    if (openMin >= closeMin) {
      return res.status(400).json({ error: 'Opening time must be earlier than closing time.' });
    }
    if (closeMin - openMin < 60) {
      return res.status(400).json({ error: 'Salon must be open for at least 1 hour (60 minutes) daily.' });
    }

    if (openingTime !== undefined || opening_time !== undefined) {
      updates.opening_time = minutesTo24HTime(openMin);
    }
    if (closingTime !== undefined || closing_time !== undefined) {
      updates.closing_time = minutesTo24HTime(closeMin);
    }

    // Break hours calculation & validation
    const candidateBreakStartStr = breakStartTime !== undefined ? breakStartTime : (break_start_time !== undefined ? break_start_time : currentSalon.break_start_time);
    const candidateBreakEndStr = breakEndTime !== undefined ? breakEndTime : (break_end_time !== undefined ? break_end_time : currentSalon.break_end_time);

    const hasCandidateBreakStart = candidateBreakStartStr !== undefined && candidateBreakStartStr !== null && String(candidateBreakStartStr).trim() !== '';
    const hasCandidateBreakEnd = candidateBreakEndStr !== undefined && candidateBreakEndStr !== null && String(candidateBreakEndStr).trim() !== '';

    if (hasCandidateBreakStart || hasCandidateBreakEnd) {
      if (!hasCandidateBreakStart || !hasCandidateBreakEnd) {
        return res.status(400).json({ error: 'Both break start time and break end time must be specified together.' });
      }

      const breakStartMin = timeStringToMinutes(candidateBreakStartStr);
      const breakEndMin = timeStringToMinutes(candidateBreakEndStr);

      if (breakStartMin === null || breakEndMin === null) {
        return res.status(400).json({ error: 'Invalid break time format. Expected 24h (e.g. "13:30") or 12h (e.g. "01:30 PM").' });
      }
      if (breakStartMin >= breakEndMin) {
        return res.status(400).json({ error: 'Break start time must be earlier than break end time.' });
      }
      if (breakStartMin < openMin || breakEndMin > closeMin) {
        return res.status(400).json({
          error: `Break hours (${minutesToDisplayTime(breakStartMin)} - ${minutesToDisplayTime(breakEndMin)}) must fit entirely within operating hours (${minutesToDisplayTime(openMin)} - ${minutesToDisplayTime(closeMin)}).`
        });
      }

      updates.break_start_time = minutesTo24HTime(breakStartMin);
      updates.break_end_time = minutesTo24HTime(breakEndMin);
    } else if (
      (breakStartTime === '' || breakStartTime === null || break_start_time === '' || break_start_time === null) &&
      (breakEndTime === '' || breakEndTime === null || break_end_time === '' || break_end_time === null)
    ) {
      // Owner explicitly cleared break
      updates.break_start_time = null;
      updates.break_end_time = null;
    }

    // Working days validation
    const candidateWorkingDays = workingDays !== undefined ? workingDays : working_days;
    if (candidateWorkingDays !== undefined) {
      const VALID_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      let daysArray: string[] = [];

      if (Array.isArray(candidateWorkingDays)) {
        daysArray = candidateWorkingDays;
      } else if (typeof candidateWorkingDays === 'string') {
        const trimmed = candidateWorkingDays.trim();
        if (trimmed.startsWith('[')) {
          try {
            daysArray = JSON.parse(trimmed);
          } catch {
            return res.status(400).json({ error: 'Invalid working_days JSON format.' });
          }
        } else {
          daysArray = trimmed.split(',').map((s) => s.trim()).filter(Boolean);
        }
      } else {
        return res.status(400).json({ error: 'working_days must be an array of days or comma-separated string.' });
      }

      if (!Array.isArray(daysArray) || daysArray.length === 0) {
        return res.status(400).json({ error: 'Salon must have at least one working day selected.' });
      }

      for (const d of daysArray) {
        if (!VALID_DAYS.includes(d)) {
          return res.status(400).json({
            error: `Invalid working day: "${d}". Allowed values are: ${VALID_DAYS.join(', ')}.`
          });
        }
      }

      // Store in standard JSON string format matching existing database rows: '["Mon","Tue",...]'
      updates.working_days = JSON.stringify(daysArray);
    }

    // Safety verification: Check whether shrinking operating hours would conflict with upcoming confirmed bookings
    const scheduleChanged =
      updates.opening_time !== undefined ||
      updates.closing_time !== undefined ||
      updates.break_start_time !== undefined ||
      updates.break_end_time !== undefined ||
      updates.working_days !== undefined;

    if (scheduleChanged) {
      const today = new Date().toISOString().slice(0, 10);
      const upcomingAptsRes = await query(
        `SELECT id, date, start_time, end_time, duration_minutes, customer_name, status
         FROM appointments
         WHERE salon_id = $1 AND status IN ('confirmed', 'pending') AND date >= $2`,
        [id, today]
      );

      const effectiveWorkingDays = updates.working_days !== undefined ? updates.working_days : currentSalon.working_days;
      const effectiveOpenMin = updates.opening_time !== undefined ? timeStringToMinutes(updates.opening_time)! : openMin;
      const effectiveCloseMin = updates.closing_time !== undefined ? timeStringToMinutes(updates.closing_time)! : closeMin;
      const effectiveBreakStart = updates.break_start_time !== undefined ? (updates.break_start_time ? timeStringToMinutes(updates.break_start_time) : null) : (currentSalon.break_start_time ? timeStringToMinutes(currentSalon.break_start_time) : null);
      const effectiveBreakEnd = updates.break_end_time !== undefined ? (updates.break_end_time ? timeStringToMinutes(updates.break_end_time) : null) : (currentSalon.break_end_time ? timeStringToMinutes(currentSalon.break_end_time) : null);

      for (const apt of upcomingAptsRes.rows) {
        // 1. Check if salon would now be closed on this appointment's date
        if (!isSalonOpenOnDate(effectiveWorkingDays, apt.date)) {
          return res.status(409).json({
            error: 'Schedule change conflict',
            message: `Cannot remove working day because there is an upcoming confirmed appointment on ${apt.date} for ${apt.customer_name}. Please reschedule or resolve existing bookings first.`
          });
        }

        const aptStart = timeStringToMinutes(apt.start_time);
        const aptEnd = timeStringToMinutes(apt.end_time) || (aptStart !== null ? aptStart + (Number(apt.duration_minutes) || 30) : null);

        if (aptStart !== null && aptEnd !== null) {
          // 2. Check if hours cut off existing appointment
          if (aptStart < effectiveOpenMin || aptEnd > effectiveCloseMin) {
            return res.status(409).json({
              error: 'Schedule change conflict',
              message: `New operating hours (${minutesToDisplayTime(effectiveOpenMin)} - ${minutesToDisplayTime(effectiveCloseMin)}) conflict with an upcoming confirmed appointment on ${apt.date} at ${apt.start_time} for ${apt.customer_name}. Please adjust the hours or resolve existing bookings first.`
            });
          }

          // 3. Check if new break hours overlap existing appointment
          if (effectiveBreakStart !== null && effectiveBreakEnd !== null && effectiveBreakStart < effectiveBreakEnd) {
            if (intervalsOverlap(aptStart, aptEnd, effectiveBreakStart, effectiveBreakEnd)) {
              return res.status(409).json({
                error: 'Schedule change conflict',
                message: `New break hours (${minutesToDisplayTime(effectiveBreakStart)} - ${minutesToDisplayTime(effectiveBreakEnd)}) overlap an upcoming confirmed appointment on ${apt.date} at ${apt.start_time} for ${apt.customer_name}.`
              });
            }
          }
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields provided for update.' });
    }

    // Build parameterized UPDATE query dynamically
    const setClauses: string[] = [];
    const queryParams: any[] = [];

    Object.entries(updates).forEach(([col, val]) => {
      queryParams.push(val);
      setClauses.push(`${col} = $${queryParams.length}`);
    });

    queryParams.push(id);
    const updateSql = `
      UPDATE salons
      SET ${setClauses.join(', ')}
      WHERE id = $${queryParams.length}
    `;

    await query(updateSql, queryParams);
    const updateRes = await query('SELECT * FROM salons WHERE id = $1', [id]);

    return res.json({
      success: true,
      salon: { ...updateRes.rows[0], featured: Boolean(updateRes.rows[0].featured) },
      message: 'Salon details updated successfully!',
    });
  } catch (err: any) {
    console.error('Update salon error:', err);
    return res.status(500).json({ error: 'Failed to update salon: ' + err.message });
  }
});

// 9b. Salon Available Slots (Dynamic calculation based on hours, break, duration, bookings)
app.get('/api/salons/:id/slots', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { date, serviceId } = req.query;

    if (!date || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Valid date query parameter (YYYY-MM-DD) is required.' });
    }

    const todayStr = getLocalDateString();
    if (date < todayStr) {
      return res.json({
        available: false,
        reason: 'This date has already passed. Please select today or an upcoming date to properly select an available slot.',
        date,
        service: {
          id: serviceId,
          name: '',
          duration: 30,
          price: 0,
        },
        slots: [],
      });
    }

    if (!serviceId || typeof serviceId !== 'string') {
      return res.status(400).json({ error: 'serviceId query parameter is required.' });
    }

    // 1. Fetch salon
    const salonRes = await query('SELECT * FROM salons WHERE id = $1', [id]);
    if (salonRes.rows.length === 0) {
      return res.status(404).json({ error: 'Salon not found.' });
    }
    const salon = salonRes.rows[0];

    // Check salon status
    if (salon.status !== 'approved') {
      return res.status(400).json({ error: 'Salon is not currently approved for bookings.' });
    }

    // 2. Fetch service
    const srvRes = await query('SELECT * FROM services WHERE id = $1', [serviceId]);
    if (srvRes.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found.' });
    }
    const service = srvRes.rows[0];

    // 3. Verify service belongs to requested salon
    if (service.salon_id !== salon.id) {
      return res.status(400).json({ error: 'Requested service does not belong to this salon.' });
    }

    if (service.status && service.status !== 'active') {
      return res.status(400).json({ error: 'Service is currently inactive.' });
    }

    // 4. Verify salon is open on this day of week
    if (!isSalonOpenOnDate(salon.working_days, date)) {
      return res.json({
        available: false,
        reason: 'Salon is closed on this day.',
        date,
        service: {
          id: service.id,
          name: service.name,
          duration: service.duration,
          price: service.price,
        },
        slots: [],
      });
    }

    // 5. Query active, blocking appointments on this date
    const aptsRes = await query(
      `SELECT start_time, end_time, duration_minutes, status 
       FROM appointments 
       WHERE salon_id = $1 AND date = $2`,
      [salon.id, date]
    );

    const bookedIntervals: BookedInterval[] = [];
    for (const apt of aptsRes.rows) {
      if (isStatusBlocking(apt.status)) {
        const startMin = timeStringToMinutes(apt.start_time);
        if (startMin !== null) {
          const dur = Number(apt.duration_minutes) || 30;
          let endMin = timeStringToMinutes(apt.end_time);
          if (endMin === null || endMin <= startMin) {
            endMin = startMin + dur;
          }
          bookedIntervals.push({ startMinutes: startMin, endMinutes: endMin });
        }
      }
    }

    // 6. Generate available slots
    const slots = generateAvailableSlots({
      openingTime: salon.opening_time || '09:00',
      closingTime: salon.closing_time || '20:00',
      breakStartTime: salon.break_start_time,
      breakEndTime: salon.break_end_time,
      workingDays: salon.working_days,
      slotStepMinutes: salon.slot_duration_minutes || 30,
      serviceDurationMinutes: Number(service.duration) || 30,
      dateStr: date,
      bookedIntervals,
    });

    if (slots.length === 0) {
      return res.json({
        available: false,
        reason: date === todayStr
          ? 'All booking slots for today have already passed. Please select an upcoming date to properly select a slot.'
          : 'No available slots for this date.',
        date,
        salonId: salon.id,
        salonName: salon.name,
        service: {
          id: service.id,
          name: service.name,
          duration: Number(service.duration),
          price: Number(service.price),
        },
        workingHours: {
          openingTime: salon.opening_time,
          closingTime: salon.closing_time,
          breakStartTime: salon.break_start_time,
          breakEndTime: salon.break_end_time,
        },
        slots: [],
        totalSlots: 0,
      });
    }

    return res.json({
      available: true,
      date,
      salonId: salon.id,
      salonName: salon.name,
      service: {
        id: service.id,
        name: service.name,
        duration: Number(service.duration),
        price: Number(service.price),
      },
      workingHours: {
        openingTime: salon.opening_time,
        closingTime: salon.closing_time,
        breakStartTime: salon.break_start_time,
        breakEndTime: salon.break_end_time,
      },
      slots,
      totalSlots: slots.length,
    });
  } catch (err: any) {
    console.error('Fetch slots error:', err);
    return res.status(500).json({ error: 'Failed to calculate available slots: ' + err.message });
  }
});

// 10. Categories
app.get('/api/categories', async (_req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM categories ORDER BY id ASC');
    return res.json({ categories: result.rows });
  } catch (err: any) {
    console.error('Categories error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 10a. Admin: Create Category
app.post('/api/admin/categories', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, description = '', iconName = 'Scissors' } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ error: 'Category name must be at least 2 characters.' });
    }

    const slug = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const catId = `cat-${slug || Date.now()}-${Date.now().toString().slice(-4)}`;

    await query(
      `INSERT INTO categories (id, name, description, icon_name)
       VALUES ($1, $2, $3, $4)`,
      [catId, name.trim(), typeof description === 'string' ? description.trim() : '', iconName]
    );

    const result = await query('SELECT * FROM categories WHERE id = $1', [catId]);

    return res.status(201).json({
      success: true,
      category: result.rows[0],
      message: `Category "${name.trim()}" created successfully.`,
    });
  } catch (err: any) {
    console.error('Create category error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 10b. Admin: Delete Category
app.delete('/api/admin/categories/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existsRes = await query('SELECT id FROM categories WHERE id = $1', [id]);
    if (existsRes.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found.' });
    }

    const inUseRes = await query('SELECT COUNT(*) AS count FROM services WHERE category_id = $1', [id]);
    const count = parseInt(inUseRes.rows[0]?.count || '0', 10);
    if (count > 0) {
      return res.status(409).json({
        error: `Cannot delete this category because ${count} salon service(s) currently use it.`,
      });
    }

    await query('DELETE FROM categories WHERE id = $1', [id]);

    return res.json({
      success: true,
      message: 'Category deleted successfully.',
    });
  } catch (err: any) {
    console.error('Delete category error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 10c. Notifications: Get Authenticated User's Scoped Notifications
app.get('/api/notifications', requireAuth, async (req: Request, res: Response) => {
  try {
    const authUser = req.user!;
    let sql = '';
    let params: any[] = [];

    if (authUser.role === 'customer') {
      sql = `SELECT * FROM notifications WHERE target_user_id = $1 ORDER BY created_at DESC LIMIT 50`;
      params = [authUser.uid];
    } else if (authUser.role === 'owner') {
      sql = `SELECT * FROM notifications
             WHERE target_user_id = $1
                OR (target_role = 'owner' AND target_salon_id IS NOT NULL AND target_salon_id = $2)
             ORDER BY created_at DESC LIMIT 50`;
      params = [authUser.uid, authUser.salonId || ''];
    } else if (authUser.role === 'admin') {
      sql = `SELECT * FROM notifications
             WHERE target_role = 'admin' OR target_user_id = $1
             ORDER BY created_at DESC LIMIT 50`;
      params = [authUser.uid];
    } else {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const result = await query(sql, params);
    const normalized = result.rows.map((n: any) => ({ ...n, read: Boolean(n.read) }));
    const unreadCount = normalized.filter((n: any) => !n.read).length;

    return res.json({
      notifications: normalized,
      unreadCount,
    });
  } catch (err: any) {
    console.error('Fetch notifications error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 10d. Notifications: Mark All as Read for Authenticated User
app.patch('/api/notifications/read-all', requireAuth, async (req: Request, res: Response) => {
  try {
    const authUser = req.user!;
    if (authUser.role === 'customer') {
      await query(`UPDATE notifications SET read = true WHERE target_user_id = $1 AND read = false`, [authUser.uid]);
    } else if (authUser.role === 'owner') {
      await query(
        `UPDATE notifications SET read = true
         WHERE (target_user_id = $1 OR (target_role = 'owner' AND target_salon_id IS NOT NULL AND target_salon_id = $2))
           AND read = false`,
        [authUser.uid, authUser.salonId || '']
      );
    } else if (authUser.role === 'admin') {
      await query(
        `UPDATE notifications SET read = true
         WHERE (target_role = 'admin' OR target_user_id = $1) AND read = false`,
        [authUser.uid]
      );
    }

    return res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err: any) {
    console.error('Mark all notifications read error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 10e. Notifications: Mark Single Notification as Read (Ownership Enforced)
app.patch('/api/notifications/:id/read', requireAuth, async (req: Request, res: Response) => {
  try {
    const authUser = req.user!;
    const { id } = req.params;

    const notifRes = await query('SELECT * FROM notifications WHERE id = $1', [id]);
    if (notifRes.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found.' });
    }
    const notif = notifRes.rows[0];

    const isAllowed =
      (authUser.role === 'customer' && notif.target_user_id === authUser.uid) ||
      (authUser.role === 'owner' &&
        (notif.target_user_id === authUser.uid ||
          (notif.target_role === 'owner' && authUser.salonId && notif.target_salon_id === authUser.salonId))) ||
      (authUser.role === 'admin' && (notif.target_role === 'admin' || notif.target_user_id === authUser.uid));

    if (!isAllowed) {
      return res.status(403).json({ error: 'Forbidden. You cannot update this notification.' });
    }

    await query('UPDATE notifications SET read = true WHERE id = $1', [id]);
    const updated = await query('SELECT * FROM notifications WHERE id = $1', [id]);
    const updatedNotif = updated.rows[0] ? { ...updated.rows[0], read: Boolean(updated.rows[0].read) } : null;

    return res.json({
      success: true,
      notification: updatedNotif,
    });
  } catch (err: any) {
    console.error('Mark notification read error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 11. Appointments: Get list (Protected: scoped by role & ownership)
app.get('/api/appointments', requireAuth, async (req: Request, res: Response) => {
  try {
    const authUser = req.user!;
    let sql = 'SELECT * FROM appointments WHERE 1=1';
    const params: any[] = [];

    if (authUser.role === 'customer') {
      // Customers can only see their own appointments
      sql += ` AND (customer_id = $1 OR LOWER(customer_email) = LOWER($2))`;
      params.push(authUser.uid, authUser.email);
    } else if (authUser.role === 'owner') {
      // Salon owners can only see appointments belonging to their own salon
      if (!authUser.salonId) {
        return res.json({ appointments: [] });
      }
      sql += ` AND salon_id = $1`;
      params.push(authUser.salonId);
    } else if (authUser.role === 'admin') {
      // Admin can view all or filter by query params
      const { customerId, salonId, userEmail } = req.query;
      if (customerId) {
        params.push(customerId);
        sql += ` AND customer_id = $${params.length}`;
      } else if (userEmail) {
        params.push(userEmail);
        sql += ` AND LOWER(customer_email) = LOWER($${params.length})`;
      } else if (salonId) {
        params.push(salonId);
        sql += ` AND salon_id = $${params.length}`;
      }
    } else {
      return res.status(403).json({ error: 'Access denied.' });
    }

    sql += ' ORDER BY created_at DESC';
    const result = await query(sql, params);
    return res.json({ appointments: result.rows });
  } catch (err: any) {
    console.error('Appointments fetch error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 12. Appointments: Create (Book slot - strictly server-validated, transaction-safe)
app.post('/api/appointments', requireAuth, async (req: Request, res: Response) => {
  const client = await getClient();
  try {
    const authUser = req.user!;
    const {
      customerName,
      customerPhone,
      customerEmail,
      salonId,
      serviceId,
      date,
      startTime,
      notes = '',
    } = req.body;

    // 1. Validate mandatory fields
    if (!customerName || !customerPhone || !salonId || !serviceId || !date || !startTime) {
      return res.status(400).json({ error: 'Please provide all required appointment details (customerName, customerPhone, salonId, serviceId, date, startTime).' });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid date format. Expected YYYY-MM-DD.' });
    }

    const todayStr = getLocalDateString();
    if (date < todayStr) {
      return res.status(400).json({
        error: 'This date has already passed. Please select today or an upcoming date to properly select an available slot.',
      });
    }

    if (isSlotInPast(date, startTime)) {
      return res.status(400).json({
        error: 'This time slot has already passed. Please properly select an upcoming time slot.',
      });
    }

    // 2. Customer identity comes strictly from req.user
    let bookingCustomerId = authUser.uid;
    let bookingCustomerEmail = authUser.email;
    if (authUser.role === 'admin' && req.body.customerId) {
      bookingCustomerId = req.body.customerId;
      bookingCustomerEmail = customerEmail || authUser.email;
    }

    // 3. Begin transaction
    await client.query('BEGIN');

    // 4. Retrieve and lock salon record inside transaction
    const salonRes = await client.query('SELECT * FROM salons WHERE id = $1 FOR SHARE', [salonId]);
    if (salonRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Salon not found.' });
    }
    const salon = salonRes.rows[0];

    if (salon.status !== 'approved') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Salon is not currently approved for bookings.' });
    }

    // 5. Retrieve service from database inside transaction
    const srvRes = await client.query('SELECT * FROM services WHERE id = $1', [serviceId]);
    if (srvRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Service not found.' });
    }
    const service = srvRes.rows[0];

    // 6. Verify service belongs to requested salon
    if (service.salon_id !== salon.id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Requested service does not belong to this salon.' });
    }

    if (service.status && service.status !== 'active') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Service is currently inactive.' });
    }

    // 7. Canonical values from database
    const canonicalServiceName = service.name;
    const canonicalPrice = Number(service.price);
    const canonicalDuration = Number(service.duration) || 30;

    // 8. Verify salon is open on this day
    if (!isSalonOpenOnDate(salon.working_days, date)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Salon is closed on the selected date.' });
    }

    // 9. Time calculations and working hours verification
    const startMinutes = timeStringToMinutes(startTime);
    if (startMinutes === null) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid start time format.' });
    }

    const endMinutes = startMinutes + canonicalDuration;
    const openMinutes = timeStringToMinutes(salon.opening_time || '09:00');
    const closeMinutes = timeStringToMinutes(salon.closing_time || '20:00');

    if (openMinutes === null || closeMinutes === null || openMinutes >= closeMinutes) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid salon operating hours configuration.' });
    }

    // Check bounds: must start after opening and finish before or at closing
    if (startMinutes < openMinutes || endMinutes > closeMinutes) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: `Requested appointment time (${minutesToDisplayTime(startMinutes)} - ${minutesToDisplayTime(endMinutes)}) falls outside salon working hours (${minutesToDisplayTime(openMinutes)} - ${minutesToDisplayTime(closeMinutes)}).`,
      });
    }

    // 10. Verify break hours
    const breakStart = timeStringToMinutes(salon.break_start_time);
    const breakEnd = timeStringToMinutes(salon.break_end_time);
    if (breakStart !== null && breakEnd !== null && breakStart < breakEnd) {
      if (intervalsOverlap(startMinutes, endMinutes, breakStart, breakEnd)) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: `Requested appointment overlaps salon break hours (${minutesToDisplayTime(breakStart)} - ${minutesToDisplayTime(breakEnd)}).`,
        });
      }
    }

    // 11. Concurrency control: Lock existing appointments for this salon and date to prevent race conditions
    const existingAptsRes = await client.query(
      `SELECT id, start_time, end_time, duration_minutes, status
       FROM appointments
       WHERE salon_id = $1 AND date = $2
       FOR UPDATE`,
      [salon.id, date]
    );

    // Re-check slot availability inside the lock
    for (const apt of existingAptsRes.rows) {
      if (isStatusBlocking(apt.status)) {
        const existingStart = timeStringToMinutes(apt.start_time);
        if (existingStart !== null) {
          const existingDur = Number(apt.duration_minutes) || 30;
          let existingEnd = timeStringToMinutes(apt.end_time);
          if (existingEnd === null || existingEnd <= existingStart) {
            existingEnd = existingStart + existingDur;
          }

          if (intervalsOverlap(startMinutes, endMinutes, existingStart, existingEnd)) {
            await client.query('ROLLBACK');
            return res.status(409).json({
              error: 'Slot conflict',
              message: 'This slot is no longer available. Please select another time.',
            });
          }
        }
      }
    }

    // 12. Insert the appointment with server-calculated fields (starts as pending for owner review)
    const appointmentId = `apt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const calculatedStartTime = minutesToDisplayTime(startMinutes);
    const calculatedEndTime = minutesToDisplayTime(endMinutes);

    await client.query(
      `INSERT INTO appointments (
        id, customer_id, customer_name, customer_phone, customer_email,
        salon_id, salon_name, salon_city, salon_address,
        service_id, service_name, date, start_time, end_time,
        duration_minutes, price, status, notes, created_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        $10, $11, $12, $13, $14,
        $15, $16, 'pending', $17, NOW()
      )`,
      [
        appointmentId,
        bookingCustomerId,
        customerName.trim(),
        customerPhone.trim(),
        bookingCustomerEmail ? bookingCustomerEmail.trim() : '',
        salon.id,
        salon.name,
        salon.city,
        salon.address,
        service.id,
        canonicalServiceName,
        date,
        calculatedStartTime,
        calculatedEndTime,
        canonicalDuration,
        canonicalPrice,
        notes || '',
      ]
    );

    const insertedAptRes = await client.query('SELECT * FROM appointments WHERE id = $1', [appointmentId]);

    // 12b. Create real notifications for both Salon Owner and Customer inside transaction
    await createNotification(client, {
      targetRole: 'owner',
      targetUserId: salon.owner_id || null,
      targetSalonId: salon.id,
      title: 'New Booking Request',
      message: `${customerName.trim()} requested ${canonicalServiceName} on ${date} at ${calculatedStartTime}. Review to accept or reject.`,
      type: 'booking_created',
      actionRoute: 'owner-dashboard',
    });

    await createNotification(client, {
      targetRole: 'customer',
      targetUserId: bookingCustomerId,
      targetSalonId: salon.id,
      title: 'Booking Request Submitted',
      message: `Your request for ${canonicalServiceName} at ${salon.name} on ${date} at ${calculatedStartTime} is pending salon approval.`,
      type: 'booking_created',
      actionRoute: 'customer-dashboard',
    });

    // 13. Commit transaction
    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      appointment: insertedAptRes.rows[0],
      message: 'Appointment request submitted! Awaiting salon confirmation.',
    });
  } catch (err: any) {
    try {
      await client.query('ROLLBACK');
    } catch {}
    console.error('Booking error:', err);
    return res.status(500).json({ error: 'Failed to book appointment: ' + err.message });
  } finally {
    client.release();
  }
});

// 13. Appointments: Update Status (Accept / Reject / Complete / Cancel - strictly authorized & validated)
app.patch('/api/appointments/:id/status', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, cancellationReason, rejectionReason, reason } = req.body;
    const authUser = req.user!;

    const ALLOWED_STATUSES = ['confirmed', 'rejected', 'completed', 'cancelled'];
    if (!status || typeof status !== 'string' || !ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Allowed values are: ${ALLOWED_STATUSES.join(', ')}.`,
      });
    }

    // First fetch the appointment to check authorization & current status
    const aptRes = await query('SELECT * FROM appointments WHERE id = $1', [id]);
    if (aptRes.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const apt = aptRes.rows[0];
    const currentStatus = String(apt.status || '').toLowerCase();

    // Verify permission:
    // Admin: can update any appointment
    // Owner: can only update appointments for their own salon
    // Customer: can only cancel their own appointment
    if (authUser.role === 'admin') {
      // Allowed
    } else if (authUser.role === 'owner') {
      if (!authUser.salonId || apt.salon_id !== authUser.salonId) {
        return res.status(403).json({ error: 'Forbidden. You can only update appointments for your own salon.' });
      }
    } else if (authUser.role === 'customer') {
      const isOwner =
        apt.customer_id === authUser.uid ||
        (apt.customer_email && apt.customer_email.toLowerCase() === authUser.email.toLowerCase());
      if (!isOwner) {
        return res.status(403).json({ error: 'Forbidden. You can only modify your own appointments.' });
      }
      if (status !== 'cancelled') {
        return res.status(403).json({ error: 'Forbidden. Customers may only cancel appointments.' });
      }
    } else {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Enforce valid state transitions
    const VALID_TRANSITIONS: Record<string, string[]> = {
      pending: ['confirmed', 'rejected', 'cancelled'],
      confirmed: ['completed', 'cancelled'],
    };
    const allowedNext = VALID_TRANSITIONS[currentStatus] || [];
    if (!allowedNext.includes(status)) {
      return res.status(400).json({
        error: `Cannot change appointment status from "${currentStatus}" to "${status}".`,
      });
    }

    const finalRejectionReason =
      status === 'rejected'
        ? (rejectionReason || reason || 'Declined by salon owner').toString().trim()
        : apt.rejection_reason || null;

    const finalCancellationReason =
      status === 'cancelled'
        ? (
            cancellationReason ||
            reason ||
            (authUser.role === 'customer' ? 'Cancelled by customer' : 'Cancelled by salon')
          )
            .toString()
            .trim()
        : apt.cancellation_reason || null;

    await query(
      `UPDATE appointments
       SET status = $1, rejection_reason = $2, cancellation_reason = $3
       WHERE id = $4`,
      [status, finalRejectionReason, finalCancellationReason, id]
    );

    const result = await query('SELECT * FROM appointments WHERE id = $1', [id]);
    const updatedApt = result.rows[0];

    // Emit real counterparty notification
    try {
      if (status === 'confirmed') {
        await createNotification({ query }, {
          targetRole: 'customer',
          targetUserId: apt.customer_id,
          targetSalonId: apt.salon_id,
          title: 'Appointment Confirmed',
          message: `${apt.salon_name} confirmed your ${apt.service_name} booking for ${apt.date} at ${apt.start_time}.`,
          type: 'booking_confirmed',
          actionRoute: 'customer-dashboard',
        });
      } else if (status === 'rejected') {
        await createNotification({ query }, {
          targetRole: 'customer',
          targetUserId: apt.customer_id,
          targetSalonId: apt.salon_id,
          title: 'Appointment Rejected',
          message: `${apt.salon_name} could not accept your ${apt.service_name} booking on ${apt.date} at ${apt.start_time}. Reason: ${finalRejectionReason}`,
          type: 'booking_rejected',
          actionRoute: 'customer-dashboard',
        });
      } else if (status === 'completed') {
        await createNotification({ query }, {
          targetRole: 'customer',
          targetUserId: apt.customer_id,
          targetSalonId: apt.salon_id,
          title: 'Appointment Completed',
          message: `Your ${apt.service_name} appointment at ${apt.salon_name} (${apt.date}) has been marked completed. Thank you for visiting!`,
          type: 'booking_completed',
          actionRoute: 'customer-dashboard',
        });
      } else if (status === 'cancelled') {
        if (authUser.role === 'customer') {
          await createNotification({ query }, {
            targetRole: 'owner',
            targetUserId: null,
            targetSalonId: apt.salon_id,
            title: 'Booking Cancelled by Customer',
            message: `${apt.customer_name} cancelled their ${apt.service_name} appointment on ${apt.date} at ${apt.start_time}. The slot is now available again.`,
            type: 'booking_cancelled',
            actionRoute: 'owner-dashboard',
          });
        } else {
          await createNotification({ query }, {
            targetRole: 'customer',
            targetUserId: apt.customer_id,
            targetSalonId: apt.salon_id,
            title: 'Appointment Cancelled by Salon',
            message: `${apt.salon_name} cancelled your ${apt.service_name} appointment on ${apt.date} at ${apt.start_time}. Reason: ${finalCancellationReason}`,
            type: 'booking_cancelled',
            actionRoute: 'customer-dashboard',
          });
        }
      }
    } catch (notifErr) {
      console.warn('Notification insert warning:', notifErr);
    }

    return res.json({
      success: true,
      appointment: updatedApt,
    });
  } catch (err: any) {
    console.error('Update appointment status error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 14. Services: Add Service (Owner of that salon or Admin only)
app.post('/api/services', requireAuth, async (req: Request, res: Response) => {
  try {
    const authUser = req.user!;
    const { salonId, categoryId, name, description, price, duration } = req.body;

    // Role check: Only salon owners and admin can manage services
    if (authUser.role === 'customer') {
      return res.status(403).json({ error: 'Forbidden. Customers cannot create or modify services.' });
    }

    // Determine target salonId:
    // If salon owner, strictly derive and enforce their own salonId from JWT
    let targetSalonId = salonId;
    if (authUser.role === 'owner') {
      if (!authUser.salonId) {
        return res.status(403).json({ error: 'Forbidden. No salon assigned to your account.' });
      }
      // Never trust client salonId if owner attempts to specify another salon
      if (salonId && salonId !== authUser.salonId) {
        return res.status(403).json({ error: 'Forbidden. You can only add services to your own salon.' });
      }
      targetSalonId = authUser.salonId;
    }

    if (!targetSalonId || !name || typeof name !== 'string' || !name.trim() || price === undefined || price === null || price === '') {
      return res.status(400).json({ error: 'Salon ID, service name, and price are required' });
    }

    const parsedPrice = Number(price);
    const parsedDuration = duration !== undefined && duration !== '' ? Number(duration) : 30;

    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({ error: 'Service price must be a non-negative number.' });
    }
    if (!Number.isFinite(parsedDuration) || parsedDuration < 5 || parsedDuration > 480) {
      return res.status(400).json({ error: 'Service duration must be between 5 and 480 minutes.' });
    }

    const srvId = `srv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    await query(
      `INSERT INTO services (id, salon_id, category_id, name, description, price, duration, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')`,
      [
        srvId,
        targetSalonId,
        categoryId || 'cat-hair',
        name.trim(),
        description || '',
        Math.round(parsedPrice),
        Math.round(parsedDuration),
      ]
    );

    const result = await query('SELECT * FROM services WHERE id = $1', [srvId]);

    return res.status(201).json({
      success: true,
      service: result.rows[0]
    });
  } catch (err: any) {
    console.error('Add service error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 14b. Services: Update Service (Owner of that salon or Admin only)
app.patch('/api/services/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const authUser = req.user!;
    const { id } = req.params;
    const { name, description, price, duration, categoryId, status } = req.body;

    if (authUser.role === 'customer') {
      return res.status(403).json({ error: 'Forbidden. Customers cannot create or modify services.' });
    }

    // Fetch existing service to verify ownership
    const srvRes = await query('SELECT * FROM services WHERE id = $1', [id]);
    if (srvRes.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found.' });
    }

    const service = srvRes.rows[0];

    // Salon owner may only mutate services belonging to their own salon
    if (authUser.role === 'owner') {
      if (!authUser.salonId || service.salon_id !== authUser.salonId) {
        return res.status(403).json({ error: 'Forbidden. You can only update services belonging to your own salon.' });
      }
    }

    if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
      return res.status(400).json({ error: 'Service name cannot be empty.' });
    }

    const updatedName = name !== undefined ? name.trim() : service.name;
    const updatedDesc = description !== undefined ? description : service.description;
    const updatedPrice = price !== undefined ? Number(price) : Number(service.price);
    const updatedDuration = duration !== undefined ? Number(duration) : Number(service.duration);
    const updatedCat = categoryId !== undefined ? categoryId : service.category_id;
    const updatedStatus = status !== undefined ? status : service.status;

    if (!Number.isFinite(updatedPrice) || updatedPrice < 0) {
      return res.status(400).json({ error: 'Service price must be a non-negative number.' });
    }
    if (!Number.isFinite(updatedDuration) || updatedDuration < 5 || updatedDuration > 480) {
      return res.status(400).json({ error: 'Service duration must be between 5 and 480 minutes.' });
    }

    await query(
      `UPDATE services
       SET name = $1, description = $2, price = $3, duration = $4, category_id = $5, status = $6
       WHERE id = $7`,
      [updatedName, updatedDesc, Math.round(updatedPrice), Math.round(updatedDuration), updatedCat, updatedStatus, id]
    );

    const result = await query('SELECT * FROM services WHERE id = $1', [id]);

    return res.json({
      success: true,
      service: result.rows[0],
    });
  } catch (err: any) {
    console.error('Update service error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 14c. Services: Delete Service (Owner of that salon or Admin only)
app.delete('/api/services/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const authUser = req.user!;
    const { id } = req.params;

    if (authUser.role === 'customer') {
      return res.status(403).json({ error: 'Forbidden. Customers cannot delete services.' });
    }

    const srvRes = await query('SELECT * FROM services WHERE id = $1', [id]);
    if (srvRes.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found.' });
    }

    const service = srvRes.rows[0];

    if (authUser.role === 'owner') {
      if (!authUser.salonId || service.salon_id !== authUser.salonId) {
        return res.status(403).json({ error: 'Forbidden. You can only delete services belonging to your own salon.' });
      }
    }

    const linkedApts = await query('SELECT COUNT(*) AS count FROM appointments WHERE service_id = $1', [id]);
    const aptCount = parseInt(linkedApts.rows[0]?.count || '0', 10);
    if (aptCount > 0) {
      return res.status(409).json({
        error: `Cannot delete this service because ${aptCount} appointment(s) reference it. Set it to inactive instead to preserve booking history.`,
      });
    }

    await query('DELETE FROM services WHERE id = $1', [id]);

    return res.json({
      success: true,
      message: 'Service deleted successfully.',
    });
  } catch (err: any) {
    console.error('Delete service error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Vite Middleware for Development / Static serving for Production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const distPath = path.resolve(__dirname, 'dist');

  if (isProd) {
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req: Request, res: Response) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    } else {
      console.warn(`[WARN] dist directory not found at ${distPath}. Running static fallback.`);
    }
  } else {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.error('Failed to initialize Vite dev server, falling back to static:', e);
      if (fs.existsSync(distPath)) {
        app.use(express.static(distPath));
        app.get('*', (_req: Request, res: Response) => {
          res.sendFile(path.resolve(distPath, 'index.html'));
        });
      }
    }
  }

  // Bind and listen to PORT immediately to satisfy Cloud Run container startup probe
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Salonix Server running on http://0.0.0.0:${PORT} (mode: ${isProd ? 'production' : 'development'})`);
  });

  // Verify database schema and safely migrate plaintext passwords asynchronously in background
  ensureSchema()
    .then(() => migratePlaintextPasswords())
    .catch((schemaErr) => {
      console.warn('[DB] Schema/password initialization warning on startup:', schemaErr);
    });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
