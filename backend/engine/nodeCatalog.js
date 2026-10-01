const NODE_CATALOG = {
  sensor: {
    label: 'Sensor',
    category: 'source',
    description: 'Telemetry stream source',
    aliases: [],
    defaults: { metric: 'temperature', interval: '5s' },
  },
  filter: {
    label: 'Filter',
    category: 'transform',
    description: 'Value threshold gate',
    aliases: [],
    defaults: { field: 'temperature', operator: '>', threshold: 50 },
  },
  movingAverage: {
    label: 'Moving Average',
    category: 'transform',
    description: 'Rolling mean window',
    aliases: ['moving_average'],
    defaults: { field: 'temperature', windowSize: 5 },
  },
  mathOperation: {
    label: 'Math Operation',
    category: 'transform',
    description: 'Arithmetic transform',
    aliases: ['math'],
    defaults: { field: 'temperature', operator: 'add', operand: 0 },
  },
  threshold: {
    label: 'Threshold',
    category: 'decision',
    description: 'Comparison gate',
    aliases: [],
    defaults: { field: 'temperature', operator: '>', threshold: 80 },
  },
  and: {
    label: 'AND Gate',
    category: 'decision',
    description: 'All incoming conditions must pass',
    aliases: [],
    defaults: { conditions: [] },
  },
  or: {
    label: 'OR Gate',
    category: 'decision',
    description: 'At least one incoming condition must pass',
    aliases: [],
    defaults: { conditions: [] },
  },
  condition: {
    label: 'Condition',
    category: 'decision',
    description: 'Conditional logic node',
    aliases: [],
    defaults: { field: 'temperature', operator: '>', threshold: 0 },
  },
  alert: {
    label: 'Alert',
    category: 'action',
    description: 'Create and broadcast an alert',
    aliases: [],
    defaults: { severity: 'warning', cooldownSeconds: 30 },
  },
  webhook: {
    label: 'Webhook',
    category: 'action',
    description: 'Dispatch an HTTP callback',
    aliases: [],
    defaults: { method: 'POST', cooldownSeconds: 10 },
  },
};

function resolveNodeType(type) {
  if (NODE_CATALOG[type]) return type;
  for (const [canonical, definition] of Object.entries(NODE_CATALOG)) {
    if (definition.aliases.includes(type)) return canonical;
  }
  return null;
}

function getNodeDefinition(type) {
  const canonical = resolveNodeType(type);
  return canonical ? { type: canonical, ...NODE_CATALOG[canonical] } : null;
}

function listNodeCatalog() {
  return Object.entries(NODE_CATALOG).map(([type, definition]) => ({
    type,
    ...definition,
  }));
}

module.exports = {
  NODE_CATALOG,
  resolveNodeType,
  getNodeDefinition,
  listNodeCatalog,
};
