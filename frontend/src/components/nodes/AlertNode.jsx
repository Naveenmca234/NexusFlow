import React, { useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { AlertTriangle, X } from 'lucide-react';

export default function AlertNode({ id, data }) {
  const { deleteElements } = useReactFlow();
  const [label] = useState(data.label || 'Incident Alert');
  const [severity, setSeverity] = useState(data.severity || 'warning');
  const [channel, setChannel] = useState(data.channel || 'Dashboard / Incident');

  const handleDelete = (e) => {
    e.stopPropagation();
    deleteElements({ nodes: [{ id }] });
  };

  return (
    <div className="custom-flow-node node-alert">
      {/* Input trigger on the left */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: '#f43f5e', width: 10, height: 10, border: '2px solid #0a0d14' }}
      />

      <div className="node-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <AlertTriangle size={16} color="#fb7185" />
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
          <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Severity:</label>
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="node-field-select"
          >
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Channel:</label>
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            className="node-field-select"
          >
            <option value="Dashboard / Incident">Dashboard</option>
            <option value="Ops Pager">Ops Pager</option>
            <option value="SMS Alert">SMS Alert</option>
            <option value="Email">Email Digest</option>
          </select>
        </div>
      </div>
    </div>
  );
}
