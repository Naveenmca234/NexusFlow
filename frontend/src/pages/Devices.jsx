import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Plus, 
  Search, 
  Battery, 
  Radio, 
  MapPin, 
  Clock, 
  RefreshCw,
  SlidersHorizontal,
  X
} from 'lucide-react';
import { api } from '../services/api';

export default function Devices() {
  const [devices, setDevices] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // New device form state
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('Temperature');
  const [newLocation, setNewLocation] = useState('Facility Unit 4');

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const data = await api.getDevices();
      setDevices(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleRegisterDevice = async (e) => {
    e.preventDefault();
    const created = await api.createDevice({
      deviceId: `DEV-${newType.slice(0, 2).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
      name: newName,
      type: newType,
      location: newLocation,
      status: 'online',
      batteryLevel: 100,
      firmwareVersion: 'v1.0.0',
    });
    setDevices([created, ...devices]);
    setShowModal(false);
    setNewName('');
  };

  const filteredDevices = devices.filter((d) => {
    const matchesSearch = d.name.toLowerCase().includes(search.toLowerCase()) || 
                          d.deviceId.toLowerCase().includes(search.toLowerCase()) ||
                          d.location?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff' }}>Connected IoT Devices</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Manage edge sensors, industrial gateways, and environmental nodes across all deployments.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={fetchDevices} className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button onClick={() => setShowModal(true)} className="btn btn-primary" style={{ fontSize: '0.8rem' }}>
            <Plus size={14} />
            Register Device
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-card" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1, minWidth: '240px', background: '#090d16', padding: '0.5rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <Search size={16} color="#64748b" />
          <input
            type="text"
            placeholder="Search by device ID, name, or location..."
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
                <th>Sensor Type</th>
                <th>Location</th>
                <th>Battery</th>
                <th>Firmware</th>
                <th>Last Ping</th>
              </tr>
            </thead>
            <tbody>
              {filteredDevices.map((device) => (
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
                    <span style={{ background: '#1e293b', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', color: '#cbd5e1' }}>
                      {device.type}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      <MapPin size={12} color="#94a3b8" />
                      <span>{device.location}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
                      <Battery size={14} color={device.batteryLevel > 30 ? '#10b981' : '#f43f5e'} />
                      <span className="font-mono">{device.batteryLevel}%</span>
                    </div>
                  </td>
                  <td className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {device.firmwareVersion}
                  </td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Clock size={12} />
                      <span>{device.lastSeen ? new Date(device.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Online'}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for adding device */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
        }}>
          <div style={{
            width: '100%',
            maxWidth: '440px',
            background: '#111726',
            border: '1px solid #23314f',
            borderRadius: '16px',
            padding: '1.75rem',
            boxShadow: '0 20px 40px rgba(0,0,0,0.8)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>Provision IoT Sensor</h2>
              <button onClick={() => setShowModal(false)} className="btn btn-outline" style={{ padding: '0.35rem' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleRegisterDevice} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Device Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cryo Cooler B3"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.75rem', background: '#090d16', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Sensor Modality
                </label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.75rem', background: '#090d16', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                >
                  <option value="Temperature">Temperature</option>
                  <option value="Vibration">Vibration</option>
                  <option value="Pressure">Pressure</option>
                  <option value="Humidity">Humidity</option>
                  <option value="Multi-Sensor">Multi-Sensor</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Installation Location
                </label>
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.75rem', background: '#090d16', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Provision Device
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
