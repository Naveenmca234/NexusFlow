const { resolveNodeType, getNodeDefinition } = require('./nodeCatalog');

function normalizeRuleGraph(ruleGraph = {}) {
  const sourceNodes = Array.isArray(ruleGraph.nodes) ? ruleGraph.nodes : [];
  const sourceEdges = Array.isArray(ruleGraph.edges) ? ruleGraph.edges : [];

  const nodes = sourceNodes.map((node, index) => {
    const resolvedType = resolveNodeType(node?.type) || node?.type || 'unknown';
    const definition = getNodeDefinition(resolvedType);
    return {
      id: node?.id || `node-${index + 1}`,
      type: resolvedType,
      position: {
        x: Number(node?.position?.x || 0),
        y: Number(node?.position?.y || 0),
      },
      data: {
        ...(definition?.defaults || {}),
        ...(node?.data || {}),
      },
    };
  });

  const edges = sourceEdges.map((edge, index) => ({
    id: edge?.id || `edge-${index + 1}`,
    source: edge?.source || null,
    target: edge?.target || null,
    sourceHandle: edge?.sourceHandle ?? null,
    targetHandle: edge?.targetHandle ?? null,
    animated: edge?.animated ?? true,
    style: edge?.style && typeof edge.style === 'object' ? { ...edge.style } : {},
  }));

  return {
    ...ruleGraph,
    name: String(ruleGraph.name || '').trim() || 'Untitled Rule Graph',
    description: String(ruleGraph.description || '').trim(),
    enabled: ruleGraph.enabled !== false,
    targetDeviceId: ruleGraph.targetDeviceId || 'all',
    nodes,
    edges,
    metadata: {
      ...(ruleGraph.metadata || {}),
      schema: ruleGraph.metadata?.schema || 'nexusflow-rule-graph/v1',
      totalNodes: nodes.length,
      totalEdges: edges.length,
    },
  };
}

module.exports = { normalizeRuleGraph };
