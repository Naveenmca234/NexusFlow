const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Rule = require('../models/Rule');
const { getIsConnected } = require('../config/db');
const { sampleRules } = require('../data/sampleData');

let inMemoryRules = JSON.parse(JSON.stringify(sampleRules));

// GET /api/rules - Retrieve all serialized rule graphs
router.get('/', async (req, res) => {
  try {
    if (getIsConnected()) {
      const rules = await Rule.find().sort({ updatedAt: -1 });
      if (rules.length > 0) return res.json(rules);
    }
    return res.json(inMemoryRules);
  } catch (err) {
    console.error('Error fetching rules:', err);
    res.json(inMemoryRules);
  }
});

// GET /api/rules/:id - Retrieve single serialized rule graph by ID
router.get('/:id', async (req, res) => {
  try {
    if (getIsConnected() && mongoose.Types.ObjectId.isValid(req.params.id)) {
      const rule = await Rule.findById(req.params.id);
      if (rule) return res.json(rule);
    }

    const found = inMemoryRules.find((r) => r._id === req.params.id || r.id === req.params.id);
    if (found) return res.json(found);

    return res.status(404).json({ error: 'Rule not found' });
  } catch (err) {
    const found = inMemoryRules.find((r) => r._id === req.params.id || r.id === req.params.id);
    if (found) return res.json(found);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/rules - Create and serialize a new rule graph
router.post('/', async (req, res) => {
  try {
    const { name, description, enabled, nodes, edges, targetDeviceId } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Rule name is required' });
    }

    const payload = {
      name: name.trim(),
      description: description || '',
      enabled: enabled !== undefined ? enabled : true,
      nodes: Array.isArray(nodes) ? nodes : [],
      edges: Array.isArray(edges) ? edges : [],
      targetDeviceId: targetDeviceId || 'all',
      executionCount: 0,
      lastTriggered: null,
    };

    if (getIsConnected()) {
      const newRule = new Rule(payload);
      const saved = await newRule.save();
      return res.status(201).json(saved);
    }

    const created = {
      ...payload,
      _id: `rule-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    inMemoryRules.unshift(created);
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/rules/:id - Update serialized rule graph (nodes, edges, configuration)
router.put('/:id', async (req, res) => {
  try {
    const { name, description, enabled, nodes, edges, targetDeviceId } = req.body;

    if (getIsConnected() && mongoose.Types.ObjectId.isValid(req.params.id)) {
      const updated = await Rule.findByIdAndUpdate(
        req.params.id,
        {
          ...(name && { name: name.trim() }),
          ...(description !== undefined && { description }),
          ...(enabled !== undefined && { enabled }),
          ...(nodes && { nodes }),
          ...(edges && { edges }),
          ...(targetDeviceId && { targetDeviceId }),
        },
        { new: true }
      );
      if (updated) return res.json(updated);
    }

    const idx = inMemoryRules.findIndex((r) => r._id === req.params.id || r.id === req.params.id);
    if (idx !== -1) {
      inMemoryRules[idx] = {
        ...inMemoryRules[idx],
        ...req.body,
        updatedAt: new Date().toISOString(),
      };
      return res.json(inMemoryRules[idx]);
    }

    res.status(404).json({ error: 'Rule not found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/rules/:id - Delete a serialized rule graph
router.delete('/:id', async (req, res) => {
  try {
    if (getIsConnected() && mongoose.Types.ObjectId.isValid(req.params.id)) {
      await Rule.findByIdAndDelete(req.params.id);
    }
    inMemoryRules = inMemoryRules.filter((r) => r._id !== req.params.id && r.id !== req.params.id);
    res.json({ success: true, message: 'Rule graph deleted successfully', id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
