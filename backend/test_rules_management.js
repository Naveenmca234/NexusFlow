const http = require('http');

let authToken = null;

const request = (path, method = 'GET', body = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(`http://localhost:5000${path}`);
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

async function runRuleTests() {
  console.log('--- STARTING RULE MANAGEMENT TEST SUITE ---');

  // Step 0: Login to obtain auth token
  const loginRes = await request('/api/auth/login', 'POST', {
    email: 'admin@nexusflow.io',
    password: 'admin123',
  });
  if (loginRes.status !== 200 || !loginRes.data?.token) {
    throw new Error('Failed to login to obtain token');
  }
  authToken = loginRes.data.token;
  console.log('✓ Obtained auth token for admin.');

  // Test 1: Fetch rules list
  console.log('\n[1] Testing GET /api/rules:');
  const res1 = await request('/api/rules');
  console.log('Status:', res1.status, '| Total rules:', Array.isArray(res1.data) ? res1.data.length : 'error');
  if (res1.status !== 200 || !Array.isArray(res1.data)) throw new Error('Failed to list rules');
  console.log('✓ Successfully retrieved rules list.');

  const sampleRule = res1.data[0];
  const targetId = sampleRule._id || sampleRule.id;

  // Test 2: Validation - Missing sensor node
  console.log('\n[2] Testing validation: Missing Sensor node (Expect 400):');
  const res2 = await request('/api/rules', 'POST', {
    name: 'Invalid Rule No Sensor',
    nodes: [
      { id: 'alt-1', type: 'alert', data: { label: 'Alert', severity: 'warning' } },
    ],
    edges: [],
  });
  console.log('Status:', res2.status, '| Error details:', res2.data?.details);
  if (res2.status !== 400 || !res2.data?.details?.some((d) => d.includes('sensor'))) {
    throw new Error('Failed to reject rule missing sensor');
  }
  console.log('✓ Correctly rejected rule missing sensor node.');

  // Test 3: Validation - Missing action node
  console.log('\n[3] Testing validation: Missing Action node (Expect 400):');
  const res3 = await request('/api/rules', 'POST', {
    name: 'Invalid Rule No Action',
    nodes: [
      { id: 'sens-1', type: 'sensor', data: { label: 'Sensor', metric: 'temperature' } },
      { id: 'filt-1', type: 'filter', data: { label: 'Filter', threshold: 50, operator: '>' } },
    ],
    edges: [{ source: 'sens-1', target: 'filt-1' }],
  });
  console.log('Status:', res3.status, '| Error details:', res3.data?.details);
  if (res3.status !== 400 || !res3.data?.details?.some((d) => d.includes('alert') || d.includes('webhook'))) {
    throw new Error('Failed to reject rule missing action node');
  }
  console.log('✓ Correctly rejected rule missing action node.');

  // Test 4: Validation - Disconnected node
  console.log('\n[4] Testing validation: Disconnected node (Expect 400):');
  const res4 = await request('/api/rules', 'POST', {
    name: 'Invalid Rule Disconnected Node',
    nodes: [
      { id: 'sens-1', type: 'sensor', data: { label: 'Sensor', metric: 'temperature' } },
      { id: 'filt-1', type: 'filter', data: { label: 'Filter', threshold: 50, operator: '>' } },
      { id: 'alt-1', type: 'alert', data: { label: 'Alert', severity: 'warning' } },
      { id: 'disc-1', type: 'filter', data: { label: 'Floating Node', threshold: 10, operator: '<' } },
    ],
    edges: [
      { source: 'sens-1', target: 'filt-1' },
      { source: 'filt-1', target: 'alt-1' },
    ],
  });
  console.log('Status:', res4.status, '| Error details:', res4.data?.details);
  if (res4.status !== 400 || !res4.data?.details?.some((d) => d.includes('Disconnected'))) {
    throw new Error('Failed to reject rule with disconnected node');
  }
  console.log('✓ Correctly rejected rule with disconnected node.');

  // Test 5: Validation - Empty/invalid required configuration
  console.log('\n[5] Testing validation: Missing threshold value (Expect 400):');
  const res5 = await request('/api/rules', 'POST', {
    name: 'Invalid Rule Missing Threshold',
    nodes: [
      { id: 'sens-1', type: 'sensor', data: { label: 'Sensor', metric: 'temperature' } },
      { id: 'filt-1', type: 'filter', data: { label: 'Filter', threshold: '', operator: '>' } },
      { id: 'alt-1', type: 'alert', data: { label: 'Alert', severity: 'warning' } },
    ],
    edges: [
      { source: 'sens-1', target: 'filt-1' },
      { source: 'filt-1', target: 'alt-1' },
    ],
  });
  console.log('Status:', res5.status, '| Error details:', res5.data?.details);
  if (res5.status !== 400 || !res5.data?.details?.some((d) => d.includes('threshold'))) {
    throw new Error('Failed to reject rule with empty threshold');
  }
  console.log('✓ Correctly rejected rule with empty configuration value.');

  // Test 6: Create a fully valid rule
  console.log('\n[6] Testing valid rule creation (Expect 201):');
  const validRule = {
    name: 'Bearing Pressure Spike Alert',
    description: 'Triggers alert when bearing pressure exceeds 1040 hPa',
    enabled: true,
    targetDeviceId: 'DEV-PR-201',
    nodes: [
      {
        id: 's-1',
        type: 'sensor',
        position: { x: 50, y: 100 },
        data: { label: 'Pressure Sensor', metric: 'pressure' },
      },
      {
        id: 'f-1',
        type: 'filter',
        position: { x: 300, y: 100 },
        data: { label: 'High Pressure Filter', field: 'pressure', operator: '>', threshold: 1040 },
      },
      {
        id: 'a-1',
        type: 'alert',
        position: { x: 550, y: 100 },
        data: { label: 'Pressure Alert', severity: 'critical' },
      },
    ],
    edges: [
      { id: 'e-1', source: 's-1', target: 'f-1' },
      { id: 'e-2', source: 'f-1', target: 'a-1' },
    ],
  };
  const res6 = await request('/api/rules', 'POST', validRule);
  console.log('Status:', res6.status, '| Created rule ID:', res6.data?._id);
  if (res6.status !== 201 || !res6.data?._id) throw new Error('Failed to create valid rule');
  const createdRuleId = res6.data._id;
  console.log('✓ Valid rule created successfully.');

  // Test 7: Toggle Rule Status (Enable/Disable)
  console.log(`\n[7] Testing PATCH /api/rules/${createdRuleId}/toggle:`);
  const res7 = await request(`/api/rules/${createdRuleId}/toggle`, 'PATCH');
  console.log('Status:', res7.status, '| New enabled state:', res7.data?.rule?.enabled);
  if (res7.status !== 200 || res7.data?.rule?.enabled !== false) {
    throw new Error('Failed to toggle rule to disabled');
  }
  console.log('✓ Successfully toggled rule status to disabled.');

  // Test 8: Duplicate Rule
  console.log(`\n[8] Testing POST /api/rules/${createdRuleId}/duplicate:`);
  const res8 = await request(`/api/rules/${createdRuleId}/duplicate`, 'POST');
  console.log('Status:', res8.status, '| Duplicate name:', res8.data?.name, '| ID:', res8.data?._id);
  if (res8.status !== 201 || !res8.data?.name?.includes('(Copy)')) {
    throw new Error('Failed to duplicate rule');
  }
  const duplicatedId = res8.data._id;
  console.log('✓ Rule successfully duplicated with copy suffix.');

  // Test 9: Delete Rules
  console.log(`\n[9] Testing DELETE /api/rules/${duplicatedId}:`);
  const res9 = await request(`/api/rules/${duplicatedId}`, 'DELETE');
  console.log('Status:', res9.status, '| Message:', res9.data?.message);
  if (res9.status !== 200) throw new Error('Failed to delete rule');
  console.log('✓ Rule deleted successfully.');

  console.log('\n=============================================');
  console.log('🎉 ALL RULE MANAGEMENT BACKEND TESTS PASSED!');
  console.log('=============================================');
}

runRuleTests().catch((err) => {
  console.error('\n❌ TEST FAILED:', err.message);
  process.exit(1);
});
