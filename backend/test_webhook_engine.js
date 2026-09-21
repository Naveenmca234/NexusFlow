const http = require('http');
const assert = require('assert');
const { Subject } = require('rxjs');
const express = require('express');
const { compileRuleGraph } = require('./engine/ruleCompiler');
const { resetWebhookCooldowns } = require('./engine/nodeHandlers');
const webhookRoutes = require('./routes/webhookRoutes');

async function runTests() {
  console.log('=== STARTING WEBHOOK ACTION ENGINE TESTS ===\n');
  resetWebhookCooldowns();

  // 1. Create a local mock target server to receive webhooks
  let receivedWebhooks = [];
  const targetServer = http.createServer(async (req, res) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      if (req.url === '/slow-timeout') {
        // Delay response to trigger timeout
        setTimeout(() => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true }));
        }, 1500);
        return;
      }

      if (req.url === '/error-500') {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal Server Anomaly' }));
        return;
      }

      receivedWebhooks.push({
        url: req.url,
        method: req.method,
        headers: req.headers,
        body: body ? JSON.parse(body) : null,
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, receivedAt: new Date().toISOString() }));
    });
  });

  await new Promise(resolve => targetServer.listen(0, resolve));
  const targetPort = targetServer.address().port;
  const webhookUrl = `http://localhost:${targetPort}/receiver`;
  const slowWebhookUrl = `http://localhost:${targetPort}/slow-timeout`;
  const errorWebhookUrl = `http://localhost:${targetPort}/error-500`;

  console.log(`📡 Mock target server listening on http://localhost:${targetPort}`);

  try {
    console.log('\n--- TEST 1: Rule Engine Pipeline Webhook Execution ---');
    const telemetrySource$ = new Subject();

    const ruleGraph = {
      _id: 'rule-webhook-thermal',
      name: 'Thermal Webhook Dispatcher',
      targetDeviceId: 'DEV-TH-101',
      cooldownSeconds: 2,
      nodes: [
        { id: '1', type: 'sensor', data: { deviceId: 'DEV-TH-101' } },
        { id: '2', type: 'condition', data: { field: 'temperature', operator: '>', threshold: 80 } },
        {
          id: '3',
          type: 'webhook',
          data: {
            url: webhookUrl,
            method: 'POST',
            cooldownSeconds: 2,
            payload: '{\n  "device": "{{deviceId}}",\n  "temp": "{{temperature}}",\n  "rule": "{{ruleName}}"\n}',
          },
        },
      ],
      edges: [
        { source: '1', target: '2' },
        { source: '2', target: '3' },
      ],
    };

    const pipeline = compileRuleGraph(ruleGraph, telemetrySource$);
    assert(pipeline, 'Pipeline should compile successfully with webhook node');

    // Case A: Temperature 75°C (<= 80) -> condition false -> NO webhook sent
    telemetrySource$.next({ deviceId: 'DEV-TH-101', temperature: 75 });
    await new Promise(r => setTimeout(r, 100));
    assert.strictEqual(receivedWebhooks.length, 0, 'No webhook should be dispatched when condition evaluates to false');
    console.log('✅ Condition false (75°C <= 80): Webhook was NOT triggered');

    // Case B: Temperature 84°C (> 80) -> condition true -> Webhook sent!
    telemetrySource$.next({ deviceId: 'DEV-TH-101', temperature: 84.2 });
    await new Promise(r => setTimeout(r, 250));
    assert.strictEqual(receivedWebhooks.length, 1, 'Webhook should be received by target server');
    assert.strictEqual(receivedWebhooks[0].body.device, 'DEV-TH-101');
    assert.strictEqual(receivedWebhooks[0].body.temp, '84.2');
    assert.strictEqual(receivedWebhooks[0].body.rule, 'Thermal Webhook Dispatcher');
    console.log('✅ Condition true (84.2°C > 80): Webhook successfully executed and payload interpolated!');

    pipeline.unsubscribe();

    console.log('\n--- TEST 2: Timeout and Failure Handling ---');
    // Test safe timeout handling (timeoutMs: 500ms on 1500ms delay endpoint)
    const { executeWebhook } = require('./engine/webhookExecutor');
    const timeoutResult = await executeWebhook(
      { url: slowWebhookUrl, method: 'POST', timeoutMs: 500 },
      { deviceId: 'DEV-SLOW' },
      { name: 'Slow Pipeline' }
    );
    assert.strictEqual(timeoutResult.success, false, 'Timeout should be marked as failure');
    assert.strictEqual(timeoutResult.status, 408, 'Status should be 408 Request Timeout');
    assert(timeoutResult.error.includes('timed out'), 'Error message should indicate timeout');
    console.log(`✅ Webhook timeout handled safely: ${timeoutResult.status} ${timeoutResult.statusText}`);

    // Test 500 error handling
    const errorResult = await executeWebhook(
      { url: errorWebhookUrl, method: 'POST' },
      { deviceId: 'DEV-ERR' },
      { name: 'Error Pipeline' }
    );
    assert.strictEqual(errorResult.success, false, '500 error should be marked as failure');
    assert.strictEqual(errorResult.status, 500, 'Status should be 500');
    console.log(`✅ Webhook 500 error recorded safely: ${errorResult.status} ${errorResult.statusText}`);

    console.log('\n--- TEST 3: SSRF and Security Protocol Validation ---');
    // Test invalid protocol (ftp://)
    const ftpResult = await executeWebhook({ url: 'ftp://malicious-server.com/payload' });
    assert.strictEqual(ftpResult.success, false);
    assert.strictEqual(ftpResult.status, 400);
    assert(ftpResult.error.includes('Only HTTP and HTTPS are permitted'));
    console.log('✅ Rejected unsafe protocol (ftp://)');

    // Test cloud metadata SSRF block (169.254.169.254)
    const metadataResult = await executeWebhook({ url: 'http://169.254.169.254/latest/meta-data/' });
    assert.strictEqual(metadataResult.success, false);
    assert.strictEqual(metadataResult.status, 400);
    assert(metadataResult.error.includes('cloud metadata'));
    console.log('✅ Blocked SSRF attempt to cloud metadata (169.254.169.254)');

    console.log('\n--- TEST 4: Webhook REST APIs ---');
    const app = express();
    app.use(express.json());
    app.use('/api/webhooks', webhookRoutes);

    const apiServer = app.listen(0);
    const apiPort = apiServer.address().port;
    const apiBase = `http://localhost:${apiPort}/api/webhooks`;

    try {
      // 1. GET /api/webhooks/logs
      const resLogs = await fetch(`${apiBase}/logs`);
      assert.strictEqual(resLogs.status, 200);
      const logs = await resLogs.json();
      assert(Array.isArray(logs), 'GET /api/webhooks/logs should return an array');
      assert(logs.length >= 3, 'Should contain logs from earlier test executions');
      console.log(`✅ GET /api/webhooks/logs returned ${logs.length} logged webhook executions`);

      // Verify structure of log
      const firstLog = logs[0];
      assert('triggerTime' in firstLog, 'Log must contain triggerTime');
      assert('webhookUrl' in firstLog, 'Log must contain webhookUrl');
      assert('status' in firstLog, 'Log must contain status');
      assert('success' in firstLog, 'Log must contain success');
      console.log('✅ Webhook log structure verified: triggerTime, webhookUrl, status, success present');

      // 2. POST /api/webhooks/test
      const resTest = await fetch(`${apiBase}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: webhookUrl,
          method: 'POST',
          payload: { ping: 'pong' },
        }),
      });
      assert.strictEqual(resTest.status, 200);
      const testJson = await resTest.json();
      assert.strictEqual(testJson.success, true);
      assert.strictEqual(testJson.status, 200);
      console.log('✅ POST /api/webhooks/test verified on-demand execution');
    } finally {
      apiServer.close();
    }

    console.log('\n🎉 ALL WEBHOOK ACTION TESTS PASSED SUCCESSFULLY!\n');
  } finally {
    targetServer.close();
  }
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
