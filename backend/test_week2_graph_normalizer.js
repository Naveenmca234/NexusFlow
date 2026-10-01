const assert = require('assert');
const { normalizeRuleGraph } = require('./engine/graphNormalizer');

function run() {
  const normalized = normalizeRuleGraph({
    name: '  Normalize Demo  ',
    description: '  Week 2 graph normalization  ',
    enabled: true,
    nodes: [
      { id: 's1', type: 'sensor', position: { x: '10', y: '20' }, data: {} },
      { id: 'm1', type: 'moving_average', data: { windowSize: 8 } },
      { id: 'a1', type: 'alert', data: { severity: 'critical' } },
    ],
    edges: [
      { source: 's1', target: 'm1' },
      { id: 'e2', source: 'm1', target: 'a1', animated: false },
    ],
  });

  assert.strictEqual(normalized.name, 'Normalize Demo');
  assert.strictEqual(normalized.description, 'Week 2 graph normalization');
  assert.strictEqual(normalized.nodes[0].position.x, 10);
  assert.strictEqual(normalized.nodes[0].position.y, 20);
  assert.strictEqual(normalized.nodes[1].type, 'movingAverage');
  assert.strictEqual(normalized.nodes[1].data.windowSize, 8);
  assert.strictEqual(normalized.edges[0].id, 'edge-1');
  assert.strictEqual(normalized.edges[0].animated, true);
  assert.strictEqual(normalized.edges[1].animated, false);
  assert.strictEqual(normalized.metadata.schema, 'nexusflow-rule-graph/v1');
  assert.strictEqual(normalized.metadata.totalNodes, 3);
  assert.strictEqual(normalized.metadata.totalEdges, 2);

  console.log('Week 2 graph normalizer audit passed.');
}

run();
