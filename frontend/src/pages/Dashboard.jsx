import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Activity, 
  Workflow, 
  AlertTriangle, 
  TrendingUp, 
  ArrowUpRight, 
  RefreshCw,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { api } from '../services/api';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [activeMetric, setActiveMetric] = useState('temperature');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dashStats, series] = await Promise.all([
        api.getDashboardStats(),
        api.getTelemetryChartSeries(),
      ]);
      setStats(dashStats);
      setChartData(series);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const metricColors = {
    temperature: { stroke: '#06b6d4', fill: 'rgba(6, 182, 212, 0.25)', unit: '°C' },
    humidity: { stroke: '#3b82f6', fill: 'rgba(59, 130, 246, 0.25)', unit: '%' },
    pressure: { stroke: '#10b981', fill: 'rgba(16, 185, 129, 0.25)', unit: 'hPa' },
    vibration: { stroke: '#f59e0b', fill: 'rgba(245, 158, 11, 0.25)', unit: 'G' },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#fff' }}>IoT Telemetry Overview</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Real-time sensory telemetry aggregation and active rule triggers across all fleet nodes.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            onClick={loadData} 
            className="btn btn-secondary" 
            disabled={loading}
            style={{ fontSize: '0.8rem' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <Link to="/rules" className="btn btn-primary" style={{ fontSize: '0.8rem' }}>
            <Workflow size={14} />
            Open Rule Builder
          </Link>
        </div>
      </div>

      {/* 4 Stats Cards */}
      <div className="stats-grid">
        {/* Total Devices */}
        <div className="stat-card">
          <div>
            <div className="stat-label">Total Devices</div>
            <div className="stat-value">{stats?.summary?.totalDevices ?? 5}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.5rem', fontSize: '0.75rem', color: '#34d399' }}>
              <span className="status-dot online"></span>
              <span>{stats?.summary?.onlineDevices ?? 4} Online</span>
              <span style={{ color: 'var(--text-muted)' }}>• {stats?.summary?.offlineDevices ?? 1} Offline</span>
            </div>
          </div>
          <div className="stat-icon-wrapper" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4' }}>
            <Cpu size={24} />
          </div>
        </div>

        {/* Total Telemetry */}
        <div className="stat-card">
          <div>
            <div className="stat-label">Telemetry Records</div>
            <div className="stat-value">
              {stats?.summary?.totalTelemetryRecords?.toLocaleString() ?? '14,280'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>
              <TrendingUp size={14} />
              <span>+124 records / min</span>
            </div>
          </div>
          <div className="stat-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
            <Activity size={24} />
          </div>
        </div>

        {/* Active Rules */}
        <div className="stat-card">
          <div>
            <div className="stat-label">Active Rules</div>
            <div className="stat-value">{stats?.summary?.activeRules ?? 2}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.5rem', fontSize: '0.75rem', color: '#a855f7' }}>
              <CheckCircle2 size={14} />
              <span>Reactive Evaluation ON</span>
            </div>
          </div>
          <div className="stat-icon-wrapper" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>
            <Workflow size={24} />
          </div>
        </div>

        {/* Recent Alerts */}
        <div className="stat-card">
          <div>
            <div className="stat-label">Active Alerts</div>
            <div className="stat-value" style={{ color: '#fb7185' }}>
              {stats?.summary?.activeAlerts ?? 2}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.5rem', fontSize: '0.75rem', color: '#fb7185' }}>
              <AlertTriangle size={14} />
              <span>Requires attention</span>
            </div>
          </div>
          <div className="stat-icon-wrapper" style={{ background: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e' }}>
            <AlertTriangle size={24} />
          </div>
        </div>
      </div>

      {/* Main Telemetry Recharts Area */}
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff' }}>
              Real-time Telemetry Trend ({activeMetric.toUpperCase()})
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Sensor node DEV-TH-101 • Facility Ambient Stream (24-hour cycle)
            </p>
          </div>

          {/* Metric Selector Tabs */}
          <div style={{ display: 'flex', gap: '0.4rem', background: '#090d16', padding: '0.25rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            {['temperature', 'humidity', 'pressure', 'vibration'].map((m) => (
              <button
                key={m}
                onClick={() => setActiveMetric(m)}
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  textTransform: 'capitalize',
                  background: activeMetric === m ? '#1e293b' : 'transparent',
                  color: activeMetric === m ? '#fff' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Recharts Container */}
        <div style={{ width: '100%', height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="metricGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={metricColors[activeMetric]?.stroke} stopOpacity={0.4}/>
                  <stop offset="95%" stopColor={metricColors[activeMetric]?.stroke} stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis 
                dataKey="time" 
                stroke="#64748b" 
                fontSize={12} 
                tickLine={false} 
              />
              <YAxis 
                stroke="#64748b" 
                fontSize={12} 
                tickLine={false}
                unit={metricColors[activeMetric]?.unit}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#111726',
                  borderColor: '#23314f',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '0.8rem',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                }}
              />
              <Area 
                type="monotone" 
                dataKey={activeMetric} 
                stroke={metricColors[activeMetric]?.stroke} 
                strokeWidth={2.5}
                fillOpacity={1} 
                fill="url(#metricGradient)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Alerts Feed Table */}
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff' }}>Recent Telemetry Alerts</h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Out-of-bounds metrics flagged by visual rule engine
            </p>
          </div>
          <Link to="/alerts" className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}>
            <span>View All Alerts</span>
            <ArrowUpRight size={14} />
          </Link>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Severity</th>
                <th>Device</th>
                <th>Alert Event</th>
                <th>Observed Value</th>
                <th>Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(stats?.recentAlerts || []).map((alert) => (
                <tr key={alert._id}>
                  <td>
                    <span className={`badge badge-${alert.severity}`}>
                      {alert.severity}
                    </span>
                  </td>
                  <td className="font-mono" style={{ color: 'var(--accent-cyan)', fontWeight: 500 }}>
                    {alert.deviceId}
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, color: '#f8fafc' }}>{alert.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{alert.message}</div>
                  </td>
                  <td className="font-mono">
                    {alert.valueDetected ? alert.valueDetected : 'N/A'}
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Clock size={12} />
                      <span>{alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge badge-${alert.status}`}>
                      {alert.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
