import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Rules from './pages/Rules';
import RuleBuilder from './pages/RuleBuilder';
import Devices from './pages/Devices';
import Telemetry from './pages/Telemetry';
import Alerts from './pages/Alerts';
import Login from './pages/Login';
import Register from './pages/Register';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Dashboard & Operational Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="rules" element={<Rules />} />
            <Route path="rules/builder" element={<RuleBuilder />} />
            <Route path="rules/builder/:id" element={<RuleBuilder />} />
            <Route path="devices" element={<Devices />} />
            <Route path="telemetry" element={<Telemetry />} />
            <Route path="alerts" element={<Alerts />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
