/**
 * Rule Graph & Configuration Validator
 * Validates React Flow DAG graphs for the NexusFlow RxJS Rule Engine:
 * 1. Required nodes: Must contain at least one sensor/source node and at least one alert/webhook action node.
 * 2. Connectivity: No disconnected nodes; sources must have outgoing edges, terminal nodes incoming edges,
 *    and intermediate nodes must have both. All edge endpoints must exist.
 * 3. Configuration values: Verifies required fields (thresholds, operators, fields, URLs) are populated.
 */

function validateRuleGraph(rule) {
  const errors = [];

  if (!rule || typeof rule !== 'object') {
    return { valid: false, errors: ['Invalid rule data provided.'] };
  }

  // 1. Rule Name Validation
  if (!rule.name || typeof rule.name !== 'string' || !rule.name.trim()) {
    errors.push('Rule name is required.');
  }

  const nodes = Array.isArray(rule.nodes) ? rule.nodes : [];
  const edges = Array.isArray(rule.edges) ? rule.edges : [];

  // 2. Required Nodes Validation
  if (nodes.length === 0) {
    errors.push('Rule must contain at least two nodes.');
    return { valid: false, errors };
  }

  const sourceNodes = nodes.filter((n) => n.type === 'sensor');
  const actionNodes = nodes.filter((n) => n.type === 'alert' || n.type === 'webhook');

  if (sourceNodes.length === 0) {
    errors.push('Rule is missing a Source node (at least one "sensor" node is required).');
  }

  if (actionNodes.length === 0) {
    errors.push('Rule is missing an Action node (at least one "alert" or "webhook" node is required).');
  }

  if (nodes.length < 2) {
    errors.push('Rule must contain at least one Source node and one Action node.');
  }

  // Map of valid node IDs
  const nodeMap = new Map();
  nodes.forEach((n) => {
    if (n.id) nodeMap.set(n.id, n);
  });

  // 3. Connectivity Validation
  const inDegree = new Map();
  const outDegree = new Map();

  nodes.forEach((n) => {
    inDegree.set(n.id, 0);
    outDegree.set(n.id, 0);
  });

  const validEdges = [];
  edges.forEach((edge, idx) => {
    if (!edge.source || !edge.target) {
      errors.push(`Edge #${idx + 1} has an undefined source or target.`);
      return;
    }
    if (!nodeMap.has(edge.source)) {
      errors.push(`Edge connects from non-existent node: "${edge.source}".`);
      return;
    }
    if (!nodeMap.has(edge.target)) {
      errors.push(`Edge connects to non-existent node: "${edge.target}".`);
      return;
    }
    if (edge.source === edge.target) {
      errors.push(`Self-referencing loop detected on node: "${nodeMap.get(edge.source)?.data?.label || edge.source}".`);
      return;
    }

    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    outDegree.set(edge.source, (outDegree.get(edge.source) || 0) + 1);
    validEdges.push(edge);
  });

  // Check connectivity per node type
  nodes.forEach((node) => {
    const label = node.data?.label || `${node.type || 'node'} (${node.id})`;
    const inCount = inDegree.get(node.id) || 0;
    const outCount = outDegree.get(node.id) || 0;

    if (inCount === 0 && outCount === 0) {
      errors.push(`Disconnected node: "${label}" is not connected to any other node.`);
      return;
    }

    if (node.type === 'sensor') {
      if (outCount === 0) {
        errors.push(`Source node "${label}" must have an outgoing connection.`);
      }
    } else if (node.type === 'alert' || node.type === 'webhook') {
      if (inCount === 0) {
        errors.push(`Action node "${label}" must have an incoming connection.`);
      }
    } else {
      // Intermediate filter/condition/math/movingAverage/threshold/gate node
      if (inCount === 0) {
        errors.push(`Intermediate node "${label}" must have an incoming connection.`);
      }
      if (outCount === 0) {
        errors.push(`Intermediate node "${label}" must have an outgoing connection.`);
      }
    }
  });

  // Check path reachability: ensure at least one path from a sensor reaches an action node
  if (sourceNodes.length > 0 && actionNodes.length > 0 && errors.length === 0) {
    const visited = new Set();
    const queue = sourceNodes.map((s) => s.id);
    queue.forEach((id) => visited.add(id));

    while (queue.length > 0) {
      const current = queue.shift();
      const outgoingEdges = validEdges.filter((e) => e.source === current);
      for (const e of outgoingEdges) {
        if (!visited.has(e.target)) {
          visited.add(e.target);
          queue.push(e.target);
        }
      }
    }

    const reachableActions = actionNodes.filter((a) => visited.has(a.id));
    if (reachableActions.length === 0) {
      errors.push('No connected pipeline path exists from a Source sensor to an Action node.');
    }
  }

  // 4. Node Configuration Values Validation
  nodes.forEach((node) => {
    const label = node.data?.label || `${node.type} (${node.id})`;
    const data = node.data || {};

    switch (node.type) {
      case 'sensor':
        if (!data.metric && !data.field) {
          errors.push(`Sensor node "${label}" must specify a telemetry metric.`);
        }
        break;

      case 'filter':
      case 'threshold':
        if (data.threshold === undefined || data.threshold === null || data.threshold === '') {
          errors.push(`Node "${label}" requires a numeric threshold value.`);
        } else if (isNaN(Number(data.threshold))) {
          errors.push(`Node "${label}" threshold must be a valid number.`);
        }
        if (!data.operator || typeof data.operator !== 'string') {
          errors.push(`Node "${label}" requires a comparison operator (e.g. >, <, >=, <=).`);
        }
        break;

      case 'condition':
        if (data.threshold !== undefined && data.threshold !== null && data.threshold !== '') {
          if (isNaN(Number(data.threshold))) {
            errors.push(`Condition node "${label}" threshold must be a valid number.`);
          }
        }
        break;

      case 'math':
      case 'mathOperation':
        if (data.operand === undefined || data.operand === null || data.operand === '') {
          errors.push(`Math node "${label}" requires an operand value.`);
        } else if (isNaN(Number(data.operand))) {
          errors.push(`Math node "${label}" operand must be a valid number.`);
        }
        if (!data.operator) {
          errors.push(`Math node "${label}" requires an operation (add, subtract, multiply, divide).`);
        }
        break;

      case 'movingAverage':
      case 'moving_average':
        if (!data.windowSize || isNaN(Number(data.windowSize)) || Number(data.windowSize) < 1) {
          errors.push(`Moving Average node "${label}" requires a window size of 1 or greater.`);
        }
        break;

      case 'alert':
        if (data.severity && !['info', 'warning', 'critical'].includes(data.severity)) {
          errors.push(`Alert node "${label}" has an invalid severity (must be info, warning, or critical).`);
        }
        break;

      case 'webhook':
        if (!data.url || typeof data.url !== 'string' || !data.url.trim()) {
          errors.push(`Webhook node "${label}" requires a destination URL.`);
        } else {
          try {
            const parsedUrl = new URL(data.url.trim());
            if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
              errors.push(`Webhook node "${label}" URL must use HTTP or HTTPS protocol.`);
            }
          } catch (e) {
            errors.push(`Webhook node "${label}" contains an invalid URL format.`);
          }
        }
        break;

      case 'and':
      case 'or':
        if (Array.isArray(data.conditions)) {
          data.conditions.forEach((c, cIdx) => {
            if (c.threshold === undefined || c.threshold === null || c.threshold === '' || isNaN(Number(c.threshold))) {
              errors.push(`Gate node "${label}" condition #${cIdx + 1} requires a valid numeric threshold.`);
            }
          });
        }
        break;

      default:
        break;
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

module.exports = {
  validateRuleGraph,
};
