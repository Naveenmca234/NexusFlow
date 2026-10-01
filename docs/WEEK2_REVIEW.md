# NexusFlow Week 2 Review

## Scope

Week 2 focuses on converting the visual React Flow graph into a stable JSON representation and validating the graph before the Node.js backend compiles it into an RxJS telemetry pipeline.

## Implemented Components

### Backend Logic Compiler

- Topological ordering of rule nodes before execution.
- Validation before RxJS subscription creation.
- Detection of unsupported node types.
- Detection of dangling edges and missing endpoints.
- Detection of self-loops and cyclic graphs.
- Duplicate node-id detection.
- Sensor-source requirement.
- Warnings for duplicate edge ids, multiple roots, and graphs without an action node.
- Validation report with roots, terminal nodes, execution order, and graph statistics.

### Frontend Graph Serialization

- Shared `nexusflow-rule-graph/v1` schema.
- Stable node serialization containing only id, type, position, and data.
- Stable edge serialization with generated ids where required.
- React Flow transient UI state is excluded from the backend payload.
- Metadata records node count, edge count, schema version, and serialization time.

## Week 2 Test Commands

### Backend

```powershell
cd A:\Projects\NexusFlow\backend
npm install
npm run test:week2
```

Expected result:

```text
Week 2 rule graph validation audit passed.
Week 2 graph edge-case audit passed.
```

### Frontend Serializer

```powershell
cd A:\Projects\NexusFlow\frontend
npm install
npm run test:week2
```

Expected result:

```text
Week 2 frontend graph serializer audit passed.
```

## Visual Review Flow

1. Start the backend and frontend.
2. Sign in to NexusFlow.
3. Open **Rule Builder**.
4. Create or inspect a flow such as:

```text
Sensor -> Filter -> Condition -> Alert
```

5. Open **JSON Graph**.
6. Confirm the payload contains the graph nodes, graph edges, and `nexusflow-rule-graph/v1` metadata.
7. Save the rule and load it again from **Load Saved Graph**.

## Review Evidence

A successful Week 2 review demonstrates both sides of the feature:

- The browser accurately serializes a visual rule graph into JSON.
- The backend rejects invalid graph structures before creating the RxJS execution pipeline.

This keeps the visual rule builder and the runtime compiler aligned under one predictable graph contract.
