const { NODE_HANDLERS } = require('./nodeHandlers');

const ACTION_NODE_TYPES = new Set(['alert', 'webhook']);

/**
 * Validate a serialized React Flow graph before it is compiled into RxJS operators.
 * The validator is intentionally side-effect free so it can be used by API routes,
 * tests, and the compiler itself.
 */
function validateRuleGraph(ruleGraph = {}) {
  const nodes = Array.isArray(ruleGraph.nodes) ? ruleGraph.nodes : [];
  const edges = Array.isArray(ruleGraph.edges) ? ruleGraph.edges : [];
  const errors = [];
  const warnings = [];

  if (nodes.length === 0) {
    errors.push({
      code: 'EMPTY_GRAPH',
      message: 'Rule graph must contain at least one node.',
    });
  }

  const nodeById = new Map();
  const duplicateNodeIds = new Set();

  for (const node of nodes) {
    if (!node || !node.id) {
      errors.push({
        code: 'NODE_ID_REQUIRED',
        message: 'Every node must have a unique id.',
      });
      continue;
    }

    if (nodeById.has(node.id)) {
      duplicateNodeIds.add(node.id);
      continue;
    }

    nodeById.set(node.id, node);

    if (!node.type || typeof NODE_HANDLERS[node.type] !== 'function') {
      errors.push({
        code: 'UNSUPPORTED_NODE_TYPE',
        nodeId: node.id,
        nodeType: node.type || null,
        message: `Node "${node.id}" uses unsupported type "${node.type || 'undefined'}".`,
      });
    }
  }

  for (const id of duplicateNodeIds) {
    errors.push({
      code: 'DUPLICATE_NODE_ID',
      nodeId: id,
      message: `Duplicate node id detected: "${id}".`,
    });
  }

  const adjacency = new Map();
  const inDegree = new Map();
  const outDegree = new Map();

  for (const id of nodeById.keys()) {
    adjacency.set(id, []);
    inDegree.set(id, 0);
    outDegree.set(id, 0);
  }

  const seenEdgeIds = new Set();

  for (const edge of edges) {
    if (!edge || !edge.source || !edge.target) {
      errors.push({
        code: 'EDGE_ENDPOINT_REQUIRED',
        edgeId: edge?.id || null,
        message: 'Every edge must define both source and target node ids.',
      });
      continue;
    }

    if (edge.id) {
      if (seenEdgeIds.has(edge.id)) {
        warnings.push({
          code: 'DUPLICATE_EDGE_ID',
          edgeId: edge.id,
          message: `Duplicate edge id detected: "${edge.id}".`,
        });
      }
      seenEdgeIds.add(edge.id);
    }

    if (!nodeById.has(edge.source) || !nodeById.has(edge.target)) {
      errors.push({
        code: 'DANGLING_EDGE',
        edgeId: edge.id || null,
        source: edge.source,
        target: edge.target,
        message: `Edge "${edge.id || '(unnamed)'}" references a node that does not exist.`,
      });
      continue;
    }

    if (edge.source === edge.target) {
      errors.push({
        code: 'SELF_LOOP',
        edgeId: edge.id || null,
        nodeId: edge.source,
        message: `Node "${edge.source}" cannot connect to itself.`,
      });
      continue;
    }

    adjacency.get(edge.source).push(edge.target);
    inDegree.set(edge.target, inDegree.get(edge.target) + 1);
    outDegree.set(edge.source, outDegree.get(edge.source) + 1);
  }

  const roots = [];
  for (const [id, degree] of inDegree.entries()) {
    if (degree === 0) roots.push(id);
  }

  const queue = [...roots];
  const executionOrderIds = [];
  const workingInDegree = new Map(inDegree);

  while (queue.length > 0) {
    const current = queue.shift();
    executionOrderIds.push(current);

    for (const next of adjacency.get(current) || []) {
      const nextDegree = workingInDegree.get(next) - 1;
      workingInDegree.set(next, nextDegree);
      if (nextDegree === 0) queue.push(next);
    }
  }

  const cycleNodeIds = [...nodeById.keys()].filter(
    (id) => !executionOrderIds.includes(id)
  );

  if (cycleNodeIds.length > 0) {
    errors.push({
      code: 'GRAPH_CYCLE',
      nodeIds: cycleNodeIds,
      message: `Rule graph contains a cycle involving: ${cycleNodeIds.join(', ')}.`,
    });
  }

  const terminalNodeIds = [...outDegree.entries()]
    .filter(([, degree]) => degree === 0)
    .map(([id]) => id);

  const sourceNodes = nodes.filter((node) => node?.type === 'sensor');
  const actionNodes = nodes.filter((node) => ACTION_NODE_TYPES.has(node?.type));

  if (sourceNodes.length === 0 && nodes.length > 0) {
    errors.push({
      code: 'NO_SENSOR_SOURCE',
      message: 'Graph has no sensor source node; at least one sensor node is required.',
    });
  }

  if (actionNodes.length === 0 && nodes.length > 0) {
    warnings.push({
      code: 'NO_ACTION_NODE',
      message: 'Graph has no alert or webhook action node.',
    });
  }

  if (roots.length > 1) {
    warnings.push({
      code: 'MULTIPLE_ROOTS',
      nodeIds: roots,
      message: `Graph contains ${roots.length} independent root nodes.`,
    });
  }

  const executionOrder = executionOrderIds
    .map((id) => nodeById.get(id))
    .filter(Boolean)
    .map((node) => ({ id: node.id, type: node.type }));

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    executionOrder,
    roots,
    terminals: terminalNodeIds,
    stats: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      sourceNodes: sourceNodes.length,
      actionNodes: actionNodes.length,
      rootNodes: roots.length,
      terminalNodes: terminalNodeIds.length,
    },
  };
}

module.exports = {
  validateRuleGraph,
};
