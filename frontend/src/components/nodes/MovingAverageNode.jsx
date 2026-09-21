import React, { useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { TrendingUp, X } from 'lucide-react';

export default function MovingAverageNode({ id, data }) {
  const { deleteElements, setNodes } = useReactFlow();
  const [label] = useState(data.label || 'Moving Average');
  const [field, setField] = useState(data.field || 'temperature');
  const [windowSize, setWindowSize] = useState(data.windowSize ?? data.window ?? 5);

  const handleDelete = (e) => {
    e.stopPropagation();
    deleteElements({ nodes: [{ id }] });
  };

  const updateConfig = (key, val) => {
    if (key === 'field') setField(val);
    if (key === 'windowSize') setWindowSize(val);

    setNodes((nds) =>
      nds.map((node) =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                [key]: val,
                ...(key === 'windowSize' ? { window: val } : {}),
              },
            }
          : node
      )
    );
  };

  return (
    <div className="custom-flow-node node-moving-average">
      {/* Input stream on the left */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: '#f59e0b', width: 10, height: 10, border: '2px solid #0a0d14' }}
      />

      <div className="node-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <TrendingUp size={16} color="#fbbf24" />
          <span style={{ fontWeight: 600, color: '#fef08a' }}>{label}</span>
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

      <div className="node-fields nodrag" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Metric:</label>
          <select
            value={field}
            onChange={(e) => updateConfig('field', e.target.value)}
            className="node-field-select"
            style={{ padding: '0.25rem 0.5rem' }}
          >
            <option value="temperature">Temperature</option>
            <option value="pressure">Pressure</option>
            <option value="rpm">RPM</option>
            <option value="vibration">Vibration</option>
            <option value="humidity">Humidity</option>
          </select>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Window (N):</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <input
              type="number"
              min="1"
              max="100"
              value={windowSize}
              onChange={(e) => updateConfig('windowSize', Math.max(1, Number(e.target.value) || 1))}
              className="node-field-input"
              style={{ width: '60px', textAlign: 'center' }}
            />
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>samples</span>
          </div>
        </div>

        {/* Informational Sub-tag */}
        <div
          style={{
            fontSize: '0.68rem',
            color: '#fbbf24',
            background: 'rgba(245, 158, 11, 0.12)',
            padding: '0.2rem 0.4rem',
            borderRadius: '4px',
            textAlign: 'center',
            border: '1px solid rgba(245, 158, 11, 0.25)',
          }}
        >
          Rolling mean over latest {windowSize} readings
        </div>
      </div>

      {/* Output stream to the right */}
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: '#f59e0b', width: 10, height: 10, border: '2px solid #0a0d14' }}
      />
    </div>
  );
}
