import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import SensorNode from '../components/nodes/SensorNode';
import FilterNode from '../components/nodes/FilterNode';
import ConditionNode from '../components/nodes/ConditionNode';
import AlertNode from '../components/nodes/AlertNode';
import { 
  Plus, 
  RotateCcw, 
  Trash2,
  Layers, 
  Cpu, 
  Filter, 
  GitBranch, 
  AlertTriangle,
  Info,
  Check
} from 'lucide-react';

const initialNodes = [
  {
    id: 'node-1',
    type: 'sensor',
    position: { x: 40, y: 140 },
    data: { label: 'Thermal Sensor 102', metric: 'temperature', interval: '2s' },
  },
  {
    id: 'node-2',
    type: 'filter',
    position: { x: 300, y: 140 },
    data: { label: 'Threshold Filter', field: 'temperature', operator: '>', threshold: 32 },
  },
  {
    id: 'node-3',
    type: 'condition',
    position: { x: 560, y: 140 },
    data: { label: 'Sustained State', conditionType: 'AND', duration: '60s' },
  },
  {
    id: 'node-4',
    type: 'alert',
    position: { x: 820, y: 140 },
    data: { label: 'Incident Dispatch', severity: 'critical', channel: 'Ops Pager' },
  },
];

const initialEdges = [
  { id: 'e1-2', source: 'node-1', target: 'node-2', animated: true, style: { stroke: '#06b6d4', strokeWidth: 2 } },
  { id: 'e2-3', source: 'node-2', target: 'node-3', animated: true, style: { stroke: '#8b5cf6', strokeWidth: 2 } },
  { id: 'e3-4', source: 'node-3', target: 'node-4', animated: true, style: { stroke: '#f59e0b', strokeWidth: 2 } },
];

let idCounter = 5;
const getId = (type) => `${type}-${Date.now()}-${idCounter++}`;

function FlowCanvas() {
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [saveStatus, setSaveStatus] = useState('');
  const { screenToFlowPosition } = useReactFlow();

  const nodeTypes = useMemo(() => ({
    sensor: SensorNode,
    filter: FilterNode,
    condition: ConditionNode,
    alert: AlertNode,
  }), []);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#38bdf8', strokeWidth: 2 } }, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const getNodeDefaultData = (type) => {
    switch (type) {
      case 'sensor':
        return { label: 'New Sensor', metric: 'temperature', interval: '5s' };
      case 'filter':
        return { label: 'Value Filter', field: 'temperature', operator: '>', threshold: 50 };
      case 'condition':
        return { label: 'Logic Condition', conditionType: 'AND', duration: '30s' };
      case 'alert':
        return { label: 'Alert Dispatch', severity: 'warning', channel: 'Dashboard / Incident' };
      default:
        return { label: 'Custom Node' };
    }
  };

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = {
        id: getId(type),
        type,
        position,
        data: getNodeDefaultData(type),
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, setNodes]
  );

  const addNodeFromPalette = (type) => {
    const x = 120 + Math.random() * 260;
    const y = 100 + Math.random() * 180;
    const newNode = {
      id: getId(type),
      type,
      position: { x, y },
      data: getNodeDefaultData(type),
    };
    setNodes((nds) => nds.concat(newNode));
  };

  const handleReset = () => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  };

  const handleClear = () => {
    setNodes([]);
    setEdges([]);
  };

  const handleSave = () => {
    setSaveStatus('Rule configuration saved');
    setTimeout(() => setSaveStatus(''), 2500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem' }}>
      {/* Action Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Visual Rule Builder
            <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>React Flow DAG</span>
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Drag nodes from the palette to define triggers, threshold filters, logic conditions, and incident alerts.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {saveStatus && (
            <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Check size={14} />
              {saveStatus}
            </span>
          )}
          <button 
            onClick={handleClear} 
            className="btn btn-secondary" 
            style={{ fontSize: '0.8rem', padding: '0.5rem 0.85rem' }}
            title="Clear all nodes and connections"
          >
            <Trash2 size={14} />
            Clear
          </button>
          <button 
            onClick={handleReset} 
            className="btn btn-secondary" 
            style={{ fontSize: '0.8rem', padding: '0.5rem 0.85rem' }}
            title="Reset sample rule graph"
          >
            <RotateCcw size={14} />
            Reset
          </button>
          <button 
            onClick={handleSave} 
            className="btn btn-primary" 
            style={{ fontSize: '0.8rem', padding: '0.5rem 0.85rem' }}
          >
            Deploy Rule
          </button>
        </div>
      </div>

      {/* Main Flow Layout Container */}
      <div className="rule-builder-container">
        {/* Node Palette Left Sidebar */}
        <div className="rule-sidebar">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.35rem' }}>
              <Layers size={16} color="#06b6d4" />
              <span>Available Nodes</span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Drag onto canvas or click to add:
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* 1. Sensor Node */}
            <div
              className="palette-node-item"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/reactflow', 'sensor');
                e.dataTransfer.effectAllowed = 'move';
              }}
              onClick={() => addNodeFromPalette('sensor')}
              title="Click or drag onto canvas"
            >
              <Cpu size={18} color="#38bdf8" />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: '#38bdf8' }}>Sensor</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Telemetry stream source</div>
              </div>
              <Plus size={14} color="#64748b" />
            </div>

            {/* 2. Filter Node */}
            <div
              className="palette-node-item"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/reactflow', 'filter');
                e.dataTransfer.effectAllowed = 'move';
              }}
              onClick={() => addNodeFromPalette('filter')}
              title="Click or drag onto canvas"
            >
              <Filter size={18} color="#c084fc" />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: '#c084fc' }}>Filter</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Value threshold gate</div>
              </div>
              <Plus size={14} color="#64748b" />
            </div>

            {/* 3. Condition Node */}
            <div
              className="palette-node-item"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/reactflow', 'condition');
                e.dataTransfer.effectAllowed = 'move';
              }}
              onClick={() => addNodeFromPalette('condition')}
              title="Click or drag onto canvas"
            >
              <GitBranch size={18} color="#fbbf24" />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: '#fbbf24' }}>Condition</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>AND / OR logic gate</div>
              </div>
              <Plus size={14} color="#64748b" />
            </div>

            {/* 4. Alert Node */}
            <div
              className="palette-node-item"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/reactflow', 'alert');
                e.dataTransfer.effectAllowed = 'move';
              }}
              onClick={() => addNodeFromPalette('alert')}
              title="Click or drag onto canvas"
            >
              <AlertTriangle size={18} color="#fb7185" />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: '#fb7185' }}>Alert</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Dispatch incident action</div>
              </div>
              <Plus size={14} color="#64748b" />
            </div>
          </div>

          {/* Quick Guide Footnote */}
          <div style={{ marginTop: 'auto', background: 'rgba(15, 23, 42, 0.7)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-cyan)', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.35rem' }}>
              <Info size={14} />
              <span>Canvas Guide</span>
            </div>
            <ul style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', lineHeight: 1.5, paddingLeft: '1rem' }}>
              <li><strong>Add:</strong> Drag from palette or click item</li>
              <li><strong>Connect:</strong> Link right port to left port</li>
              <li><strong>Move:</strong> Drag any node by header</li>
              <li><strong>Delete:</strong> Click ✕ on node or press Delete</li>
            </ul>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="rule-canvas-wrapper" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            deleteKeyCode={['Backspace', 'Delete']}
            fitView
          >
            <Background color="#1a243a" gap={20} size={1} />
            <Controls />
            <MiniMap 
              nodeStrokeColor="#38bdf8"
              nodeColor="#131b2e"
              maskColor="rgba(10, 13, 20, 0.75)"
            />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}

export default function RuleBuilder() {
  return (
    <ReactFlowProvider>
      <FlowCanvas />
    </ReactFlowProvider>
  );
}
