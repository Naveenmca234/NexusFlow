const express = require('express');
const router = express.Router();
const Alert = require('../models/Alert');
const { getIsConnected } = require('../config/db');
const { sampleAlerts } = require('../data/sampleData');
const { broadcast } = require('../engine/socketServer');

let inMemoryAlerts = [...sampleAlerts];

// Helper: Normalize status filter
function matchStatus(alertStatus, queryStatus) {
  if (!queryStatus || queryStatus === 'all') return true;
  const s = String(queryStatus).toLowerCase();
  const a = String(alertStatus).toLowerCase();
  if (s === 'new') return a === 'new' || a === 'active';
  return a === s;
}

// GET all alerts with query filtering
router.get('/', async (req, res) => {
  try {
    const { severity, status, deviceId, limit } = req.query;

    if (getIsConnected()) {
      const filter = {};
      if (severity && severity !== 'all') filter.severity = severity;
      if (status && status !== 'all') {
        if (status.toLowerCase() === 'new') {
          filter.status = { $in: ['new', 'active'] };
        } else {
          filter.status = status;
        }
      }
      if (deviceId && deviceId !== 'all') filter.deviceId = deviceId;

      const limitNum = parseInt(limit, 10) || 100;
      const alerts = await Alert.find(filter).sort({ timestamp: -1 }).limit(limitNum);
      return res.json(alerts);
    }

    // In-memory fallback
    let filtered = [...inMemoryAlerts];
    if (severity && severity !== 'all') filtered = filtered.filter(a => a.severity === severity);
    if (status && status !== 'all') filtered = filtered.filter(a => matchStatus(a.status, status));
    if (deviceId && deviceId !== 'all') filtered = filtered.filter(a => a.deviceId === deviceId);
    if (limit) filtered = filtered.slice(0, parseInt(limit, 10));

    res.json(filtered);
  } catch (err) {
    console.error('Error fetching alerts:', err);
    res.json(inMemoryAlerts);
  }
});

// GET alert by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (getIsConnected()) {
      try {
        const alert = await Alert.findById(id);
        if (alert) return res.json(alert);
      } catch (idErr) {
        // Not a standard ObjectId; fallback to finding by string id or custom field
        const alert = await Alert.findOne({ _id: id });
        if (alert) return res.json(alert);
      }
    }

    const found = inMemoryAlerts.find(a => String(a._id) === String(id));
    if (found) return res.json(found);

    res.status(404).json({ error: `Alert with ID "${id}" not found` });
  } catch (err) {
    console.error(`Error fetching alert ${req.params.id}:`, err);
    res.status(500).json({ error: err.message });
  }
});

// POST new alert
router.post('/', async (req, res) => {
  try {
    const rawVal = req.body.triggerValue ?? req.body.valueDetected ?? null;
    const payload = {
      deviceId: req.body.deviceId || 'DEV-TH-101',
      ruleId: req.body.ruleId || null,
      ruleName: req.body.ruleName || 'Manual / External Rule',
      title: req.body.title || 'System Alert',
      message: req.body.message || 'Telemetry parameter out of normal operational envelope.',
      severity: req.body.severity || 'warning',
      status: 'new',
      valueDetected: rawVal,
      triggerValue: rawVal,
      threshold: req.body.threshold ?? null,
      cooldownSeconds: Number(req.body.cooldownSeconds ?? 30),
      timestamp: new Date(),
    };

    let createdAlert;
    if (getIsConnected()) {
      const doc = new Alert(payload);
      createdAlert = await doc.save();
    } else {
      createdAlert = { ...payload, _id: `alt-${Date.now()}-${Math.floor(Math.random() * 1000)}` };
      inMemoryAlerts.unshift(createdAlert);
      if (inMemoryAlerts.length > 200) inMemoryAlerts.pop();
    }

    broadcast('ALERT_TRIGGERED', createdAlert);
    res.status(201).json(createdAlert);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /:id/acknowledge -> Sets alert status to 'acknowledged'
router.patch('/:id/acknowledge', async (req, res) => {
  try {
    const { id } = req.params;
    if (getIsConnected()) {
      let updated;
      try {
        updated = await Alert.findByIdAndUpdate(id, { status: 'acknowledged' }, { new: true });
      } catch (err) {
        updated = await Alert.findOneAndUpdate({ _id: id }, { status: 'acknowledged' }, { new: true });
      }
      if (updated) {
        broadcast('ALERT_STATUS_UPDATE', updated);
        return res.json(updated);
      }
    }

    const idx = inMemoryAlerts.findIndex(a => String(a._id) === String(id));
    if (idx !== -1) {
      inMemoryAlerts[idx] = { ...inMemoryAlerts[idx], status: 'acknowledged' };
      broadcast('ALERT_STATUS_UPDATE', inMemoryAlerts[idx]);
      return res.json(inMemoryAlerts[idx]);
    }

    res.status(404).json({ error: 'Alert not found' });
  } catch (err) {
    console.error('Error acknowledging alert:', err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /:id/resolve -> Sets alert status to 'resolved'
router.patch('/:id/resolve', async (req, res) => {
  try {
    const { id } = req.params;
    if (getIsConnected()) {
      let updated;
      try {
        updated = await Alert.findByIdAndUpdate(id, { status: 'resolved' }, { new: true });
      } catch (err) {
        updated = await Alert.findOneAndUpdate({ _id: id }, { status: 'resolved' }, { new: true });
      }
      if (updated) {
        broadcast('ALERT_STATUS_UPDATE', updated);
        return res.json(updated);
      }
    }

    const idx = inMemoryAlerts.findIndex(a => String(a._id) === String(id));
    if (idx !== -1) {
      inMemoryAlerts[idx] = { ...inMemoryAlerts[idx], status: 'resolved' };
      broadcast('ALERT_STATUS_UPDATE', inMemoryAlerts[idx]);
      return res.json(inMemoryAlerts[idx]);
    }

    res.status(404).json({ error: 'Alert not found' });
  } catch (err) {
    console.error('Error resolving alert:', err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /:id/status -> Generic status updater for backwards compatibility
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['new', 'acknowledged', 'resolved', 'active'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    if (getIsConnected()) {
      let updated;
      try {
        updated = await Alert.findByIdAndUpdate(req.params.id, { status }, { new: true });
      } catch (err) {
        updated = await Alert.findOneAndUpdate({ _id: req.params.id }, { status }, { new: true });
      }
      if (updated) {
        broadcast('ALERT_STATUS_UPDATE', updated);
        return res.json(updated);
      }
    }

    const idx = inMemoryAlerts.findIndex(a => String(a._id) === String(req.params.id));
    if (idx !== -1) {
      inMemoryAlerts[idx] = { ...inMemoryAlerts[idx], status };
      broadcast('ALERT_STATUS_UPDATE', inMemoryAlerts[idx]);
      return res.json(inMemoryAlerts[idx]);
    }

    res.status(404).json({ error: 'Alert not found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function addAlertRecord(alert) {
  inMemoryAlerts.unshift(alert);
  if (inMemoryAlerts.length > 200) {
    inMemoryAlerts.pop();
  }
}

router.addAlertRecord = addAlertRecord;

module.exports = router;
