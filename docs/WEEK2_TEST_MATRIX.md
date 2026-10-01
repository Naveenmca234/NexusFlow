# NexusFlow Week 2 Test Matrix

This matrix maps Week 2 requirements to executable checks and review evidence. It is designed to make the mid-project review traceable: every Week 2 feature should have either an automated check or a clear manual verification step.

## Requirement traceability

| Week 2 requirement | Implementation evidence | Verification type |
| --- | --- | --- |
| Logic Compiler converts visual graphs into executable RxJS pipelines | `backend/engine/ruleCompiler.js` | Automated compiler/graph tests |
| Graphs are validated before compilation | `backend/engine/graphValidator.js` | Automated validation tests |
| Custom Data Source nodes are supported | Sensor entries in `backend/engine/nodeCatalog.js` and frontend node library | Automated catalog test + manual canvas review |
| Custom Math Operation nodes are supported | Math entries in `backend/engine/nodeCatalog.js` and frontend node library | Automated catalog test + manual canvas review |
| Custom Action Trigger nodes are supported | Alert/Webhook entries in `backend/engine/nodeCatalog.js` and frontend node library | Automated catalog test + manual canvas review |
| React Flow graph serializes into stable backend JSON | `frontend/src/utils/ruleGraphSerializer.js` | Automated serializer test + JSON Graph modal |
| Saved graph safely restores to canvas state | `frontend/src/utils/ruleGraphDeserializer.js` | Automated deserializer test |
| Complex DAG ordering is deterministic | compiler validation + branched DAG audit | Automated branching-order test |

## Automated test matrix

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
2. Add a Sensor source node.
3. Add at least one processing node such as Filter, Moving Average, Math Operation, or Threshold.
4. Add an Action node such as Alert or Webhook.
5. Connect the nodes into a directed pipeline.
6. Open **JSON Graph** and verify the `nexusflow-rule-graph/v1` metadata, node count, and edge count.
7. Save the rule.
8. Load the saved rule and verify the canvas is restored.
9. Introduce an invalid structure such as a self-loop, unsupported node, or dangling edge and confirm validation rejects it.
10. Verify a branched graph still produces a deterministic topological execution order.

## Review pass criteria

Week 2 can be presented as review-ready when all of the following are demonstrated:

- Backend Week 2 test command completes without assertion failures.
- Frontend Week 2 serializer/deserializer tests complete without assertion failures.
- A visual Sensor -> processing/decision -> Action pipeline serializes to valid JSON.
- The saved graph can be loaded back into the visual editor.
- Invalid graph structures are blocked before RxJS compilation.
- The node library exposes the Week 2 source, math/processing, and action categories.

Together these checks demonstrate the Week 2 Logic Compiler, custom node library, and graph serialization requirements while keeping automated evidence separate from manual UI evidence.
