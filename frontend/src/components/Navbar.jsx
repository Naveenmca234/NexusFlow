import React, { useState, useEffect } from 'react';
import { Bell, Activity, Wifi, ShieldCheck, User } from 'lucide-react';

export default function Navbar() {
  const [time, setTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="navbar-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span className="status-dot online"></span>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#34d399', letterSpacing: '0.05em' }}>
            ENGINE ONLINE
          </span>
        </div>

        <div style={{ height: '16px', width: '1px', background: 'var(--border-color)' }}></div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          <Activity size={14} color="#06b6d4" />
          <span>Ingestion: <strong>1.4k events/sec</strong></span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <div className="font-mono" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: '#111726', padding: '0.3rem 0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
          {time}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button 
            className="btn btn-outline" 
            style={{ padding: '0.45rem', borderRadius: '8px' }}
            title="System Notifications"
          >
            <Bell size={16} />
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', paddingLeft: '0.5rem', borderLeft: '1px solid var(--border-color)' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={16} color="#fff" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>IoT Admin</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>nexus-root</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
