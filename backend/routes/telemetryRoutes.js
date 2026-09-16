const express = require('express');
const router = express.Router();
const Telemetry = require('../models/Telemetry');
const { getIsConnected } = require('../config/db');
const { sampleTelemetry } = require('../data/sampleData');

let inMemoryTelemetry = [...sampleTelemetry];

// GET telemetry data list
router.get('/', async (req, res) => {
  try {
    const { deviceId, limit = 50 } = req.query;
    if (getIsConnected()) {
      const filter = deviceId ? { deviceId } : {};
      const records = await Telemetry.find(filter)
        .sort({ timestamp: -1 })
        .limit(Number(limit));
      if (records.length > 0) return res.json(records);
    }
    const filtered = deviceId
      ? inMemoryTelemetry.filter(t => t.deviceId === deviceId)
      : inMemoryTelemetry;
    return res.json(filtered.slice(0, Number(limit)));
  } catch (err) {
    console.error('Error fetching telemetry:', err);
    res.json(inMemoryTelemetry);
  }
});

// GET chart aggregate series (used directly by Recharts)
router.get('/series', (req, res) => {
  const chartData = inMemoryTelemetry.map(item => ({
    time: item.timeLabel || new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    temperature: item.metrics?.temperature ?? 22,
    humidity: item.metrics?.humidity ?? 50,
    pressure: item.metrics?.pressure ?? 1013,
    vibration: item.metrics?.vibration ?? 0.2,
    battery: item.metrics?.battery ?? 88,
  }));
  res.json(chartData);
});

// POST incoming telemetry
router.post('/', async (req, res) => {
  try {
    const { deviceId, metrics, rawPayload } = req.body;
    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId is required' });
    }

    const newRecord = {
      deviceId,
      timestamp: new Date(),
      metrics: metrics || {},
      rawPayload: rawPayload || {},
    };

    if (getIsConnected()) {
      const doc = new Telemetry(newRecord);
      const saved = await doc.save();
      return res.status(201).json(saved);
    }

    const created = {
      ...newRecord,
      _id: `tel-${Date.now()}`,
      timeLabel: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    inMemoryTelemetry.push(created);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
