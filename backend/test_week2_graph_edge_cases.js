const assert = require('assert');
const { validateRuleGraph } = require('./engine/graphValidator');

function baseGraph() {
  return {
    name: 'Week 2 Edge Case Audit',
    nodes: [
      { id: 'sensor-a', type: 'sensor', data: { deviceId: 'all' } },
      { id: 'threshold-a', type: 'threshold', data: { field: 'temperature', operator: '>', threshold: 80 } },
      { id: 'alert-a', type: 'alert', data: { severity: 'critical' } },
    ],
    edges: [
      { id: 'edge-1', source: 'sensor-a', target: 'threshold-a' },
      { id: 'edge-2', source: 'threshold-a', target: 'alert-a' },
    ],
  };
}

function hasCode(items, code) {
  return items.some((item) => item.code === code);
}

function run() {
  const valid = validateRuleGraph(baseGraph());
  assert.strictEqual(valid.valid, true);
  assert.deepStrictEqual(valid.roots, ['sensor-a']);
  assert.deepStrictEqual(valid.terminals, ['alert-a']);

  const selfLoop = baseGraph();
  selfLoop.edges.push({ id: 'edge-loop', source: 'threshold-a', target: 'threshold-a' });
  const selfLoopReport = validateRuleGraph(selfLoop);
  assert.strictEqual(selfLoopReport.valid, false);
  assert.ok(hasCode(selfLoopReport.errors, 'SELF_LOOP'));

  const duplicateNode = baseGraph();
  duplicateNode.nodes.push({ id: 'threshold-a', type: 'filter', data: {} });
  const duplicateNodeReport = validateRuleGraph(duplicateNode);
  assert.strictEqual(duplicateNodeReport.valid, false);
  assert.ok(hasCode(duplicateNodeReport.errors, 'DUPLICATE_NODE_ID'));

  const duplicateEdge = baseGraph();
  duplicateEdge.edges.push({ id: 'edge-2', source: 'sensor-a', target: 'alert-a' });
  const duplicateEdgeReport = validateRuleGraph(duplicateEdge);
  assert.strictEqual(duplicateEdgeReport.valid, true);
  assert.ok(hasCode(duplicateEdgeReport.warnings, 'DUPLICATE_EDGE_ID'));

  const missingAction = baseGraph();
  missingAction.nodes = missingAction.nodes.filter((node) => node.id !== 'alert-a');
  missingAction.edges = missingAction.edges.filter((edge) => edge.target !== 'alert-a');
  const missingActionReport = validateRuleGraph(missingAction);
  assert.strictEqual(missingActionReport.valid, true);
  assert.ok(hasCode(missingActionReport.warnings, 'NO_ACTION_NODE'));

  const multipleRoots = baseGraph();
  multipleRoots.nodes.push({ id: 'sensor-b', type: 'sensor', data: { deviceId: 'DEV-TH-102' } });
  const multipleRootsReport = validateRuleGraph(multipleRoots);
  assert.strictEqual(multipleRootsReport.valid, true);
  assert.ok(hasCode(multipleRootsReport.warnings, 'MULTIPLE_ROOTS'));

  const noSensor = baseGraph();
  noSensor.nodes = noSensor.nodes.filter((node) => node.type !== 'sensor');
  noSensor.edges = noSensor.edges.filter((edge) => edge.source !== 'sensor-a');
  const noSensorReport = validateRuleGraph(noSensor);
  assert.strictEqual(noSensorReport.valid, false);
  assert.ok(hasCode(noSensorReport.errors, 'NO_SENSOR_SOURCE'));

  console.log('Week 2 graph edge-case audit passed.');
  console.log('Checks: self-loop, duplicate node, duplicate edge, no action, multiple roots, no sensor.');
}

run();
