import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  RefreshCw, 
  Download, 
  Terminal, 
  CheckCircle, 
  Play, 
  Pause,
  Sliders,
  TrendingUp,
  Cpu
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { api } from '../services/api';

export default function Telemetry() {
  const [telemetry, setTelemetry] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [isLiveStreaming, setIsLiveStreaming] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState('DEV-TH-101');

  const loadData = async () => {
    try {
      const [series, list] = await Promise.all([
        api.getTelemetryChartSeries(),
        api.getTelemetryList(15),
      ]);
      setChartData(series);
      setTelemetry(list);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      if (isLiveStreaming) {
        // simulate streaming ticks
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const newPoint = {
          time: timeStr,
          temperature: parseFloat((23 + Math.random() * 4).toFixed(1)),
          humidity: parseFloat((48 + Math.random() * 6).toFixed(1)),
          pressure: parseFloat((1012 + Math.random() * 2).toFixed(1)),
          vibration: parseFloat((0.15 + Math.random() * 0.1).toFixed(2)),
        };

        setChartData((prev) => [...prev.slice(-14), newPoint]);
        setTelemetry((prev) => [
          {
            _id: `tel-${Date.now()}`,
            deviceId: selectedDevice,
            timestamp: now.toISOString(),
            metrics: newPoint,
          },
          ...prev.slice(0, 14),
        ]);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [isLiveStreaming, selectedDevice]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff' }}>Telemetry Ingestion Stream</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            High-throughput event bus streaming multi-sensor metric packets into the rule evaluation pipeline.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            onClick={() => setIsLiveStreaming(!isLiveStreaming)} 
            className={`btn ${isLiveStreaming ? 'btn-secondary' : 'btn-primary'}`}
            style={{ fontSize: '0.8rem' }}
          >
            {isLiveStreaming ? <Pause size={14} /> : <Play size={14} />}
            {isLiveStreaming ? 'Pause Stream' : 'Resume Live'}
          </button>
          <button onClick={loadData} className="btn btn-outline" style={{ fontSize: '0.8rem' }}>
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>

      {/* Dual Live Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
        {/* Temp & Humidity */}
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff' }}>Temperature (°C) & Humidity (%)</span>
            <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>DEV-TH-101</span>
          </div>
          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: '#111726', borderColor: '#23314f', borderRadius: '8px' }} />
                <Line type="monotone" dataKey="temperature" stroke="#06b6d4" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="humidity" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pressure & Vibration */}
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff' }}>Pressure (hPa) & Vibration (G)</span>
            <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>DEV-PR-301</span>
          </div>
          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: '#111726', borderColor: '#23314f', borderRadius: '8px' }} />
                <Line type="monotone" dataKey="pressure" stroke="#10b981" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="vibration" stroke="#f59e0b" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Telemetry Stream Raw Log Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Terminal size={16} color="var(--accent-cyan)" />
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff' }}>Live Event Feed</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Showing latest 15 packets
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Device ID</th>
                <th>Temperature</th>
                <th>Humidity</th>
                <th>Pressure</th>
                <th>Vibration</th>
                <th>Payload Status</th>
              </tr>
            </thead>
            <tbody>
              {telemetry.map((item, idx) => (
                <tr key={item._id || idx}>
                  <td className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : 'now'}
                  </td>
                  <td className="font-mono" style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>
                    {item.deviceId || 'DEV-TH-101'}
                  </td>
                  <td className="font-mono">
                    {item.metrics?.temperature ? `${item.metrics.temperature} °C` : '—'}
                  </td>
                  <td className="font-mono">
                    {item.metrics?.humidity ? `${item.metrics.humidity} %` : '—'}
                  </td>
                  <td className="font-mono">
                    {item.metrics?.pressure ? `${item.metrics.pressure} hPa` : '—'}
                  </td>
                  <td className="font-mono">
                    {item.metrics?.vibration ? `${item.metrics.vibration} G` : '—'}
                  </td>
                  <td>
                    <span className="badge badge-online" style={{ fontSize: '0.65rem' }}>
                      <CheckCircle size={10} />
                      VALIDATED
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
