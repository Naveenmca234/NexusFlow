const assert = require('assert');
const {
  validateRuleGraph,
  orderNodesFromGraph,
} = require('./engine/ruleCompiler');

function makeValidGraph() {
  return {
    name: 'Week 2 Compiler Audit',
    nodes: [
      { id: 'sensor-1', type: 'sensor', data: { deviceId: 'all' } },
      { id: 'avg-1', type: 'movingAverage', data: { field: 'temperature', windowSize: 5 } },
      { id: 'math-1', type: 'mathOperation', data: { field: 'temperature', operator: 'add', operand: 2 } },
      { id: 'threshold-1', type: 'threshold', data: { field: 'temperature', operator: '>', threshold: 80 } },
      { id: 'alert-1', type: 'alert', data: { severity: 'critical' } },
    ],
    edges: [
      { id: 'e1', source: 'sensor-1', target: 'avg-1' },
      { id: 'e2', source: 'avg-1', target: 'math-1' },
      { id: 'e3', source: 'math-1', target: 'threshold-1' },
      { id: 'e4', source: 'threshold-1', target: 'alert-1' },
    ],
  };
}

function run() {
  const validGraph = makeValidGraph();
  const validReport = validateRuleGraph(validGraph);

  assert.strictEqual(validReport.valid, true, 'Expected valid graph to pass');
  assert.strictEqual(validReport.stats.totalNodes, 5);
  assert.strictEqual(validReport.stats.totalEdges, 4);
  assert.deepStrictEqual(
    validReport.executionOrder.map((node) => node.id),
    ['sensor-1', 'avg-1', 'math-1', 'threshold-1', 'alert-1']
  );

  const ordered = orderNodesFromGraph(validGraph.nodes, validGraph.edges);
  assert.deepStrictEqual(
    ordered.map((node) => node.id),
    ['sensor-1', 'avg-1', 'math-1', 'threshold-1', 'alert-1']
  );

  const danglingReport = validateRuleGraph({
    ...validGraph,
    edges: [...validGraph.edges, { id: 'broken', source: 'sensor-1', target: 'missing-node' }],
  });
  assert.strictEqual(danglingReport.valid, false);
  assert.ok(danglingReport.errors.some((item) => item.code === 'DANGLING_EDGE'));

  const cycleReport = validateRuleGraph({
    ...validGraph,
    edges: [...validGraph.edges, { id: 'cycle', source: 'alert-1', target: 'sensor-1' }],
  });
  assert.strictEqual(cycleReport.valid, false);
  assert.ok(cycleReport.errors.some((item) => item.code === 'GRAPH_CYCLE'));

  const unsupportedReport = validateRuleGraph({
    ...validGraph,
    nodes: [...validGraph.nodes, { id: 'mystery-1', type: 'unknownNode', data: {} }],
  });
  assert.strictEqual(unsupportedReport.valid, false);
  assert.ok(
    unsupportedReport.errors.some((item) => item.code === 'UNSUPPORTED_NODE_TYPE')
  );

  console.log('Week 2 rule graph validation audit passed.');
  console.log(
    JSON.stringify(
      {
        validGraph: validReport.stats,
        executionOrder: validReport.executionOrder,
        checks: ['valid DAG', 'topological order', 'dangling edge', 'cycle', 'unsupported node'],
      },
      null,
      2
    )
  );
}

run();
