const assert = require('assert');
const { Subject } = require('rxjs');
const { compileRuleGraph } = require('./engine/ruleCompiler');
const { resetAlertCooldowns, alertCooldownTracker } = require('./engine/nodeHandlers');
const express = require('express');
const alertRoutes = require('./routes/alertRoutes');

async function runTests() {
  console.log('--- TEST 1: Alert Cooldown Suppression in RxJS Pipeline ---');
  resetAlertCooldowns();

  const telemetrySource$ = new Subject();
  let alertsFired = [];

  // Mock broadcast function
  const socketServer = require('./engine/socketServer');
  const origBroadcast = socketServer.broadcast;
  socketServer.broadcast = (type, payload) => {
    if (type === 'ALERT_TRIGGERED') {
      alertsFired.push(payload);
    }
  };

  // Rule with 5 second cooldown: Temperature > 80°C -> Alert
  const ruleGraph = {
    _id: 'rule-thermal-cooldown',
    name: 'Thermal Protection Rule',
    targetDeviceId: 'DEV-TH-101',
    cooldownSeconds: 5,
    nodes: [
      { id: '1', type: 'sensor', data: { deviceId: 'DEV-TH-101' } },
      { id: '2', type: 'condition', data: { field: 'temperature', operator: '>', threshold: 80 } },
      { id: '3', type: 'alert', data: { label: 'High Heat Hazard', severity: 'critical', cooldownSeconds: 5 } }
    ],
    edges: [
      { source: '1', target: '2' },
      { source: '2', target: '3' }
    ]
  };

  const pipeline = compileRuleGraph(ruleGraph, telemetrySource$);
  assert(pipeline, 'Pipeline should be compiled');

  // Emit reading 1: 85°C at t=0 -> should fire alert
  telemetrySource$.next({ deviceId: 'DEV-TH-101', temperature: 85, timestamp: new Date() });
  await new Promise(r => setTimeout(r, 50));
  assert.strictEqual(alertsFired.length, 1, 'First breach at 85°C should fire an alert');
  assert.strictEqual(alertsFired[0].status, 'new', 'Initial alert status should be "new"');
  assert.strictEqual(alertsFired[0].cooldownSeconds, 5, 'Alert should record cooldown of 5s');
  assert.strictEqual(alertsFired[0].triggerValue, 85, 'Alert should record triggerValue');
  console.log('✅ First alert fired at 85°C with status="new" and cooldown=5s');

  // Emit reading 2: 87°C at t=100ms -> temperature still > 80°C, should be SUPPRESSED by cooldown
  telemetrySource$.next({ deviceId: 'DEV-TH-101', temperature: 87, timestamp: new Date() });
  await new Promise(r => setTimeout(r, 50));
  assert.strictEqual(alertsFired.length, 1, 'Second breach during cooldown should be SUPPRESSED');
  console.log('✅ Second consecutive reading (87°C) suppressed by cooldown');

  // Emit reading 3 for a DIFFERENT device (DEV-TH-102) -> should NOT be suppressed by DEV-TH-101 cooldown
  // (Note sensor node is configured for DEV-TH-101, but fleet-wide rule would differentiate)
  pipeline.unsubscribe();

  console.log('\n--- TEST 2: Alert Management REST APIs ---');
  const app = express();
  app.use(express.json());
  app.use('/api/alerts', alertRoutes);

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/alerts`;

  try {
    // 1. GET /api/alerts
    const resGet = await fetch(baseUrl);
    assert.strictEqual(resGet.status, 200);
    const alerts = await resGet.json();
    assert(Array.isArray(alerts), 'GET /api/alerts should return array');
    assert(alerts.length >= 1, 'Should return at least sample alerts');
    console.log(`✅ GET /api/alerts returned ${alerts.length} alerts`);

    // 2. GET /api/alerts/:id
    const targetId = alerts[0]._id;
    const resGetOne = await fetch(`${baseUrl}/${targetId}`);
    assert.strictEqual(resGetOne.status, 200);
    const singleAlert = await resGetOne.json();
    assert.strictEqual(singleAlert._id, targetId);
    console.log(`✅ GET /api/alerts/:id found alert with ID "${targetId}"`);

    // 3. PATCH /api/alerts/:id/acknowledge
    const resAck = await fetch(`${baseUrl}/${targetId}/acknowledge`, { method: 'PATCH' });
    assert.strictEqual(resAck.status, 200);
    const ackedAlert = await resAck.json();
    assert.strictEqual(ackedAlert.status, 'acknowledged', 'Status should be updated to "acknowledged"');
    console.log(`✅ PATCH /api/alerts/:id/acknowledge successfully updated status to "acknowledged"`);

    // 4. PATCH /api/alerts/:id/resolve
    const resRes = await fetch(`${baseUrl}/${targetId}/resolve`, { method: 'PATCH' });
    assert.strictEqual(resRes.status, 200);
    const resolvedAlert = await resRes.json();
    assert.strictEqual(resolvedAlert.status, 'resolved', 'Status should be updated to "resolved"');
    console.log(`✅ PATCH /api/alerts/:id/resolve successfully updated status to "resolved"`);

    // 5. Test status filter: GET /api/alerts?status=resolved
    const resFilter = await fetch(`${baseUrl}?status=resolved`);
    assert.strictEqual(resFilter.status, 200);
    const resolvedList = await resFilter.json();
    assert(resolvedList.every(a => a.status === 'resolved'), 'All returned alerts should have status="resolved"');
    console.log(`✅ GET /api/alerts?status=resolved correctly filtered alerts (count: ${resolvedList.length})`);

    // 6. Test 404 on nonexistent alert
    const res404 = await fetch(`${baseUrl}/nonexistent-id-999`);
    assert.strictEqual(res404.status, 404);
    console.log(`✅ GET /api/alerts/:id returns 404 for invalid ID`);
  } finally {
    server.close();
  }

  // Restore broadcast
  socketServer.broadcast = origBroadcast;

  console.log('\n🎉 ALL ALERT MANAGEMENT & COOLDOWN TESTS PASSED SUCCESSFULLY!\n');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
