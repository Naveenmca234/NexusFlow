import React, { useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Calculator, X } from 'lucide-react';

export default function MathNode({ id, data }) {
  const { deleteElements, setNodes } = useReactFlow();
  const [label] = useState(data.label || 'Math Operation');
  const [field, setField] = useState(data.field || 'temperature');
  const [operator, setOperator] = useState(data.operator || data.operation || 'add');
  const [operand, setOperand] = useState(data.operand ?? data.value ?? 10);

  const handleDelete = (e) => {
    e.stopPropagation();
    deleteElements({ nodes: [{ id }] });
  };

  const updateConfig = (key, val) => {
    if (key === 'field') setField(val);
    if (key === 'operator') setOperator(val);
    if (key === 'operand') setOperand(val);

    setNodes((nds) =>
      nds.map((node) =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                [key]: val,
                ...(key === 'operator' ? { operation: val } : {}),
              },
            }
          : node
      )
    );
  };

  const getOpSymbol = (op) => {
    switch (op) {
      case 'add':
      case '+':
        return '+';
      case 'subtract':
      case '-':
        return '-';
      case 'multiply':
      case '*':
        return '×';
      case 'divide':
      case '/':
        return '÷';
      default:
        return '+';
    }
  };

  return (
    <div className="custom-flow-node node-math">
      {/* Input stream on the left */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: '#38bdf8', width: 10, height: 10, border: '2px solid #0a0d14' }}
      />

      <div className="node-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Calculator size={16} color="#38bdf8" />
          <span style={{ fontWeight: 600, color: '#38bdf8' }}>{label}</span>
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

      <div className="node-fields nodrag" style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginTop: '0.5rem' }}>
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
          <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Operation:</label>
          <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
            <select
              value={operator}
              onChange={(e) => updateConfig('operator', e.target.value)}
              className="node-field-select"
              style={{ width: '85px' }}
            >
              <option value="add">Add (+)</option>
              <option value="subtract">Subtract (-)</option>
              <option value="multiply">Multiply (×)</option>
              <option value="divide">Divide (÷)</option>
            </select>
            <input
              type="number"
              value={operand}
              onChange={(e) => updateConfig('operand', Number(e.target.value))}
              className="node-field-input"
              style={{ width: '55px', textAlign: 'center' }}
            />
          </div>
        </div>

        {/* Formula preview */}
        <div
          style={{
            fontSize: '0.68rem',
            color: '#38bdf8',
            background: 'rgba(6, 182, 212, 0.12)',
            padding: '0.2rem 0.4rem',
            borderRadius: '4px',
            textAlign: 'center',
            border: '1px solid rgba(6, 182, 212, 0.25)',
          }}
        >
          {field} {getOpSymbol(operator)} {operand}
        </div>
      </div>

      {/* Output stream to the right */}
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: '#38bdf8', width: 10, height: 10, border: '2px solid #0a0d14' }}
      />
    </div>
  );
}
