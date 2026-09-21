const express = require('express');
const router = express.Router();
const Telemetry = require('../models/Telemetry');
const { getIsConnected } = require('../config/db');
const { generateSingleTelemetry, generateTelemetryBatch } = require('../utils/telemetryGenerator');

let inMemoryTelemetry = generateTelemetryBatch(20);

// Helper to normalize telemetry records
function normalizeTelemetry(doc) {
  const t = doc.temperature ?? doc.metrics?.temperature ?? 24.5;
  const p = doc.pressure ?? doc.metrics?.pressure ?? 1013.2;
  const r = doc.rpm ?? doc.metrics?.rpm ?? 1800;
  const v = doc.vibration ?? doc.metrics?.vibration ?? 0.18;
  return {
    _id: doc._id,
    deviceId: doc.deviceId,
    timestamp: doc.timestamp,
    temperature: t,
    pressure: p,
    rpm: r,
    vibration: v,
    metrics: {
      temperature: t,
      pressure: p,
      rpm: r,
      vibration: v,
      humidity: doc.metrics?.humidity ?? 48,
    },
  };
}

// GET /api/telemetry - Get recent telemetry records
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const { deviceId } = req.query;

    if (getIsConnected()) {
      const filter = deviceId ? { deviceId } : {};
      const records = await Telemetry.find(filter)
        .sort({ timestamp: -1 })
        .limit(limit);
      if (records.length > 0) {
        return res.json(records.map(normalizeTelemetry));
      }
    }

    const filtered = deviceId
      ? inMemoryTelemetry.filter((t) => t.deviceId === deviceId)
      : inMemoryTelemetry;
    return res.json(filtered.slice(0, limit).map(normalizeTelemetry));
  } catch (err) {
    console.error('Error fetching telemetry:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/telemetry/series - Formatted timeseries for Recharts
router.get('/series', async (req, res) => {
  try {
    let records = [];
    if (getIsConnected()) {
      records = await Telemetry.find().sort({ timestamp: -1 }).limit(15);
      records.reverse();
    }
    if (records.length === 0) {
      records = inMemoryTelemetry.slice(-15);
    }
    const series = records.map((r) => {
      const norm = normalizeTelemetry(r);
      return {
        time: new Date(norm.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        temperature: norm.temperature,
        pressure: norm.pressure,
        rpm: norm.rpm,
        vibration: norm.vibration,
      };
    });
    res.json(series);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/telemetry/:deviceId - Get telemetry records for a specific device
router.get('/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const limit = Math.min(Number(req.query.limit) || 50, 200);

    if (getIsConnected()) {
      const records = await Telemetry.find({ deviceId })
        .sort({ timestamp: -1 })
        .limit(limit);
      if (records.length > 0) {
        return res.json(records.map(normalizeTelemetry));
      }
    }

    const filtered = inMemoryTelemetry.filter((t) => t.deviceId === deviceId);
    return res.json(filtered.slice(0, limit).map(normalizeTelemetry));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/telemetry - Ingest a new telemetry record
router.post('/', async (req, res) => {
  try {
    const { deviceId, temperature, pressure, rpm, vibration, metrics, timestamp } = req.body;
    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId is required' });
    }

    const payload = {
      deviceId: deviceId.trim(),
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      temperature: Number(temperature ?? metrics?.temperature ?? 0),
      pressure: Number(pressure ?? metrics?.pressure ?? 0),
      rpm: Number(rpm ?? metrics?.rpm ?? 0),
      vibration: Number(vibration ?? metrics?.vibration ?? 0),
      metrics: metrics || {},
    };

    if (getIsConnected()) {
      const doc = new Telemetry(payload);
      const saved = await doc.save();
      return res.status(201).json(normalizeTelemetry(saved));
    }

    const created = {
      ...payload,
      _id: `tel-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    };
    inMemoryTelemetry.unshift(created);
    res.status(201).json(normalizeTelemetry(created));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/telemetry/generate - Trigger mock telemetry generation
router.post('/generate', async (req, res) => {
  try {
    const { deviceId, count = 1 } = req.body;
    const num = Math.min(Number(count) || 1, 20);
    const generated = [];

    for (let i = 0; i < num; i++) {
      const data = generateSingleTelemetry(deviceId);
      if (getIsConnected()) {
        const doc = new Telemetry(data);
        const saved = await doc.save();
        generated.push(normalizeTelemetry(saved));
      } else {
        const created = { ...data, _id: `tel-${Date.now()}-${i}` };
        inMemoryTelemetry.unshift(created);
        generated.push(normalizeTelemetry(created));
      }
    }

    res.status(201).json({
      message: `Generated ${num} mock telemetry record(s)`,
      records: generated,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
