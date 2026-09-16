import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { AlertTriangle } from 'lucide-react';

export default function AlertNode({ data }) {
  return (
    <div className="custom-flow-node node-alert">
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: '#f43f5e', width: 10, height: 10 }}
      />
      
      <div className="node-header">
        <AlertTriangle size={16} color="#fb7185" />
        <span>{data.label || 'Trigger Alert'}</span>
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <div>Severity: <strong style={{ color: '#fca5a5', textTransform: 'uppercase' }}>{data.severity || 'warning'}</strong></div>
        <div>Channel: <span>{data.channel || 'Dashboard / Incident'}</span></div>
      </div>
    </div>
  );
}
