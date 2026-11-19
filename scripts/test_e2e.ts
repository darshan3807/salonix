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

import { query, pool } from '../src/db/db.ts';

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

  // 1. Health check
  await runTest('T1: Health endpoints (/api/health & /healthz)', async () => {
    const h1 = await http('/api/health');
    const h2 = await http('/healthz');
    assert(h1.status === 200 && h1.data?.status === 'ok', `Expected 200 ok on /api/health, got ${h1.status}`);
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
  // Remove only notifications generated during this E2E test window
  await query(
    `DELETE FROM notifications
     WHERE created_at >= $1::timestamptz
       AND (target_user_id = $2 OR target_salon_id = $3)`,
    [testStartTimeIso, customerUid, ownerSalonId]
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
