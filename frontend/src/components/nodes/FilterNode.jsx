import React, { useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Filter, X } from 'lucide-react';

export default function FilterNode({ id, data }) {
  const { deleteElements, setNodes } = useReactFlow();
  const [label] = useState(data.label || 'Threshold Filter');
  const [field, setField] = useState(data.field || 'temperature');
  const [operator, setOperator] = useState(data.operator || '>');
  const [threshold, setThreshold] = useState(data.threshold ?? 32);

  const handleDelete = (e) => {
    e.stopPropagation();
    deleteElements({ nodes: [{ id }] });
  };

  const updateConfig = (key, val) => {
    if (key === 'field') setField(val);
    if (key === 'operator') setOperator(val);
    if (key === 'threshold') setThreshold(val);
    setNodes((nds) =>
      nds.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, [key]: val } } : node
      )
    );
  };

  return (
    <div className="custom-flow-node node-filter">
      {/* Input stream on the left */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: '#8b5cf6', width: 10, height: 10, border: '2px solid #0a0d14' }}
      />

      <div className="node-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Filter size={16} color="#c084fc" />
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
          <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Field:</label>
          <select
            value={field}
            onChange={(e) => updateConfig('field', e.target.value)}
            className="node-field-select"
          >
            <option value="temperature">Temperature</option>
            <option value="humidity">Humidity</option>
            <option value="pressure">Pressure</option>
            <option value="vibration">Vibration</option>
          </select>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Condition:</label>
          <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
            <select
              value={operator}
              onChange={(e) => updateConfig('operator', e.target.value)}
              className="node-field-select"
              style={{ width: '45px' }}
            >
              <option value=">">&gt;</option>
              <option value=">=">&gt;=</option>
              <option value="<">&lt;</option>
              <option value="<=">&lt;=</option>
              <option value="==">==</option>
            </select>
            <input
              type="number"
              value={threshold}
              onChange={(e) => updateConfig('threshold', Number(e.target.value))}
              className="node-field-input"
              style={{ width: '55px' }}
            />
          </div>
        </div>
      </div>

      {/* Filtered output to the right */}
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: '#8b5cf6', width: 10, height: 10, border: '2px solid #0a0d14' }}
      />
    </div>
  );
}
