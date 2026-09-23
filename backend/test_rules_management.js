const http = require('http');
const express = require('express');

let authToken = null;
let testServer = null;
let baseUrl = 'http://localhost:5000';

const request = (path, method = 'GET', body = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(`${baseUrl}${path}`);
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const req = http.request(
      url,
      { method, headers },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: raw ? JSON.parse(raw) : null });
          } catch (e) {
            resolve({ status: res.statusCode, data: raw });
          }
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
};

async function ensureServerRunning() {
  try {
    const res = await request('/api/rules');
    if (res && res.status) return; // Server already running
  } catch (e) {
    // Start self-contained test server on random port
    const app = express();
    app.use(express.json());
    app.use('/api/rules', require('./routes/ruleRoutes'));
    app.use('/api/auth', require('./routes/authRoutes'));

    await new Promise((resolve) => {
      testServer = app.listen(0, () => {
        const port = testServer.address().port;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  }
}

async function runRuleTests() {
  console.log('--- STARTING RULE MANAGEMENT TEST SUITE ---');
  await ensureServerRunning();

  // Step 0: Login to obtain auth token
  const loginRes = await request('/api/auth/login', 'POST', {
    email: 'admin@nexusflow.io',
    password: 'admin123',
  });
  if (loginRes.status === 200 && loginRes.data?.token) {
    authToken = loginRes.data.token;
    console.log('✅ Obtained auth token for admin.');
  } else {
    console.log('ℹ️ Running in open/mock mode without token requirement.');
  }

  // Test 1: Fetch rules list
  console.log('\n[1] Testing GET /api/rules:');
  const res1 = await request('/api/rules');
  console.log('Status:', res1.status, '| Total rules:', Array.isArray(res1.data) ? res1.data.length : 'error');
  if (res1.status !== 200 || !Array.isArray(res1.data)) throw new Error('Failed to list rules');
  console.log('✅ Successfully retrieved rules list.');

  const sampleRule = res1.data[0];
  const targetId = sampleRule._id || sampleRule.id;

  // Test 2: Validation - Missing sensor node
  console.log('\n[2] Testing validation: Missing Sensor node (Expect 400 or 422):');
  const res2 = await request('/api/rules', 'POST', {
    name: 'Invalid Test Rule',
    nodes: [{ id: 'a1', type: 'alert', data: {} }],
    edges: [],
  });
  console.log('Status:', res2.status);
  if (res2.status !== 400 && res2.status !== 422) throw new Error('Validation failed to reject invalid graph');
  console.log('✅ Validation correctly rejected rule lacking sensor root.');

  // Test 3: Create valid rule
  console.log('\n[3] Testing POST /api/rules (Create new rule):');
  const res3 = await request('/api/rules', 'POST', {
    name: 'Auto-Test Pipeline',
    description: 'Generated during management test',
    targetDeviceId: 'DEV-TH-101',
    nodes: [
      { id: 's1', type: 'sensor', data: { deviceId: 'DEV-TH-101' } },
      { id: 'f1', type: 'filter', data: { field: 'temperature', operator: '>', threshold: 70 } },
      { id: 'a1', type: 'alert', data: { severity: 'warning' } },
    ],
    edges: [
      { id: 'e1', source: 's1', target: 'f1' },
      { id: 'e2', source: 'f1', target: 'a1' },
    ],
  });
  console.log('Status:', res3.status, '| Created ID:', res3.data?._id);
  if (res3.status !== 201 || !res3.data?._id) throw new Error('Failed to create valid rule');
  const createdId = res3.data._id;
  console.log('✅ Successfully created valid rule graph.');

  // Test 4: Execution History Endpoint
  console.log('\n[4] Testing GET /api/rules/executions:');
  const res4 = await request('/api/rules/executions');
  console.log('Status:', res4.status, '| Total executions recorded:', Array.isArray(res4.data) ? res4.data.length : 'error');
  if (res4.status !== 200 || !Array.isArray(res4.data)) throw new Error('Failed to fetch executions');
  console.log('✅ Execution history endpoint verified.');

  // Test 5: Status Control - Pause Rule
  console.log(`\n[5] Testing PATCH /api/rules/${createdId}/status (pause):`);
  const res5 = await request(`/api/rules/${createdId}/status`, 'PATCH', { status: 'paused' });
  console.log('Status:', res5.status, '| New Status:', res5.data?.rule?.status);
  if (res5.status !== 200 || res5.data?.rule?.status !== 'paused') throw new Error('Failed to pause rule');
  console.log('✅ Rule paused successfully.');

  // Test 6: Status Control - Resume Rule
  console.log(`\n[6] Testing PATCH /api/rules/${createdId}/status (resume):`);
  const res6 = await request(`/api/rules/${createdId}/status`, 'PATCH', { status: 'active' });
  console.log('Status:', res6.status, '| New Status:', res6.data?.rule?.status);
  if (res6.status !== 200 || res6.data?.rule?.status !== 'active') throw new Error('Failed to resume rule');
  console.log('✅ Rule resumed successfully.');

  // Test 7: Duplicate Rule
  console.log(`\n[7] Testing POST /api/rules/${createdId}/duplicate:`);
  const res7 = await request(`/api/rules/${createdId}/duplicate`, 'POST');
  console.log('Status:', res7.status, '| Duplicated Name:', res7.data?.name);
  if (res7.status !== 201 || !res7.data?._id) throw new Error('Failed to duplicate rule');
  const duplicatedId = res7.data._id;
  console.log('✅ Rule successfully duplicated.');

  // Test 8: Clean Up
  console.log(`\n[8] Cleaning up created test rules...`);
  await request(`/api/rules/${createdId}`, 'DELETE');
  await request(`/api/rules/${duplicatedId}`, 'DELETE');
  console.log('✅ Cleanup complete.');

  console.log('\n=============================================');
  console.log('🎉 ALL RULE MANAGEMENT BACKEND TESTS PASSED!');
  console.log('=============================================\n');

  if (testServer) {
    testServer.close();
  }
}

runRuleTests().catch((err) => {
  console.error('\n❌ TEST FAILED:', err.message);
  if (testServer) testServer.close();
  process.exit(1);
});
