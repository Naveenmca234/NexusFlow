import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Workflow, 
  Cpu, 
  Activity, 
  AlertTriangle, 
  LogIn, 
  Zap,
  Radio,
  Server
} from 'lucide-react';

export default function Sidebar() {
  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/rules', label: 'Rule Builder', icon: Workflow },
    { to: '/devices', label: 'Devices', icon: Cpu },
    { to: '/telemetry', label: 'Telemetry', icon: Activity },
    { to: '/alerts', label: 'Alerts', icon: AlertTriangle },
  ];

  return (
    <aside className="sidebar">
      <div>
        {/* Brand Header */}
        <div className="brand-section">
          <div className="brand-logo-icon">
            <Zap size={20} />
          </div>
          <div>
            <div className="brand-title">NexusFlow</div>
            <div className="brand-subtitle">IoT Rule Engine</div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="nav-links">
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '0.5rem 0.85rem', fontWeight: 600 }}>
            Operational Engine
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer Info & Auth */}
      <div style={{ padding: '1.25rem', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ background: '#111726', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <Radio size={14} color="#10b981" />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#f8fafc' }}>MQTT Broker</span>
          </div>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>tcp://broker.nexusflow.io:1883</p>
        </div>

        <NavLink to="/login" className="nav-item" style={{ padding: '0.5rem 0.75rem' }}>
          <LogIn size={16} />
          <span>Switch Account / Login</span>
        </NavLink>
      </div>
    </aside>
  );
}
