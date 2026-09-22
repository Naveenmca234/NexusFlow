const http = require('http');

const request = (path, method = 'GET', body = null, token = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(`http://localhost:5000${path}`);
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(
      url,
      {
        method,
        headers,
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => {
          rawData += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = rawData ? JSON.parse(rawData) : null;
            resolve({ status: res.statusCode, headers: res.headers, data: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, headers: res.headers, data: rawData });
          }
        });
      }
    );

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
};

async function runTests() {
  console.log('--- STARTING NEXUSFLOW AUTH TEST SUITE ---');

  // Test 1: Unauthenticated request to protected endpoint (/api/devices)
  console.log('\n[1] Testing GET /api/devices without token (Expect 401):');
  const res1 = await request('/api/devices');
  console.log('Status:', res1.status, '| Response:', res1.data);
  if (res1.status !== 401) throw new Error('Expected 401 for unauthenticated request');
  console.log('✓ Protected route correctly denied unauthenticated access.');

  // Test 2: Ingestion endpoint (/api/telemetry) remains accessible
  console.log('\n[2] Testing GET /api/telemetry without token (Expect 200 - Ingestion unchanged):');
  const res2 = await request('/api/telemetry?limit=1');
  console.log('Status:', res2.status, '| Count:', Array.isArray(res2.data) ? res2.data.length : 'ok');
  if (res2.status !== 200) throw new Error('Expected 200 for open telemetry stream');
  console.log('✓ Telemetry stream remains operational and unhindered.');

  // Test 3: Login with default admin account
  console.log('\n[3] Testing POST /api/auth/login with pre-seeded admin account:');
  const res3 = await request('/api/auth/login', 'POST', {
    email: 'admin@nexusflow.io',
    password: 'admin123',
  });
  console.log('Status:', res3.status, '| User:', res3.data?.user?.name, '| Token received:', !!res3.data?.token);
  if (res3.status !== 200 || !res3.data?.token) throw new Error('Failed to login with default admin');
  const adminToken = res3.data.token;
  console.log('✓ Login successful with default admin credentials.');

  // Test 4: Access protected route with Bearer token
  console.log('\n[4] Testing GET /api/devices with Bearer token:');
  const res4 = await request('/api/devices', 'GET', null, adminToken);
  console.log('Status:', res4.status, '| Devices count:', Array.isArray(res4.data) ? res4.data.length : 'ok');
  if (res4.status !== 200) throw new Error('Expected 200 with valid JWT token');
  console.log('✓ Protected route successfully accessed with Bearer token.');

  // Test 5: Register a new user
  const uniqueEmail = `engineer_${Date.now()}@nexusflow.io`;
  console.log(`\n[5] Testing POST /api/auth/register with new email: ${uniqueEmail}`);
  const res5 = await request('/api/auth/register', 'POST', {
    name: 'Sarah Chen',
    email: uniqueEmail,
    password: 'securePassword2026',
  });
  console.log('Status:', res5.status, '| User:', res5.data?.user?.name, '| Token received:', !!res5.data?.token);
  if (res5.status !== 201 || !res5.data?.token) throw new Error('Expected 201 for new user registration');
  const newUserToken = res5.data.token;
  console.log('✓ New user registered and token generated.');

  // Test 6: Verify duplicate registration is rejected
  console.log('\n[6] Testing duplicate email registration (Expect 400):');
  const res6 = await request('/api/auth/register', 'POST', {
    name: 'Duplicate Sarah',
    email: uniqueEmail,
    password: 'anotherPassword',
  });
  console.log('Status:', res6.status, '| Error:', res6.data?.error);
  if (res6.status !== 400) throw new Error('Expected 400 for duplicate registration');
  console.log('✓ Duplicate registration correctly rejected.');

  // Test 7: Verify /api/auth/me with the new user token
  console.log('\n[7] Testing GET /api/auth/me with new user token:');
  const res7 = await request('/api/auth/me', 'GET', null, newUserToken);
  console.log('Status:', res7.status, '| User email:', res7.data?.user?.email);
  if (res7.status !== 200 || res7.data?.user?.email !== uniqueEmail.toLowerCase()) {
    throw new Error('Expected 200 with correct user profile');
  }
  console.log('✓ /api/auth/me verified user profile.');

  // Test 8: Login with new user credentials
  console.log('\n[8] Testing POST /api/auth/login with newly registered user:');
  const res8 = await request('/api/auth/login', 'POST', {
    email: uniqueEmail,
    password: 'securePassword2026',
  });
  console.log('Status:', res8.status, '| Message:', res8.data?.message);
  if (res8.status !== 200 || !res8.data?.token) throw new Error('Login with new user failed');
  console.log('✓ Successfully logged in with new user credentials.');

  // Test 9: Login with incorrect password
  console.log('\n[9] Testing POST /api/auth/login with invalid password (Expect 401):');
  const res9 = await request('/api/auth/login', 'POST', {
    email: uniqueEmail,
    password: 'wrongPassword',
  });
  console.log('Status:', res9.status, '| Error:', res9.data?.error);
  if (res9.status !== 401) throw new Error('Expected 401 for wrong password');
  console.log('✓ Invalid password correctly rejected.');

  console.log('\n=============================================');
  console.log('🎉 ALL BACKEND AUTHENTICATION TESTS PASSED!');
  console.log('=============================================');
}

runTests().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED:', err.message);
  process.exit(1);
});
