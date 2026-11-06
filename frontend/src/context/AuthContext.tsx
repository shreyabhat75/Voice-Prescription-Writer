import React, { createContext, useContext, useState, useEffect } from 'react';
import { DoctorProfile, DEMO_DOCTORS } from '../types/auth';

interface AuthContextType {
  doctor: DoctorProfile;
  isAuthenticated: boolean;
  login: (profile: DoctorProfile) => void;
  logout: () => void;
}

const STORAGE_KEY = 'voicerx_doctor_session';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [doctor, setDoctor] = useState<DoctorProfile>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Fallback
    }
    return DEMO_DOCTORS[0];
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem(`${STORAGE_KEY}_auth`) === 'true';
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(doctor));
      localStorage.setItem(`${STORAGE_KEY}_auth`, String(isAuthenticated));
      // Also keep last doctor string for backwards compatibility
      localStorage.setItem('voicerx_last_doctor', doctor.name);
    } catch {
      // Storage unavailable or quota exceeded
    }
  }, [doctor, isAuthenticated]);

  const login = (profile: DoctorProfile) => {
    setDoctor(profile);
    setIsAuthenticated(true);
  };

  const logout = () => {
    setIsAuthenticated(false);
    try {
      localStorage.setItem(`${STORAGE_KEY}_auth`, 'false');
    } catch {
      // Storage unavailable
    }
  };

  return (
    <AuthContext.Provider value={{ doctor, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
