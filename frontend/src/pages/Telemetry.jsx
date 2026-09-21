import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  RefreshCw, 
  Terminal, 
  CheckCircle, 
  Sparkles,
  SlidersHorizontal,
  Gauge,
  Thermometer,
  Zap,
  Filter
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid,
  Legend
} from 'recharts';
import { api } from '../services/api';

export default function Telemetry() {
  const [telemetry, setTelemetry] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState('all');
  const [selectedMetric, setSelectedMetric] = useState('all');
  const [generating, setGenerating] = useState(false);

  const loadTelemetryData = async () => {
    setLoading(true);
    try {
      const deviceParam = selectedDevice === 'all' ? null : selectedDevice;
      const [list, series] = await Promise.all([
        api.getTelemetryList(20, deviceParam),
        api.getTelemetryChartSeries(),
      ]);
      setTelemetry(list || []);
      setChartData(series || []);
    } catch (err) {
      console.error('Error loading telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTelemetryData();
  }, [selectedDevice]);

  const handleGenerateMock = async () => {
    setGenerating(true);
    try {
      const targetDev = selectedDevice === 'all' ? 'DEV-TH-101' : selectedDevice;
      await api.generateMockTelemetry(targetDev, 3);
      await loadTelemetryData();
    } catch (err) {
      console.error('Error generating telemetry:', err);
    } finally {
      setGenerating(false);
    }
  };

  const getMetricValue = (item, key) => {
    if (item[key] !== undefined && item[key] !== null) return item[key];
    if (item.metrics && item.metrics[key] !== undefined) return item.metrics[key];
    return '—';
  };

  const deviceOptions = [
    { value: 'all', label: 'All Devices' },
    { value: 'DEV-TH-101', label: 'DEV-TH-101 (Thermal Alpha)' },
    { value: 'DEV-VB-201', label: 'DEV-VB-201 (Turbine Motor)' },
    { value: 'DEV-PR-301', label: 'DEV-PR-301 (Hydraulic Line)' },
    { value: 'DEV-MS-401', label: 'DEV-MS-401 (Greenhouse Pod)' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff' }}>IoT Telemetry Ingestion</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Raw sensory time-series metrics: Temperature, Pressure, RPM, and Vibration stored in MongoDB.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button 
            onClick={handleGenerateMock} 
            className="btn btn-primary"
            style={{ fontSize: '0.8rem' }}
            disabled={generating}
          >
            <Sparkles size={14} className={generating ? 'animate-spin' : ''} />
            <span>{generating ? 'Generating...' : 'Generate Mock Telemetry'}</span>
          </button>
          <button 
            onClick={loadTelemetryData} 
            className="btn btn-secondary" 
            style={{ fontSize: '0.8rem' }}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-card" style={{ padding: '0.85rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Filter size={15} color="var(--accent-cyan)" />
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f8fafc' }}>Device Filter:</span>
          <select
            value={selectedDevice}
            onChange={(e) => setSelectedDevice(e.target.value)}
            className="node-field-select"
            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
          >
            {deviceOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Metric selection toggle */}
        <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Chart Focus:</span>
          {['all', 'temperature', 'pressure', 'rpm', 'vibration'].map((m) => (
            <button
              key={m}
              onClick={() => setSelectedMetric(m)}
              style={{
                padding: '0.3rem 0.6rem',
                fontSize: '0.7rem',
                fontWeight: 600,
                textTransform: 'capitalize',
                background: selectedMetric === m ? '#1e293b' : 'transparent',
                color: selectedMetric === m ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                border: '1px solid',
                borderColor: selectedMetric === m ? 'var(--accent-cyan)' : 'var(--border-color)',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Basic Telemetry Chart */}
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#fff' }}>Telemetry Sensor Metrics Trend</h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Real-time telemetry observations plotted across historical timestamps
            </p>
          </div>
          <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>
            Live Series
          </span>
        </div>

        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#111726',
                  borderColor: '#23314f',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '0.8rem',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '0.75rem', paddingTop: '8px' }} />

              {(selectedMetric === 'all' || selectedMetric === 'temperature') && (
                <Line 
                  type="monotone" 
                  name="Temperature (°C)" 
                  dataKey="temperature" 
                  stroke="#06b6d4" 
                  strokeWidth={2} 
                  dot={false} 
                />
              )}
              {(selectedMetric === 'all' || selectedMetric === 'pressure') && (
                <Line 
                  type="monotone" 
                  name="Pressure (hPa)" 
                  dataKey="pressure" 
                  stroke="#10b981" 
                  strokeWidth={2} 
                  dot={false} 
                />
              )}
              {(selectedMetric === 'all' || selectedMetric === 'rpm') && (
                <Line 
                  type="monotone" 
                  name="RPM" 
                  dataKey="rpm" 
                  stroke="#8b5cf6" 
                  strokeWidth={2} 
                  dot={false} 
                />
              )}
              {(selectedMetric === 'all' || selectedMetric === 'vibration') && (
                <Line 
                  type="monotone" 
                  name="Vibration (G)" 
                  dataKey="vibration" 
                  stroke="#f59e0b" 
                  strokeWidth={2} 
                  dot={false} 
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Telemetry Records Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Terminal size={16} color="var(--accent-cyan)" />
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#fff' }}>Recent Telemetry Records</h2>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Displaying latest {telemetry.length} packets
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Device ID</th>
                <th>Temperature</th>
                <th>Pressure</th>
                <th>RPM</th>
                <th>Vibration</th>
                <th>Storage Status</th>
              </tr>
            </thead>
            <tbody>
              {telemetry.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    No telemetry records found. Click "Generate Mock Telemetry" to simulate data packets.
                  </td>
                </tr>
              ) : (
                telemetry.map((item, idx) => (
                  <tr key={item._id || idx}>
                    <td className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {item.timestamp ? new Date(item.timestamp).toLocaleString([], { hour12: false }) : 'Just now'}
                    </td>
                    <td className="font-mono" style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>
                      {item.deviceId}
                    </td>
                    <td className="font-mono">
                      {getMetricValue(item, 'temperature')} °C
                    </td>
                    <td className="font-mono">
                      {getMetricValue(item, 'pressure')} hPa
                    </td>
                    <td className="font-mono" style={{ color: '#c084fc' }}>
                      {getMetricValue(item, 'rpm')} RPM
                    </td>
                    <td className="font-mono" style={{ color: '#fbbf24' }}>
                      {getMetricValue(item, 'vibration')} G
                    </td>
                    <td>
                      <span className="badge badge-online" style={{ fontSize: '0.65rem' }}>
                        <CheckCircle size={10} />
                        STORED
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
  );
}
