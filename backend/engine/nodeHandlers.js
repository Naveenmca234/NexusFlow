const { filter, map, tap } = require('rxjs/operators');
const Alert = require('../models/Alert');
const Rule = require('../models/Rule');
const { getIsConnected } = require('../config/db');

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
 * Alert Node Handler:
 * Triggers alert event creation when incoming packet reaches the end of the pipeline
 */
function compileAlertNode(node, ruleContext) {
  return tap(async (packet) => {
    try {
      const severity = node.data?.severity || 'warning';
      const label = node.data?.label || ruleContext?.name || 'Rule Alert';
      const field = node.data?.field || 'telemetry';
      const detectedVal = extractMetricValue(packet, field) ?? packet.temperature ?? 'N/A';

      const alertPayload = {
        ruleId: ruleContext?._id || null,
        deviceId: packet.deviceId || 'DEV-TH-101',
        title: `${ruleContext?.name || 'Visual Rule'}: Threshold Exceeded`,
        message: `${label}: Condition met on ${packet.deviceId}. Value detected: ${detectedVal}`,
        severity: ['info', 'warning', 'critical'].includes(severity) ? severity : 'warning',
        status: 'active',
        valueDetected: detectedVal,
        threshold: node.data?.threshold ?? null,
        timestamp: new Date(),
      };

      // Persist alert in MongoDB if connected
      if (getIsConnected()) {
        const newAlert = new Alert(alertPayload);
        await newAlert.save();

        // Increment rule execution counter
        if (ruleContext?._id) {
          await Rule.findByIdAndUpdate(ruleContext._id, {
            $inc: { executionCount: 1 },
            lastTriggered: new Date(),
          });
        }
      }

      console.log(`[RuleEngine Alert] 🚨 ${alertPayload.title} -> ${alertPayload.deviceId} (${alertPayload.severity})`);
    } catch (err) {
      console.error('[RuleEngine Alert Error]:', err.message);
    }
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
};

module.exports = {
  NODE_HANDLERS,
  evaluateComparison,
  compileSensorNode,
  compileFilterNode,
  compileConditionNode,
  compileAlertNode,
};
