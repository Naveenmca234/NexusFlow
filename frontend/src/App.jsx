import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import RuleBuilder from './pages/RuleBuilder';
import Devices from './pages/Devices';
import Telemetry from './pages/Telemetry';
import Alerts from './pages/Alerts';
import Login from './pages/Login';

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Auth Route */}
        <Route path="/login" element={<Login />} />

        {/* Protected Dashboard / Operational Routes */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="rules" element={<RuleBuilder />} />
          <Route path="devices" element={<Devices />} />
          <Route path="telemetry" element={<Telemetry />} />
          <Route path="alerts" element={<Alerts />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}
