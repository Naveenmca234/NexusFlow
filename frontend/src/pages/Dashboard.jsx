import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Cpu, 
  Activity, 
  Workflow, 
  AlertTriangle, 
  TrendingUp, 
  ArrowUpRight, 
  Clock, 
  CheckCircle2,
  SlidersHorizontal
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { 
  mockDevices, 
  mockTelemetryChartData, 
  mockAlerts, 
  mockRules 
} from '../mockData';

export default function Dashboard() {
  const [activeMetric, setActiveMetric] = useState('temperature');

  // Summary Metrics computed directly from mock data
  const totalDevices = mockDevices.length;
  const onlineDevices = mockDevices.filter((d) => d.status === 'online').length;
  const offlineDevices = mockDevices.filter((d) => d.status !== 'online').length;
  const totalTelemetryRecords = 14280;
  const activeRulesCount = mockRules.filter((r) => r.enabled).length;
  const recentAlertsCount = mockAlerts.filter((a) => a.status === 'active').length;

  const metricConfigs = {
    temperature: {
      name: 'Temperature',
      stroke: '#06b6d4',
      fill: 'rgba(6, 182, 212, 0.25)',
      unit: '°C',
    },
    humidity: {
      name: 'Humidity',
      stroke: '#3b82f6',
      fill: 'rgba(59, 130, 246, 0.25)',
      unit: '%',
    },
    pressure: {
      name: 'Pressure',
      stroke: '#10b981',
      fill: 'rgba(16, 185, 129, 0.25)',
      unit: 'hPa',
    },
    vibration: {
      name: 'Vibration',
      stroke: '#f59e0b',
      fill: 'rgba(245, 158, 11, 0.25)',
      unit: 'G',
    },
  };

  const currentConfig = metricConfigs[activeMetric];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Dashboard Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#fff' }}>IoT Telemetry Overview</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Sensory telemetry summary and active visual rule events across your IoT fleet.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Link to="/rules" className="btn btn-primary" style={{ fontSize: '0.8rem' }}>
            <Workflow size={15} />
            <span>Rule Builder</span>
          </Link>
          <Link to="/devices" className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>
            <Cpu size={15} />
            <span>Manage Devices</span>
          </Link>
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div className="stats-grid">
        {/* 1. Total Devices */}
        <div className="stat-card">
          <div>
            <div className="stat-label">Total Devices</div>
            <div className="stat-value">{totalDevices}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.5rem', fontSize: '0.75rem', color: '#34d399' }}>
              <span className="status-dot online"></span>
              <span>{onlineDevices} Online</span>
              <span style={{ color: 'var(--text-muted)' }}>• {offlineDevices} Offline</span>
            </div>
          </div>
          <div className="stat-icon-wrapper" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4' }}>
            <Cpu size={24} />
          </div>
        </div>

        {/* 2. Telemetry Records */}
        <div className="stat-card">
          <div>
            <div className="stat-label">Telemetry Records</div>
            <div className="stat-value">{totalTelemetryRecords.toLocaleString()}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>
              <TrendingUp size={14} />
              <span>+124 records / min</span>
            </div>
          </div>
          <div className="stat-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
            <Activity size={24} />
          </div>
        </div>

        {/* 3. Active Rules */}
        <div className="stat-card">
          <div>
            <div className="stat-label">Active Rules</div>
            <div className="stat-value">{activeRulesCount}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.5rem', fontSize: '0.75rem', color: '#a855f7' }}>
              <CheckCircle2 size={14} />
              <span>{mockRules.length} Total Defined</span>
            </div>
          </div>
          <div className="stat-icon-wrapper" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>
            <Workflow size={24} />
          </div>
        </div>

        {/* 4. Recent Alerts */}
        <div className="stat-card">
          <div>
            <div className="stat-label">Recent Alerts</div>
            <div className="stat-value" style={{ color: recentAlertsCount > 0 ? '#fb7185' : 'var(--text-primary)' }}>
              {recentAlertsCount}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.5rem', fontSize: '0.75rem', color: '#fb7185' }}>
              <AlertTriangle size={14} />
              <span>{mockAlerts.length} Total Flagged</span>
            </div>
          </div>
          <div className="stat-icon-wrapper" style={{ background: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e' }}>
            <AlertTriangle size={24} />
          </div>
        </div>
      </div>

      {/* Simple Telemetry Chart using Recharts */}
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <SlidersHorizontal size={18} color="var(--accent-cyan)" />
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff' }}>
                Fleet Telemetry Trends ({currentConfig.name})
              </h2>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              Sensor node DEV-TH-101 • 24-Hour Metric Observation Series
            </p>
          </div>

          {/* Metric Selector Tabs */}
          <div style={{ display: 'flex', gap: '0.4rem', background: '#090d16', padding: '0.25rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            {Object.keys(metricConfigs).map((key) => {
              const config = metricConfigs[key];
              const isSelected = activeMetric === key;
              return (
                <button
                  key={key}
                  onClick={() => setActiveMetric(key)}
                  style={{
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    background: isSelected ? '#1e293b' : 'transparent',
                    color: isSelected ? '#fff' : 'var(--text-secondary)',
                    border: isSelected ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid transparent',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {config.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Recharts Area Chart */}
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mockTelemetryChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="dashboardMetricGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={currentConfig.stroke} stopOpacity={0.35}/>
                  <stop offset="95%" stopColor={currentConfig.stroke} stopOpacity={0.0}/>
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
                unit={currentConfig.unit}
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
                formatter={(value) => [`${value} ${currentConfig.unit}`, currentConfig.name]}
              />
              <Area 
                type="monotone" 
                dataKey={activeMetric} 
                stroke={currentConfig.stroke} 
                strokeWidth={2.5}
                fillOpacity={1} 
                fill="url(#dashboardMetricGradient)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Alerts Section */}
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff' }}>Recent Alerts</h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Out-of-bounds metrics and event thresholds flagged by active rules
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
                <th>Device ID</th>
                <th>Alert Event</th>
                <th>Observed Value</th>
                <th>Timestamp</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {mockAlerts.map((alert) => (
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
                    {alert.valueDetected || 'N/A'}
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Clock size={12} />
                      <span>{alert.timestamp}</span>
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
