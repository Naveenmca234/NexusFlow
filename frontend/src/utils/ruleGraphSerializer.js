export const RULE_GRAPH_SCHEMA = 'nexusflow-rule-graph/v1';

/**
 * Convert React Flow state into the stable JSON contract consumed by the
 * Node.js/RxJS rule compiler. Keeping this in one place prevents the canvas UI
 * from leaking React Flow-only fields into the backend payload.
 */
export function serializeRuleGraph({
  name,
  description = '',
  enabled = true,
  targetDeviceId = 'all',
  nodes = [],
  edges = [],
}) {
  const serializedNodes = nodes.map((node) => ({
    id: node.id,
    type: node.type,
    position: {
      x: Number(node.position?.x || 0),
      y: Number(node.position?.y || 0),
    },
    data: { ...(node.data || {}) },
  }));

  const serializedEdges = edges.map((edge, index) => ({
    id: edge.id || `edge-${index + 1}`,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle ?? null,
    targetHandle: edge.targetHandle ?? null,
    animated: edge.animated ?? true,
    style: { ...(edge.style || {}) },
  }));

  return {
    name: String(name || '').trim() || 'Untitled Rule Graph',
    description: String(description || '').trim(),
    enabled: Boolean(enabled),
    targetDeviceId: targetDeviceId || 'all',
    nodes: serializedNodes,
    edges: serializedEdges,
    metadata: {
      schema: RULE_GRAPH_SCHEMA,
      totalNodes: serializedNodes.length,
      totalEdges: serializedEdges.length,
      serializedAt: new Date().toISOString(),
    },
  };
}
