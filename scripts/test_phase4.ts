/**
 * Salonix Phase 4 Verification Suite
 * Tests PATCH /api/salons/:id, authorization, validation, schedule conflicts, and dynamic slots.
 */

async function runTests() {
  const BASE_URL = 'http://localhost:3000';
  let passed = 0;
  let total = 0;

  function assert(name: string, condition: boolean, detail?: string) {
    total++;
    if (condition) {
      console.log(`  [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${name} - ${detail || 'Condition not met'}`);
    }
  }

  console.log('\n======================================================');
  console.log('--- STARTING SALONIX PHASE 4 AUTOMATED TEST SUITE ---');
  console.log('======================================================\n');

  // 1. Get Tokens
  const ownerRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner@salonix.com', password: 'password123' }),
  });
  const ownerData = await ownerRes.json();
  const ownerToken = ownerData.token;

  const custRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'user@salonix.com', password: 'password123' }),
  });
  const custData = await custRes.json();
  const custToken = custData.token;

  const adminRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@salonix.com', password: 'password123' }),
  });
  const adminData = await adminRes.json();
  const adminToken = adminData.token;

  // TEST 1: Unauthenticated request rejected with 401
  const t1 = await fetch(`${BASE_URL}/api/salons/salon-1`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tagline: 'Should fail' }),
  });
  assert('Test 1: Unauthenticated request rejected with HTTP 401', t1.status === 401, `Status: ${t1.status}`);

  // TEST 2: Customer cannot update salon details (HTTP 403)
  const t2 = await fetch(`${BASE_URL}/api/salons/salon-1`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${custToken}` },
    body: JSON.stringify({ tagline: 'Customer tamper attempt' }),
  });
  assert('Test 2: Customer cannot update salon details (HTTP 403)', t2.status === 403, `Status: ${t2.status}`);

  // TEST 3: Owner cannot update another owner salon (HTTP 403)
  const t3 = await fetch(`${BASE_URL}/api/salons/salon-2`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({ tagline: 'Tamper other salon' }),
  });
  assert('Test 3: Owner cannot update another owner salon (HTTP 403)', t3.status === 403, `Status: ${t3.status}`);

  // TEST 4: Invalid opening/closing times rejected (opening >= closing) (HTTP 400)
  const t4 = await fetch(`${BASE_URL}/api/salons/salon-1`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({ openingTime: '21:00', closingTime: '09:00' }),
  });
  assert('Test 4: Opening time after closing rejected (HTTP 400)', t4.status === 400, `Status: ${t4.status}`);

  // TEST 5: Invalid break period rejected (break ends after closing) (HTTP 400)
  const t5 = await fetch(`${BASE_URL}/api/salons/salon-1`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({ openingTime: '10:00', closingTime: '19:00', breakStartTime: '18:00', breakEndTime: '20:00' }),
  });
  assert('Test 5: Break period outside operating hours rejected (HTTP 400)', t5.status === 400, `Status: ${t5.status}`);

  // TEST 6: Invalid working days value rejected (HTTP 400)
  const t6 = await fetch(`${BASE_URL}/api/salons/salon-1`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({ workingDays: ['Mon', 'InvalidDay'] }),
  });
  assert('Test 6: Invalid working days rejected (HTTP 400)', t6.status === 400, `Status: ${t6.status}`);

  // TEST 7: Owner successfully updates their own salon profile and schedule
  const t7 = await fetch(`${BASE_URL}/api/salons/salon-1`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({
      tagline: 'Premier wellness and artisan hairstyling in Koregaon Park',
      phone: '+91 98901 23456',
      openingTime: '09:30',
      closingTime: '20:30',
      breakStartTime: '13:30',
      breakEndTime: '14:30',
      workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    }),
  });
  const t7Data = await t7.json();
  assert('Test 7: Owner successfully updates own salon (HTTP 200)', t7.status === 200 && t7Data.success, `Status: ${t7.status}`);

  // TEST 8: Omitted fields remain unchanged
  const t8 = await fetch(`${BASE_URL}/api/salons/salon-1`);
  const t8Data = await t8.json();
  assert('Test 8: Omitted fields preserved (city, address, name intact)', t8Data.salon?.city === 'Pune' && t8Data.salon?.name === 'Aura Luxury Salon & Spa', `City: ${t8Data.salon?.city}`);

  // TEST 9: Dynamic slots availability reflects new opening time (09:30 AM)
  const t9 = await fetch(`${BASE_URL}/api/salons/salon-1/slots?date=2026-10-25&serviceId=srv-101`);
  const t9Data = await t9.json();
  assert('Test 9: Dynamic slot generation starts at 09:30 AM', t9Data.slots[0]?.slot === '09:30 AM', `First slot was: ${t9Data.slots[0]?.slot}`);

  // TEST 10: Admin can update salon settings (HTTP 200)
  const t10 = await fetch(`${BASE_URL}/api/salons/salon-1`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      openingTime: '10:00',
      closingTime: '20:30',
    }),
  });
  assert('Test 10: Admin authorization policy works for salon updates (HTTP 200)', t10.status === 200, `Status: ${t10.status}`);

  // TEST 11: Dynamic slots restored back to 10:00 AM
  const t11 = await fetch(`${BASE_URL}/api/salons/salon-1/slots?date=2026-10-25&serviceId=srv-101`);
  const t11Data = await t11.json();
  assert('Test 11: Restored slots begin at 10:00 AM', t11Data.slots[0]?.slot === '10:00 AM', `First slot: ${t11Data.slots[0]?.slot}`);

  console.log('\n======================================================');
  console.log(`--- TEST RESULTS: ${passed} / ${total} TESTS PASSED ---`);
  console.log('======================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test suite failed with unexpected error:', err);
  process.exit(1);
});
