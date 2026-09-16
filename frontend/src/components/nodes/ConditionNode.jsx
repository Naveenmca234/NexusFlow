import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { GitBranch } from 'lucide-react';

export default function ConditionNode({ data }) {
  return (
    <div className="custom-flow-node node-condition">
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: '#f59e0b', width: 10, height: 10 }}
      />
      
      <div className="node-header">
        <GitBranch size={16} color="#fbbf24" />
        <span>{data.label || 'Condition'}</span>
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <div>Logic: <strong style={{ color: '#fef08a' }}>{data.conditionType || 'AND'}</strong></div>
        <div>Duration: <span className="font-mono">{data.duration || 'sustained 30s'}</span></div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        style={{ background: '#f59e0b', width: 10, height: 10 }}
      />
    </div>
  );
}
