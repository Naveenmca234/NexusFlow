import assert from 'node:assert/strict';
import { deserializeRuleGraph } from './src/utils/ruleGraphDeserializer.js';

const { graph, warnings } = deserializeRuleGraph({
  name: '  Saved Thermal Rule  ',
  description: '  load from JSON  ',
  enabled: true,
  targetDeviceId: 'DEV-TH-102',
  nodes: [
    { id: 's1', type: 'sensor', position: { x: '15', y: '25' }, data: { metric: 'temperature' } },
    { id: 'a1', type: 'alert', data: { severity: 'critical' } },
  ],
  edges: [{ source: 's1', target: 'a1' }],
  metadata: { schema: 'nexusflow-rule-graph/v1' },
});

assert.equal(graph.name, 'Saved Thermal Rule');
assert.equal(graph.description, 'load from JSON');
assert.equal(graph.targetDeviceId, 'DEV-TH-102');
assert.equal(graph.nodes.length, 2);
assert.equal(graph.nodes[0].position.x, 15);
assert.equal(graph.nodes[0].position.y, 25);
assert.equal(graph.edges[0].id, 'edge-1');
assert.equal(graph.edges[0].animated, true);
assert.equal(graph.metadata.schema, 'nexusflow-rule-graph/v1');
assert.deepEqual(warnings, []);

const unsupported = deserializeRuleGraph({
  nodes: [{ id: 'x1', type: 'customUnknown', data: {} }],
  edges: [],
});
assert.equal(unsupported.warnings.length, 1);
assert.match(unsupported.warnings[0], /Unsupported node type/);

console.log('Week 2 graph deserializer audit passed.');
