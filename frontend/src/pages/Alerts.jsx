import React, { useState, useEffect, useMemo } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Search, 
  Check, 
  RefreshCw,
  BellRing,
  Radio,
  SlidersHorizontal,
  ShieldAlert,
  ShieldCheck,
  Eye,
  Activity,
  Cpu,
  Workflow,
  Timer
} from 'lucide-react';
import { api } from '../services/api';
import { useNexusWebSocket } from '../hooks/useNexusWebSocket';

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFeedback, setActionFeedback] = useState(null);

  const { isConnected, lastAlert, lastAlertUpdate } = useNexusWebSocket();

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const data = await api.getAlerts();
      setAlerts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  // Real-time synchronization when new alert is received via WebSocket
  useEffect(() => {
    if (!lastAlert) return;
    setAlerts((prev) => {
      // Avoid duplicate alert by ID
      if (prev.some((a) => (a._id && a._id === lastAlert._id) || (a.id && a.id === lastAlert.id))) {
        return prev;
      }
      return [lastAlert, ...prev];
    });
  }, [lastAlert]);

  // Real-time synchronization when an alert status update is received via WebSocket
  useEffect(() => {
    if (!lastAlertUpdate) return;
    setAlerts((prev) =>
      prev.map((a) => {
        const match = (a._id && a._id === lastAlertUpdate._id) || (a.id && a.id === lastAlertUpdate._id);
        return match ? { ...a, status: lastAlertUpdate.status } : a;
      })
    );
  }, [lastAlertUpdate]);

  // Status handlers
  const handleAcknowledge = async (id, title) => {
    try {
      const updated = await api.acknowledgeAlert(id);
      setAlerts((prev) =>
        prev.map((a) => (String(a._id) === String(id) || String(a.id) === String(id) ? { ...a, status: 'acknowledged' } : a))
      );
      setActionFeedback({ type: 'success', message: `Alert acknowledged successfully.` });
      setTimeout(() => setActionFeedback(null), 3000);
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
      setActionFeedback({ type: 'error', message: 'Failed to acknowledge alert.' });
      setTimeout(() => setActionFeedback(null), 3000);
    }
  };

  const handleResolve = async (id, title) => {
    try {
      const updated = await api.resolveAlert(id);
      setAlerts((prev) =>
        prev.map((a) => (String(a._id) === String(id) || String(a.id) === String(id) ? { ...a, status: 'resolved' } : a))
      );
      setActionFeedback({ type: 'success', message: `Alert resolved successfully.` });
      setTimeout(() => setActionFeedback(null), 3000);
    } catch (err) {
      console.error('Failed to resolve alert:', err);
      setActionFeedback({ type: 'error', message: 'Failed to resolve alert.' });
      setTimeout(() => setActionFeedback(null), 3000);
    }
  };

  // Helper to normalize display status
  const getNormalizedStatus = (rawStatus) => {
    const s = String(rawStatus || 'new').toLowerCase();
    if (s === 'active' || s === 'new') return 'new';
    if (s === 'acknowledged') return 'acknowledged';
    if (s === 'resolved') return 'resolved';
    return s;
  };

  // KPI Calculations
  const stats = useMemo(() => {
    const total = alerts.length;
    const newCount = alerts.filter((a) => getNormalizedStatus(a.status) === 'new').length;
    const ackCount = alerts.filter((a) => getNormalizedStatus(a.status) === 'acknowledged').length;
    const resCount = alerts.filter((a) => getNormalizedStatus(a.status) === 'resolved').length;
    return { total, newCount, ackCount, resCount };
  }, [alerts]);

  // Filtered Alert List
  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      const normStatus = getNormalizedStatus(alert.status);
      const matchStatus = statusFilter === 'all' || normStatus === statusFilter;
      const matchSeverity = severityFilter === 'all' || (alert.severity || 'warning') === severityFilter;
      
      const search = searchTerm.trim().toLowerCase();
      const matchSearch =
        !search ||
        (alert._id && String(alert._id).toLowerCase().includes(search)) ||
        (alert.deviceId && alert.deviceId.toLowerCase().includes(search)) ||
        (alert.ruleName && alert.ruleName.toLowerCase().includes(search)) ||
        (alert.title && alert.title.toLowerCase().includes(search)) ||
        (alert.message && alert.message.toLowerCase().includes(search));

      return matchStatus && matchSeverity && matchSearch;
    });
  }, [alerts, statusFilter, severityFilter, searchTerm]);

  // Format ID for clean display
  const formatAlertId = (id) => {
    if (!id) return 'ALT-N/A';
    const str = String(id);
    if (str.length > 12) {
      return `...${str.slice(-8)}`;
    }
    return str;
  };

  // Format value and units
  const formatTriggerValue = (alert) => {
    const val = alert.triggerValue ?? alert.valueDetected;
    if (val === null || val === undefined) return '—';
    if (typeof val === 'number') {
      return Number.isInteger(val) ? val : val.toFixed(2);
    }
    return String(val);
  };

  const formatThreshold = (alert) => {
    if (alert.threshold === null || alert.threshold === undefined) return '—';
    return alert.threshold;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
              Alert Management
            </h1>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.72rem',
                padding: '0.2rem 0.55rem',
                borderRadius: '999px',
                background: isConnected ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                color: isConnected ? '#34d399' : '#f87171',
                border: `1px solid ${isConnected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                fontWeight: 600,
              }}
            >
              <Radio size={10} className={isConnected ? 'animate-pulse' : ''} />
              {isConnected ? 'LIVE SYNC' : 'OFFLINE'}
            </div>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Monitor threshold breaches, manage cooldown policies, and track incident acknowledgement and resolution workflows.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={fetchAlerts} className="btn btn-secondary" style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh Alerts
          </button>
        </div>
      </div>

      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div
          style={{
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            background: actionFeedback.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.12)',
            border: `1px solid ${actionFeedback.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
            color: actionFeedback.type === 'success' ? '#34d399' : '#fb7185',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.85rem',
          }}
        >
          {actionFeedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{actionFeedback.message}</span>
        </div>
      )}

      {/* KPI Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        {/* Total Alerts */}
        <div className="glass-card" style={{ padding: '1.1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
            <BellRing size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Total Alerts</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff' }}>{stats.total}</div>
          </div>
        </div>

        {/* New Alerts */}
        <div 
          className="glass-card" 
          onClick={() => setStatusFilter('new')}
          style={{ 
            padding: '1.1rem', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '1rem', 
            cursor: 'pointer',
            border: statusFilter === 'new' ? '1px solid #f43f5e' : '1px solid var(--border-color)',
            background: statusFilter === 'new' ? 'rgba(244, 63, 94, 0.08)' : undefined
          }}
        >
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(244, 63, 94, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fb7185' }}>
            <ShieldAlert size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#fb7185', fontWeight: 600, textTransform: 'uppercase' }}>New</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff' }}>{stats.newCount}</div>
          </div>
        </div>

        {/* Acknowledged Alerts */}
        <div 
          className="glass-card" 
          onClick={() => setStatusFilter('acknowledged')}
          style={{ 
            padding: '1.1rem', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '1rem', 
            cursor: 'pointer',
            border: statusFilter === 'acknowledged' ? '1px solid #f59e0b' : '1px solid var(--border-color)',
            background: statusFilter === 'acknowledged' ? 'rgba(245, 158, 11, 0.08)' : undefined
          }}
        >
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fbbf24' }}>
            <Eye size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: 600, textTransform: 'uppercase' }}>Acknowledged</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff' }}>{stats.ackCount}</div>
          </div>
        </div>

        {/* Resolved Alerts */}
        <div 
          className="glass-card" 
          onClick={() => setStatusFilter('resolved')}
          style={{ 
            padding: '1.1rem', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '1rem', 
            cursor: 'pointer',
            border: statusFilter === 'resolved' ? '1px solid #10b981' : '1px solid var(--border-color)',
            background: statusFilter === 'resolved' ? 'rgba(16, 185, 129, 0.08)' : undefined
          }}
        >
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399' }}>
            <ShieldCheck size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 600, textTransform: 'uppercase' }}>Resolved</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff' }}>{stats.resCount}</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="glass-card" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        {/* Search Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1, minWidth: '220px', background: '#090d16', padding: '0.5rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <Search size={16} color="#64748b" />
          <input
            type="text"
            placeholder="Search by ID, Device, Rule name or message..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '0.85rem', outline: 'none', width: '100%' }}
          />
        </div>

        {/* State Filter Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginRight: '0.2rem' }}>STATE:</span>
          {[
            { key: 'all', label: 'All', count: stats.total },
            { key: 'new', label: 'New', count: stats.newCount },
            { key: 'acknowledged', label: 'Acknowledged', count: stats.ackCount },
            { key: 'resolved', label: 'Resolved', count: stats.resCount },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                background: statusFilter === tab.key ? '#1e293b' : 'transparent',
                color: statusFilter === tab.key ? '#38bdf8' : 'var(--text-secondary)',
                border: '1px solid',
                borderColor: statusFilter === tab.key ? '#38bdf8' : 'var(--border-color)',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'all 0.15s ease',
              }}
            >
              <span>{tab.label}</span>
              <span
                style={{
                  fontSize: '0.68rem',
                  padding: '0.1rem 0.35rem',
                  borderRadius: '999px',
                  background: statusFilter === tab.key ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  color: statusFilter === tab.key ? '#38bdf8' : 'var(--text-muted)',
                }}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Severity Filter Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <SlidersHorizontal size={14} color="#64748b" />
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            style={{
              background: '#090d16',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              fontSize: '0.75rem',
              fontWeight: 600,
              padding: '0.4rem 0.75rem',
              borderRadius: '6px',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="all">Severity: All</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>
        </div>
      </div>

      {/* Alert Management Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container" style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(15, 23, 42, 0.65)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>ALERT ID</th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>DEVICE</th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>RULE</th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>TRIGGER VALUE</th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>THRESHOLD</th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>TIMESTAMP</th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>STATUS</th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <RefreshCw size={22} className="animate-spin" style={{ margin: '0 auto 0.5rem' }} />
                    <div>Loading incidents from telemetry history...</div>
                  </td>
                </tr>
              ) : filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>
                    <CheckCircle2 size={36} color="#10b981" style={{ margin: '0 auto 0.75rem' }} />
                    <div style={{ color: '#fff', fontSize: '1rem', fontWeight: 600 }}>No Alerts Found</div>
                    <div style={{ fontSize: '0.82rem', marginTop: '0.25rem' }}>
                      All systems nominal. No alerts match the active filter criteria.
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAlerts.map((alert) => {
                  const normStatus = getNormalizedStatus(alert.status);
                  const alertId = alert._id || alert.id;
                  const severity = alert.severity || 'warning';

                  return (
                    <tr
                      key={alertId}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Alert ID */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span
                            className="font-mono"
                            title={String(alertId)}
                            style={{
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              color: '#94a3b8',
                              background: '#090d16',
                              padding: '0.2rem 0.45rem',
                              borderRadius: '4px',
                              border: '1px solid var(--border-color)',
                            }}
                          >
                            {formatAlertId(alertId)}
                          </span>
                        </div>
                      </td>

                      {/* Device */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Cpu size={14} color="#38bdf8" />
                          <span className="font-mono" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f8fafc' }}>
                            {alert.deviceId || 'DEV-N/A'}
                          </span>
                        </div>
                      </td>

                      {/* Rule */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Workflow size={13} color="#a855f7" />
                            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#e2e8f0' }}>
                              {alert.ruleName || alert.title || 'Visual Rule'}
                            </span>
                          </div>
                          {alert.cooldownSeconds && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.15rem' }}>
                              <Timer size={10} color="#64748b" />
                              <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                                Cooldown: {alert.cooldownSeconds}s
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Trigger Value */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          className="font-mono"
                          style={{
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            color: severity === 'critical' ? '#fb7185' : severity === 'warning' ? '#fbbf24' : '#38bdf8',
                            background: severity === 'critical' ? 'rgba(244, 63, 94, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            border: `1px solid ${severity === 'critical' ? 'rgba(244, 63, 94, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`,
                          }}
                        >
                          {formatTriggerValue(alert)}
                        </span>
                      </td>

                      {/* Threshold */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span className="font-mono" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          {formatThreshold(alert)}
                        </span>
                      </td>

                      {/* Timestamp */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          <Clock size={12} />
                          <span>
                            {alert.timestamp
                              ? new Date(alert.timestamp).toLocaleString([], {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit',
                                })
                              : 'Recently'}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            padding: '0.25rem 0.6rem',
                            borderRadius: '999px',
                            letterSpacing: '0.03em',
                            background:
                              normStatus === 'new'
                                ? 'rgba(244, 63, 94, 0.15)'
                                : normStatus === 'acknowledged'
                                ? 'rgba(245, 158, 11, 0.15)'
                                : 'rgba(16, 185, 129, 0.15)',
                            color:
                              normStatus === 'new'
                                ? '#fb7185'
                                : normStatus === 'acknowledged'
                                ? '#fbbf24'
                                : '#34d399',
                            border: `1px solid ${
                              normStatus === 'new'
                                ? 'rgba(244, 63, 94, 0.35)'
                                : normStatus === 'acknowledged'
                                ? 'rgba(245, 158, 11, 0.35)'
                                : 'rgba(16, 185, 129, 0.35)'
                            }`,
                          }}
                        >
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background:
                                normStatus === 'new'
                                  ? '#fb7185'
                                  : normStatus === 'acknowledged'
                                  ? '#fbbf24'
                                  : '#34d399',
                            }}
                          />
                          {normStatus}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem' }}>
                          {normStatus === 'new' && (
                            <button
                              onClick={() => handleAcknowledge(alertId, alert.title)}
                              title="Acknowledge alert"
                              style={{
                                padding: '0.3rem 0.6rem',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                background: '#1e293b',
                                color: '#fbbf24',
                                border: '1px solid rgba(245, 158, 11, 0.35)',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <Eye size={12} />
                              Acknowledge
                            </button>
                          )}

                          {normStatus !== 'resolved' && (
                            <button
                              onClick={() => handleResolve(alertId, alert.title)}
                              title="Resolve alert"
                              style={{
                                padding: '0.3rem 0.6rem',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                background: '#1e293b',
                                color: '#34d399',
                                border: '1px solid rgba(16, 185, 129, 0.35)',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <Check size={12} />
                              Resolve
                            </button>
                          )}

                          {normStatus === 'resolved' && (
                            <span
                              style={{
                                fontSize: '0.72rem',
                                color: '#34d399',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                              }}
                            >
                              <CheckCircle2 size={13} />
                              Closed
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
