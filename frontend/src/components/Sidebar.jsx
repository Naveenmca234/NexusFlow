import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Workflow, 
  Cpu, 
  Activity, 
  AlertTriangle, 
  Zap, 
  X,
  Radio,
  LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ isOpen, onClose }) {
  const { logout } = useAuth();
  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/rules', label: 'Rule Builder', icon: Workflow },
    { to: '/devices', label: 'Devices', icon: Cpu },
    { to: '/telemetry', label: 'Telemetry', icon: Activity },
    { to: '/alerts', label: 'Alerts', icon: AlertTriangle },
  ];

  const handleLogout = () => {
    if (onClose) onClose();
    logout();
  };

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div>
        {/* Brand Header */}
        <div className="brand-section">
          <div className="brand-logo-container">
            <div className="brand-logo-icon">
              <Zap size={20} />
            </div>
            <div>
              <div className="brand-title">NexusFlow</div>
              <div className="brand-subtitle">IoT Rule Engine</div>
            </div>
          </div>
          
          {/* Mobile Close Button */}
          {onClose && (
            <button 
              className="sidebar-close-btn" 
              onClick={onClose}
              aria-label="Close navigation menu"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="nav-links" aria-label="Main Navigation">
          <div className="nav-group-label">
            Operational Menu
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                onClick={onClose}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer Info Badge & Logout */}
      <div className="sidebar-footer">
        <div className="sidebar-status-card">
          <div className="status-card-header">
            <Radio size={14} color="#10b981" />
            <span className="status-card-title">Telemetry Engine</span>
          </div>
          <p className="status-card-desc">Status: Ready & Active</p>
          <div className="status-card-meta">v1.0.0 • Production Ready</div>
        </div>

        <button
          onClick={handleLogout}
          className="nav-item"
          style={{
            marginTop: '0.75rem',
            width: '100%',
            background: 'rgba(244, 63, 94, 0.08)',
            border: '1px solid rgba(244, 63, 94, 0.2)',
            color: '#f43f5e',
            cursor: 'pointer',
            padding: '0.6rem 0.8rem',
            borderRadius: 'var(--radius-sm, 6px)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontSize: '0.85rem',
            fontWeight: 500,
          }}
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
