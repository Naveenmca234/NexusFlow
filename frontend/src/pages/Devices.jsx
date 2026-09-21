import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Plus, 
  Search, 
  Battery, 
  MapPin, 
  Clock, 
  RefreshCw, 
  Trash2, 
  X, 
  SlidersHorizontal,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';

export default function Devices() {
  const [devices, setDevices] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Form State
  const [name, setName] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [type, setType] = useState('Temperature');
  const [status, setStatus] = useState('online');
  const [location, setLocation] = useState('Facility A - Zone 1');

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const data = await api.getDevices();
      setDevices(data || []);
    } catch (err) {
      console.error('Failed to load devices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleCreateDevice = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const payload = {
      name: name.trim(),
      deviceId: deviceId.trim() || `DEV-${type.slice(0, 2).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
      type,
      status,
      location: location.trim() || 'Facility Zone',
      batteryLevel: 100,
      firmwareVersion: 'v1.0.0',
      lastActivity: new Date(),
      lastSeen: new Date(),
    };

    try {
      const created = await api.createDevice(payload);
      setDevices((prev) => [created, ...prev]);
      setShowModal(false);
      setName('');
      setDeviceId('');
      setLocation('Facility A - Zone 1');
      setFeedback({ type: 'success', message: `Device "${payload.name}" added successfully.` });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      setFeedback({ type: 'error', message: 'Failed to create device: ' + err.message });
    }
  };

  const handleDeleteDevice = async (id, devName) => {
    if (!window.confirm(`Are you sure you want to delete device "${devName || id}"?`)) return;

    try {
      await api.deleteDevice(id);
      setDevices((prev) => prev.filter((d) => d._id !== id && d.deviceId !== id));
      setFeedback({ type: 'success', message: 'Device deleted successfully.' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      setFeedback({ type: 'error', message: 'Failed to delete device: ' + err.message });
    }
  };

  const formatLastActivity = (device) => {
    const timeVal = device.lastActivity || device.lastSeen;
    if (!timeVal) return 'Just now';
    if (typeof timeVal === 'string' && (timeVal.includes('ago') || timeVal === 'Just now')) {
      return timeVal;
    }
    const date = new Date(timeVal);
    if (isNaN(date.getTime())) return 'Recently';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const filteredDevices = devices.filter((d) => {
    const q = search.toLowerCase();
    const matchesSearch = 
      (d.name && d.name.toLowerCase().includes(q)) || 
      (d.deviceId && d.deviceId.toLowerCase().includes(q)) ||
      (d.location && d.location.toLowerCase().includes(q)) ||
      (d.type && d.type.toLowerCase().includes(q));
    const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff' }}>IoT Devices Fleet</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Inventory of registered sensory nodes, environmental monitors, and edge telemetry hardware.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button onClick={fetchDevices} className="btn btn-secondary" style={{ fontSize: '0.8rem' }} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button onClick={() => setShowModal(true)} className="btn btn-primary" style={{ fontSize: '0.8rem' }}>
            <Plus size={16} />
            <span>Add Device</span>
          </button>
        </div>
      </div>

      {/* Notifications / Feedback banner */}
      {feedback && (
        <div style={{
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          background: feedback.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.12)',
          border: `1px solid ${feedback.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
          color: feedback.type === 'success' ? '#34d399' : '#fb7185',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.85rem'
        }}>
          {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="glass-card" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1, minWidth: '240px', background: '#090d16', padding: '0.5rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <Search size={16} color="#64748b" />
          <input
            type="text"
            placeholder="Search by device ID, name, location or type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '0.85rem', outline: 'none', width: '100%' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <SlidersHorizontal size={14} color="#64748b" />
          {['all', 'online', 'warning', 'offline'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              style={{
                padding: '0.4rem 0.75rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'capitalize',
                background: statusFilter === st ? '#1e293b' : 'transparent',
                color: statusFilter === st ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                border: '1px solid',
                borderColor: statusFilter === st ? 'var(--accent-cyan)' : 'var(--border-color)',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Devices Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Device ID</th>
                <th>Device Name</th>
                <th>Type</th>
                <th>Location</th>
                <th>Battery</th>
                <th>Last Activity</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    No devices match your query. Click "Add Device" to register one.
                  </td>
                </tr>
              ) : (
                filteredDevices.map((device) => (
                  <tr key={device._id || device.deviceId}>
                    <td>
                      <span className={`badge badge-${device.status}`}>
                        <span className={`status-dot ${device.status}`}></span>
                        {device.status}
                      </span>
                    </td>
                    <td className="font-mono" style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>
                      {device.deviceId}
                    </td>
                    <td style={{ fontWeight: 600, color: '#f8fafc' }}>
                      {device.name}
                    </td>
                    <td>
                      <span style={{ background: '#1e293b', padding: '0.25rem 0.55rem', borderRadius: '4px', fontSize: '0.75rem', color: '#cbd5e1' }}>
                        {device.type}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                        <MapPin size={12} color="#94a3b8" />
                        <span>{device.location || 'Unassigned'}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
                        <Battery size={14} color={device.batteryLevel > 30 ? '#10b981' : '#f43f5e'} />
                        <span className="font-mono">{device.batteryLevel ?? 100}%</span>
                      </div>
                    </td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Clock size={12} />
                        <span>{formatLastActivity(device)}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => handleDeleteDevice(device._id || device.deviceId, device.name)}
                        className="btn btn-outline"
                        style={{ padding: '0.35rem 0.6rem', color: '#fb7185', borderColor: 'rgba(244, 63, 94, 0.25)' }}
                        title="Delete Device"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Device Modal Dialog */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
        }}>
          <div style={{
            width: '100%',
            maxWidth: '460px',
            background: '#111726',
            border: '1px solid #23314f',
            borderRadius: '16px',
            padding: '1.75rem',
            boxShadow: '0 20px 40px rgba(0,0,0,0.8)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Cpu size={20} color="var(--accent-cyan)" />
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>Add New IoT Device</h2>
              </div>
              <button 
                onClick={() => setShowModal(false)} 
                className="btn btn-outline" 
                style={{ padding: '0.35rem' }}
                aria-label="Close dialog"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateDevice} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Device Name <span style={{ color: '#fb7185' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cold Storage Temp Sensor 1"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.75rem', background: '#090d16', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Device ID (optional, auto-generated if blank)
                </label>
                <input
                  type="text"
                  placeholder="e.g. DEV-TH-105"
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.75rem', background: '#090d16', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.75rem', background: '#090d16', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                  >
                    <option value="Temperature">Temperature</option>
                    <option value="Humidity">Humidity</option>
                    <option value="Pressure">Pressure</option>
                    <option value="Vibration">Vibration</option>
                    <option value="Multi-Sensor">Multi-Sensor</option>
                    <option value="Gateway">Gateway</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Initial Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.75rem', background: '#090d16', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                  >
                    <option value="online">Online</option>
                    <option value="warning">Warning</option>
                    <option value="offline">Offline</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Location / Zone
                </label>
                <input
                  type="text"
                  placeholder="e.g. Warehouse Alpha - Zone 3"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.75rem', background: '#090d16', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Device
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
