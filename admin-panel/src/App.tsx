import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import EmployeesPage from './pages/EmployeesPage';
import OfficePage from './pages/OfficePage';
import QRDisplayPage from './pages/QRDisplayPage';
import AttendancePage from './pages/AttendancePage';
import ReportsPage from './pages/ReportsPage';

const App: React.FC = () => {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* Full-screen QR display (no sidebar) – still guards auth inside */}
      <Route path="/offices/:id/qr" element={<QRDisplayPage />} />

      {/* Protected layout */}
      <Route element={<Layout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/employees" element={<EmployeesPage />} />
        <Route path="/offices" element={<OfficePage />} />
        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="/reports" element={<ReportsPage />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;

