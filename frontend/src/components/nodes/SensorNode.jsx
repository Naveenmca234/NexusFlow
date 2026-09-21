import React, { useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Cpu, X } from 'lucide-react';

export default function SensorNode({ id, data }) {
  const { deleteElements, setNodes } = useReactFlow();
  const [label] = useState(data.label || 'Sensor Input');
  const [metric, setMetric] = useState(data.metric || 'temperature');
  const [interval, setIntervalVal] = useState(data.interval || '2s');

  const handleDelete = (e) => {
    e.stopPropagation();
    deleteElements({ nodes: [{ id }] });
  };

  const updateConfig = (key, val) => {
    if (key === 'metric') setMetric(val);
    if (key === 'interval') setIntervalVal(val);
    setNodes((nds) =>
      nds.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, [key]: val } } : node
      )
    );
  };

  return (
    <div className="custom-flow-node node-sensor">
      <div className="node-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Cpu size={16} color="#38bdf8" />
          <span style={{ fontWeight: 600 }}>{label}</span>
        </div>
        <button
          className="node-delete-btn nodrag"
          onClick={handleDelete}
          title="Delete Node"
          aria-label="Delete Node"
        >
          <X size={13} />
        </button>
      </div>

      <div className="node-fields nodrag" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Metric:</label>
          <select
            value={metric}
            onChange={(e) => updateConfig('metric', e.target.value)}
            className="node-field-select"
          >
            <option value="temperature">Temperature (°C)</option>
            <option value="humidity">Humidity (%)</option>
            <option value="pressure">Pressure (hPa)</option>
            <option value="vibration">Vibration (G)</option>
          </select>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Interval:</label>
          <select
            value={interval}
            onChange={(e) => updateConfig('interval', e.target.value)}
            className="node-field-select"
          >
            <option value="1s">1 second</option>
            <option value="2s">2 seconds</option>
            <option value="5s">5 seconds</option>
            <option value="10s">10 seconds</option>
          </select>
        </div>
      </div>

      {/* Sensor emits telemetry to the right */}
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: '#06b6d4', width: 10, height: 10, border: '2px solid #0a0d14' }}
      />
    </div>
  );
}
