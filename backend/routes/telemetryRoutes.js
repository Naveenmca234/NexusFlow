const express = require('express');
const router = express.Router();
const Telemetry = require('../models/Telemetry');
const { getIsConnected } = require('../config/db');
const { generateSingleTelemetry, generateTelemetryBatch } = require('../utils/telemetryGenerator');
const { processTelemetry } = require('../engine/ruleEngine');

let inMemoryTelemetry = generateTelemetryBatch(25);

// Helper to normalize telemetry document for API response
function normalizeTelemetry(doc) {
  const t = doc.temperature ?? doc.metrics?.temperature ?? 24.0;
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

// Build query filter for Time-Series queries (by device and time range)
function buildTelemetryFilter(params, query) {
  const filter = {};
  const deviceId = params.deviceId || query.deviceId;
  if (deviceId && deviceId !== 'all') {
    filter.deviceId = deviceId;
  }

  const start = query.startTime || query.from || query.startDate;
  const end = query.endTime || query.to || query.endDate;

  if (start || end) {
    filter.timestamp = {};
    if (start) {
      const startDate = new Date(start);
      if (!isNaN(startDate.getTime())) filter.timestamp.$gte = startDate;
    }
    if (end) {
      const endDate = new Date(end);
      if (!isNaN(endDate.getTime())) filter.timestamp.$lte = endDate;
    }
    // Clean empty timestamp filter if dates were invalid
    if (Object.keys(filter.timestamp).length === 0) {
      delete filter.timestamp;
    }
  }

  return filter;
}

// Apply in-memory filtering for development fallback
function filterInMemoryTelemetry(filter, limit = 50) {
  let list = [...inMemoryTelemetry];

  if (filter.deviceId) {
    list = list.filter((item) => item.deviceId === filter.deviceId);
  }

  if (filter.timestamp) {
    if (filter.timestamp.$gte) {
      list = list.filter((item) => new Date(item.timestamp) >= filter.timestamp.$gte);
    }
    if (filter.timestamp.$lte) {
      list = list.filter((item) => new Date(item.timestamp) <= filter.timestamp.$lte);
    }
  }

  // Sort by latest readings
  list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  return list.slice(0, limit).map(normalizeTelemetry);
}

// ==========================================
// API Routes
// ==========================================

// GET /api/telemetry - Retrieve telemetry readings (latest, by device, within time range)
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const filter = buildTelemetryFilter({}, req.query);

    if (getIsConnected()) {
      const records = await Telemetry.find(filter)
        .sort({ timestamp: -1 })
        .limit(limit);
      if (records.length > 0) {
        return res.json(records.map(normalizeTelemetry));
      }
    }

    return res.json(filterInMemoryTelemetry(filter, limit));
  } catch (err) {
    console.error('Error querying telemetry:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/telemetry/latest - Get latest reading for each active device
router.get('/latest', async (req, res) => {
  try {
    if (getIsConnected()) {
      // MongoDB Time-Series aggregation to get latest reading per deviceId
      const latestPerDevice = await Telemetry.aggregate([
        { $sort: { timestamp: -1 } },
        {
          $group: {
            _id: '$deviceId',
            latestRecord: { $first: '$$ROOT' },
          },
        },
        { $replaceRoot: { newRoot: '$latestRecord' } },
      ]);

      if (latestPerDevice.length > 0) {
        return res.json(latestPerDevice.map(normalizeTelemetry));
      }
    }

    // In-memory fallback: latest per device
    const deviceMap = new Map();
    const sorted = [...inMemoryTelemetry].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    for (const record of sorted) {
      if (!deviceMap.has(record.deviceId)) {
        deviceMap.set(record.deviceId, normalizeTelemetry(record));
      }
    }
    return res.json(Array.from(deviceMap.values()));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/telemetry/series - Formatted timeseries dataset for Recharts
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

// GET /api/telemetry/:deviceId - Retrieve readings for a specific device (supports time range query)
router.get('/:deviceId', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const filter = buildTelemetryFilter(req.params, req.query);

    if (getIsConnected()) {
      const records = await Telemetry.find(filter)
        .sort({ timestamp: -1 })
        .limit(limit);
      if (records.length > 0) {
        return res.json(records.map(normalizeTelemetry));
      }
    }

    return res.json(filterInMemoryTelemetry(filter, limit));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/telemetry - Ingest telemetry into MongoDB Time-Series collection
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
      // Ingest directly into MongoDB Time-Series collection
      const doc = new Telemetry(payload);
      const saved = await doc.save();
      const normalized = normalizeTelemetry(saved);
      // Trigger real-time rule engine evaluation
      processTelemetry(normalized);
      return res.status(201).json(normalized);
    }

    const created = {
      ...payload,
      _id: `tel-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    };
    inMemoryTelemetry.unshift(created);
    const normalized = normalizeTelemetry(created);
    // Trigger real-time rule engine evaluation
    processTelemetry(normalized);
    res.status(201).json(normalized);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/telemetry/generate - Helper endpoint to generate mock telemetry for testing
router.post('/generate', async (req, res) => {
  try {
    const { deviceId, count = 1 } = req.body;
    const num = Math.min(Number(count) || 1, 25);
    const generated = [];

    for (let i = 0; i < num; i++) {
      const data = generateSingleTelemetry(deviceId);
      if (getIsConnected()) {
        const doc = new Telemetry(data);
        const saved = await doc.save();
        const norm = normalizeTelemetry(saved);
        processTelemetry(norm);
        generated.push(norm);
      } else {
        const created = { ...data, _id: `tel-${Date.now()}-${i}` };
        inMemoryTelemetry.unshift(created);
        const norm = normalizeTelemetry(created);
        processTelemetry(norm);
        generated.push(norm);
      }
    }

    res.status(201).json({
      message: `Generated ${num} mock Time-Series telemetry record(s)`,
      records: generated,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
