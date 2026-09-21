const express = require('express');
const router = express.Router();
const WebhookLog = require('../models/WebhookLog');
const { getIsConnected } = require('../config/db');
const { executeWebhook, getInMemoryWebhookLogs } = require('../engine/webhookExecutor');

// GET /api/webhooks/logs
router.get('/logs', async (req, res) => {
  try {
    const { ruleId, deviceId, limit = 50, success } = req.query;
    const limitNum = Math.min(parseInt(limit, 10) || 50, 200);

    if (getIsConnected()) {
      const filter = {};
      if (ruleId && ruleId !== 'all') filter.ruleId = ruleId;
      if (deviceId && deviceId !== 'all') filter.deviceId = deviceId;
      if (success !== undefined && success !== 'all') {
        filter.success = success === 'true' || success === true;
      }

      const logs = await WebhookLog.find(filter)
        .sort({ triggerTime: -1 })
        .limit(limitNum);

      if (logs && logs.length > 0) {
        return res.json(logs);
      }
    }

    // In-memory fallback
    let filtered = [...getInMemoryWebhookLogs()];
    if (ruleId && ruleId !== 'all') {
      filtered = filtered.filter((l) => String(l.ruleId) === String(ruleId));
    }
    if (deviceId && deviceId !== 'all') {
      filtered = filtered.filter((l) => l.deviceId === deviceId);
    }
    if (success !== undefined && success !== 'all') {
      const isSuccess = success === 'true' || success === true;
      filtered = filtered.filter((l) => l.success === isSuccess);
    }

    res.json(filtered.slice(0, limitNum));
  } catch (err) {
    console.error('Error fetching webhook logs:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/webhooks/test
router.post('/test', async (req, res) => {
  try {
    const { url, method = 'POST', payload, timeoutMs = 5000 } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'Webhook URL is required' });
    }

    const mockPacket = {
      deviceId: 'TEST-DEVICE-01',
      temperature: 84.5,
      pressure: 1014.2,
      rpm: 3250,
      vibration: 0.38,
      timestamp: new Date().toISOString(),
    };

    const mockRule = {
      _id: 'test-rule',
      name: 'Webhook Connection Test',
    };

    const result = await executeWebhook(
      { url, method, payload, timeoutMs },
      mockPacket,
      mockRule
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
