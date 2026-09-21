const { NODE_HANDLERS } = require('./nodeHandlers');

/**
 * Topologically order nodes based on edges (Source -> Target sequence)
 * e.g., Sensor -> Filter -> Condition -> Alert
 */
function orderNodesFromGraph(nodes = [], edges = []) {
  if (nodes.length === 0) return [];

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const adjacency = new Map();
  const inDegree = new Map();

  for (const node of nodes) {
    adjacency.set(node.id, []);
    inDegree.set(node.id, 0);
  }

  for (const edge of edges) {
    if (adjacency.has(edge.source) && inDegree.has(edge.target)) {
      adjacency.get(edge.source).push(edge.target);
      inDegree.set(edge.target, inDegree.get(edge.target) + 1);
    }
  }

  // Find root nodes (no incoming edges, typically Sensor nodes)
  const queue = [];
  for (const [id, degree] of inDegree.entries()) {
    if (degree === 0) queue.push(id);
  }

  const ordered = [];
  while (queue.length > 0) {
    const currentId = queue.shift();
    const node = nodeMap.get(currentId);
    if (node) ordered.push(node);

    for (const neighbor of adjacency.get(currentId) || []) {
      const nextDegree = inDegree.get(neighbor) - 1;
      inDegree.set(neighbor, nextDegree);
      if (nextDegree === 0) {
        queue.push(neighbor);
      }
    }
  }

  // If any unvisited nodes remain (e.g. disconnected nodes), append them
  for (const node of nodes) {
    if (!ordered.some((n) => n.id === node.id)) {
      ordered.push(node);
    }
  }

  return ordered;
}

/**
 * Compile a saved React Flow JSON graph into an active RxJS Observable pipeline
 * @param {Object} ruleGraph - The saved rule object
 * @param {import('rxjs').Observable} telemetrySource$ - Telemetry event stream
 * @returns {Object|null} Active compiled pipeline metadata
 */
function compileRuleGraph(ruleGraph, telemetrySource$) {
  if (!ruleGraph || !ruleGraph.nodes || ruleGraph.nodes.length === 0) {
    return null;
  }

  const ruleContext = {
    _id: ruleGraph._id || ruleGraph.id,
    name: ruleGraph.name || 'Untitled Rule',
    targetDeviceId: ruleGraph.targetDeviceId || 'all',
    cooldownSeconds: ruleGraph.cooldownSeconds !== undefined ? Number(ruleGraph.cooldownSeconds) : undefined,
  };

  // Order nodes by execution flow (Sensor -> Filter -> Condition -> Alert)
  const orderedNodes = orderNodesFromGraph(ruleGraph.nodes, ruleGraph.edges || []);
  const graphContext = {
    nodes: ruleGraph.nodes || [],
    edges: ruleGraph.edges || [],
  };
  const operators = [];

  for (const node of orderedNodes) {
    const handlerFactory = NODE_HANDLERS[node.type];
    if (typeof handlerFactory === 'function') {
      const op = handlerFactory(node, ruleContext, graphContext);
      if (op) operators.push(op);
    } else {
      console.warn(`[RuleCompiler] Unknown node type: "${node.type}". Skipping.`);
    }
  }

  if (operators.length === 0) {
    console.warn(`[RuleCompiler] No executable operators generated for rule: "${ruleContext.name}"`);
    return null;
  }

  // Construct the RxJS pipeline
  const compiledPipeline$ = telemetrySource$.pipe(...operators);

  // Subscribe to activate the rule
  const subscription = compiledPipeline$.subscribe({
    next: (val) => {
      // Rule successfully evaluated and executed
    },
    error: (err) => {
      console.error(`[Rule Pipeline Error] in rule "${ruleContext.name}":`, err);
    },
  });

  return {
    ruleId: ruleContext._id,
    ruleName: ruleContext.name,
    orderedNodes: orderedNodes.map((n) => ({ id: n.id, type: n.type })),
    subscription,
    unsubscribe: () => subscription.unsubscribe(),
  };
}

module.exports = {
  compileRuleGraph,
  orderNodesFromGraph,
};
