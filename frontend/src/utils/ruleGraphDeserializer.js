export const RULE_GRAPH_SCHEMA = 'nexusflow-rule-graph/v1';

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

function toFiniteNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Convert a persisted Week 2 rule graph back into safe React Flow state.
 *
 * The deserializer deliberately repairs malformed presentation-only fields
 * (missing ids/positions) while refusing unsafe edges that would reference
 * missing nodes. Semantic validation still belongs to the backend validator.
 */
export function deserializeRuleGraph(payload = {}) {
  const warnings = [];
  const seenNodeIds = new Set();
  let repairedNodeIds = 0;
  let repairedEdgeIds = 0;
  let droppedEdges = 0;

  const nodes = Array.isArray(payload.nodes)
    ? payload.nodes.map((node, index) => {
        const type = node?.type || 'unknown';
        if (!SUPPORTED_NODE_TYPES.has(type)) {
          warnings.push(`Unsupported node type: ${type}`);
        }

        const requestedId = String(node?.id || `node-${index + 1}`);
        let id = requestedId;
        let suffix = 2;
        while (seenNodeIds.has(id)) {
          id = `${requestedId}-${suffix++}`;
        }
        if (id !== requestedId) {
          repairedNodeIds += 1;
          warnings.push(`Duplicate node id "${requestedId}" was restored as "${id}".`);
        }
        seenNodeIds.add(id);

        return {
          id,
          type,
          position: {
            x: toFiniteNumber(node?.position?.x),
            y: toFiniteNumber(node?.position?.y),
          },
          data: { ...(node?.data || {}) },
        };
      })
    : [];

  const validNodeIds = new Set(nodes.map((node) => node.id));
  const seenEdgeIds = new Set();
  const edges = [];

  if (Array.isArray(payload.edges)) {
    payload.edges.forEach((edge, index) => {
      const source = String(edge?.source || '');
      const target = String(edge?.target || '');

      if (!source || !target) {
        droppedEdges += 1;
        warnings.push(`Edge #${index + 1} was skipped because source or target is missing.`);
        return;
      }

      if (!validNodeIds.has(source) || !validNodeIds.has(target)) {
        droppedEdges += 1;
        warnings.push(`Edge #${index + 1} was skipped because it references a missing node.`);
        return;
      }

      if (source === target) {
        droppedEdges += 1;
        warnings.push(`Edge #${index + 1} was skipped because self-loops are not safe to restore.`);
        return;
      }

      const requestedId = String(edge?.id || `edge-${index + 1}`);
      let id = requestedId;
      let suffix = 2;
      while (seenEdgeIds.has(id)) {
        id = `${requestedId}-${suffix++}`;
      }
      if (id !== requestedId) {
        repairedEdgeIds += 1;
        warnings.push(`Duplicate edge id "${requestedId}" was restored as "${id}".`);
      }
      seenEdgeIds.add(id);

      edges.push({
        id,
        source,
        target,
        sourceHandle: edge?.sourceHandle ?? null,
        targetHandle: edge?.targetHandle ?? null,
        animated: edge?.animated ?? true,
        style: { ...(edge?.style || {}) },
      });
    });
  }

  const schema = payload?.metadata?.schema;
  if (schema && schema !== RULE_GRAPH_SCHEMA) {
    warnings.push(`Graph schema "${schema}" differs from supported schema "${RULE_GRAPH_SCHEMA}".`);
  }

  const targetDeviceId = String(payload.targetDeviceId || 'all').trim() || 'all';

  return {
    graph: {
      name: String(payload.name || '').trim() || 'Saved Rule',
      description: String(payload.description || '').trim(),
      enabled: payload.enabled !== false,
      targetDeviceId,
      nodes,
      edges,
      metadata: {
        ...(payload.metadata || {}),
        schema: schema || RULE_GRAPH_SCHEMA,
        totalNodes: nodes.length,
        totalEdges: edges.length,
      },
    },
    warnings,
    diagnostics: {
      restoredNodes: nodes.length,
      restoredEdges: edges.length,
      repairedNodeIds,
      repairedEdgeIds,
      droppedEdges,
      warningCount: warnings.length,
    },
  };
}
