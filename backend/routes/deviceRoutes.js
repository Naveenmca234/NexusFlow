const express = require('express');
const router = express.Router();
const Device = require('../models/Device');
const { getIsConnected } = require('../config/db');
const { sampleDevices } = require('../data/sampleData');

let inMemoryDevices = [...sampleDevices];

// GET all devices
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
    console.error('Error fetching devices:', err);
    res.json(inMemoryDevices);
  }
});

// GET single device
router.get('/:id', async (req, res) => {
  try {
    if (getIsConnected()) {
      const device = await Device.findById(req.params.id) || await Device.findOne({ deviceId: req.params.id });
      if (device) return res.json(device);
    }
    const found = inMemoryDevices.find(d => d._id === req.params.id || d.deviceId === req.params.id);
    if (found) return res.json(found);
    return res.status(404).json({ message: 'Device not found' });
  } catch (err) {
    const found = inMemoryDevices.find(d => d._id === req.params.id || d.deviceId === req.params.id);
    if (found) return res.json(found);
    res.status(500).json({ error: err.message });
  }
});

// POST create device
router.post('/', async (req, res) => {
  try {
    const payload = {
      deviceId: req.body.deviceId || `DEV-${Date.now().toString().slice(-4)}`,
      name: req.body.name || 'New Sensor Node',
      type: req.body.type || 'Temperature',
      status: req.body.status || 'online',
      location: req.body.location || 'Facility Zone',
      batteryLevel: req.body.batteryLevel ?? 100,
      firmwareVersion: req.body.firmwareVersion || 'v1.0.0',
      lastSeen: new Date(),
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

// DELETE device
router.delete('/:id', async (req, res) => {
  try {
    if (getIsConnected()) {
      await Device.findByIdAndDelete(req.params.id);
    }
    inMemoryDevices = inMemoryDevices.filter(d => d._id !== req.params.id && d.deviceId !== req.params.id);
    res.json({ success: true, message: 'Device deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
