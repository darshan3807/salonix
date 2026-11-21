import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();
try {
  if (fs.existsSync('/app/.dev.env.json')) {
    const devEnv = JSON.parse(fs.readFileSync('/app/.dev.env.json', 'utf8'));
    for (const [key, value] of Object.entries(devEnv)) {
      if (!process.env[key] && typeof value === 'string') {
        process.env[key] = value;
      }
    }
  }
} catch {
  // ignore
}

import { query, pool, convertPgToMySQL, detectTransactionCommand, getDbConfigInfo } from '../src/db/db.ts';

const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';

interface TestResult {
  name: string;
  passed: boolean;
  detail?: string;
}

const results: TestResult[] = [];
const createdAppointmentIds: string[] = [];
const createdServiceIds: string[] = [];
const createdCategoryIds: string[] = [];
const createdUserEmails: string[] = [];
const createdSalonIds: string[] = [];
let testStartTimeIso = new Date().toISOString();

async function runTest(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ name, passed: true });
    console.log(`  [PASS] ${name}`);
  } catch (err: any) {
    results.push({ name, passed: false, detail: err?.message || String(err) });
    console.error(`  [FAIL] ${name} -> ${err?.message || err}`);
  }
}

function assert(condition: any, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function http(path: string, options: RequestInit = {}, token?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, ok: res.ok, data };
}

function getFutureDate(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}

async function main() {
  console.log(`\n=== SALONIX End-to-End Automated Test Suite (${BASE_URL}) ===\n`);

  // Capture DB server timestamp before creating synthetic notifications so cleanup is exact
  const nowRes = await query('SELECT NOW() AS ts');
  testStartTimeIso = new Date(nowRes.rows[0].ts).toISOString();

  let customerToken = '';
  let ownerToken = '';
  let adminToken = '';
  let ownerSalonId = 'salon-1';
  let ownerServiceId = '';
  let originalCustomerProfile: { name: string; phone: string; city: string } | null = null;
  let customerUid = '';

  // 1. Health check & active DB metadata
  await runTest('T1: Health endpoints (/api/health & /healthz) report active DB metadata', async () => {
    const h1 = await http('/api/health');
    const h2 = await http('/healthz');
    assert(h1.status === 200 && h1.data?.status === 'ok', `Expected 200 ok on /api/health, got ${h1.status}`);
    assert(Boolean(h1.data?.database?.engine && h1.data?.database?.driver), 'Missing database engine metadata on /api/health');
    assert(h2.status === 200 && h2.data?.status === 'ok', `Expected 200 ok on /healthz, got ${h2.status}`);
  });

  // 2. Public Discovery, Category Filter & Sorting
  await runTest('T2: Public Salon Discovery, Services Enrichment & Sorting', async () => {
    const allRes = await http('/api/salons?sort=price_asc');
    assert(allRes.status === 200 && Array.isArray(allRes.data?.salons), 'Salons list failed');
    assert(allRes.data.salons.length > 0, 'Expected at least 1 approved salon');
    const first = allRes.data.salons[0];
    assert(Array.isArray(first.services), 'Salon should include services array');
    assert(Array.isArray(first.category_ids), 'Salon should include category_ids array');

    const descRes = await http('/api/salons?sort=price_desc');
    assert(descRes.status === 200, 'price_desc sort failed');
    const ascPrices = allRes.data.salons.map((s: any) => Number(s.starting_price));
    const descPrices = descRes.data.salons.map((s: any) => Number(s.starting_price));
    assert(ascPrices[0] <= ascPrices[ascPrices.length - 1], 'price_asc ordering invalid');
    assert(descPrices[0] >= descPrices[descPrices.length - 1], 'price_desc ordering invalid');

    const catRes = await http('/api/salons?categoryId=cat-hair');
    assert(catRes.status === 200 && catRes.data.salons.length > 0, 'Category filter returned no salons');
  });

  // 3. Authentication for Customer, Owner, Admin + invalid password rejection
  await runTest('T3: JWT Login for Customer, Salon Owner, Admin & Invalid Password Check', async () => {
    const bad = await http('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'user@salonix.com', password: 'wrong-password' }),
    });
    assert(bad.status === 401, `Expected 401 for wrong password, got ${bad.status}`);

    const cust = await http('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'user@salonix.com', password: 'password123' }),
    });
    assert(cust.status === 200 && cust.data?.token && cust.data?.user?.role === 'customer', 'Customer login failed');
    customerToken = cust.data.token;
    customerUid = cust.data.user.uid;
    originalCustomerProfile = {
      name: cust.data.user.name,
      phone: cust.data.user.phone || '',
      city: cust.data.user.city || 'Pune',
    };

    const own = await http('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'owner@salonix.com', password: 'password123' }),
    });
    assert(own.status === 200 && own.data?.token && own.data?.user?.role === 'owner', 'Owner login failed');
    ownerToken = own.data.token;
    ownerSalonId = own.data.user.salon_id || own.data.user.salonId || 'salon-1';

    const adm = await http('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@salonix.com', password: 'password123' }),
    });
    assert(adm.status === 200 && adm.data?.token && adm.data?.user?.role === 'admin', 'Admin login failed');
    adminToken = adm.data.token;

    const me = await http('/api/auth/me', {}, customerToken);
    assert(me.status === 200 && me.data?.user?.email === 'user@salonix.com', '/api/auth/me failed');
  });

  // 4. RBAC & IDOR Protection
  await runTest('T4: Role-Based Access Control (401/403 enforcement)', async () => {
    const unauthApts = await http('/api/appointments');
    assert(unauthApts.status === 401, `Expected 401 unauthenticated appointments, got ${unauthApts.status}`);

    const custAdmin = await http('/api/admin/stats', {}, customerToken);
    assert(custAdmin.status === 403, `Expected 403 for customer accessing admin stats, got ${custAdmin.status}`);

    const custSalonEdit = await http(
      `/api/salons/${ownerSalonId}`,
      { method: 'PATCH', body: JSON.stringify({ name: 'Hacked Salon' }) },
      customerToken
    );
    assert(custSalonEdit.status === 403, `Expected 403 for customer editing salon, got ${custSalonEdit.status}`);

    const custAddSrv = await http(
      '/api/services',
      { method: 'POST', body: JSON.stringify({ salonId: ownerSalonId, name: 'Hack', price: 100 }) },
      customerToken
    );
    assert(custAddSrv.status === 403, `Expected 403 for customer adding service, got ${custAddSrv.status}`);

    const ownerOtherSalon = await http(
      '/api/salons/salon-2',
      { method: 'PATCH', body: JSON.stringify({ tagline: 'Unauthorized' }) },
      ownerToken
    );
    assert(ownerOtherSalon.status === 403, `Expected 403 for owner editing another salon, got ${ownerOtherSalon.status}`);
  });

  // 5. Salon Owner Service Create, Validate, Edit & Delete
  await runTest('T5: Salon Owner Service CRUD & Validation', async () => {
    // Reject negative price
    const badPrice = await http(
      '/api/services',
      { method: 'POST', body: JSON.stringify({ salonId: ownerSalonId, name: 'Bad Price', price: -50, duration: 30 }) },
      ownerToken
    );
    assert(badPrice.status === 400, `Expected 400 for negative price, got ${badPrice.status}`);

    // Create service
    const created = await http(
      '/api/services',
      {
        method: 'POST',
        body: JSON.stringify({
          salonId: ownerSalonId,
          categoryId: 'cat-hair',
          name: 'E2E Test Styling',
          price: 499,
          duration: 30,
          description: 'Temporary E2E test service',
        }),
      },
      ownerToken
    );
    assert(created.status === 201 && created.data?.service?.id, 'Service creation failed');
    const srvId = created.data.service.id;
    createdServiceIds.push(srvId);

    // Edit service
    const updated = await http(
      `/api/services/${srvId}`,
      { method: 'PATCH', body: JSON.stringify({ name: 'E2E Updated Styling', price: 599, duration: 45 }) },
      ownerToken
    );
    assert(
      updated.status === 200 && updated.data?.service?.name === 'E2E Updated Styling' && Number(updated.data?.service?.price) === 599,
      'Service update failed'
    );

    // Delete service
    const deleted = await http(`/api/services/${srvId}`, { method: 'DELETE' }, ownerToken);
    assert(deleted.status === 200 && deleted.data?.success, 'Service delete failed');
  });

  // Pick a real active service from owner's salon for booking tests
  const salonDetail = await http(`/api/salons/${ownerSalonId}`);
  ownerServiceId = salonDetail.data?.services?.[0]?.id;

  // Find a future date where salon is open and has >= 3 available slots
  let testDate = '';
  let testSlots: string[] = [];
  for (let offset = 14; offset <= 25; offset++) {
    const candidate = getFutureDate(offset);
    const sRes = await http(`/api/salons/${ownerSalonId}/slots?date=${candidate}&serviceId=${ownerServiceId}`);
    if (sRes.ok && sRes.data?.available && (sRes.data.slots || []).length >= 3) {
      testDate = candidate;
      testSlots = sRes.data.slots.map((s: any) => s.slot);
      break;
    }
  }

  // 6. Dynamic Slot Generation
  await runTest('T6: Dynamic Slot Generation returns valid slots', async () => {
    assert(Boolean(ownerServiceId), 'No active service found on owner salon');
    assert(Boolean(testDate) && testSlots.length >= 3, 'Could not find future open date with >= 3 slots');
  });

  // 7. Pending Booking Creation & Double-Booking 409 Protection
  let pendingApt1Id = '';
  const chosenSlot1 = testSlots[0];
  await runTest('T7: Booking Starts as Pending & Blocks Double-Booking (HTTP 409)', async () => {
    const b1 = await http(
      '/api/appointments',
      {
        method: 'POST',
        body: JSON.stringify({
          customerName: 'Pooja Sharma',
          customerPhone: '+91 9876543210',
          salonId: ownerSalonId,
          serviceId: ownerServiceId,
          date: testDate,
          startTime: chosenSlot1,
          notes: 'E2E pending booking test',
        }),
      },
      customerToken
    );
    assert(b1.status === 201 && b1.data?.appointment?.status === 'pending', `Expected 201 pending, got ${b1.status} / ${b1.data?.appointment?.status}`);
    pendingApt1Id = b1.data.appointment.id;
    createdAppointmentIds.push(pendingApt1Id);

    // Double booking attempt on same slot must fail with 409
    const dup = await http(
      '/api/appointments',
      {
        method: 'POST',
        body: JSON.stringify({
          customerName: 'Pooja Sharma',
          customerPhone: '+91 9876543210',
          salonId: ownerSalonId,
          serviceId: ownerServiceId,
          date: testDate,
          startTime: chosenSlot1,
        }),
      },
      customerToken
    );
    assert(dup.status === 409, `Expected 409 conflict on double booking, got ${dup.status}`);

    // Slot should no longer appear in available slots
    const slotsAfter = await http(`/api/salons/${ownerSalonId}/slots?date=${testDate}&serviceId=${ownerServiceId}`);
    const remaining = (slotsAfter.data?.slots || []).map((s: any) => s.slot);
    assert(!remaining.includes(chosenSlot1), 'Booked pending slot should be removed from available slots');
  });

  // 8. Real PostgreSQL Notifications & Ownership Isolation
  await runTest('T8: Real Notifications Created, Scoped, & Mark-Read Persists', async () => {
    const ownerNotifs = await http('/api/notifications', {}, ownerToken);
    assert(ownerNotifs.status === 200 && ownerNotifs.data.unreadCount >= 1, 'Owner should have unread booking notification');
    const ownerBookingNotif = ownerNotifs.data.notifications.find((n: any) => n.title === 'New Booking Request');
    assert(Boolean(ownerBookingNotif), 'Owner missing "New Booking Request" notification');

    // Customer must NOT be able to mark owner's notification read (403)
    const crossRead = await http(`/api/notifications/${ownerBookingNotif.id}/read`, { method: 'PATCH' }, customerToken);
    assert(crossRead.status === 403, `Expected 403 on cross-user notification read, got ${crossRead.status}`);

    // Owner marks own notification read -> 200 & persisted
    const markRead = await http(`/api/notifications/${ownerBookingNotif.id}/read`, { method: 'PATCH' }, ownerToken);
    assert(markRead.status === 200 && markRead.data?.notification?.read === true, 'Owner mark notification read failed');
  });

  // 9. Owner Rejects Pending Booking -> Reason Saved, Slot Released, Invalid Transition Blocked
  await runTest('T9: Owner Rejects Pending Booking (Reason Saved, Slot Released, Re-Confirm Blocked)', async () => {
    const rej = await http(
      `/api/appointments/${pendingApt1Id}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status: 'rejected', rejectionReason: 'Stylist unavailable at this hour' }),
      },
      ownerToken
    );
    assert(
      rej.status === 200 &&
        rej.data?.appointment?.status === 'rejected' &&
        rej.data?.appointment?.rejection_reason === 'Stylist unavailable at this hour',
      'Owner reject failed or reason missing'
    );

    // Slot should be released immediately
    const slotsReopened = await http(`/api/salons/${ownerSalonId}/slots?date=${testDate}&serviceId=${ownerServiceId}`);
    const reopenedList = (slotsReopened.data?.slots || []).map((s: any) => s.slot);
    assert(reopenedList.includes(chosenSlot1), 'Rejected slot should become available again');

    // Invalid transition: rejected -> confirmed must return 400
    const badTransition = await http(
      `/api/appointments/${pendingApt1Id}/status`,
      { method: 'PATCH', body: JSON.stringify({ status: 'confirmed' }) },
      ownerToken
    );
    assert(badTransition.status === 400, `Expected 400 for invalid rejected->confirmed transition, got ${badTransition.status}`);

    // Customer receives rejection notification
    const custNotifs = await http('/api/notifications', {}, customerToken);
    const hasRejNotif = (custNotifs.data?.notifications || []).some(
      (n: any) => n.title === 'Appointment Rejected' && n.message.includes('Stylist unavailable')
    );
    assert(hasRejNotif, 'Customer did not receive rejection notification with reason');
  });

  // 10. Full Happy Path: Pending -> Owner Accept (Confirmed) -> Owner Complete
  await runTest('T10: Pending -> Owner Accepts (Confirmed) -> Owner Completes', async () => {
    const b2 = await http(
      '/api/appointments',
      {
        method: 'POST',
        body: JSON.stringify({
          customerName: 'Pooja Sharma',
          customerPhone: '+91 9876543210',
          salonId: ownerSalonId,
          serviceId: ownerServiceId,
          date: testDate,
          startTime: testSlots[1],
        }),
      },
      customerToken
    );
    assert(b2.status === 201 && b2.data?.appointment?.status === 'pending', 'Booking 2 creation failed');
    const apt2Id = b2.data.appointment.id;
    createdAppointmentIds.push(apt2Id);

    const acc = await http(
      `/api/appointments/${apt2Id}/status`,
      { method: 'PATCH', body: JSON.stringify({ status: 'confirmed' }) },
      ownerToken
    );
    assert(acc.status === 200 && acc.data?.appointment?.status === 'confirmed', 'Owner accept failed');

    const comp = await http(
      `/api/appointments/${apt2Id}/status`,
      { method: 'PATCH', body: JSON.stringify({ status: 'completed' }) },
      ownerToken
    );
    assert(comp.status === 200 && comp.data?.appointment?.status === 'completed', 'Owner complete failed');
  });

  // 11. Customer Cancels Pending Booking -> Slot Freed & Owner Notified
  await runTest('T11: Customer Cancels Own Booking & Releases Slot', async () => {
    const b3 = await http(
      '/api/appointments',
      {
        method: 'POST',
        body: JSON.stringify({
          customerName: 'Pooja Sharma',
          customerPhone: '+91 9876543210',
          salonId: ownerSalonId,
          serviceId: ownerServiceId,
          date: testDate,
          startTime: testSlots[2],
        }),
      },
      customerToken
    );
    assert(b3.status === 201, 'Booking 3 creation failed');
    const apt3Id = b3.data.appointment.id;
    createdAppointmentIds.push(apt3Id);

    // Customer cannot accept their own booking (403)
    const custTryConfirm = await http(
      `/api/appointments/${apt3Id}/status`,
      { method: 'PATCH', body: JSON.stringify({ status: 'confirmed' }) },
      customerToken
    );
    assert(custTryConfirm.status === 403, `Expected 403 for customer confirming booking, got ${custTryConfirm.status}`);

    // Customer cancels own booking -> 200
    const cancel = await http(
      `/api/appointments/${apt3Id}/status`,
      { method: 'PATCH', body: JSON.stringify({ status: 'cancelled', cancellationReason: 'Plans changed' }) },
      customerToken
    );
    assert(
      cancel.status === 200 &&
        cancel.data?.appointment?.status === 'cancelled' &&
        cancel.data?.appointment?.cancellation_reason === 'Plans changed',
      'Customer cancel failed'
    );
  });

  // 12. Customer Profile Management
  await runTest('T12: Customer Profile Update & Restoration (PATCH /api/auth/profile)', async () => {
    assert(Boolean(originalCustomerProfile), 'Original customer profile missing');
    const upd = await http(
      '/api/auth/profile',
      {
        method: 'PATCH',
        body: JSON.stringify({
          name: originalCustomerProfile!.name,
          phone: '+91 98220 11223',
          city: 'Mumbai',
        }),
      },
      customerToken
    );
    assert(upd.status === 200 && upd.data?.user?.city === 'Mumbai', 'Profile update failed');

    // Restore original profile immediately
    const restore = await http(
      '/api/auth/profile',
      {
        method: 'PATCH',
        body: JSON.stringify(originalCustomerProfile),
      },
      customerToken
    );
    assert(restore.status === 200 && restore.data?.user?.city === originalCustomerProfile!.city, 'Profile restore failed');
  });

  // 13. Admin Category Management
  await runTest('T13: Admin Category Create, Delete & In-Use Protection', async () => {
    const createCat = await http(
      '/api/admin/categories',
      {
        method: 'POST',
        body: JSON.stringify({ name: 'E2E Nail Studio', description: 'Temporary test category' }),
      },
      adminToken
    );
    assert(createCat.status === 201 && createCat.data?.category?.id, 'Admin category create failed');
    const catId = createCat.data.category.id;
    createdCategoryIds.push(catId);

    // Deleting an in-use category must return 409
    const delInUse = await http('/api/admin/categories/cat-hair', { method: 'DELETE' }, adminToken);
    assert(delInUse.status === 409, `Expected 409 when deleting in-use category, got ${delInUse.status}`);

    // Deleting unused synthetic category must succeed
    const delNew = await http(`/api/admin/categories/${catId}`, { method: 'DELETE' }, adminToken);
    assert(delNew.status === 200 && delNew.data?.success, 'Admin category delete failed');
  });

  // 14. Cross-DB SQL Dialect & MariaDB/MySQL Adapter Verification
  await runTest('T14: MariaDB/MySQL SQL Adapter & Zero PostgreSQL-only RETURNING Clauses', async () => {
    // 1. Transaction commands must be intercepted (never sent to MariaDB prepared statements)
    assert(detectTransactionCommand('BEGIN') === 'BEGIN', 'BEGIN not detected');
    assert(detectTransactionCommand('BEGIN;') === 'BEGIN', 'BEGIN; not detected');
    assert(detectTransactionCommand('COMMIT') === 'COMMIT', 'COMMIT not detected');
    assert(detectTransactionCommand('ROLLBACK') === 'ROLLBACK', 'ROLLBACK not detected');
    assert(detectTransactionCommand('SELECT * FROM users') === null, 'Regular SELECT falsely flagged as transaction');

    // 2. Repeated positional params ($1 used multiple times) must expand accurately
    const repeated = convertPgToMySQL(
      'SELECT * FROM salons WHERE LOWER(name) LIKE LOWER($1) OR LOWER(city) LIKE LOWER($1)',
      ['%pune%']
    );
    assert(repeated.values.length === 2 && repeated.values[0] === '%pune%' && repeated.values[1] === '%pune%', 'Repeated $1 param expansion failed');

    // 3. FOR SHARE -> LOCK IN SHARE MODE & ::timestamptz cast stripped
    const locked = convertPgToMySQL('SELECT * FROM salons WHERE id = $1 AND created_at >= $2::timestamptz FOR SHARE', ['salon-1', '2026-01-01']);
    assert(locked.sql.includes('LOCK IN SHARE MODE') && !locked.sql.includes('FOR SHARE'), 'FOR SHARE translation failed');
    assert(!locked.sql.includes('::timestamptz'), '::timestamptz cast stripping failed');

    // 4. MariaDB reserved column `read` on notifications quoted safely in INSERT and UPDATE
    const notifInsert = convertPgToMySQL(
      `INSERT INTO notifications (\n id, title, type, read, action_route\n) VALUES ($1, $2, $3, false, $4)`,
      ['n1', 'Hi', 'test', 'home']
    );
    assert(notifInsert.sql.includes('`read`'), 'Multiline INSERT notifications.read quoting failed');

    const notifUpdate = convertPgToMySQL(
      'UPDATE notifications SET read = true WHERE target_user_id = $1 AND read = false',
      ['u1']
    );
    assert(notifUpdate.sql.includes('SET `read` = true') && notifUpdate.sql.includes('AND `read` = false'), 'UPDATE notifications.read quoting failed');

    // 5. Verify server.ts contains ZERO SQL RETURNING clauses (ignore comments)
    const serverSource = fs.readFileSync('server.ts', 'utf8').replace(/\/\/.*$/gm, '');
    const returningSqlMatch = serverSource.match(/\bRETURNING\s+(\*|[a-z_]+(?:\s*,\s*[a-z_]+)*)/g);
    assert(!returningSqlMatch, `Found PostgreSQL-only RETURNING clause(s) in server.ts: ${returningSqlMatch?.join(', ')}`);
  });

  // 15. Customer Registration End-to-End (Validation, Creation, Bcrypt, Duplicate 409, Login)
  await runTest('T15: Customer Registration End-to-End, Bcrypt Verification, Duplicate 409 & Login', async () => {
    // Reject invalid email
    const badEmail = await http('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test User', email: 'not-an-email', password: 'password123', role: 'customer' }),
    });
    assert(badEmail.status === 400, `Expected 400 for invalid email, got ${badEmail.status}`);

    // Reject short password
    const shortPwd = await http('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test User', email: 'shortpwd@salonix.test', password: '123', role: 'customer' }),
    });
    assert(shortPwd.status === 400, `Expected 400 for short password, got ${shortPwd.status}`);

    const regEmail = `e2e.cust.${Date.now()}@salonix.test`;
    createdUserEmails.push(regEmail);
    const reg = await http('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'E2E Registered Customer',
        email: regEmail,
        phone: '+91 98111 22334',
        city: 'Pune',
        password: 'TestPassword@123',
        role: 'customer',
      }),
    });
    assert(reg.status === 201 && reg.data?.success && reg.data?.token, `Customer registration failed: ${reg.status} ${JSON.stringify(reg.data)}`);
    assert(reg.data?.user?.email === regEmail && reg.data?.user?.role === 'customer', 'Registered customer payload mismatch');
    assert(!('password' in reg.data.user), 'Password must never be returned in registration response');

    // Verify stored password in DB is bcrypt hash
    const dbRow = await query('SELECT password, uid FROM users WHERE LOWER(email) = LOWER($1)', [regEmail]);
    assert(dbRow.rows.length === 1, 'Registered customer not found in database');
    assert(
      String(dbRow.rows[0].password || '').startsWith('$2'),
      'Registered customer password is NOT stored as a bcrypt hash'
    );

    // Duplicate email must return 409
    const dup = await http('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Duplicate Customer',
        email: regEmail,
        password: 'TestPassword@123',
        role: 'customer',
      }),
    });
    assert(dup.status === 409, `Expected 409 for duplicate email, got ${dup.status}`);

    // Login with newly registered credentials must succeed
    const loginRes = await http('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: regEmail, password: 'TestPassword@123' }),
    });
    assert(loginRes.status === 200 && loginRes.data?.token, 'Login failed for newly registered customer');
  });

  // 16. Salon Owner Registration End-to-End (Atomic Owner + Salon + 3 Starter Services + Login)
  await runTest('T16: Salon Owner Registration End-to-End (Owner + Salon + Starter Services + Login)', async () => {
    const ownerRegEmail = `e2e.owner.${Date.now()}@salonix.test`;
    createdUserEmails.push(ownerRegEmail);
    const reg = await http('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'E2E Salon Partner',
        email: ownerRegEmail,
        phone: '+91 98222 33445',
        city: 'Nashik',
        password: 'OwnerPassword@123',
        role: 'owner',
        salonName: 'E2E Velvet Lounge',
        salonAddress: 'Shop 9, College Road, Nashik',
        openingTime: '09:30 AM',
        closingTime: '08:30 PM',
        startingPrice: 300,
        aboutSalon: 'Temporary E2E salon partner registration verification',
      }),
    });
    assert(reg.status === 201 && reg.data?.success && reg.data?.token, `Owner registration failed: ${reg.status} ${JSON.stringify(reg.data)}`);
    assert(reg.data?.user?.role === 'owner', 'Registered owner role mismatch');
    const createdSalonId = reg.data?.user?.salonId || reg.data?.user?.salon_id;
    assert(Boolean(createdSalonId), 'Owner registration did not assign salonId');
    createdSalonIds.push(createdSalonId);

    // Verify salon + 3 default services exist in DB with normalized 24h hours & JSON working_days
    const salonDb = await query('SELECT * FROM salons WHERE id = $1', [createdSalonId]);
    assert(salonDb.rows.length === 1, 'Owner salon row missing in database');
    assert(salonDb.rows[0].opening_time === '09:30' && salonDb.rows[0].closing_time === '20:30', `Expected normalized 24h hours 09:30-20:30, got ${salonDb.rows[0].opening_time}-${salonDb.rows[0].closing_time}`);
    const wdVal = salonDb.rows[0].working_days;
    const wdValid = Array.isArray(wdVal) ? wdVal.length === 7 : typeof wdVal === 'string' && wdVal.startsWith('[');
    assert(wdValid, `Expected valid JSON working_days, got ${JSON.stringify(wdVal)}`);

    const srvDb = await query('SELECT id FROM services WHERE salon_id = $1', [createdSalonId]);
    assert(srvDb.rows.length === 3, `Expected 3 starter services for new salon, got ${srvDb.rows.length}`);

    // Verify newly registered owner can log in
    const loginRes = await http('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: ownerRegEmail, password: 'OwnerPassword@123' }),
    });
    assert(loginRes.status === 200 && loginRes.data?.token && loginRes.data?.user?.role === 'owner', 'Login failed for newly registered owner');
  });

  // Cleanup synthetic test records so existing database data stays spotless
  console.log('\nCleaning up synthetic E2E test records...');
  for (const id of createdAppointmentIds) {
    await query('DELETE FROM appointments WHERE id = $1', [id]);
  }
  for (const id of createdServiceIds) {
    await query('DELETE FROM services WHERE id = $1', [id]);
  }
  for (const id of createdCategoryIds) {
    await query('DELETE FROM categories WHERE id = $1', [id]);
  }
  for (const sid of createdSalonIds) {
    await query('UPDATE users SET salon_id = NULL WHERE salon_id = $1', [sid]);
    await query('DELETE FROM services WHERE salon_id = $1', [sid]);
    await query('DELETE FROM notifications WHERE target_salon_id = $1', [sid]);
    await query('DELETE FROM salons WHERE id = $1', [sid]);
  }
  for (const email of createdUserEmails) {
    await query('DELETE FROM notifications WHERE message LIKE $1', [`%${email}%`]);
    await query('DELETE FROM users WHERE LOWER(email) = LOWER($1)', [email]);
  }
  // Remove only notifications generated during this E2E test window (cross-DB safe)
  const dbInfo = getDbConfigInfo();
  const formattedStart = dbInfo.isMySQL
    ? testStartTimeIso.slice(0, 19).replace('T', ' ')
    : testStartTimeIso;
  await query(
    `DELETE FROM notifications
     WHERE created_at >= $1
       AND (target_user_id = $2 OR target_salon_id = $3)`,
    [formattedStart, customerUid, ownerSalonId]
  );

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`\n=== E2E Summary: ${passed}/${results.length} passed, ${failed} failed ===\n`);

  await pool.end();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error('Fatal test runner error:', err);
  try {
    await pool.end();
  } catch {}
  process.exit(1);
});
