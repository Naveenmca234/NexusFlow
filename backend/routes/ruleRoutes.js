const express = require('express');
const router = express.Router();
const Rule = require('../models/Rule');
const { getIsConnected } = require('../config/db');
const { sampleRules } = require('../data/sampleData');

let inMemoryRules = JSON.parse(JSON.stringify(sampleRules));

// GET all rules
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

// GET single rule
router.get('/:id', async (req, res) => {
  try {
    if (getIsConnected()) {
      const rule = await Rule.findById(req.params.id);
      if (rule) return res.json(rule);
    }
    const found = inMemoryRules.find(r => r._id === req.params.id);
    if (found) return res.json(found);
    return res.status(404).json({ message: 'Rule not found' });
  } catch (err) {
    const found = inMemoryRules.find(r => r._id === req.params.id);
    if (found) return res.json(found);
    res.status(500).json({ error: err.message });
  }
});

// POST create rule
router.post('/', async (req, res) => {
  try {
    const payload = {
      name: req.body.name || 'Untitled Rule',
      description: req.body.description || '',
      enabled: req.body.enabled !== undefined ? req.body.enabled : true,
      nodes: req.body.nodes || [],
      edges: req.body.edges || [],
      targetDeviceId: req.body.targetDeviceId || 'all',
      executionCount: 0,
      lastTriggered: null,
    };

    if (getIsConnected()) {
      const newRule = new Rule(payload);
      const saved = await newRule.save();
      return res.status(201).json(saved);
    }

    const created = { ...payload, _id: `rule-${Date.now()}` };
    inMemoryRules.unshift(created);
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT update rule (graph updates)
router.put('/:id', async (req, res) => {
  try {
    if (getIsConnected()) {
      const updated = await Rule.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (updated) return res.json(updated);
    }

    const idx = inMemoryRules.findIndex(r => r._id === req.params.id);
    if (idx !== -1) {
      inMemoryRules[idx] = { ...inMemoryRules[idx], ...req.body, updatedAt: new Date() };
      return res.json(inMemoryRules[idx]);
    }
    res.status(404).json({ message: 'Rule not found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH toggle rule status
router.patch('/:id/toggle', async (req, res) => {
  try {
    if (getIsConnected()) {
      const rule = await Rule.findById(req.params.id);
      if (rule) {
        rule.enabled = !rule.enabled;
        await rule.save();
        return res.json(rule);
      }
    }

    const rule = inMemoryRules.find(r => r._id === req.params.id);
    if (rule) {
      rule.enabled = !rule.enabled;
      return res.json(rule);
    }
    res.status(404).json({ message: 'Rule not found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE rule
router.delete('/:id', async (req, res) => {
  try {
    if (getIsConnected()) {
      await Rule.findByIdAndDelete(req.params.id);
    }
    inMemoryRules = inMemoryRules.filter(r => r._id !== req.params.id);
    res.json({ success: true, message: 'Rule deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
