import React, { useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { GitBranch, X } from 'lucide-react';

export default function ConditionNode({ id, data }) {
  const { deleteElements } = useReactFlow();
  const [label] = useState(data.label || 'Condition Logic');
  const [conditionType, setConditionType] = useState(data.conditionType || 'AND');
  const [duration, setDuration] = useState(data.duration || '30s');

  const handleDelete = (e) => {
    e.stopPropagation();
    deleteElements({ nodes: [{ id }] });
  };

  return (
    <div className="custom-flow-node node-condition">
      {/* Input stream on the left */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: '#f59e0b', width: 10, height: 10, border: '2px solid #0a0d14' }}
      />

      <div className="node-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <GitBranch size={16} color="#fbbf24" />
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
          <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Operator:</label>
          <select
            value={conditionType}
            onChange={(e) => setConditionType(e.target.value)}
            className="node-field-select"
          >
            <option value="AND">AND (All Met)</option>
            <option value="OR">OR (Any Met)</option>
            <option value="XOR">XOR (Exclusive)</option>
          </select>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Window:</label>
          <select
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="node-field-select"
          >
            <option value="immediate">Immediate</option>
            <option value="30s">Sustained 30s</option>
            <option value="60s">Sustained 60s</option>
            <option value="2 cycles">2 Cycles</option>
          </select>
        </div>
      </div>

      {/* Output signal to the right */}
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: '#f59e0b', width: 10, height: 10, border: '2px solid #0a0d14' }}
      />
    </div>
  );
}
