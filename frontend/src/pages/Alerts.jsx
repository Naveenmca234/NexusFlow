import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Filter, 
  ShieldAlert, 
  Check, 
  Radio, 
  RefreshCw,
  BellRing
} from 'lucide-react';
import { api } from '../services/api';

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const data = await api.getAlerts();
      setAlerts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleStatusChange = async (id, newStatus) => {
    await api.updateAlertStatus(id, newStatus);
    setAlerts((prev) =>
      prev.map((a) => (a._id === id ? { ...a, status: newStatus } : a))
    );
  };

  const filteredAlerts = alerts.filter((a) => {
    const matchSev = severityFilter === 'all' || a.severity === severityFilter;
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchSev && matchStatus;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff' }}>Telemetry Incident Center</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Track rule-triggered anomaly alerts, dispatch notifications, and manage resolution workflows.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={fetchAlerts} className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh Alerts
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="glass-card" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        {/* Severity Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>SEVERITY:</span>
          {['all', 'critical', 'warning', 'info'].map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'capitalize',
                background: severityFilter === sev ? '#1e293b' : 'transparent',
                color: severityFilter === sev ? '#fff' : 'var(--text-secondary)',
                border: '1px solid',
                borderColor: severityFilter === sev ? 'var(--accent-cyan)' : 'var(--border-color)',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              {sev}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>STATUS:</span>
          {['all', 'active', 'acknowledged', 'resolved'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'capitalize',
                background: statusFilter === st ? '#1e293b' : 'transparent',
                color: statusFilter === st ? '#38bdf8' : 'var(--text-secondary)',
                border: '1px solid',
                borderColor: statusFilter === st ? '#38bdf8' : 'var(--border-color)',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {filteredAlerts.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <CheckCircle2 size={42} color="#10b981" style={{ margin: '0 auto 0.75rem' }} />
            <h3 style={{ color: '#fff', fontSize: '1.1rem' }}>All Systems Nominal</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No alerts match the selected severity and status criteria.
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={alert._id}
              className="glass-card"
              style={{
                borderLeft: `4px solid ${
                  alert.severity === 'critical' ? '#f43f5e' : alert.severity === 'warning' ? '#f59e0b' : '#38bdf8'
                }`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '8px',
                  background: alert.severity === 'critical' ? 'rgba(244, 63, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: alert.severity === 'critical' ? '#fb7185' : '#fbbf24',
                  flexShrink: 0,
                }}>
                  <AlertTriangle size={20} />
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
                    <span className={`badge badge-${alert.severity}`}>{alert.severity}</span>
                    <span className="font-mono" style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                      {alert.deviceId}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>•</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Clock size={12} />
                      {alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f8fafc', marginBottom: '0.2rem' }}>
                    {alert.title}
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {alert.message}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span className={`badge badge-${alert.status}`} style={{ marginRight: '0.5rem' }}>
                  {alert.status}
                </span>

                {alert.status === 'active' && (
                  <button
                    onClick={() => handleStatusChange(alert._id, 'acknowledged')}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                  >
                    Acknowledge
                  </button>
                )}

                {alert.status !== 'resolved' && (
                  <button
                    onClick={() => handleStatusChange(alert._id, 'resolved')}
                    className="btn btn-outline"
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem', borderColor: 'rgba(16, 185, 129, 0.4)', color: '#34d399' }}
                  >
                    <Check size={12} />
                    Resolve
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
