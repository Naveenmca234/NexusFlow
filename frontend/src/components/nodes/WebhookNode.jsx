import React, { useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Globe, X, Send, ChevronDown, ChevronRight, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '../../services/api';

export default function WebhookNode({ id, data }) {
  const { deleteElements, setNodes } = useReactFlow();
  const [label] = useState(data.label || 'Webhook Dispatch');
  const [url, setUrl] = useState(data.url || data.webhookUrl || 'https://httpbin.org/post');
  const [method, setMethod] = useState(data.method || 'POST');
  const [cooldown, setCooldown] = useState(data.cooldownSeconds ?? data.cooldown ?? 10);
  const [payload, setPayload] = useState(
    typeof data.payload === 'object'
      ? JSON.stringify(data.payload, null, 2)
      : data.payload || '{\n  "deviceId": "{{deviceId}}",\n  "temperature": "{{temperature}}",\n  "rule": "{{ruleName}}"\n}'
  );
  const [showPayload, setShowPayload] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const handleDelete = (e) => {
    e.stopPropagation();
    deleteElements({ nodes: [{ id }] });
  };

  const updateConfig = (key, val) => {
    if (key === 'url') setUrl(val);
    if (key === 'method') setMethod(val);
    if (key === 'cooldownSeconds') setCooldown(val);
    if (key === 'payload') setPayload(val);

    setNodes((nds) =>
      nds.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, [key]: val, webhookUrl: key === 'url' ? val : (node.data.webhookUrl || val) } } : node
      )
    );
  };

  const handleTestTrigger = async (e) => {
    e.stopPropagation();
    if (!url.trim()) return;

    setTesting(true);
    setTestResult(null);

    try {
      let parsedPayload = null;
      try {
        parsedPayload = JSON.parse(payload);
      } catch (err) {
        parsedPayload = payload;
      }

      const res = await api.testWebhook({
        url: url.trim(),
        method,
        payload: parsedPayload,
        timeoutMs: 5000,
      });

      setTestResult(res);
      setTimeout(() => setTestResult(null), 4000);
    } catch (err) {
      setTestResult({ success: false, statusText: err.message });
      setTimeout(() => setTestResult(null), 4000);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="custom-flow-node node-webhook" style={{ minWidth: '260px' }}>
      {/* Input trigger on the left */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: '#818cf8', width: 10, height: 10, border: '2px solid #0a0d14' }}
      />

      {/* Header */}
      <div className="node-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Globe size={16} color="#818cf8" />
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

      {/* Form Fields */}
      <div className="node-fields nodrag" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
        {/* Method & URL */}
        <div style={{ display: 'flex', gap: '0.35rem' }}>
          <select
            value={method}
            onChange={(e) => updateConfig('method', e.target.value)}
            className="node-field-select"
            style={{ width: '80px', fontWeight: 700, color: '#818cf8' }}
          >
            <option value="POST">POST</option>
            <option value="GET">GET</option>
            <option value="PUT">PUT</option>
            <option value="PATCH">PATCH</option>
          </select>

          <input
            type="text"
            placeholder="https://api.example.com/webhook"
            value={url}
            onChange={(e) => updateConfig('url', e.target.value)}
            className="node-field-input"
            style={{ flex: 1, fontSize: '0.72rem' }}
          />
        </div>

        {/* Cooldown Settings */}
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

        {/* Expandable Payload Template */}
        <div>
          <button
            type="button"
            onClick={() => setShowPayload(!showPayload)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#818cf8',
              fontSize: '0.7rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.2rem',
              cursor: 'pointer',
              padding: '0.1rem 0',
              fontWeight: 600,
            }}
          >
            {showPayload ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <span>{showPayload ? 'Hide Payload Template' : 'Configure Payload JSON'}</span>
          </button>

          {showPayload && (
            <div style={{ marginTop: '0.35rem' }}>
              <textarea
                value={payload}
                onChange={(e) => updateConfig('payload', e.target.value)}
                className="node-field-input font-mono"
                rows={4}
                style={{
                  width: '100%',
                  fontSize: '0.68rem',
                  resize: 'vertical',
                  lineHeight: '1.3',
                  background: '#0a0d14',
                }}
                placeholder='{\n  "deviceId": "{{deviceId}}"\n}'
              />
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Variables: <code style={{ color: '#818cf8' }}>{`{{deviceId}}`}</code>, <code style={{ color: '#818cf8' }}>{`{{temperature}}`}</code>, <code style={{ color: '#818cf8' }}>{`{{ruleName}}`}</code>
              </div>
            </div>
          )}
        </div>

        {/* Test Trigger Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '0.4rem', marginTop: '0.2rem' }}>
          <button
            type="button"
            disabled={testing || !url.trim()}
            onClick={handleTestTrigger}
            className="btn btn-outline"
            style={{
              fontSize: '0.7rem',
              padding: '0.25rem 0.55rem',
              borderColor: 'rgba(129, 140, 248, 0.4)',
              color: '#818cf8',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              cursor: 'pointer',
            }}
          >
            {testing ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
            <span>{testing ? 'Sending...' : 'Test Webhook'}</span>
          </button>

          {testResult && (
            <span
              style={{
                fontSize: '0.68rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                color: testResult.success ? '#34d399' : '#fb7185',
              }}
            >
              {testResult.success ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
              <span>{testResult.status ? `${testResult.status} ${testResult.statusText}` : testResult.statusText || 'Error'}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
