const assert = require('assert');
const { orderNodesFromGraph } = require('./engine/ruleCompiler');
const { validateRuleGraph } = require('./engine/graphValidator');

function run() {
  const graph = {
    name: 'Week 2 Branched DAG',
    nodes: [
      { id: 'sensor', type: 'sensor', data: {} },
      { id: 'temp', type: 'threshold', data: { field: 'temperature', operator: '>', threshold: 80 } },
      { id: 'rpm', type: 'threshold', data: { field: 'rpm', operator: '>', threshold: 3000 } },
      { id: 'and', type: 'and', data: {} },
      { id: 'alert', type: 'alert', data: { severity: 'critical' } },
    ],
    edges: [
      { id: 'e1', source: 'sensor', target: 'temp' },
      { id: 'e2', source: 'sensor', target: 'rpm' },
      { id: 'e3', source: 'temp', target: 'and' },
      { id: 'e4', source: 'rpm', target: 'and' },
      { id: 'e5', source: 'and', target: 'alert' },
    ],
  };

  const report = validateRuleGraph(graph);
  assert.strictEqual(report.valid, true);

  const ordered = orderNodesFromGraph(graph.nodes, graph.edges).map((node) => node.id);
  assert.strictEqual(ordered[0], 'sensor');
  assert.strictEqual(ordered[ordered.length - 1], 'alert');
  assert.ok(ordered.indexOf('temp') < ordered.indexOf('and'));
  assert.ok(ordered.indexOf('rpm') < ordered.indexOf('and'));
  assert.ok(ordered.indexOf('and') < ordered.indexOf('alert'));

  console.log('Week 2 branched DAG ordering audit passed.');
  console.log(`Execution order: ${ordered.join(' -> ')}`);
}

run();
