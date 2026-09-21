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
  Radio
} from 'lucide-react';

export default function Sidebar({ isOpen, onClose }) {
  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/rules', label: 'Rule Builder', icon: Workflow },
    { to: '/devices', label: 'Devices', icon: Cpu },
    { to: '/telemetry', label: 'Telemetry', icon: Activity },
    { to: '/alerts', label: 'Alerts', icon: AlertTriangle },
  ];

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

      {/* Footer Info Badge */}
      <div className="sidebar-footer">
        <div className="sidebar-status-card">
          <div className="status-card-header">
            <Radio size={14} color="#10b981" />
            <span className="status-card-title">Telemetry Engine</span>
          </div>
          <p className="status-card-desc">Status: Ready & Active</p>
          <div className="status-card-meta">v1.0.0 • Production Ready</div>
        </div>
      </div>
    </aside>
  );
}
