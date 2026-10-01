import assert from 'node:assert/strict';
import { RULE_GRAPH_SCHEMA, serializeRuleGraph } from './src/utils/ruleGraphSerializer.js';

const graph = serializeRuleGraph({
  name: '  Thermal Spike Pipeline  ',
  description: '  Week 2 serializer audit  ',
  targetDeviceId: 'DEV-TH-102',
  nodes: [
    {
      id: 'sensor-1',
      type: 'sensor',
      position: { x: 10.5, y: 20.25 },
      data: { metric: 'temperature' },
      selected: true,
      dragging: true,
    },
    {
      id: 'alert-1',
      type: 'alert',
      position: { x: 300, y: 20 },
      data: { severity: 'critical' },
    },
  ],
  edges: [
    {
      source: 'sensor-1',
      target: 'alert-1',
      animated: false,
      sourceHandle: undefined,
      targetHandle: undefined,
      style: { strokeWidth: 2 },
      selected: true,
    },
  ],
});

assert.equal(graph.name, 'Thermal Spike Pipeline');
assert.equal(graph.description, 'Week 2 serializer audit');
assert.equal(graph.targetDeviceId, 'DEV-TH-102');
assert.equal(graph.metadata.schema, RULE_GRAPH_SCHEMA);
assert.equal(graph.metadata.totalNodes, 2);
assert.equal(graph.metadata.totalEdges, 1);
assert.ok(!Number.isNaN(Date.parse(graph.metadata.serializedAt)));

assert.deepEqual(Object.keys(graph.nodes[0]).sort(), ['data', 'id', 'position', 'type']);
assert.equal(graph.nodes[0].position.x, 10.5);
assert.equal(graph.nodes[0].position.y, 20.25);
assert.equal(graph.nodes[0].selected, undefined);
assert.equal(graph.nodes[0].dragging, undefined);

assert.equal(graph.edges[0].id, 'edge-1');
assert.equal(graph.edges[0].animated, false);
assert.equal(graph.edges[0].sourceHandle, null);
assert.equal(graph.edges[0].targetHandle, null);
assert.equal(graph.edges[0].selected, undefined);

const defaults = serializeRuleGraph({
  name: '   ',
  nodes: [{ id: 'sensor-default', type: 'sensor', position: {}, data: {} }],
  edges: [],
});

assert.equal(defaults.name, 'Untitled Rule Graph');
assert.equal(defaults.targetDeviceId, 'all');
assert.equal(defaults.nodes[0].position.x, 0);
assert.equal(defaults.nodes[0].position.y, 0);

console.log('Week 2 frontend graph serializer audit passed.');
console.log(`Schema: ${RULE_GRAPH_SCHEMA} | Nodes: ${graph.metadata.totalNodes} | Edges: ${graph.metadata.totalEdges}`);
