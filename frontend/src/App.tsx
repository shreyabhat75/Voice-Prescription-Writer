import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { NewPrescription } from './pages/NewPrescription';
import { PrescriptionReview } from './pages/PrescriptionReview';
import { PrescriptionHistory } from './pages/PrescriptionHistory';

export const App: React.FC = () => {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/new" element={<NewPrescription />} />
        <Route path="/prescription/:id" element={<PrescriptionReview />} />
        <Route path="/history" element={<PrescriptionHistory />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};

export default App;

