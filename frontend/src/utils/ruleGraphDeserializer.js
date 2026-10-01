const SUPPORTED_NODE_TYPES = new Set([
  'sensor',
  'filter',
  'movingAverage',
  'moving_average',
  'mathOperation',
  'math',
  'threshold',
  'and',
  'or',
  'condition',
  'alert',
  'webhook',
]);

export function deserializeRuleGraph(payload = {}) {
  const warnings = [];
  const nodes = Array.isArray(payload.nodes)
    ? payload.nodes.map((node, index) => {
        const type = node?.type || 'unknown';
        if (!SUPPORTED_NODE_TYPES.has(type)) {
          warnings.push(`Unsupported node type: ${type}`);
        }
        return {
          id: node?.id || `node-${index + 1}`,
          type,
          position: {
            x: Number(node?.position?.x || 0),
            y: Number(node?.position?.y || 0),
          },
          data: { ...(node?.data || {}) },
        };
      })
    : [];

  const edges = Array.isArray(payload.edges)
    ? payload.edges.map((edge, index) => ({
        id: edge?.id || `edge-${index + 1}`,
        source: edge?.source || '',
        target: edge?.target || '',
        sourceHandle: edge?.sourceHandle ?? null,
        targetHandle: edge?.targetHandle ?? null,
        animated: edge?.animated ?? true,
        style: { ...(edge?.style || {}) },
      }))
    : [];

  return {
    graph: {
      name: String(payload.name || '').trim() || 'Saved Rule',
      description: String(payload.description || '').trim(),
      enabled: payload.enabled !== false,
      targetDeviceId: payload.targetDeviceId || 'all',
      nodes,
      edges,
      metadata: { ...(payload.metadata || {}) },
    },
    warnings,
  };
}
