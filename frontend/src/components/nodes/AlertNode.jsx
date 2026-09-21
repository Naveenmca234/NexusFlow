import React, { useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { AlertTriangle, X } from 'lucide-react';

export default function AlertNode({ id, data }) {
  const { deleteElements, setNodes } = useReactFlow();
  const [label] = useState(data.label || 'Incident Alert');
  const [severity, setSeverity] = useState(data.severity || 'warning');
  const [channel, setChannel] = useState(data.channel || 'Dashboard / Incident');
  const [cooldown, setCooldown] = useState(data.cooldownSeconds ?? data.cooldown ?? 30);

  const handleDelete = (e) => {
    e.stopPropagation();
    deleteElements({ nodes: [{ id }] });
  };

  const updateConfig = (key, val) => {
    if (key === 'severity') setSeverity(val);
    if (key === 'channel') setChannel(val);
    if (key === 'cooldownSeconds') setCooldown(val);
    setNodes((nds) =>
      nds.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, [key]: val } } : node
      )
    );
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
            onChange={(e) => updateConfig('severity', e.target.value)}
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
            onChange={(e) => updateConfig('channel', e.target.value)}
            className="node-field-select"
          >
            <option value="Dashboard / Incident">Dashboard</option>
            <option value="Ops Pager">Ops Pager</option>
            <option value="SMS Alert">SMS Alert</option>
            <option value="Email">Email Digest</option>
          </select>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Cooldown (s):</label>
          <input
            type="number"
            min="0"
            max="3600"
            value={cooldown}
            onChange={(e) => updateConfig('cooldownSeconds', Math.max(0, parseInt(e.target.value, 10) || 0))}
            className="node-field-input"
            style={{ width: '65px', textAlign: 'right' }}
          />
        </div>
      </div>
    </div>
  );
}
