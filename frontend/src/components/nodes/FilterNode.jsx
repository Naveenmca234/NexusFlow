import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Filter } from 'lucide-react';

export default function FilterNode({ data }) {
  return (
    <div className="custom-flow-node node-filter">
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: '#8b5cf6', width: 10, height: 10 }}
      />
      
      <div className="node-header">
        <Filter size={16} color="#c084fc" />
        <span>{data.label || 'Data Filter'}</span>
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <div>Clause: <span className="font-mono" style={{ color: '#e9d5ff' }}>{data.field || 'val'} {data.operator || '>'} {data.threshold ?? 30}</span></div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        style={{ background: '#8b5cf6', width: 10, height: 10 }}
      />
    </div>
  );
}
