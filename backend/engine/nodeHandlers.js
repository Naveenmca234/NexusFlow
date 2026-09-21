const { filter, map, tap } = require('rxjs/operators');
const Alert = require('../models/Alert');
const Rule = require('../models/Rule');
const { getIsConnected } = require('../config/db');
const socketServer = require('./socketServer');

/**
 * Basic comparison operator evaluator
 * Supported: >, <, >=, <=, ==, !=
 */
function evaluateComparison(actualValue, operator, threshold) {
  if (actualValue === undefined || actualValue === null) return false;
  const a = Number(actualValue);
  const b = Number(threshold);
  if (isNaN(a) || isNaN(b)) return false;

  switch (operator) {
    case '>':
      return a > b;
    case '<':
      return a < b;
    case '>=':
      return a >= b;
    case '<=':
      return a <= b;
    case '==':
    case '===':
      return a === b;
    case '!=':
    case '!==':
      return a !== b;
    default:
      return a > b;
  }
}

/**
 * Helper to extract metric value from telemetry packet
 */
function extractMetricValue(packet, field) {
  if (!packet) return undefined;
  const f = (field || 'temperature').toLowerCase();
  if (packet[f] !== undefined) return packet[f];
  if (packet.metrics && packet.metrics[f] !== undefined) return packet.metrics[f];
  return packet.temperature;
}

/**
 * Sensor Node Handler:
 * Filters stream for matching target device(s)
 */
function compileSensorNode(node, ruleContext) {
  const targetId = node.data?.deviceId || node.data?.targetDeviceId || ruleContext?.targetDeviceId;
  const isFleetWide = !targetId || targetId === 'all';

  return filter((packet) => {
    if (isFleetWide) return true;
    return packet.deviceId === targetId;
  });
}

/**
 * Filter Node Handler:
 * Evaluates metric value against operator and threshold
 */
function compileFilterNode(node) {
  const field = node.data?.field || 'temperature';
  const operator = node.data?.operator || '>';
  const threshold = node.data?.threshold ?? 30;

  return filter((packet) => {
    const val = extractMetricValue(packet, field);
    return evaluateComparison(val, operator, threshold);
  });
}

/**
 * Condition Node Handler:
 * Evaluates rule condition logic and comparison operators (>, <, >=, <=, ==, !=)
 */
function compileConditionNode(node) {
  const operator = node.data?.operator || '>';
  const threshold = node.data?.threshold;
  const field = node.data?.field || 'temperature';

  return filter((packet) => {
    // If condition has explicit comparison operator and threshold, evaluate it
    if (threshold !== undefined && threshold !== null) {
      const val = extractMetricValue(packet, field);
      return evaluateComparison(val, operator, threshold);
    }
    // Default pass-through if condition logic is meta
    return true;
  });
}

/**
 * Alert Cooldown Tracker:
 * Stores timestamp of last alert fired keyed by `${ruleKey}:${deviceKey}`
 * Prevents alert flooding when metric persistently breaches threshold.
 */
const alertCooldownTracker = new Map();

function resetAlertCooldowns() {
  alertCooldownTracker.clear();
}

/**
 * Alert Node Handler:
 * Triggers alert event creation when incoming packet reaches the end of the pipeline.
 * Respects configured cooldown period per rule and device.
 */
function compileAlertNode(node, ruleContext) {
  // Configurable cooldown period (in seconds)
  // Priority: node.data.cooldownSeconds -> node.data.cooldown -> ruleContext.cooldownSeconds -> default 30s
  const defaultCooldown = 30;
  const configuredCooldown = Number(
    node.data?.cooldownSeconds ?? node.data?.cooldown ?? ruleContext?.cooldownSeconds ?? defaultCooldown
  );
  const cooldownSeconds = isNaN(configuredCooldown) || configuredCooldown < 0 ? defaultCooldown : configuredCooldown;
  const cooldownMs = cooldownSeconds * 1000;
  const ruleKey = String(ruleContext?._id || ruleContext?.name || 'rule');

  return tap(async (packet) => {
    try {
      const deviceId = packet.deviceId || 'DEV-TH-101';
      const cooldownKey = `${ruleKey}:${deviceId}`;
      const now = Date.now();
      const lastFired = alertCooldownTracker.get(cooldownKey) || 0;

      // Check if cooldown period is active
      if (cooldownMs > 0 && (now - lastFired < cooldownMs)) {
        const remainingSec = Math.ceil((cooldownMs - (now - lastFired)) / 1000);
        // Suppress alert during cooldown
        return;
      }

      // Record timestamp for cooldown
      alertCooldownTracker.set(cooldownKey, now);

      const severity = node.data?.severity || 'warning';
      const label = node.data?.label || ruleContext?.name || 'Rule Alert';
      const field = node.data?.field || 'telemetry';
      const detectedVal = extractMetricValue(packet, field) ?? packet.temperature ?? 'N/A';

      const alertPayload = {
        ruleId: ruleContext?._id || null,
        ruleName: ruleContext?.name || node.data?.ruleName || 'Visual Rule',
        deviceId: deviceId,
        title: `${ruleContext?.name || 'Visual Rule'}: Threshold Exceeded`,
        message: `${label}: Condition met on ${deviceId}. Value detected: ${detectedVal}`,
        severity: ['info', 'warning', 'critical'].includes(severity) ? severity : 'warning',
        status: 'new',
        valueDetected: detectedVal,
        triggerValue: detectedVal,
        threshold: node.data?.threshold ?? null,
        cooldownSeconds,
        timestamp: new Date(),
      };

      let savedAlert = alertPayload;

      // Persist alert in MongoDB if connected
      if (getIsConnected()) {
        const newAlert = new Alert(alertPayload);
        savedAlert = await newAlert.save();

        // Increment rule execution counter
        if (ruleContext?._id) {
          await Rule.findByIdAndUpdate(ruleContext._id, {
            $inc: { executionCount: 1 },
            lastTriggered: new Date(),
          });
        }
      } else {
        savedAlert = {
          ...alertPayload,
          _id: `alt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        };
        try {
          const alertRoutes = require('../routes/alertRoutes');
          if (typeof alertRoutes.addAlertRecord === 'function') {
            alertRoutes.addAlertRecord(savedAlert);
          }
        } catch (e) {
          // ignore cyclic require
        }
      }

      // Update in-memory counter if present
      if (ruleContext) {
        ruleContext.executionCount = (ruleContext.executionCount || 0) + 1;
        ruleContext.lastTriggered = new Date();
      }

      console.log(`[RuleEngine Alert] 🚨 ${alertPayload.title} -> ${alertPayload.deviceId} (${alertPayload.severity}) [cooldown: ${cooldownSeconds}s]`);

      // Real-time WebSocket broadcasts
      socketServer.broadcast('ALERT_TRIGGERED', savedAlert);
      socketServer.broadcast('RULE_STATUS', {
        ruleId: ruleContext?._id || ruleContext?.name || 'rule-1',
        ruleName: ruleContext?.name || 'Visual Rule',
        executionCount: ruleContext?.executionCount || 1,
        lastTriggered: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[RuleEngine Alert Error]:', err.message);
    }
  });
}

/**
 * Webhook Cooldown Tracker:
 * Stores timestamp of last webhook execution keyed by `whk:${ruleKey}:${deviceKey}`
 */
const webhookCooldownTracker = new Map();

function resetWebhookCooldowns() {
  webhookCooldownTracker.clear();
}

/**
 * Webhook Node Handler:
 * Executes an HTTP webhook when rule condition evaluates to true.
 * Records execution result, handles timeouts, and enforces cooldowns safely.
 */
function compileWebhookNode(node, ruleContext) {
  const { executeWebhook } = require('./webhookExecutor');
  const defaultCooldown = 10;
  const configuredCooldown = Number(
    node.data?.cooldownSeconds ?? node.data?.cooldown ?? ruleContext?.cooldownSeconds ?? defaultCooldown
  );
  const cooldownSeconds = isNaN(configuredCooldown) || configuredCooldown < 0 ? defaultCooldown : configuredCooldown;
  const cooldownMs = cooldownSeconds * 1000;
  const ruleKey = String(ruleContext?._id || ruleContext?.name || 'rule');

  return tap(async (packet) => {
    try {
      const deviceId = packet.deviceId || 'DEV-TH-101';
      const cooldownKey = `whk:${ruleKey}:${deviceId}`;
      const now = Date.now();
      const lastFired = webhookCooldownTracker.get(cooldownKey) || 0;

      if (cooldownMs > 0 && (now - lastFired < cooldownMs)) {
        // Cooldown active, suppress duplicate webhook execution
        return;
      }

      webhookCooldownTracker.set(cooldownKey, now);

      await executeWebhook(
        {
          url: node.data?.url || node.data?.webhookUrl,
          method: node.data?.method || 'POST',
          payload: node.data?.payload,
          timeoutMs: node.data?.timeoutMs || 5000,
        },
        packet,
        ruleContext
      );
    } catch (err) {
      console.error('[RuleEngine Webhook Error]:', err.message);
    }
  });
}

/**
 * Moving Average Node Handler:
 * Calculates the moving average of the latest N telemetry values for a target field
 * and passes the calculated average to the next node in the pipeline.
 */
function compileMovingAverageNode(node, ruleContext) {
  const windowSize = Math.max(Number(node.data?.windowSize || node.data?.window) || 5, 1);
  const field = (node.data?.field || 'temperature').toLowerCase();
  const buffers = new Map();

  return map((packet) => {
    const rawVal = extractMetricValue(packet, field);
    const num = Number(rawVal);
    if (isNaN(num)) {
      return packet;
    }

    const deviceKey = packet.deviceId || 'default';
    if (!buffers.has(deviceKey)) {
      buffers.set(deviceKey, []);
    }
    const windowQueue = buffers.get(deviceKey);
    windowQueue.push(num);
    if (windowQueue.length > windowSize) {
      windowQueue.shift();
    }

    const sum = windowQueue.reduce((acc, curr) => acc + curr, 0);
    const avg = parseFloat((sum / windowQueue.length).toFixed(2));

    // Map calculated average into the packet so downstream nodes (Filter, Condition, Alert) receive it
    const mappedPacket = {
      ...packet,
      [field]: avg,
      movingAverage: avg,
      rawMetricValue: rawVal,
      movingAverageWindow: windowQueue.length,
      movingAverageConfigWindow: windowSize,
    };

    if (mappedPacket.metrics) {
      mappedPacket.metrics = {
        ...mappedPacket.metrics,
        [field]: avg,
      };
    }

    return mappedPacket;
  });
}

/**
 * Math Operation Node Handler:
 * Supports: Add, Subtract, Multiply, Divide (+, -, *, /)
 * Updates the target metric or outputField on the telemetry packet
 */
function compileMathNode(node) {
  const field = (node.data?.field || 'temperature').toLowerCase();
  const rawOp = (node.data?.operator || node.data?.operation || 'add').toLowerCase();
  const operand = Number(node.data?.operand ?? node.data?.value ?? 0);
  const outputField = (node.data?.outputField || field).toLowerCase();

  return map((packet) => {
    const rawVal = extractMetricValue(packet, field);
    const num = Number(rawVal);
    if (isNaN(num)) return packet;

    let result = num;
    switch (rawOp) {
      case 'add':
      case '+':
        result = num + operand;
        break;
      case 'subtract':
      case '-':
        result = num - operand;
        break;
      case 'multiply':
      case '*':
        result = num * operand;
        break;
      case 'divide':
      case '/':
        result = operand !== 0 ? num / operand : num;
        break;
      default:
        result = num + operand;
    }
    result = parseFloat(result.toFixed(2));

    const updated = {
      ...packet,
      [outputField]: result,
      mathResult: result,
      rawMetricValue: rawVal,
    };

    if (updated.metrics) {
      updated.metrics = {
        ...updated.metrics,
        [outputField]: result,
      };
    }

    return updated;
  });
}

/**
 * Threshold Node Handler:
 * Evaluates metric value against operator (>, <, >=, <=, ==, !=) and threshold
 * If connected to an AND/OR combiner, tags evaluation on packet._nodeResults;
 * otherwise acts as a direct stream filter.
 */
function compileThresholdNode(node, ruleContext, graphContext) {
  const field = (node.data?.field || 'temperature').toLowerCase();
  const operator = node.data?.operator || '>';
  const threshold = Number(node.data?.threshold ?? 0);

  // Check if this threshold node feeds into an AND or OR combiner downstream
  const edgesFromNode = graphContext?.edges?.filter((e) => e.source === node.id) || [];
  const feedsIntoCombiner = edgesFromNode.some((e) => {
    const targetNode = graphContext?.nodes?.find((n) => n.id === e.target);
    return targetNode && (targetNode.type === 'and' || targetNode.type === 'or');
  });

  if (feedsIntoCombiner) {
    return map((packet) => {
      const val = extractMetricValue(packet, field);
      const passes = evaluateComparison(val, operator, threshold);
      return {
        ...packet,
        _nodeResults: {
          ...(packet._nodeResults || {}),
          [node.id]: passes,
        },
      };
    });
  }

  return filter((packet) => {
    const val = extractMetricValue(packet, field);
    const passes = evaluateComparison(val, operator, threshold);
    if (packet._nodeResults) {
      packet._nodeResults[node.id] = passes;
    }
    return passes;
  });
}

/**
 * AND Node Handler:
 * Evaluates true ONLY IF all incoming parent condition branches AND/OR in-node criteria evaluate to true.
 */
function compileAndNode(node, ruleContext, graphContext) {
  const incomingEdges = graphContext?.edges?.filter((e) => e.target === node.id) || [];
  const parentNodeIds = incomingEdges.map((e) => e.source);
  const conditions = Array.isArray(node.data?.conditions) ? node.data.conditions : [];

  return filter((packet) => {
    let parentsPass = true;
    if (parentNodeIds.length > 0) {
      // All parent nodes that evaluated a boolean result must be true
      parentsPass = parentNodeIds.every((parentId) => {
        if (!packet._nodeResults || packet._nodeResults[parentId] === undefined) {
          return true; // Not an evaluation node (e.g. sensor/ma)
        }
        return packet._nodeResults[parentId] === true;
      });
    }

    let conditionsPass = true;
    if (conditions.length > 0) {
      conditionsPass = conditions.every((c) => {
        const val = extractMetricValue(packet, c.field);
        return evaluateComparison(val, c.operator || '>', c.threshold ?? 0);
      });
    }

    return parentsPass && conditionsPass;
  });
}

/**
 * OR Node Handler:
 * Evaluates true IF AT LEAST ONE incoming parent condition branch OR in-node criteria evaluates to true.
 */
function compileOrNode(node, ruleContext, graphContext) {
  const incomingEdges = graphContext?.edges?.filter((e) => e.target === node.id) || [];
  const parentNodeIds = incomingEdges.map((e) => e.source);
  const conditions = Array.isArray(node.data?.conditions) ? node.data.conditions : [];

  return filter((packet) => {
    let parentEvaluatedCount = 0;
    let parentsPass = false;

    if (parentNodeIds.length > 0) {
      for (const parentId of parentNodeIds) {
        if (packet._nodeResults && packet._nodeResults[parentId] !== undefined) {
          parentEvaluatedCount++;
          if (packet._nodeResults[parentId] === true) {
            parentsPass = true;
            break;
          }
        }
      }
    }

    let conditionsPass = false;
    if (conditions.length > 0) {
      conditionsPass = conditions.some((c) => {
        const val = extractMetricValue(packet, c.field);
        return evaluateComparison(val, c.operator || '>', c.threshold ?? 0);
      });
    }

    if (parentEvaluatedCount > 0 && conditions.length > 0) {
      return parentsPass || conditionsPass;
    }
    if (parentEvaluatedCount > 0) {
      return parentsPass;
    }
    if (conditions.length > 0) {
      return conditionsPass;
    }

    return true;
  });
}

/**
 * Modular Node Handler Registry
 * Allows easily registering additional node types in the future
 */
const NODE_HANDLERS = {
  sensor: compileSensorNode,
  filter: compileFilterNode,
  condition: compileConditionNode,
  alert: compileAlertNode,
  webhook: compileWebhookNode,
  movingAverage: compileMovingAverageNode,
  moving_average: compileMovingAverageNode,
  mathOperation: compileMathNode,
  math: compileMathNode,
  threshold: compileThresholdNode,
  and: compileAndNode,
  or: compileOrNode,
};

module.exports = {
  NODE_HANDLERS,
  evaluateComparison,
  compileSensorNode,
  compileFilterNode,
  compileConditionNode,
  compileAlertNode,
  compileWebhookNode,
  compileMovingAverageNode,
  compileMathNode,
  compileThresholdNode,
  compileAndNode,
  compileOrNode,
  alertCooldownTracker,
  resetAlertCooldowns,
  webhookCooldownTracker,
  resetWebhookCooldowns,
};
