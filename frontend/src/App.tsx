import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { Dashboard } from './pages/Dashboard';
import { NewPrescription } from './pages/NewPrescription';
import { PrescriptionReview } from './pages/PrescriptionReview';
import { PrescriptionHistory } from './pages/PrescriptionHistory';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Product Overview & Landing */}
        <Route path="/" element={<LandingPage />} />

        {/* Doctor Workstation Sign-In */}
        <Route path="/login" element={<LoginPage />} />

        {/* Clinical Workspace (App Shell) */}
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/new" element={<NewPrescription />} />
          <Route path="/prescription/:id" element={<PrescriptionReview />} />
          <Route path="/history" element={<PrescriptionHistory />} />
        </Route>

        {/* Wildcard fallback to landing */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
};

export default App;
