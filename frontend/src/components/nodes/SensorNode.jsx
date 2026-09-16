import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Cpu, Activity } from 'lucide-react';

export default function SensorNode({ data }) {
  return (
    <div className="custom-flow-node node-sensor">
      <div className="node-header">
        <Cpu size={16} color="#38bdf8" />
        <span>{data.label || 'Sensor Input'}</span>
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <div>Metric: <strong style={{ color: '#fff' }}>{data.metric || 'temperature'}</strong></div>
        <div>Interval: <span className="font-mono">{data.interval || '5s'}</span></div>
      </div>
      
      {/* Sensor outputs data to the right */}
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: '#06b6d4', width: 10, height: 10 }}
      />
    </div>
  );
}
