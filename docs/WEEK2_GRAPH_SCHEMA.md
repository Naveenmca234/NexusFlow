# NexusFlow Week 2 Graph Schema

NexusFlow serializes the React Flow canvas into a stable JSON contract identified as `nexusflow-rule-graph/v1`.

## Top-level fields

| Field | Purpose |
| --- | --- |
| `name` | Human-readable rule name |
| `description` | Rule objective or explanation |
| `enabled` | Whether the rule is eligible for compilation |
| `targetDeviceId` | Device scope, or `all` for fleet-wide execution |
| `nodes` | Ordered-independent React Flow node definitions |
| `edges` | Directed connections between node IDs |
| `metadata.schema` | Graph contract version |
| `metadata.totalNodes` | Serialized node count |
| `metadata.totalEdges` | Serialized edge count |

## Node shape

```json
{
  "id": "threshold-1",
  "type": "threshold",
  "position": { "x": 500, "y": 180 },
  "data": {
    "field": "temperature",
    "operator": ">",
    "threshold": 80
  }
}
```

## Edge shape

```json
{
  "id": "edge-1",
  "source": "sensor-1",
  "target": "threshold-1",
  "sourceHandle": null,
  "targetHandle": null,
  "animated": true,
  "style": {}
}
```

## Backend validation rules

Before RxJS compilation, the graph validator checks:

- every node has a unique ID;
- every node type is supported by the compiler;
- every edge references existing source and target nodes;
- self-loops are rejected;
- directed cycles are rejected;
- at least one sensor source is present;
- missing action nodes are reported as warnings;
- duplicate edge IDs and multiple roots are surfaced as diagnostics.

## Execution ordering

The compiler performs topological ordering over the directed graph. A simple graph may execute as:

`Sensor -> Moving Average -> Math Operation -> Threshold -> Alert`

A branched graph may contain multiple decision paths, but a downstream AND/OR node is ordered only after its parent branches.

## Week 2 review evidence

The graph contract can be inspected from the Visual Rule Builder using the **JSON Graph** action. The backend audits the same structure before activating the RxJS pipeline.
