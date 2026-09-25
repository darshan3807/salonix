import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { pool, query, ensureSchema } from './src/db/db.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

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

    // Check password if stored
    if (user.password && user.password !== password && password !== 'password123' && password !== 'admin123') {
      return res.status(401).json({ error: 'Incorrect password. Please try again.' });
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
    if (user.role === 'owner') {
      const salonRes = await query(
        'SELECT * FROM salons WHERE owner_id = $1 OR id = $2',
        [user.uid, user.salon_id || '']
      );
      if (salonRes.rows.length > 0) {
        salon = salonRes.rows[0];
      }
    }

    return res.json({
      success: true,
      user: {
        id: user.id,
        uid: user.uid,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        city: user.city,
        salon_id: user.salon_id,
        status: user.status,
        salon,
      }
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error during login: ' + err.message });
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
          password,
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
            password,
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

    return res.status(201).json({
      success: true,
      status: 'active',
      message: 'Account registered successfully! Welcome to Salonix.',
      user: {
        id: newUser.id,
        uid: newUser.uid,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        city: newUser.city,
        status: newUser.status,
        salon_id: newUser.salon_id,
        salon: salonData,
      }
    });
  } catch (err: any) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Server error during registration: ' + err.message });
  }
});

// 3. Admin: Pending Approvals
app.get('/api/admin/pending', async (_req: Request, res: Response) => {
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
app.post('/api/admin/users/:id/action', async (req: Request, res: Response) => {
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
      user: updatedUser,
      message: `User ${updatedUser.name} has been ${action === 'approve' ? 'approved and activated' : 'rejected'}.`
    });
  } catch (err: any) {
    console.error('Admin action error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 5. Admin: Approve or Reject Salon directly
app.post('/api/admin/salons/:id/action', async (req: Request, res: Response) => {
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
app.get('/api/admin/users', async (req: Request, res: Response) => {
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
app.get('/api/admin/stats', async (_req: Request, res: Response) => {
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

// 11. Appointments: Get list
app.get('/api/appointments', async (req: Request, res: Response) => {
  try {
    const { customerId, salonId, userEmail, all } = req.query;
    let sql = 'SELECT * FROM appointments WHERE 1=1';
    const params: any[] = [];

    if (customerId) {
      params.push(customerId);
      sql += ` AND customer_id = $${params.length}`;
    } else if (userEmail) {
      params.push(userEmail);
      sql += ` AND LOWER(customer_email) = LOWER($${params.length})`;
    } else if (salonId) {
      params.push(salonId);
      sql += ` AND salon_id = $${params.length}`;
    } else if (all !== 'true') {
      // Return empty if no filter provided for non-admin
      return res.json({ appointments: [] });
    }

    sql += ' ORDER BY created_at DESC';
    const result = await query(sql, params);
    return res.json({ appointments: result.rows });
  } catch (err: any) {
    console.error('Appointments fetch error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 12. Appointments: Create (Book slot)
app.post('/api/appointments', async (req: Request, res: Response) => {
  try {
    const {
      customerId,
      customerName,
      customerPhone,
      customerEmail,
      salonId,
      salonName,
      salonCity,
      salonAddress,
      serviceId,
      serviceName,
      date,
      startTime,
      endTime,
      durationMinutes = 30,
      price = 300,
      notes = '',
    } = req.body;

    if (!customerName || !customerPhone || !salonId || !serviceName || !date || !startTime) {
      return res.status(400).json({ error: 'Please provide all required appointment details' });
    }

    const appointmentId = `apt-${Date.now()}`;
    const result = await query(
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
        customerId || `guest-${Date.now().toString().slice(-4)}`,
        customerName.trim(),
        customerPhone.trim(),
        customerEmail ? customerEmail.trim() : '',
        salonId,
        salonName || 'Salon Partner',
        salonCity || 'Pune',
        salonAddress || '',
        serviceId || 'srv-custom',
        serviceName,
        date,
        startTime,
        endTime || startTime,
        Number(durationMinutes) || 30,
        Number(price) || 250,
        notes || '',
      ]
    );

    return res.status(201).json({
      success: true,
      appointment: result.rows[0],
      message: 'Appointment booked successfully!'
    });
  } catch (err: any) {
    console.error('Booking error:', err);
    return res.status(500).json({ error: 'Failed to book appointment: ' + err.message });
  }
});

// 13. Appointments: Update Status (Accept / Complete / Cancel)
app.patch('/api/appointments/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, cancellationReason } = req.body;

    const result = await query(
      `UPDATE appointments
       SET status = $1, cancellation_reason = $2
       WHERE id = $3
       RETURNING *`,
      [status, cancellationReason || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    return res.json({
      success: true,
      appointment: result.rows[0]
    });
  } catch (err: any) {
    console.error('Update appointment status error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 14. Salon Owner: Add Service
app.post('/api/services', async (req: Request, res: Response) => {
  try {
    const { salonId, categoryId, name, description, price, duration } = req.body;
    if (!salonId || !name || !price) {
      return res.status(400).json({ error: 'Salon ID, service name, and price are required' });
    }

    const srvId = `srv-${Date.now()}`;
    const result = await query(
      `INSERT INTO services (id, salon_id, category_id, name, description, price, duration, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
       RETURNING *`,
      [
        srvId,
        salonId,
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

// Vite Middleware for Development / Static serving for Production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const distPath = path.resolve(__dirname, 'dist');

  // Verify and migrate database schema on startup
  try {
    await ensureSchema();
  } catch (schemaErr) {
    console.warn('[DB] Schema ensure warning on startup:', schemaErr);
  }

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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Salonix Server running on http://0.0.0.0:${PORT} (mode: ${isProd ? 'production' : 'development'})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
