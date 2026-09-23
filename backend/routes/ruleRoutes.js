const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Rule = require('../models/Rule');
const RuleExecution = require('../models/RuleExecution');
const { getInMemoryExecutions } = require('../engine/nodeHandlers');
const { getIsConnected } = require('../config/db');
const { sampleRules } = require('../data/sampleData');
const { activateRule, deactivateRule, pauseRule, resumeRule } = require('../engine/ruleEngine');
const { validateRuleGraph } = require('../engine/graphValidator');

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

// POST /api/rules/validate - Audit a serialized React Flow graph before saving/compiling
router.post('/validate', (req, res) => {
  const report = validateRuleGraph(req.body || {});
  return res.status(report.valid ? 200 : 422).json({
    schema: 'nexusflow-rule-graph/v1',
    ...report,
  });
});

// GET /api/rules/executions - Retrieve execution history
router.get('/executions', async (req, res) => {
  try {
    const { ruleId, limit = 50 } = req.query;
    const maxLimit = Math.min(Number(limit) || 50, 200);

    if (getIsConnected()) {
      const query = ruleId ? { ruleId } : {};
      const executions = await RuleExecution.find(query)
        .sort({ timestamp: -1 })
        .limit(maxLimit);
      return res.json(executions);
    }

    const inMemory = getInMemoryExecutions(ruleId);
    return res.json(inMemory.slice(0, maxLimit));
  } catch (err) {
    console.error('Error fetching rule executions:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/rules/:id/executions - Retrieve execution history for a specific rule
router.get('/:id/executions', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const maxLimit = Math.min(Number(limit) || 50, 200);

    if (getIsConnected()) {
      const executions = await RuleExecution.find({ ruleId: req.params.id })
        .sort({ timestamp: -1 })
        .limit(maxLimit);
      return res.json(executions);
    }

    const inMemory = getInMemoryExecutions(req.params.id);
    return res.json(inMemory.slice(0, maxLimit));
  } catch (err) {
    console.error('Error fetching rule executions by ID:', err);
    res.status(500).json({ error: err.message });
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

// POST /api/rules - Create, validate and serialize a new rule graph
router.post('/', async (req, res) => {
  try {
    const { name, description, enabled, nodes, edges, targetDeviceId, cooldownSeconds } = req.body;

    // Validate graph and configuration values
    const validation = validateRuleGraph(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Rule validation failed',
        details: validation.errors,
      });
    }

    const payload = {
      name: name.trim(),
      description: description ? description.trim() : '',
      enabled: enabled !== undefined ? Boolean(enabled) : true,
      nodes: Array.isArray(nodes) ? nodes : [],
      edges: Array.isArray(edges) ? edges : [],
      targetDeviceId: targetDeviceId || 'all',
      cooldownSeconds: cooldownSeconds ? Number(cooldownSeconds) : 30,
      executionCount: 0,
      lastTriggered: null,
    };

    if (getIsConnected()) {
      const newRule = new Rule(payload);
      const saved = await newRule.save();
      // Activate pipeline in RxJS Rule Engine if enabled
      if (saved.enabled) {
        activateRule(saved);
      }
      return res.status(201).json(saved);
    }

    const created = {
      ...payload,
      _id: `rule-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    inMemoryRules.unshift(created);
    if (created.enabled) {
      activateRule(created);
    }
    res.status(201).json(created);
  } catch (err) {
    console.error('Error creating rule:', err);
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/rules/:id - Update serialized rule graph (nodes, edges, configuration)
router.put('/:id', async (req, res) => {
  try {
    const { name, description, enabled, nodes, edges, targetDeviceId, cooldownSeconds } = req.body;

    // Fetch existing rule to merge before validation
    let existing = null;
    if (getIsConnected() && mongoose.Types.ObjectId.isValid(req.params.id)) {
      existing = await Rule.findById(req.params.id);
    } else {
      existing = inMemoryRules.find((r) => r._id === req.params.id || r.id === req.params.id);
    }

    if (!existing) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    const mergedForValidation = {
      name: name !== undefined ? name : existing.name,
      description: description !== undefined ? description : existing.description,
      enabled: enabled !== undefined ? enabled : existing.enabled,
      nodes: nodes !== undefined ? nodes : existing.nodes,
      edges: edges !== undefined ? edges : existing.edges,
      targetDeviceId: targetDeviceId !== undefined ? targetDeviceId : existing.targetDeviceId,
      cooldownSeconds: cooldownSeconds !== undefined ? cooldownSeconds : existing.cooldownSeconds,
    };

    // Run validation on merged configuration
    const validation = validateRuleGraph(mergedForValidation);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Rule validation failed',
        details: validation.errors,
      });
    }

    if (getIsConnected() && mongoose.Types.ObjectId.isValid(req.params.id)) {
      const updated = await Rule.findByIdAndUpdate(
        req.params.id,
        {
          ...(name !== undefined && { name: name.trim() }),
          ...(description !== undefined && { description: description.trim() }),
          ...(enabled !== undefined && { enabled: Boolean(enabled) }),
          ...(nodes !== undefined && { nodes }),
          ...(edges !== undefined && { edges }),
          ...(targetDeviceId !== undefined && { targetDeviceId }),
          ...(cooldownSeconds !== undefined && { cooldownSeconds: Number(cooldownSeconds) }),
        },
        { new: true }
      );

      if (updated) {
        if (updated.enabled) {
          activateRule(updated);
        } else {
          deactivateRule(updated._id);
        }
        return res.json(updated);
      }
    }

    const idx = inMemoryRules.findIndex((r) => r._id === req.params.id || r.id === req.params.id);
    if (idx !== -1) {
      inMemoryRules[idx] = {
        ...inMemoryRules[idx],
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description.trim() }),
        ...(enabled !== undefined && { enabled: Boolean(enabled) }),
        ...(nodes !== undefined && { nodes }),
        ...(edges !== undefined && { edges }),
        ...(targetDeviceId !== undefined && { targetDeviceId }),
        ...(cooldownSeconds !== undefined && { cooldownSeconds: Number(cooldownSeconds) }),
        updatedAt: new Date().toISOString(),
      };

      if (inMemoryRules[idx].enabled) {
        activateRule(inMemoryRules[idx]);
      } else {
        deactivateRule(inMemoryRules[idx]._id || inMemoryRules[idx].id);
      }
      return res.json(inMemoryRules[idx]);
    }

    res.status(404).json({ error: 'Rule not found' });
  } catch (err) {
    console.error('Error updating rule:', err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/rules/:id/toggle - Enable or disable rule
router.patch('/:id/toggle', async (req, res) => {
  try {
    if (getIsConnected() && mongoose.Types.ObjectId.isValid(req.params.id)) {
      const existing = await Rule.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Rule not found' });
      }

      const nextStatus = !existing.enabled;
      existing.enabled = nextStatus;
      await existing.save();

      if (nextStatus) {
        activateRule(existing);
      } else {
        deactivateRule(existing._id);
      }

      return res.json({
        message: `Rule "${existing.name}" is now ${nextStatus ? 'enabled' : 'disabled'}`,
        rule: existing,
      });
    }

    const idx = inMemoryRules.findIndex((r) => r._id === req.params.id || r.id === req.params.id);
    if (idx !== -1) {
      const nextStatus = !inMemoryRules[idx].enabled;
      inMemoryRules[idx].enabled = nextStatus;
      inMemoryRules[idx].updatedAt = new Date().toISOString();

      if (nextStatus) {
        activateRule(inMemoryRules[idx]);
      } else {
        deactivateRule(inMemoryRules[idx]._id || inMemoryRules[idx].id);
      }

      return res.json({
        message: `Rule "${inMemoryRules[idx].name}" is now ${nextStatus ? 'enabled' : 'disabled'}`,
        rule: inMemoryRules[idx],
      });
    }

    res.status(404).json({ error: 'Rule not found' });
  } catch (err) {
    console.error('Error toggling rule:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/rules/:id/duplicate - Duplicate an existing rule
router.post('/:id/duplicate', async (req, res) => {
  try {
    let original = null;
    if (getIsConnected() && mongoose.Types.ObjectId.isValid(req.params.id)) {
      original = await Rule.findById(req.params.id);
    } else {
      original = inMemoryRules.find((r) => r._id === req.params.id || r.id === req.params.id);
    }

    if (!original) {
      return res.status(404).json({ error: 'Original rule not found to duplicate' });
    }

    const duplicatePayload = {
      name: `${original.name} (Copy)`,
      description: original.description || '',
      enabled: false, // Default to disabled to let user configure before activating
      nodes: JSON.parse(JSON.stringify(original.nodes || [])),
      edges: JSON.parse(JSON.stringify(original.edges || [])),
      targetDeviceId: original.targetDeviceId || 'all',
      cooldownSeconds: original.cooldownSeconds || 30,
      executionCount: 0,
      lastTriggered: null,
    };

    if (getIsConnected()) {
      const duplicatedRule = new Rule(duplicatePayload);
      const saved = await duplicatedRule.save();
      return res.status(201).json(saved);
    }

    const created = {
      ...duplicatePayload,
      _id: `rule-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    inMemoryRules.unshift(created);
    res.status(201).json(created);
  } catch (err) {
    console.error('Error duplicating rule:', err);
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
    // Deactivate pipeline in RxJS engine
    deactivateRule(req.params.id);
    res.json({ success: true, message: 'Rule graph deleted successfully', id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// PATCH /api/rules/:id/status - Update execution status: active, paused, or disabled
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'paused', 'disabled'].includes(status)) {
      return res.status(400).json({ error: 'Status must be one of: active, paused, disabled' });
    }

    const isEnabled = status === 'active';

    if (getIsConnected() && mongoose.Types.ObjectId.isValid(req.params.id)) {
      const rule = await Rule.findById(req.params.id);
      if (!rule) return res.status(404).json({ error: 'Rule not found' });

      rule.status = status;
      rule.enabled = isEnabled;
      await rule.save();

      if (status === 'active') {
        activateRule(rule);
      } else {
        deactivateRule(rule._id);
      }

      return res.json({
        message: `Rule "${rule.name}" status updated to ${status}`,
        rule,
      });
    }

    const idx = inMemoryRules.findIndex((r) => r._id === req.params.id || r.id === req.params.id);
    if (idx !== -1) {
      inMemoryRules[idx].status = status;
      inMemoryRules[idx].enabled = isEnabled;
      inMemoryRules[idx].updatedAt = new Date().toISOString();

      if (status === 'active') {
        activateRule(inMemoryRules[idx]);
      } else {
        deactivateRule(inMemoryRules[idx]._id || inMemoryRules[idx].id);
      }

      return res.json({
        message: `Rule "${inMemoryRules[idx].name}" status updated to ${status}`,
        rule: inMemoryRules[idx],
      });
    }

    res.status(404).json({ error: 'Rule not found' });
  } catch (err) {
    console.error('Error updating rule status:', err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/rules/:id/pause - Pause rule execution
router.patch('/:id/pause', async (req, res) => {
  req.body = { status: 'paused' };
  return router.handle(req, res);
});

// PATCH /api/rules/:id/resume - Resume rule execution
router.patch('/:id/resume', async (req, res) => {
  req.body = { status: 'active' };
  return router.handle(req, res);
});

module.exports = router;
