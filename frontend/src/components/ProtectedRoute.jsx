import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Zap } from 'lucide-react';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#090d16',
        color: 'var(--text-secondary)',
        gap: '1rem',
      }}>
        <div style={{
          width: '44px',
          height: '44px',
          background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          boxShadow: '0 0 24px rgba(6, 182, 212, 0.4)',
          animation: 'pulse 1.5s infinite ease-in-out',
        }}>
          <Zap size={24} />
        </div>
        <div style={{ fontSize: '0.9rem', letterSpacing: '0.05em' }}>
          Verifying security credentials...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children ? children : <Outlet />;
}
