const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Device = require('../models/Device');
const { getIsConnected } = require('../config/db');
const { sampleDevices } = require('../data/sampleData');

let inMemoryDevices = [...sampleDevices];

// GET /api/devices - Get all devices
router.get('/', async (req, res) => {
  try {
    if (getIsConnected()) {
      const devices = await Device.find().sort({ createdAt: -1 });
      if (devices.length > 0) {
        return res.json(devices);
      }
    }
    return res.json(inMemoryDevices);
  } catch (err) {
    console.error('Error fetching devices from MongoDB:', err);
    res.json(inMemoryDevices);
  }
});

// GET /api/devices/:id - Get device by ID or deviceId
router.get('/:id', async (req, res) => {
  try {
    if (getIsConnected()) {
      let device = null;
      if (mongoose.Types.ObjectId.isValid(req.params.id)) {
        device = await Device.findById(req.params.id);
      }
      if (!device) {
        device = await Device.findOne({ deviceId: req.params.id });
      }
      if (device) return res.json(device);
    }
    const found = inMemoryDevices.find(d => d._id === req.params.id || d.deviceId === req.params.id);
    if (found) return res.json(found);
    return res.status(404).json({ message: 'Device not found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/devices - Create device
router.post('/', async (req, res) => {
  try {
    const { name, deviceId, type, status, location, batteryLevel, firmwareVersion } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Device name is required' });
    }

    const payload = {
      deviceId: deviceId ? deviceId.trim() : `DEV-${(type || 'SN').slice(0, 2).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
      name: name.trim(),
      type: type || 'Multi-Sensor',
      status: status || 'online',
      location: location || 'Facility Zone 1',
      batteryLevel: typeof batteryLevel === 'number' ? batteryLevel : 100,
      firmwareVersion: firmwareVersion || 'v1.0.0',
      lastSeen: new Date(),
      lastActivity: new Date(),
    };

    if (getIsConnected()) {
      const newDevice = new Device(payload);
      const saved = await newDevice.save();
      return res.status(201).json(saved);
    }

    const created = { ...payload, _id: `dev-${Date.now()}` };
    inMemoryDevices.unshift(created);
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/devices/:id - Delete device
router.delete('/:id', async (req, res) => {
  try {
    if (getIsConnected()) {
      let result = null;
      if (mongoose.Types.ObjectId.isValid(req.params.id)) {
        result = await Device.findByIdAndDelete(req.params.id);
      }
      if (!result) {
        result = await Device.findOneAndDelete({ deviceId: req.params.id });
      }
    }
    inMemoryDevices = inMemoryDevices.filter(d => d._id !== req.params.id && d.deviceId !== req.params.id);
    res.json({ success: true, message: 'Device deleted successfully', id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
