import React, { useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { GitFork, Plus, Trash2, X } from 'lucide-react';

export default function OrNode({ id, data }) {
  const { deleteElements, setNodes } = useReactFlow();
  const [label] = useState(data.label || 'OR Gate');
  const [conditions, setConditions] = useState(
    Array.isArray(data.conditions)
      ? data.conditions
      : [
          { field: 'temperature', operator: '>', threshold: 85 },
          { field: 'vibration', operator: '>', threshold: 0.5 },
        ]
  );

  const handleDelete = (e) => {
    e.stopPropagation();
    deleteElements({ nodes: [{ id }] });
  };

  const updateCondition = (index, key, val) => {
    const next = [...conditions];
    next[index] = { ...next[index], [key]: val };
    setConditions(next);

    setNodes((nds) =>
      nds.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, conditions: next } } : node
      )
    );
  };

  const addCondition = () => {
    const next = [...conditions, { field: 'pressure', operator: '>', threshold: 1030 }];
    setConditions(next);
    setNodes((nds) =>
      nds.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, conditions: next } } : node
      )
    );
  };

  const removeCondition = (index) => {
    if (conditions.length <= 1) return;
    const next = conditions.filter((_, i) => i !== index);
    setConditions(next);
    setNodes((nds) =>
      nds.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, conditions: next } } : node
      )
    );
  };

  return (
    <div className="custom-flow-node node-or">
      {/* Target handle 1 (Top Left) */}
      <Handle
        type="target"
        position={Position.Left}
        id="in-1"
        style={{ top: '35%', background: '#f59e0b', width: 10, height: 10, border: '2px solid #0a0d14' }}
      />
      {/* Target handle 2 (Bottom Left) */}
      <Handle
        type="target"
        position={Position.Left}
        id="in-2"
        style={{ top: '65%', background: '#f59e0b', width: 10, height: 10, border: '2px solid #0a0d14' }}
      />

      <div className="node-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <GitFork size={16} color="#fbbf24" />
          <span style={{ fontWeight: 600, color: '#fbbf24' }}>{label} (ANY TRUE)</span>
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

      <div className="node-fields nodrag" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.4rem' }}>
        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
          Passes if any input branch OR condition below is true:
        </div>

        {conditions.map((cond, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: '#090d16', padding: '0.25rem 0.35rem', borderRadius: '4px' }}>
            <select
              value={cond.field}
              onChange={(e) => updateCondition(idx, 'field', e.target.value)}
              className="node-field-select"
              style={{ fontSize: '0.68rem', padding: '0.15rem 0.3rem' }}
            >
              <option value="temperature">Temp</option>
              <option value="rpm">RPM</option>
              <option value="pressure">Press</option>
              <option value="vibration">Vib</option>
            </select>
            <select
              value={cond.operator}
              onChange={(e) => updateCondition(idx, 'operator', e.target.value)}
              className="node-field-select"
              style={{ width: '42px', fontSize: '0.68rem', padding: '0.15rem 0.2rem' }}
            >
              <option value=">">&gt;</option>
              <option value="<">&lt;</option>
              <option value=">=">&gt;=</option>
              <option value="<=">&lt;=</option>
              <option value="==">==</option>
            </select>
            <input
              type="number"
              value={cond.threshold}
              onChange={(e) => updateCondition(idx, 'threshold', Number(e.target.value))}
              className="node-field-input"
              style={{ width: '48px', fontSize: '0.68rem', textAlign: 'center' }}
            />
            {conditions.length > 1 && (
              <button
                onClick={() => removeCondition(idx)}
                style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '0.1rem' }}
                title="Remove condition"
              >
                <Trash2 size={11} />
              </button>
            )}
          </div>
        ))}

        <button
          onClick={addCondition}
          className="btn btn-outline"
          style={{
            fontSize: '0.68rem',
            padding: '0.2rem 0.4rem',
            justifyContent: 'center',
            borderColor: 'rgba(245, 158, 11, 0.3)',
            color: '#fbbf24',
            marginTop: '0.2rem',
          }}
        >
          <Plus size={11} />
          <span>Add OR Condition</span>
        </button>
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
