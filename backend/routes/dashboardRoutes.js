const express = require('express');
const router = express.Router();
const Device = require('../models/Device');
const Telemetry = require('../models/Telemetry');
const Rule = require('../models/Rule');
const Alert = require('../models/Alert');
const { getIsConnected } = require('../config/db');
const { sampleDevices, sampleTelemetry, sampleRules, sampleAlerts } = require('../data/sampleData');

router.get('/stats', async (req, res) => {
  try {
    let totalDevices = sampleDevices.length;
    let onlineDevices = sampleDevices.filter(d => d.status === 'online').length;
    let totalTelemetry = sampleTelemetry.length;
    let activeRules = sampleRules.filter(r => r.enabled).length;
    let recentAlerts = sampleAlerts.slice(0, 5);

    if (getIsConnected()) {
      const devCount = await Device.countDocuments();
      if (devCount > 0) {
        totalDevices = devCount;
        onlineDevices = await Device.countDocuments({ status: 'online' });
        totalTelemetry = await Telemetry.countDocuments();
        activeRules = await Rule.countDocuments({ enabled: true });
        recentAlerts = await Alert.find().sort({ timestamp: -1 }).limit(5);
      }
    }

    res.json({
      summary: {
        totalDevices,
        onlineDevices,
        offlineDevices: totalDevices - onlineDevices,
        totalTelemetryRecords: totalTelemetry,
        activeRules,
        activeAlerts: recentAlerts.filter(a => a.status === 'active').length,
      },
      recentAlerts,
      databaseConnected: getIsConnected(),
    });
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
