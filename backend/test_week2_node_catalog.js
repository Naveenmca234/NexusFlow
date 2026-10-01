const assert = require('assert');
const { NODE_HANDLERS } = require('./engine/nodeHandlers');
const {
  listNodeCatalog,
  resolveNodeType,
  getNodeDefinition,
} = require('./engine/nodeCatalog');

function run() {
  const catalog = listNodeCatalog();
  assert.ok(catalog.length >= 10, 'Expected full Week 2 node library');

  for (const item of catalog) {
    assert.ok(item.label, `Missing label for ${item.type}`);
    assert.ok(item.category, `Missing category for ${item.type}`);
    assert.ok(item.description, `Missing description for ${item.type}`);
    assert.ok(item.defaults && typeof item.defaults === 'object');
    assert.strictEqual(typeof NODE_HANDLERS[item.type], 'function', `Missing compiler handler for ${item.type}`);
  }

  assert.strictEqual(resolveNodeType('moving_average'), 'movingAverage');
  assert.strictEqual(resolveNodeType('math'), 'mathOperation');
  assert.strictEqual(resolveNodeType('unknown'), null);

  const alert = getNodeDefinition('alert');
  assert.strictEqual(alert.category, 'action');
  assert.strictEqual(alert.defaults.severity, 'warning');

  console.log('Week 2 node catalog audit passed.');
  console.log(`Validated ${catalog.length} canonical visual rule node definitions.`);
}

run();
