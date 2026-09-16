const express = require('express');
const router = express.Router();
const Alert = require('../models/Alert');
const { getIsConnected } = require('../config/db');
const { sampleAlerts } = require('../data/sampleData');

let inMemoryAlerts = [...sampleAlerts];

// GET all alerts
router.get('/', async (req, res) => {
  try {
    const { severity, status } = req.query;
    if (getIsConnected()) {
      const filter = {};
      if (severity) filter.severity = severity;
      if (status) filter.status = status;
      const alerts = await Alert.find(filter).sort({ timestamp: -1 });
      if (alerts.length > 0) return res.json(alerts);
    }

    let filtered = [...inMemoryAlerts];
    if (severity) filtered = filtered.filter(a => a.severity === severity);
    if (status) filtered = filtered.filter(a => a.status === status);
    res.json(filtered);
  } catch (err) {
    console.error('Error fetching alerts:', err);
    res.json(inMemoryAlerts);
  }
});

// POST new alert
router.post('/', async (req, res) => {
  try {
    const payload = {
      deviceId: req.body.deviceId,
      ruleId: req.body.ruleId || null,
      title: req.body.title || 'System Alert',
      message: req.body.message || 'Telemetry parameter out of normal operational envelope.',
      severity: req.body.severity || 'warning',
      status: 'active',
      valueDetected: req.body.valueDetected ?? null,
      threshold: req.body.threshold ?? null,
      timestamp: new Date(),
    };

    if (getIsConnected()) {
      const doc = new Alert(payload);
      const saved = await doc.save();
      return res.status(201).json(saved);
    }

    const created = { ...payload, _id: `alt-${Date.now()}` };
    inMemoryAlerts.unshift(created);
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH acknowledge or resolve alert
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'acknowledged', 'resolved'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    if (getIsConnected()) {
      const updated = await Alert.findByIdAndUpdate(req.params.id, { status }, { new: true });
      if (updated) return res.json(updated);
    }

    const idx = inMemoryAlerts.findIndex(a => a._id === req.params.id);
    if (idx !== -1) {
      inMemoryAlerts[idx].status = status;
      return res.json(inMemoryAlerts[idx]);
    }
    res.status(404).json({ message: 'Alert not found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
