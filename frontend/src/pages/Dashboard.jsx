import React, { useState, useEffect, useRef } from 'react';
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
  SlidersHorizontal,
  Play,
  Square,
  Radio,
  X,
  Zap,
  Gauge,
  BellRing,
  Terminal,
  Trash2,
  Thermometer,
  Wind,
  RotateCw,
  Vibrate,
  CircleDot
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
import { api } from '../services/api';
import { useNexusWebSocket } from '../hooks/useNexusWebSocket';

export default function Dashboard() {
  const [activeMetric, setActiveMetric] = useState('temperature');
  
  // Dashboard Metrics & Datasets
  const [stats, setStats] = useState({
    totalDevices: mockDevices.length,
    onlineDevices: mockDevices.filter((d) => d.status === 'online').length,
    offlineDevices: mockDevices.filter((d) => d.status !== 'online').length,
    totalTelemetryRecords: 14280,
    activeRules: mockRules.filter((r) => r.enabled).length,
    activeAlerts: mockAlerts.filter((a) => a.status === 'active').length,
  });

  const [chartData, setChartData] = useState(mockTelemetryChartData);
  const [recentAlerts, setRecentAlerts] = useState(mockAlerts);
  const [devicesList, setDevicesList] = useState(mockDevices);
  const [enginePipelines, setEnginePipelines] = useState([]);
  const [mockStreamState, setMockStreamState] = useState({
    isStreaming: false,
    sampleCount: 0,
    deviceId: 'DEV-TH-101',
  });
  const [activeToasts, setActiveToasts] = useState([]);
  const [latestPacket, setLatestPacket] = useState(null);
  
  // Real-Time Activity Stream Feed
  const [activityFeed, setActivityFeed] = useState([
    {
      id: 'init-1',
      type: 'device',
      title: 'Device Fleet Initialized',
      subtitle: 'Fleet baseline monitoring active across 4 nodes',
      timestamp: new Date().toLocaleTimeString(),
    },
    {
      id: 'init-2',
      type: 'rule',
      title: 'RxJS Pipelines Active',
      subtitle: 'Overheat & Vibration Interlocks armed',
      timestamp: new Date().toLocaleTimeString(),
    }
  ]);

  const activityTerminalRef = useRef(null);

  // Hook up WebSocket
  const {
    isConnected,
    lastTelemetry,
    lastAlert,
    lastRuleEvent,
    lastDeviceStatus,
    streamStatus,
  } = useNexusWebSocket();

  // Helper to add activity log item
  const pushActivity = (item) => {
    setActivityFeed((prev) => [
      {
        id: `act-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toLocaleTimeString(),
        ...item,
      },
      ...prev.slice(0, 30),
    ]);
  };

  // Load initial data on mount
  useEffect(() => {
    async function loadInitialData() {
      try {
        const statsData = await api.getDashboardStats();
        if (statsData?.summary) setStats(statsData.summary);
        if (statsData?.recentAlerts?.length > 0) setRecentAlerts(statsData.recentAlerts);

        const series = await api.getTelemetryChartSeries();
        if (series?.length > 0) setChartData(series);

        const engineData = await api.getEngineStatus();
        if (engineData?.pipelines) setEnginePipelines(engineData.pipelines);

        const streamData = await api.getMockStreamStatus();
        if (streamData) setMockStreamState(streamData);

        // Load devices and attach latest readings
        const devices = await api.getDevices();
        const latestReadings = await api.getLatestTelemetry();
        
        if (devices && devices.length > 0) {
          const merged = devices.map((d) => {
            const reading = Array.isArray(latestReadings) 
              ? latestReadings.find((r) => r.deviceId === d.deviceId) 
              : null;
            return {
              ...d,
              latestTelemetry: reading || {
                temperature: 24.5,
                pressure: 1013.2,
                rpm: 1800,
                vibration: 0.18,
              },
            };
          });
          setDevicesList(merged);
        }
      } catch (err) {
        console.warn('Could not load initial API data:', err.message);
      }
    }

    loadInitialData();
  }, []);

  // Handle incoming real-time telemetry from WebSocket
  useEffect(() => {
    if (!lastTelemetry) return;

    setLatestPacket(lastTelemetry);

    // Increment telemetry count in summary card
    setStats((prev) => ({
      ...prev,
      totalTelemetryRecords: prev.totalTelemetryRecords + 1,
    }));

    // Slide incoming point into Recharts dataset
    const formattedPoint = {
      time: new Date(lastTelemetry.timestamp || Date.now()).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      temperature: Number(lastTelemetry.temperature ?? lastTelemetry.metrics?.temperature ?? 24),
      pressure: Number(lastTelemetry.pressure ?? lastTelemetry.metrics?.pressure ?? 1013),
      rpm: Number(lastTelemetry.rpm ?? lastTelemetry.metrics?.rpm ?? 1800),
      vibration: Number(lastTelemetry.vibration ?? lastTelemetry.metrics?.vibration ?? 0.2),
      humidity: Number(lastTelemetry.metrics?.humidity ?? 48),
      deviceId: lastTelemetry.deviceId,
    };

    setChartData((prev) => [...prev.slice(-19), formattedPoint]);

    // Update specific device in the fleet list
    setDevicesList((prev) =>
      prev.map((dev) =>
        dev.deviceId === lastTelemetry.deviceId
          ? {
              ...dev,
              status: 'online',
              lastActivity: 'Just now',
              latestTelemetry: {
                temperature: lastTelemetry.temperature,
                pressure: lastTelemetry.pressure,
                rpm: lastTelemetry.rpm,
                vibration: lastTelemetry.vibration,
              },
              _flash: true,
            }
          : dev
      )
    );

    // Push into real-time activity log
    pushActivity({
      type: 'telemetry',
      title: `Telemetry Ingested: ${lastTelemetry.deviceId}`,
      subtitle: `${lastTelemetry.temperature}°C • ${lastTelemetry.pressure} hPa • ${lastTelemetry.rpm} RPM • ${lastTelemetry.vibration}G`,
    });
  }, [lastTelemetry]);

  // Handle incoming device status updates from WebSocket
  useEffect(() => {
    if (!lastDeviceStatus) return;

    if (lastDeviceStatus.action === 'created' && lastDeviceStatus.device) {
      setDevicesList((prev) => [lastDeviceStatus.device, ...prev]);
      pushActivity({
        type: 'device',
        title: `New Device Registered: ${lastDeviceStatus.device.deviceId}`,
        subtitle: `${lastDeviceStatus.device.name} (${lastDeviceStatus.device.type})`,
      });
      return;
    }

    if (lastDeviceStatus.action === 'deleted' && lastDeviceStatus.deviceId) {
      setDevicesList((prev) => prev.filter((d) => d.deviceId !== lastDeviceStatus.deviceId));
      pushActivity({
        type: 'device',
        title: `Device Removed: ${lastDeviceStatus.deviceId}`,
        subtitle: 'Decommissioned from IoT fleet',
      });
      return;
    }

    if (lastDeviceStatus.deviceId) {
      setDevicesList((prev) =>
        prev.map((dev) =>
          dev.deviceId === lastDeviceStatus.deviceId
            ? {
                ...dev,
                status: lastDeviceStatus.status || dev.status,
                lastActivity: 'Just now',
                latestTelemetry: lastDeviceStatus.latestTelemetry || dev.latestTelemetry,
              }
            : dev
        )
      );
      pushActivity({
        type: 'device',
        title: `Device Status: ${lastDeviceStatus.deviceId}`,
        subtitle: `State: ${lastDeviceStatus.status || 'online'} • Ping acknowledged`,
      });
    }
  }, [lastDeviceStatus]);

  // Handle incoming real-time alerts from WebSocket
  useEffect(() => {
    if (!lastAlert) return;

    // Prepend to recent alerts table
    setRecentAlerts((prev) => {
      const exists = prev.some((a) => a._id === lastAlert._id);
      if (exists) return prev;
      return [lastAlert, ...prev.slice(0, 8)];
    });

    setStats((prev) => ({
      ...prev,
      activeAlerts: prev.activeAlerts + 1,
    }));

    // Trigger visual toast notification banner
    const newToast = {
      id: lastAlert._id || Date.now(),
      title: lastAlert.title || 'Rule Threshold Exceeded',
      message: lastAlert.message || 'Parameter boundary condition reached.',
      severity: lastAlert.severity || 'warning',
      deviceId: lastAlert.deviceId || 'DEV-TH-101',
      valueDetected: lastAlert.valueDetected,
      timestamp: new Date().toLocaleTimeString(),
    };

    setActiveToasts((prev) => [newToast, ...prev.slice(0, 2)]);

    // Push into real-time activity log
    pushActivity({
      type: 'alert',
      title: `🚨 ${lastAlert.title}`,
      subtitle: `Target: ${lastAlert.deviceId} • Detected: ${lastAlert.valueDetected ?? 'N/A'}`,
    });

    // Auto dismiss after 7 seconds
    const timer = setTimeout(() => {
      setActiveToasts((prev) => prev.filter((t) => t.id !== newToast.id));
    }, 7000);

    return () => clearTimeout(timer);
  }, [lastAlert]);

  // Handle incoming rule execution event from WebSocket
  useEffect(() => {
    if (!lastRuleEvent) return;

    setEnginePipelines((prev) => {
      const copy = [...prev];
      const idx = copy.findIndex((p) => p.ruleId === lastRuleEvent.ruleId);
      if (idx !== -1) {
        copy[idx] = {
          ...copy[idx],
          executionCount: (copy[idx].executionCount || 0) + 1,
          lastTriggered: lastRuleEvent.lastTriggered || new Date().toISOString(),
        };
      }
      return copy;
    });

    pushActivity({
      type: 'rule',
      title: `⚡ Rule Pipeline Fired`,
      subtitle: `Rule: ${lastRuleEvent.ruleName || 'Visual Rule'} on ${lastRuleEvent.deviceId || 'device'}`,
    });
  }, [lastRuleEvent]);

  // Handle mock sensor stream status from WebSocket
  useEffect(() => {
    if (streamStatus) {
      setMockStreamState((prev) => ({ ...prev, ...streamStatus }));
    }
  }, [streamStatus]);

  // Dismiss alert toast
  const dismissToast = (id) => {
    setActiveToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Start continuous mock sensor stream
  const handleStartMockStream = async () => {
    try {
      const res = await api.startMockStream({
        intervalMs: 2500,
        deviceId: 'DEV-TH-101',
      });
      if (res?.config) {
        setMockStreamState((prev) => ({ ...prev, isStreaming: true, ...res.config }));
      }
    } catch (err) {
      console.error('Failed to start mock stream:', err);
    }
  };

  // Stop continuous mock sensor stream
  const handleStopMockStream = async () => {
    try {
      const res = await api.stopMockStream();
      if (res?.config) {
        setMockStreamState((prev) => ({ ...prev, isStreaming: false, ...res.config }));
      }
    } catch (err) {
      console.error('Failed to stop mock stream:', err);
    }
  };

  const metricConfigs = {
    temperature: {
      name: 'Temperature',
      stroke: '#06b6d4',
      fill: 'rgba(6, 182, 212, 0.25)',
      unit: '°C',
    },
    pressure: {
      name: 'Pressure',
      stroke: '#10b981',
      fill: 'rgba(16, 185, 129, 0.25)',
      unit: 'hPa',
    },
    rpm: {
      name: 'RPM',
      stroke: '#8b5cf6',
      fill: 'rgba(139, 92, 246, 0.25)',
      unit: 'RPM',
    },
    vibration: {
      name: 'Vibration',
      stroke: '#f59e0b',
      fill: 'rgba(245, 158, 11, 0.25)',
      unit: 'G',
    },
  };

  const currentConfig = metricConfigs[activeMetric] || metricConfigs.temperature;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Visual Alert Toast Banner(s) at Top */}
      {activeToasts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {activeToasts.map((toast) => {
            const isCritical = toast.severity === 'critical';
            const isWarning = toast.severity === 'warning';
            const borderCol = isCritical ? 'var(--accent-rose)' : isWarning ? 'var(--accent-amber)' : 'var(--accent-cyan)';
            const bgCol = isCritical ? 'rgba(244, 63, 94, 0.15)' : isWarning ? 'rgba(245, 158, 11, 0.15)' : 'rgba(6, 182, 212, 0.15)';

            return (
              <div
                key={toast.id}
                className="toast-banner-enter"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.85rem 1.25rem',
                  borderRadius: '10px',
                  background: bgCol,
                  border: `1px solid ${borderCol}`,
                  boxShadow: `0 4px 18px ${isCritical ? 'rgba(244, 63, 94, 0.3)' : 'rgba(245, 158, 11, 0.2)'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <span className={isCritical ? 'pulse-dot-red' : 'pulse-dot-amber'}></span>
                  <BellRing size={20} color={borderCol} />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <strong style={{ fontSize: '0.9rem', color: '#fff' }}>{toast.title}</strong>
                      <span className={`badge badge-${toast.severity}`}>{toast.severity.toUpperCase()}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{toast.timestamp}</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                      Device: <span className="font-mono" style={{ color: '#fff', fontWeight: 600 }}>{toast.deviceId}</span> • {toast.message}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => dismissToast(toast.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    padding: '0.3rem',
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Dashboard Top Header & Live WebSocket Status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#fff' }}>IoT Telemetry Overview</h1>
            {/* Live WebSocket Connection Badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.25rem 0.65rem',
                borderRadius: '20px',
                fontSize: '0.72rem',
                fontWeight: 600,
                background: isConnected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                border: `1px solid ${isConnected ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
                color: isConnected ? '#34d399' : '#fbbf24',
              }}
            >
              <span className={isConnected ? 'pulse-dot-green' : 'pulse-dot-amber'}></span>
              <span>{isConnected ? 'LIVE WEBSOCKET' : 'CONNECTING...'}</span>
            </div>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Real-time sensory telemetry streaming, dynamic per-device metrics, and RxJS rule interlocks.
          </p>
        </div>

        {/* Continuous Mock Sensor Controls & Quick Links */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {mockStreamState.isStreaming ? (
            <button
              onClick={handleStopMockStream}
              className="btn btn-secondary"
              style={{
                fontSize: '0.8rem',
                borderColor: 'var(--accent-rose)',
                color: '#fb7185',
                background: 'rgba(244, 63, 94, 0.1)',
              }}
            >
              <Square size={14} fill="#fb7185" />
              <span>Stop Mock Sensor</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                ({mockStreamState.sampleCount} pkts)
              </span>
            </button>
          ) : (
            <button
              onClick={handleStartMockStream}
              className="btn btn-primary"
              style={{
                fontSize: '0.8rem',
                background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
              }}
            >
              <Play size={14} fill="#fff" />
              <span>Start Mock Sensor</span>
            </button>
          )}

          <Link to="/rules" className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>
            <Workflow size={15} />
            <span>Rule Builder</span>
          </Link>
          <Link to="/devices" className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>
            <Cpu size={15} />
            <span>Manage Devices</span>
          </Link>
        </div>
      </div>

      {/* Mock Stream Real-time Status Bar (if active) */}
      {mockStreamState.isStreaming && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.65rem 1.25rem',
            borderRadius: '8px',
            background: 'rgba(6, 182, 212, 0.08)',
            border: '1px solid rgba(6, 182, 212, 0.25)',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Radio size={16} color="var(--accent-cyan)" />
            <span>
              Mock Sensor Stream Active: Generating telemetry packets every <strong style={{ color: '#fff' }}>2.5s</strong> targeting{' '}
              <span className="font-mono" style={{ color: 'var(--accent-cyan)' }}>{mockStreamState.deviceId}</span>
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span>
              Emitted Samples: <strong style={{ color: '#fff' }}>{mockStreamState.sampleCount}</strong>
            </span>
            {latestPacket && (
              <span style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)' }}>
                Latest: {latestPacket.temperature}°C / {latestPacket.pressure} hPa / {latestPacket.vibration}G
              </span>
            )}
          </div>
        </div>
      )}

      {/* Summary Cards Grid */}
      <div className="stats-grid">
        {/* 1. Total Devices */}
        <div className="stat-card">
          <div>
            <div className="stat-label">Total Devices</div>
            <div className="stat-value">{devicesList.length}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.5rem', fontSize: '0.75rem', color: '#34d399' }}>
              <span className="status-dot online"></span>
              <span>{devicesList.filter((d) => d.status === 'online').length} Online</span>
              <span style={{ color: 'var(--text-muted)' }}>• {devicesList.filter((d) => d.status !== 'online').length} Offline</span>
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
            <div className="stat-value">{stats.totalTelemetryRecords.toLocaleString()}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>
              <TrendingUp size={14} />
              <span>Real-Time Stream Active</span>
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
            <div className="stat-value">{stats.activeRules}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.5rem', fontSize: '0.75rem', color: '#a855f7' }}>
              <CheckCircle2 size={14} />
              <span>RxJS Pipelines Running</span>
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
            <div className="stat-value" style={{ color: stats.activeAlerts > 0 ? '#fb7185' : 'var(--text-primary)' }}>
              {stats.activeAlerts}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.5rem', fontSize: '0.75rem', color: '#fb7185' }}>
              <AlertTriangle size={14} />
              <span>{recentAlerts.length} Captured</span>
            </div>
          </div>
          <div className="stat-icon-wrapper" style={{ background: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e' }}>
            <AlertTriangle size={24} />
          </div>
        </div>
      </div>

      {/* Real-time Telemetry Live Chart */}
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <SlidersHorizontal size={18} color="var(--accent-cyan)" />
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff' }}>
                Real-Time Telemetry Trends ({currentConfig.name})
              </h2>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              Sliding live window • Latest reading:{' '}
              <strong style={{ color: 'var(--accent-cyan)' }}>
                {chartData.length > 0 ? `${chartData[chartData.length - 1][activeMetric] ?? 'N/A'} ${currentConfig.unit}` : 'Awaiting data...'}
              </strong>
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
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                isAnimationActive={false}
                fillOpacity={1} 
                fill="url(#dashboardMetricGradient)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grid: 1. Latest Telemetry Per Device (Fleet View) & 2. Real-Time Activity Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem' }}>
        
        {/* Latest Telemetry Value for Each Device */}
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Cpu size={18} color="var(--accent-cyan)" />
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff' }}>Device Fleet Status & Latest Telemetry</h2>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                Real-time sensory readings by device with live status heartbeat
              </p>
            </div>
            <Link to="/devices" className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}>
              <span>All Devices</span>
              <ArrowUpRight size={13} />
            </Link>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Device</th>
                  <th>Status</th>
                  <th>Temperature</th>
                  <th>Pressure</th>
                  <th>RPM</th>
                  <th>Vibration</th>
                  <th>Last Seen</th>
                </tr>
              </thead>
              <tbody>
                {devicesList.map((dev) => {
                  const t = dev.latestTelemetry?.temperature ?? '24.0';
                  const p = dev.latestTelemetry?.pressure ?? '1013';
                  const r = dev.latestTelemetry?.rpm ?? '1800';
                  const v = dev.latestTelemetry?.vibration ?? '0.18';
                  const isOnline = dev.status === 'online';

                  return (
                    <tr key={dev.deviceId || dev._id}>
                      <td>
                        <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.85rem' }}>{dev.name}</div>
                        <div className="font-mono" style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)' }}>
                          {dev.deviceId}
                        </div>
                      </td>
                      <td>
                        <span className={`badge badge-${isOnline ? 'online' : 'offline'}`}>
                          <span className={isOnline ? 'pulse-dot-green' : 'pulse-dot-amber'}></span>
                          {isOnline ? 'ONLINE' : 'OFFLINE'}
                        </span>
                      </td>
                      <td>
                        <span className="device-metric-pill" style={{ color: '#38bdf8' }}>
                          <Thermometer size={12} />
                          {t}°C
                        </span>
                      </td>
                      <td>
                        <span className="device-metric-pill" style={{ color: '#34d399' }}>
                          <Wind size={12} />
                          {p} hPa
                        </span>
                      </td>
                      <td>
                        <span className="device-metric-pill" style={{ color: '#a78bfa' }}>
                          <RotateCw size={12} />
                          {r}
                        </span>
                      </td>
                      <td>
                        <span className="device-metric-pill" style={{ color: '#fbbf24' }}>
                          <Vibrate size={12} />
                          {v}G
                        </span>
                      </td>
                      <td style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {dev.lastActivity || 'Just now'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Real-Time Activity Stream Panel */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Terminal size={18} color="var(--accent-emerald)" />
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff' }}>Real-Time Activity Feed</h2>
                <span className="badge badge-online" style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem' }}>
                  <span className="pulse-dot-green"></span>
                  LIVE FEED
                </span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                Chronological event terminal capturing telemetry packets, interlocks, and alerts
              </p>
            </div>
            <button
              onClick={() => setActivityFeed([])}
              className="btn btn-outline"
              style={{ fontSize: '0.72rem', padding: '0.3rem 0.6rem', color: 'var(--text-muted)' }}
              title="Clear activity log"
            >
              <Trash2 size={13} />
              <span>Clear</span>
            </button>
          </div>

          <div className="activity-terminal" ref={activityTerminalRef} style={{ flex: 1, minHeight: '260px' }}>
            {activityFeed.length > 0 ? (
              activityFeed.map((item) => (
                <div key={item.id} className={`activity-item ${item.type}`}>
                  <div>
                    <div style={{ color: '#f8fafc', fontWeight: 500 }}>
                      {item.title}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '0.1rem' }}>
                      {item.subtitle}
                    </div>
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.68rem', marginLeft: '0.75rem', whiteSpace: 'nowrap' }}>
                    {item.timestamp}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                Awaiting incoming real-time telemetry, rules, and alert events...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Active Rule Execution Status Section */}
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Zap size={18} color="var(--accent-purple)" />
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff' }}>RxJS Rule Engine Execution Status</h2>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              Active reactive pipelines evaluating live telemetry streams in real time
            </p>
          </div>
          <Link to="/rules" className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}>
            <span>Build New Rule</span>
            <ArrowUpRight size={14} />
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
          {enginePipelines.length > 0 ? (
            enginePipelines.map((pipeline) => (
              <div
                key={pipeline.ruleId}
                style={{
                  background: '#0d121f',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff' }}>
                      {pipeline.ruleName}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      ID: <span className="font-mono">{pipeline.ruleId}</span>
                    </div>
                  </div>
                  <span className="badge badge-online">ACTIVE PIPELINE</span>
                </div>

                {/* Pipeline Flow Chain */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {(pipeline.nodes || [{ type: 'sensor' }, { type: 'condition' }, { type: 'alert' }]).map((n, i) => (
                    <React.Fragment key={i}>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          background: n.type === 'sensor' ? 'rgba(6, 182, 212, 0.15)' :
                                      n.type === 'filter' ? 'rgba(59, 130, 246, 0.15)' :
                                      n.type === 'movingAverage' ? 'rgba(245, 158, 11, 0.15)' :
                                      n.type === 'mathOperation' || n.type === 'math' ? 'rgba(56, 189, 248, 0.15)' :
                                      n.type === 'threshold' ? 'rgba(236, 72, 153, 0.15)' :
                                      n.type === 'and' ? 'rgba(16, 185, 129, 0.15)' :
                                      n.type === 'or' ? 'rgba(245, 158, 11, 0.15)' :
                                      n.type === 'condition' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                          color: n.type === 'sensor' ? '#06b6d4' :
                                 n.type === 'filter' ? '#3b82f6' :
                                 n.type === 'movingAverage' ? '#fbbf24' :
                                 n.type === 'mathOperation' || n.type === 'math' ? '#38bdf8' :
                                 n.type === 'threshold' ? '#f472b6' :
                                 n.type === 'and' ? '#34d399' :
                                 n.type === 'or' ? '#fbbf24' :
                                 n.type === 'condition' ? '#f59e0b' : '#f43f5e',
                          textTransform: 'uppercase',
                        }}
                      >
                        {n.type}
                      </span>
                      {i < (pipeline.nodes?.length || 3) - 1 && (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>➔</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', borderTop: '1px solid #161e31', paddingTop: '0.5rem', color: 'var(--text-secondary)' }}>
                  <span>
                    Executions: <strong style={{ color: 'var(--accent-cyan)' }}>{pipeline.executionCount ?? 0}</strong>
                  </span>
                  <span>
                    Last Triggered: {pipeline.lastTriggered ? new Date(pipeline.lastTriggered).toLocaleTimeString() : 'Awaiting trigger'}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div
              style={{
                padding: '1.5rem',
                background: '#0d121f',
                borderRadius: '8px',
                border: '1px dashed var(--border-color)',
                color: 'var(--text-muted)',
                fontSize: '0.85rem',
                textAlign: 'center',
                gridColumn: '1 / -1',
              }}
            >
              Active visual rules are compiled and evaluating incoming telemetry on the backend.
            </div>
          )}
        </div>
      </div>

      {/* Real-time Alerts Feed Section */}
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff' }}>Recent Alerts Feed</h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Out-of-bounds metrics and event thresholds flagged by active RxJS rule conditions
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
              {recentAlerts.map((alert) => (
                <tr key={alert._id || Math.random()}>
                  <td>
                    <span className={`badge badge-${alert.severity || 'warning'}`}>
                      {alert.severity || 'warning'}
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
                    {alert.valueDetected !== undefined && alert.valueDetected !== null ? String(alert.valueDetected) : 'N/A'}
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Clock size={12} />
                      <span>
                        {alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString() : 'Just now'}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge badge-${alert.status || 'active'}`}>
                      {alert.status || 'active'}
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
