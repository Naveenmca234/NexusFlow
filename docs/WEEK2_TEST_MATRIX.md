# NexusFlow Week 2 Test Matrix

This matrix maps Week 2 requirements to executable checks and review evidence.

| Area | Verification | Expected result |
| --- | --- | --- |
| Basic DAG | `test_rule_graph_validation.js` | Valid graph accepted |
| Topological order | `test_rule_graph_validation.js` | Source executes before transforms/actions |
| Dangling edge | `test_rule_graph_validation.js` | Invalid graph rejected |
| Graph cycle | `test_rule_graph_validation.js` | Cycle rejected |
| Unsupported node | `test_rule_graph_validation.js` | Unsupported type rejected |
| Self-loop | `test_week2_graph_edge_cases.js` | Self-reference rejected |
| Duplicate node ID | `test_week2_graph_edge_cases.js` | Duplicate node rejected |
| Duplicate edge ID | `test_week2_graph_edge_cases.js` | Warning generated |
| Missing sensor | `test_week2_graph_edge_cases.js` | Graph rejected |
| Missing action | `test_week2_graph_edge_cases.js` | Warning generated |
| Multiple roots | `test_week2_graph_edge_cases.js` | Diagnostic warning generated |
| Custom node library | `test_week2_node_catalog.js` | Catalog types map to compiler handlers |
| Alias resolution | `test_week2_node_catalog.js` | Legacy aliases resolve to canonical types |
| Backend normalization | `test_week2_graph_normalizer.js` | Defaults and schema normalized |
| Branched DAG | `test_week2_branching_order.js` | Parent branches precede combiner/action |
| Frontend serialization | `frontend/test_week2_serializer.js` | Canvas produces stable v1 JSON contract |
| Frontend deserialization | `frontend/test_week2_deserializer.js` | Saved graph safely restores into canvas state |

## Commands

Backend:

```powershell
cd A:\Projects\NexusFlow\backend
npm run test:week2
```

Frontend:

```powershell
cd A:\Projects\NexusFlow\frontend
npm run test:week2
```

## Manual review

1. Open **Rule Builder**.
2. Add source, transform, decision, and action nodes.
3. Connect them into a directed pipeline.
4. Open **JSON Graph** and verify the `nexusflow-rule-graph/v1` metadata.
5. Save the rule.
6. Load the saved rule and verify the canvas is restored.
7. Confirm invalid structures are rejected by validation.

Together these checks demonstrate the Week 2 Logic Compiler, custom node library, and graph serialization requirements.
