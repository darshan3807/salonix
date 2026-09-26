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
import { pool, query, ensureSchema, migratePlaintextPasswords } from './src/db/db.ts';
import { generateToken, requireAuth, requireRole, requireAdmin, requireSalonOwner, requireCustomer } from './src/middleware/auth.ts';
import { serializeUser } from './src/lib/userSerializer.ts';
import {
  timeStringToMinutes,
  minutesToDisplayTime,
  isSalonOpenOnDate,
  isStatusBlocking,
  intervalsOverlap,
  generateAvailableSlots,
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
  res.status(200).json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

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

// 2. Auth: Register (Proper signup with admin approval required)
app.post('/api/auth/register', async (req: Request, res: Response) => {
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

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if email already registered
    const existing = await query(
      'SELECT id, status, role FROM users WHERE LOWER(email) = LOWER($1)',
      [email.trim()]
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

    const assignedRole = role === 'owner' ? 'owner' : 'customer';
    const timestamp = Date.now();
    const newUid = `usr-${assignedRole === 'owner' ? 'owner' : 'cust'}-${timestamp.toString().slice(-6)}`;
    let assignedSalonId: string | null = null;

    // If salon owner, create salon entry with pending status
    if (assignedRole === 'owner') {
      assignedSalonId = `salon-${timestamp.toString().slice(-6)}`;
      await query(
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
          salonName ? salonName.trim() : `${name.trim()}'s Salon`,
          'Premium Hair, Beauty & Grooming Experience',
          aboutSalon || 'Professional salon offering haircuts, styling, skincare and grooming services.',
          aboutSalon || 'Book slots online with verified experienced stylists and aesthetic specialists.',
          salonAddress || `${city || 'City Center'}, Main Road`,
          city || 'Pune',
          'Maharashtra',
          '411001',
          phone || '+91 98000 00000',
          email.trim(),
          openingTime || '09:00 AM',
          closingTime || '08:00 PM',
          30,
          'Mon - Sun (All 7 Days)',
          5.0,
          0,
          Number(startingPrice) || 250,
          false,
          'pending', // Salon is also pending approval
          '#0f172a',
        ]
      );

      // Add 3 default services for this new salon
      await query(
        `INSERT INTO services (id, salon_id, category_id, name, description, price, duration, status)
         VALUES 
          ($1, $2, 'cat-hair', 'Signature Haircut & Styling', 'Custom haircut with wash and blow dry styling', 350, 30, 'active'),
          ($3, $2, 'cat-beard', 'Royal Beard Shaping & Trim', 'Precision beard trim with hot towel finish', 200, 20, 'active'),
          ($4, $2, 'cat-facial', 'Glow Facial & Clean-Up', 'Deep cleansing and skin rejuvenation', 550, 45, 'active')
        `,
        [
          `srv-${timestamp}-1`,
          assignedSalonId,
          `srv-${timestamp}-2`,
          `srv-${timestamp}-3`,
        ]
      );
    }

    // Insert user into PostgreSQL with active status
    let userInsert;
    try {
      userInsert = await query(
        `INSERT INTO users (
          uid, email, name, phone, role, city, status, salon_id, password, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        RETURNING id, uid, name, email, phone, role, city, status, salon_id, created_at`,
        [
          newUid,
          email.trim(),
          name.trim(),
          phone ? phone.trim() : '',
          assignedRole,
          city ? city.trim() : 'Pune',
          'active',
          assignedSalonId,
          hashedPassword,
        ]
      );
    } catch (insertErr: any) {
      if (insertErr.message && (insertErr.message.includes('password') || insertErr.message.includes('column'))) {
        console.warn('Users table missing column, executing schema update and retrying:', insertErr.message);
        await ensureSchema();
        userInsert = await query(
          `INSERT INTO users (
            uid, email, name, phone, role, city, status, salon_id, password, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
          RETURNING id, uid, name, email, phone, role, city, status, salon_id, created_at`,
          [
            newUid,
            email.trim(),
            name.trim(),
            phone ? phone.trim() : '',
            assignedRole,
            city ? city.trim() : 'Pune',
            'active',
            assignedSalonId,
            hashedPassword,
          ]
        );
      } else {
        throw insertErr;
      }
    }

    const newUser = userInsert.rows[0];

    // Create admin notification
    await query(
      `INSERT INTO notifications (id, target_role, target_user_id, target_salon_id, title, message, type, read, action_route, created_at)
       VALUES ($1, 'admin', NULL, $2, $3, $4, 'new_user', false, '/admin/approvals', NOW())`,
      [
        `notif-${timestamp}`,
        assignedSalonId,
        `New ${assignedRole === 'owner' ? 'Salon Owner' : 'Customer'} Registered`,
        `${newUser.name} (${newUser.email}) joined as a ${assignedRole === 'owner' ? 'Salon Partner' : 'Customer'}.`
      ]
    );

    let salonData = null;
    if (assignedSalonId) {
      const sRes = await query('SELECT * FROM salons WHERE id = $1', [assignedSalonId]);
      if (sRes.rows.length > 0) salonData = sRes.rows[0];
    }

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
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Server error during registration: ' + err.message });
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

    const newStatus = action === 'approve' ? 'active' : 'rejected';

    const userRes = await query(
      `UPDATE users SET status = $1 WHERE id = $2 RETURNING *`,
      [newStatus, id]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

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

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const salonRes = await query(
      `UPDATE salons SET status = $1 WHERE id = $2 RETURNING *`,
      [newStatus, id]
    );

    if (salonRes.rows.length === 0) {
      return res.status(404).json({ error: 'Salon not found' });
    }

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
      query(`SELECT COUNT(*) FROM users WHERE status = 'pending'`),
      query(`SELECT COUNT(*) FROM users WHERE status = 'active'`),
      query(`SELECT COUNT(*) FROM salons WHERE status = 'approved'`),
      query(`SELECT COUNT(*) FROM appointments`),
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

// 8. Public / Customer: Salons List
app.get('/api/salons', async (req: Request, res: Response) => {
  try {
    const { city, search, all } = req.query;
    let sql = `SELECT * FROM salons WHERE 1=1`;
    const params: any[] = [];

    // Filter to only approved salons unless requested by admin with all=true
    if (all !== 'true') {
      sql += ` AND status = 'approved'`;
    }

    if (city && city !== 'all') {
      params.push(city);
      sql += ` AND LOWER(city) = LOWER($${params.length})`;
    }

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (LOWER(name) LIKE LOWER($${params.length}) OR LOWER(description) LIKE LOWER($${params.length}) OR LOWER(address) LIKE LOWER($${params.length}))`;
    }

    sql += ' ORDER BY rating DESC, review_count DESC';
    const result = await query(sql, params);
    return res.json({ salons: result.rows });
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
      salon: salonRes.rows[0],
      services: servicesRes.rows,
    });
  } catch (err: any) {
    console.error('Salon details error:', err);
    return res.status(500).json({ error: err.message });
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
  const client = await pool.connect();
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

    // 12. Insert the appointment with server-calculated fields
    const appointmentId = `apt-${Date.now()}`;
    const calculatedStartTime = minutesToDisplayTime(startMinutes);
    const calculatedEndTime = minutesToDisplayTime(endMinutes);

    const insertRes = await client.query(
      `INSERT INTO appointments (
        id, customer_id, customer_name, customer_phone, customer_email,
        salon_id, salon_name, salon_city, salon_address,
        service_id, service_name, date, start_time, end_time,
        duration_minutes, price, status, notes, created_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        $10, $11, $12, $13, $14,
        $15, $16, 'confirmed', $17, NOW()
      ) RETURNING *`,
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

    // 13. Commit transaction
    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      appointment: insertRes.rows[0],
      message: 'Appointment booked successfully!',
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

// 13. Appointments: Update Status (Accept / Complete / Cancel - strictly authorized)
app.patch('/api/appointments/:id/status', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, cancellationReason } = req.body;
    const authUser = req.user!;

    // First fetch the appointment to check authorization
    const aptRes = await query('SELECT * FROM appointments WHERE id = $1', [id]);
    if (aptRes.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const apt = aptRes.rows[0];

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
      const isOwner = apt.customer_id === authUser.uid || (apt.customer_email && apt.customer_email.toLowerCase() === authUser.email.toLowerCase());
      if (!isOwner) {
        return res.status(403).json({ error: 'Forbidden. You can only modify your own appointments.' });
      }
      if (status !== 'cancelled') {
        return res.status(403).json({ error: 'Forbidden. Customers may only cancel appointments.' });
      }
    } else {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const result = await query(
      `UPDATE appointments
       SET status = $1, cancellation_reason = $2
       WHERE id = $3
       RETURNING *`,
      [status, cancellationReason || null, id]
    );

    return res.json({
      success: true,
      appointment: result.rows[0]
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

    if (!targetSalonId || !name || price === undefined || price === null || price === '') {
      return res.status(400).json({ error: 'Salon ID, service name, and price are required' });
    }

    const srvId = `srv-${Date.now()}`;
    const result = await query(
      `INSERT INTO services (id, salon_id, category_id, name, description, price, duration, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
       RETURNING *`,
      [
        srvId,
        targetSalonId,
        categoryId || 'cat-hair',
        name.trim(),
        description || '',
        Number(price),
        Number(duration) || 30,
      ]
    );

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

    const updatedName = name !== undefined ? name.trim() : service.name;
    const updatedDesc = description !== undefined ? description : service.description;
    const updatedPrice = price !== undefined ? Number(price) : service.price;
    const updatedDuration = duration !== undefined ? Number(duration) : service.duration;
    const updatedCat = categoryId !== undefined ? categoryId : service.category_id;
    const updatedStatus = status !== undefined ? status : service.status;

    const result = await query(
      `UPDATE services
       SET name = $1, description = $2, price = $3, duration = $4, category_id = $5, status = $6
       WHERE id = $7
       RETURNING *`,
      [updatedName, updatedDesc, updatedPrice, updatedDuration, updatedCat, updatedStatus, id]
    );

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
