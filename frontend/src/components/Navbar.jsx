import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, Bell, Activity, ShieldCheck, User } from 'lucide-react';

export default function Navbar({ onToggleSidebar }) {
  const location = useLocation();
  const [time, setTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getPageInfo = (pathname) => {
    if (pathname.startsWith('/rules')) return { title: 'Rule Builder', category: 'Automation & Logic' };
    if (pathname.startsWith('/devices')) return { title: 'Device Fleet', category: 'Sensor Management' };
    if (pathname.startsWith('/telemetry')) return { title: 'Telemetry Stream', category: 'Real-time Metrics' };
    if (pathname.startsWith('/alerts')) return { title: 'Incident Alerts', category: 'Triage & Monitoring' };
    return { title: 'Dashboard', category: 'Overview & Analytics' };
  };

  const pageInfo = getPageInfo(location.pathname);

  return (
    <header className="navbar-header">
      <div className="navbar-left">
        {/* Mobile Menu Toggle */}
        <button 
          className="menu-toggle-btn" 
          onClick={onToggleSidebar}
          aria-label="Toggle navigation menu"
        >
          <Menu size={20} />
        </button>

        {/* Page Title & Breadcrumb */}
        <div className="navbar-title-group">
          <div className="navbar-breadcrumb">
            <span>NexusFlow</span>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-current">{pageInfo.title}</span>
          </div>
          <h1 className="navbar-page-title">{pageInfo.title}</h1>
        </div>
      </div>

      <div className="navbar-right">
        {/* System Health Badge */}
        <div className="system-health-badge">
          <span className="status-dot online"></span>
          <span className="system-health-text">ENGINE ONLINE</span>
        </div>

        {/* Live Clock */}
        <div className="navbar-clock font-mono">
          {time}
        </div>

        {/* Notification Bell */}
        <button 
          className="navbar-icon-btn" 
          title="System Notifications"
          aria-label="View system notifications"
        >
          <Bell size={18} />
          <span className="notification-indicator"></span>
        </button>

        {/* User Profile Badge */}
        <div className="navbar-user-profile">
          <div className="user-avatar">
            <User size={16} />
          </div>
          <div className="user-details">
            <span className="user-name">IoT Admin</span>
            <span className="user-role">nexus-operator</span>
          </div>
        </div>
      </div>
    </header>
  );
}
