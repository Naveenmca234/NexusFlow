import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import MovingAverageNode from '../components/nodes/MovingAverageNode';
import MathNode from '../components/nodes/MathNode';
import ThresholdNode from '../components/nodes/ThresholdNode';
import AndNode from '../components/nodes/AndNode';
import OrNode from '../components/nodes/OrNode';
import ConditionNode from '../components/nodes/ConditionNode';
import AlertNode from '../components/nodes/AlertNode';
import WebhookNode from '../components/nodes/WebhookNode';
import { api } from '../services/api';
import { serializeRuleGraph } from '../utils/ruleGraphSerializer';
import { useNexusWebSocket } from '../hooks/useNexusWebSocket';
import { 
  Plus, 
  RotateCcw, 
  Trash2, 
  Layers, 
  Cpu, 
  Filter, 
  TrendingUp,
  Calculator,
  Gauge,
  GitMerge,
  GitFork,
  GitBranch, 
  AlertTriangle,
  Globe,
  ScrollText,
  Info,
  Check,
  Save,
  FolderOpen,
  Code,
  Copy,
  X,
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw
} from 'lucide-react';

const initialNodes = [
  {
    id: 'sensor-1',
    type: 'sensor',
    position: { x: 40, y: 140 },
    data: { label: 'Thermal Sensor 102', metric: 'temperature', interval: '2s' },
  },
  {
    id: 'filter-2',
    type: 'filter',
    position: { x: 300, y: 140 },
    data: { label: 'Threshold Filter', field: 'temperature', operator: '>', threshold: 32 },
  },
  {
    id: 'condition-3',
    type: 'condition',
    position: { x: 560, y: 140 },
    data: { label: 'Sustained State', conditionType: 'AND', duration: '60s' },
  },
  {
    id: 'alert-4',
    type: 'alert',
    position: { x: 820, y: 140 },
    data: { label: 'Incident Dispatch', severity: 'critical', channel: 'Ops Pager' },
  },
];

const initialEdges = [
  { id: 'e1-2', source: 'sensor-1', target: 'filter-2', animated: true, style: { stroke: '#06b6d4', strokeWidth: 2 } },
  { id: 'e2-3', source: 'filter-2', target: 'condition-3', animated: true, style: { stroke: '#8b5cf6', strokeWidth: 2 } },
  { id: 'e3-4', source: 'condition-3', target: 'alert-4', animated: true, style: { stroke: '#f59e0b', strokeWidth: 2 } },
];

let idCounter = 10;
const getId = (type) => `${type}-${Date.now()}-${idCounter++}`;

function FlowCanvas() {
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { screenToFlowPosition, fitView } = useReactFlow();

  // Rule Metadata State
  const [savedRules, setSavedRules] = useState([]);
  const [currentRuleId, setCurrentRuleId] = useState(null);
  const [ruleName, setRuleName] = useState('Thermal Spike Alert Pipeline');
  const [ruleDescription, setRuleDescription] = useState('Flags when temperature exceeds 32°C for over 60 seconds');
  const [targetDevice, setTargetDevice] = useState('DEV-TH-102');
  
  // Feedback & Modal State
  const [saveStatus, setSaveStatus] = useState('');
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Load saved rules list on mount
  const fetchRulesList = async () => {
    try {
      const data = await api.getRules();
      setSavedRules(data || []);
    } catch (err) {
      console.error('Error fetching rules list:', err);
    }
  };

  useEffect(() => {
    fetchRulesList();
  }, []);

  // Webhook Logs State
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [webhookLogs, setWebhookLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logFilter, setLogFilter] = useState('all');

  const { lastWebhookEvent } = useNexusWebSocket();

  const fetchWebhookLogs = async () => {
    setLoadingLogs(true);
    try {
      const data = await api.getWebhookLogs();
      setWebhookLogs(data || []);
    } catch (e) {
      console.error('Error fetching webhook logs:', e);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (showLogsModal) {
      fetchWebhookLogs();
    }
  }, [showLogsModal]);

  useEffect(() => {
    if (lastWebhookEvent) {
      setWebhookLogs((prev) => {
        if (prev.some(l => l._id && l._id === lastWebhookEvent._id)) return prev;
        return [lastWebhookEvent, ...prev];
      });
    }
  }, [lastWebhookEvent]);

  const nodeTypes = useMemo(() => ({
    sensor: SensorNode,
    filter: FilterNode,
    movingAverage: MovingAverageNode,
    moving_average: MovingAverageNode,
    mathOperation: MathNode,
    math: MathNode,
    threshold: ThresholdNode,
    and: AndNode,
    or: OrNode,
    condition: ConditionNode,
    alert: AlertNode,
    webhook: WebhookNode,
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
      case 'movingAverage':
      case 'moving_average':
        return { label: 'Moving Average', field: 'temperature', windowSize: 5 };
      case 'mathOperation':
      case 'math':
        return { label: 'Math Operation', field: 'temperature', operator: 'add', operand: 10 };
      case 'threshold':
        return { label: 'Threshold', field: 'temperature', operator: '>', threshold: 80 };
      case 'and':
        return {
          label: 'AND Gate',
          conditions: [
            { field: 'temperature', operator: '>', threshold: 80 },
            { field: 'rpm', operator: '>', threshold: 3000 },
          ],
        };
      case 'or':
        return {
          label: 'OR Gate',
          conditions: [
            { field: 'temperature', operator: '>', threshold: 85 },
            { field: 'vibration', operator: '>', threshold: 0.5 },
          ],
        };
      case 'condition':
        return { label: 'Logic Condition', conditionType: 'AND', duration: '30s' };
      case 'alert':
        return { label: 'Alert Dispatch', severity: 'warning', channel: 'Dashboard / Incident', cooldownSeconds: 30 };
      case 'webhook':
        return {
          label: 'HTTP Webhook',
          url: 'https://httpbin.org/post',
          method: 'POST',
          cooldownSeconds: 10,
          payload: '{\n  "deviceId": "{{deviceId}}",\n  "temperature": "{{temperature}}",\n  "rule": "{{ruleName}}"\n}',
        };
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

  // Serialize React Flow graph through the shared Week 2 graph contract.
  const serializeGraph = () =>
    serializeRuleGraph({
      name: ruleName,
      description: ruleDescription,
      enabled: true,
      targetDeviceId: targetDevice,
      nodes,
      edges,
    });

  // Save rule graph to backend API
  const handleSaveRule = async () => {
    const serialized = serializeGraph();
    try {
      let saved;
      if (currentRuleId && !currentRuleId.startsWith('rule-00')) {
        saved = await api.updateRule(currentRuleId, serialized);
      } else {
        saved = await api.createRule(serialized);
        if (saved?._id) setCurrentRuleId(saved._id);
      }
      await fetchRulesList();
      setSaveStatus('Rule graph saved successfully!');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (err) {
      console.error('Error saving rule graph:', err);
      setSaveStatus('Error saving graph');
    }
  };

  // Load a saved rule graph onto the canvas
  const handleLoadRule = async (ruleId) => {
    if (!ruleId) return;
    try {
      const rule = await api.getRuleById(ruleId);
      if (rule) {
        setCurrentRuleId(rule._id || rule.id || ruleId);
        setRuleName(rule.name || 'Saved Rule');
        setRuleDescription(rule.description || '');
        setTargetDevice(rule.targetDeviceId || 'all');
        if (Array.isArray(rule.nodes) && rule.nodes.length > 0) {
          setNodes(rule.nodes);
        }
        if (Array.isArray(rule.edges)) {
          setEdges(rule.edges);
        }
        setSaveStatus(`Loaded "${rule.name}"`);
        setTimeout(() => setSaveStatus(''), 2500);
        setTimeout(() => fitView({ padding: 0.2 }), 100);
      }
    } catch (err) {
      console.error('Error loading rule graph:', err);
    }
  };

  const handleReset = () => {
    setCurrentRuleId(null);
    setRuleName('Thermal Spike Alert Pipeline');
    setRuleDescription('Flags when temperature exceeds 32°C for over 60 seconds');
    setNodes(initialNodes);
    setEdges(initialEdges);
    setTimeout(() => fitView({ padding: 0.2 }), 100);
  };

  const handleClear = () => {
    setNodes([]);
    setEdges([]);
  };

  const copyJsonToClipboard = () => {
    const jsonStr = JSON.stringify(serializeGraph(), null, 2);
    navigator.clipboard.writeText(jsonStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem' }}>
      {/* Action Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Visual Rule Builder
            <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>Graph Serialization</span>
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Construct React Flow DAG pipelines with JSON graph serialization and MongoDB persistence.
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {saveStatus && (
            <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Check size={14} />
              {saveStatus}
            </span>
          )}

          {/* Saved Rules Dropdown Loader */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#111726', padding: '0.25rem 0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
            <FolderOpen size={14} color="var(--accent-cyan)" />
            <select
              value={currentRuleId || ''}
              onChange={(e) => handleLoadRule(e.target.value)}
              className="node-field-select"
              style={{ fontSize: '0.75rem', background: 'transparent', border: 'none' }}
            >
              <option value="">-- Load Saved Graph --</option>
              {savedRules.map((r) => (
                <option key={r._id || r.id} value={r._id || r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <button 
            onClick={() => setShowJsonModal(true)} 
            className="btn btn-secondary" 
            style={{ fontSize: '0.75rem', padding: '0.45rem 0.75rem' }}
            title="Inspect serialized JSON representation"
          >
            <Code size={14} />
            <span>JSON Graph</span>
          </button>

          <button 
            onClick={() => setShowLogsModal(true)} 
            className="btn btn-secondary" 
            style={{ fontSize: '0.75rem', padding: '0.45rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', borderColor: 'rgba(129, 140, 248, 0.4)', color: '#818cf8' }}
            title="Inspect real-time webhook execution logs"
          >
            <ScrollText size={14} />
            <span>Webhook Logs</span>
          </button>

          <button 
            onClick={handleClear} 
            className="btn btn-secondary" 
            style={{ fontSize: '0.75rem', padding: '0.45rem 0.75rem' }}
            title="Clear all nodes and edges"
          >
            <Trash2 size={14} />
            <span>Clear</span>
          </button>

          <button 
            onClick={handleReset} 
            className="btn btn-secondary" 
            style={{ fontSize: '0.75rem', padding: '0.45rem 0.75rem' }}
            title="Reset sample rule graph"
          >
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>

          <button 
            onClick={handleSaveRule} 
            className="btn btn-primary" 
            style={{ fontSize: '0.75rem', padding: '0.45rem 0.85rem' }}
          >
            <Save size={14} />
            <span>Save Rule</span>
          </button>
        </div>
      </div>

      {/* Rule Details Meta Bar */}
      <div className="glass-card" style={{ padding: '0.65rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '220px' }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Rule Name:</label>
          <input
            type="text"
            value={ruleName}
            onChange={(e) => setRuleName(e.target.value)}
            placeholder="Enter rule name..."
            style={{ background: '#090d16', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0.3rem 0.6rem', color: '#fff', fontSize: '0.8rem', flex: 1 }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '240px' }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Description:</label>
          <input
            type="text"
            value={ruleDescription}
            onChange={(e) => setRuleDescription(e.target.value)}
            placeholder="Rule objective..."
            style={{ background: '#090d16', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0.3rem 0.6rem', color: '#fff', fontSize: '0.8rem', flex: 1 }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Target Device:</label>
          <select
            value={targetDevice}
            onChange={(e) => setTargetDevice(e.target.value)}
            className="node-field-select"
            style={{ padding: '0.3rem 0.6rem' }}
          >
            <option value="all">All Devices (Fleetwide)</option>
            <option value="DEV-TH-101">DEV-TH-101</option>
            <option value="DEV-TH-102">DEV-TH-102</option>
            <option value="DEV-VB-201">DEV-VB-201</option>
            <option value="DEV-PR-301">DEV-PR-301</option>
          </select>
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

            {/* 3. Moving Average Node */}
            <div
              className="palette-node-item"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/reactflow', 'movingAverage');
                e.dataTransfer.effectAllowed = 'move';
              }}
              onClick={() => addNodeFromPalette('movingAverage')}
              title="Click or drag onto canvas"
            >
              <TrendingUp size={18} color="#fbbf24" />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: '#fbbf24' }}>Moving Average</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Rolling mean window</div>
              </div>
              <Plus size={14} color="#64748b" />
            </div>

            {/* 4. Math Operation Node */}
            <div
              className="palette-node-item"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/reactflow', 'mathOperation');
                e.dataTransfer.effectAllowed = 'move';
              }}
              onClick={() => addNodeFromPalette('mathOperation')}
              title="Click or drag onto canvas"
            >
              <Calculator size={18} color="#38bdf8" />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: '#38bdf8' }}>Math Operation</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Add, sub, mul, div</div>
              </div>
              <Plus size={14} color="#64748b" />
            </div>

            {/* 5. Threshold Node */}
            <div
              className="palette-node-item"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/reactflow', 'threshold');
                e.dataTransfer.effectAllowed = 'move';
              }}
              onClick={() => addNodeFromPalette('threshold')}
              title="Click or drag onto canvas"
            >
              <Gauge size={18} color="#f472b6" />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: '#f472b6' }}>Threshold</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>&gt;, &lt;, &gt;=, &lt;=, ==, !=</div>
              </div>
              <Plus size={14} color="#64748b" />
            </div>

            {/* 6. AND Gate Node */}
            <div
              className="palette-node-item"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/reactflow', 'and');
                e.dataTransfer.effectAllowed = 'move';
              }}
              onClick={() => addNodeFromPalette('and')}
              title="Click or drag onto canvas"
            >
              <GitMerge size={18} color="#34d399" />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: '#34d399' }}>AND Gate</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>All conditions must pass</div>
              </div>
              <Plus size={14} color="#64748b" />
            </div>

            {/* 7. OR Gate Node */}
            <div
              className="palette-node-item"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/reactflow', 'or');
                e.dataTransfer.effectAllowed = 'move';
              }}
              onClick={() => addNodeFromPalette('or')}
              title="Click or drag onto canvas"
            >
              <GitFork size={18} color="#fbbf24" />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: '#fbbf24' }}>OR Gate</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Any condition must pass</div>
              </div>
              <Plus size={14} color="#64748b" />
            </div>

            {/* 8. Condition Node */}
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
              <GitBranch size={18} color="#f59e0b" />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: '#f59e0b' }}>Condition</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Logic duration gate</div>
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

            {/* 5. Webhook Action Node */}
            <div
              className="palette-node-item"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/reactflow', 'webhook');
                e.dataTransfer.effectAllowed = 'move';
              }}
              onClick={() => addNodeFromPalette('webhook')}
              title="Click or drag onto canvas"
            >
              <Globe size={18} color="#818cf8" />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: '#818cf8' }}>Webhook</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>HTTP callback dispatch</div>
              </div>
              <Plus size={14} color="#64748b" />
            </div>
          </div>

          {/* Quick Guide Footnote */}
          <div style={{ marginTop: 'auto', background: 'rgba(15, 23, 42, 0.7)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-cyan)', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.35rem' }}>
              <Info size={14} />
              <span>Serialization Status</span>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              <div>• Nodes: <strong>{nodes.length}</strong> defined</div>
              <div>• Edges: <strong>{edges.length}</strong> linked</div>
              <div>• Active ID: <span className="font-mono" style={{ color: 'var(--accent-cyan)' }}>{currentRuleId ? currentRuleId.slice(0, 10) + '...' : 'Unsaved draft'}</span></div>
            </div>
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

      {/* Serialized JSON Graph Modal */}
      {showJsonModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200,
        }}>
          <div style={{
            width: '90%',
            maxWidth: '680px',
            maxHeight: '85vh',
            background: '#0d1322',
            border: '1px solid #23314f',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px rgba(0,0,0,0.9)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Code size={18} color="var(--accent-cyan)" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>Serialized JSON Rule Graph</h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button 
                  onClick={copyJsonToClipboard} 
                  className="btn btn-secondary" 
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                >
                  <Copy size={13} />
                  <span>{copied ? 'Copied!' : 'Copy JSON'}</span>
                </button>
                <button 
                  onClick={() => setShowJsonModal(false)} 
                  className="btn btn-outline" 
                  style={{ padding: '0.35rem' }}
                  aria-label="Close dialog"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* JSON Code Viewer */}
            <div style={{ padding: '1.25rem', overflowY: 'auto', flex: 1, background: '#090d16' }}>
              <pre className="font-mono" style={{ fontSize: '0.75rem', color: '#38bdf8', lineHeight: 1.5, margin: 0 }}>
                {JSON.stringify(serializeGraph(), null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
      {/* Webhook Execution Logs Modal */}
      {showLogsModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.82)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 220,
        }}>
          <div style={{
            width: '92%',
            maxWidth: '920px',
            maxHeight: '88vh',
            background: '#0d1322',
            border: '1px solid #23314f',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 60px rgba(0,0,0,0.95)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <ScrollText size={18} color="#818cf8" />
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', margin: 0 }}>Webhook Execution Logs</h3>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Real-time HTTP callback dispatch history from reactive pipelines</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {/* Filter buttons */}
                <div style={{ display: 'flex', gap: '0.3rem', marginRight: '0.5rem' }}>
                  {['all', 'success', 'failed'].map((f) => (
                    <button
                      key={f}
                      onClick={() => setLogFilter(f)}
                      style={{
                        padding: '0.25rem 0.55rem',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        textTransform: 'capitalize',
                        background: logFilter === f ? '#1e293b' : 'transparent',
                        color: logFilter === f ? '#818cf8' : 'var(--text-secondary)',
                        border: '1px solid',
                        borderColor: logFilter === f ? '#818cf8' : 'var(--border-color)',
                        borderRadius: '5px',
                        cursor: 'pointer',
                      }}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                <button 
                  onClick={fetchWebhookLogs} 
                  className="btn btn-secondary" 
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                  title="Refresh logs"
                >
                  <RefreshCw size={13} className={loadingLogs ? 'animate-spin' : ''} />
                  <span>Refresh</span>
                </button>
                <button 
                  onClick={() => setShowLogsModal(false)} 
                  className="btn btn-outline" 
                  style={{ padding: '0.35rem' }}
                  aria-label="Close dialog"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Logs Table */}
            <div style={{ padding: '1rem 1.5rem', overflowY: 'auto', flex: 1, background: '#090d16' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.78rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.65rem 0.75rem', fontWeight: 600 }}>TRIGGER TIME</th>
                    <th style={{ padding: '0.65rem 0.75rem', fontWeight: 600 }}>TARGET WEBHOOK URL</th>
                    <th style={{ padding: '0.65rem 0.75rem', fontWeight: 600 }}>RULE / DEVICE</th>
                    <th style={{ padding: '0.65rem 0.75rem', fontWeight: 600 }}>HTTP STATUS</th>
                    <th style={{ padding: '0.65rem 0.75rem', fontWeight: 600 }}>OUTCOME</th>
                    <th style={{ padding: '0.65rem 0.75rem', fontWeight: 600, textAlign: 'right' }}>LATENCY</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingLogs ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                        <RefreshCw size={18} className="animate-spin" style={{ margin: '0 auto 0.5rem' }} />
                        <div>Loading execution history...</div>
                      </td>
                    </tr>
                  ) : webhookLogs.filter((l) => {
                      if (logFilter === 'success') return l.success;
                      if (logFilter === 'failed') return !l.success;
                      return true;
                    }).length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                        <Globe size={32} color="#818cf8" style={{ margin: '0 auto 0.6rem', opacity: 0.7 }} />
                        <div style={{ color: '#fff', fontWeight: 600 }}>No Webhook Logs Found</div>
                        <div style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                          Connect a Webhook node in your visual rule and trigger telemetry to record HTTP dispatches.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    webhookLogs
                      .filter((l) => {
                        if (logFilter === 'success') return l.success;
                        if (logFilter === 'failed') return !l.success;
                        return true;
                      })
                      .map((log, idx) => (
                        <tr 
                          key={log._id || idx}
                          style={{ 
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                            transition: 'background 0.15s ease',
                          }}
                        >
                          <td style={{ padding: '0.65rem 0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <Clock size={11} />
                              <span>
                                {log.triggerTime
                                  ? new Date(log.triggerTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                                  : 'Just now'}
                              </span>
                            </div>
                          </td>

                          <td style={{ padding: '0.65rem 0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span
                                style={{
                                  fontSize: '0.65rem',
                                  fontWeight: 700,
                                  color: '#818cf8',
                                  background: 'rgba(129, 140, 248, 0.15)',
                                  padding: '0.15rem 0.4rem',
                                  borderRadius: '4px',
                                }}
                              >
                                {log.method || 'POST'}
                              </span>
                              <span
                                className="font-mono"
                                title={log.webhookUrl}
                                style={{
                                  maxWidth: '220px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  display: 'inline-block',
                                  color: '#f8fafc',
                                }}
                              >
                                {log.webhookUrl}
                              </span>
                            </div>
                            {log.error && (
                              <div style={{ fontSize: '0.68rem', color: '#fb7185', marginTop: '0.2rem' }}>
                                Error: {log.error}
                              </div>
                            )}
                          </td>

                          <td style={{ padding: '0.65rem 0.75rem' }}>
                            <div style={{ fontWeight: 600, color: '#e2e8f0' }}>{log.ruleName || 'Visual Rule'}</div>
                            <div className="font-mono" style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)' }}>
                              {log.deviceId || 'DEV-N/A'}
                            </div>
                          </td>

                          <td style={{ padding: '0.65rem 0.75rem' }}>
                            <span
                              className="font-mono"
                              style={{
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                color: log.status >= 200 && log.status < 300 ? '#34d399' : '#fb7185',
                              }}
                            >
                              {log.status ? `${log.status} ${log.statusText}` : log.statusText || 'Error'}
                            </span>
                          </td>

                          <td style={{ padding: '0.65rem 0.75rem' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                padding: '0.15rem 0.5rem',
                                borderRadius: '999px',
                                background: log.success ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                                color: log.success ? '#34d399' : '#fb7185',
                                border: `1px solid ${log.success ? 'rgba(16, 185, 129, 0.35)' : 'rgba(244, 63, 94, 0.35)'}`,
                              }}
                            >
                              {log.success ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                              {log.success ? 'Success' : 'Failed'}
                            </span>
                          </td>

                          <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>
                            <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>
                              {log.responseTimeMs ?? 0}ms
                            </span>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
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
