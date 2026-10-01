import assert from 'node:assert/strict';
import {
  RULE_GRAPH_SCHEMA,
  deserializeRuleGraph,
} from './src/utils/ruleGraphDeserializer.js';

const { graph, warnings, diagnostics } = deserializeRuleGraph({
  name: '  Saved Thermal Rule  ',
  description: '  load from JSON  ',
  enabled: true,
  targetDeviceId: 'DEV-TH-102',
  nodes: [
    { id: 's1', type: 'sensor', position: { x: '15', y: '25' }, data: { metric: 'temperature' } },
    { id: 'a1', type: 'alert', data: { severity: 'critical' } },
  ],
  edges: [{ source: 's1', target: 'a1' }],
  metadata: { schema: RULE_GRAPH_SCHEMA },
});

assert.equal(graph.name, 'Saved Thermal Rule');
assert.equal(graph.description, 'load from JSON');
assert.equal(graph.targetDeviceId, 'DEV-TH-102');
assert.equal(graph.nodes.length, 2);
assert.equal(graph.nodes[0].position.x, 15);
assert.equal(graph.nodes[0].position.y, 25);
assert.equal(graph.edges[0].id, 'edge-1');
assert.equal(graph.edges[0].animated, true);
assert.equal(graph.metadata.schema, RULE_GRAPH_SCHEMA);
assert.deepEqual(warnings, []);
assert.deepEqual(diagnostics, {
  restoredNodes: 2,
  restoredEdges: 1,
  repairedNodeIds: 0,
  droppedEdges: 0,
});

const unsafe = deserializeRuleGraph({
  nodes: [
    { id: 's1', type: 'sensor', position: { x: 'not-a-number', y: 10 } },
    { id: 's1', type: 'alert', position: { x: 50, y: 60 } },
    { id: 'x1', type: 'customUnknown', data: {} },
  ],
  edges: [
    { id: 'edge-a', source: 's1', target: 'missing' },
    { id: 'edge-b', source: 's1', target: 's1' },
    { id: 'edge-c', source: '', target: 's1' },
    { id: 'edge-d', source: 's1', target: 's1-2' },
    { id: 'edge-d', source: 's1-2', target: 'x1' },
  ],
  metadata: { schema: 'legacy-rule-graph/v0' },
});

assert.equal(unsafe.graph.nodes[0].position.x, 0);
assert.equal(unsafe.graph.nodes[1].id, 's1-2');
assert.equal(unsafe.graph.edges.length, 2);
assert.equal(unsafe.graph.edges[0].id, 'edge-d');
assert.equal(unsafe.graph.edges[1].id, 'edge-d-2');
assert.equal(unsafe.diagnostics.repairedNodeIds, 1);
assert.equal(unsafe.diagnostics.droppedEdges, 3);
assert.ok(unsafe.warnings.some((message) => message.includes('Unsupported node type')));
assert.ok(unsafe.warnings.some((message) => message.includes('Duplicate node id')));
assert.ok(unsafe.warnings.some((message) => message.includes('missing node')));
assert.ok(unsafe.warnings.some((message) => message.includes('self-loops')));
assert.ok(unsafe.warnings.some((message) => message.includes('source or target is missing')));
assert.ok(unsafe.warnings.some((message) => message.includes('Duplicate edge id')));
assert.ok(unsafe.warnings.some((message) => message.includes('differs from supported schema')));

console.log('Week 2 graph deserializer audit passed.');
console.log('Verified safe restoration, duplicate-id repair, invalid-edge filtering, and schema diagnostics.');
