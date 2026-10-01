# NexusFlow Week 2 Custom Node Library

The Week 2 frontend exposes a visual node library for building IoT rule pipelines without hardcoding business logic.

## Source

### Sensor
Starts a telemetry pipeline and scopes incoming events to a device or fleet.

## Transform nodes

### Filter
Passes telemetry only when a configured field satisfies a comparison.

### Moving Average
Calculates a rolling average across the latest configured number of telemetry samples.

### Math Operation
Applies add, subtract, multiply, or divide transformations to a selected metric.

## Decision nodes

### Threshold
Evaluates numeric telemetry with `>`, `<`, `>=`, `<=`, `==`, and `!=` operators.

### AND Gate
Requires all evaluated parent conditions or configured conditions to pass.

### OR Gate
Allows the pipeline to continue when at least one evaluated condition passes.

### Condition
Provides an additional configurable decision stage in the visual pipeline.

## Action nodes

### Alert
Creates an incident alert, applies cooldown protection, and broadcasts the result to connected clients.

### Webhook
Dispatches an HTTP callback when the upstream rule evaluates successfully.

## Canonical aliases

For backward compatibility, the compiler recognizes:

- `moving_average` as `movingAverage`
- `math` as `mathOperation`

The backend node catalog records canonical node types, categories, descriptions, defaults, and aliases so the Week 2 node library can be audited consistently.

## Example rule

```text
Sensor
  -> Moving Average
  -> Math Operation
  -> Threshold
  -> Alert
```

## Week 2 goal

This node library satisfies the project requirement to provide custom UI nodes for **Data Sources**, **Math Operations**, and **Action Triggers**, while also supporting filtering and compound decision logic for richer rule graphs.
