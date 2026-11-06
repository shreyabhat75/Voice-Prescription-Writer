import React, { createContext, useContext, useState, useEffect } from 'react';
import { DoctorProfile, DEMO_DOCTORS } from '../types/auth';

export interface AuthContextType {
  doctor: DoctorProfile | null;
  isAuthenticated: boolean;
  roster: DoctorProfile[];
  login: (profile: DoctorProfile) => void;
  logout: () => void;
  authenticateWithSecretCode: (code: string) => { success: boolean; error?: string; doctor?: DoctorProfile };
  addDoctor: (newDoc: Omit<DoctorProfile, 'id' | 'loginCount' | 'patientsAttendedCount'> & { secretCode: string }) => boolean;
  removeDoctor: (id: string) => boolean;
  recordPatientAttended: (doctorId?: string) => void;
}

const STORAGE_SESSION_KEY = 'voicerx_doctor_session';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load initial persistent roster
  const [roster, setRoster] = useState<DoctorProfile[]>(() => {
    try {
      const storedRoster = localStorage.getItem('voicerx_doctor_roster');
      if (storedRoster) {
        const parsed = JSON.parse(storedRoster);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback to default demo doctors
    }
    return DEMO_DOCTORS;
  });

  // Current active doctor session
  const [doctor, setDoctor] = useState<DoctorProfile | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_SESSION_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Fallback
    }
    return null;
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('voicerx_doctor_session_auth') === 'true';
  });

  // Synchronize roster to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('voicerx_doctor_roster', JSON.stringify(roster));
    } catch {
      // Storage unavailable
    }
  }, [roster]);

  // Synchronize active session to localStorage
  useEffect(() => {
    try {
      if (doctor && isAuthenticated) {
        localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(doctor));
        localStorage.setItem('voicerx_doctor_session_auth', 'true');
        localStorage.setItem('voicerx_last_doctor', doctor.name);
      } else {
        localStorage.removeItem(STORAGE_SESSION_KEY);
        localStorage.setItem('voicerx_doctor_session_auth', 'false');
      }
    } catch {
      // Storage unavailable
    }
  }, [doctor, isAuthenticated]);

  const login = (profile: DoctorProfile) => {
    setDoctor(profile);
    setIsAuthenticated(true);
  };

  const logout = () => {
    setDoctor(null);
    setIsAuthenticated(false);
    try {
      localStorage.removeItem(STORAGE_SESSION_KEY);
      localStorage.setItem('voicerx_doctor_session_auth', 'false');
    } catch {
      // Storage unavailable
    }
  };

  const authenticateWithSecretCode = (code: string): { success: boolean; error?: string; doctor?: DoctorProfile } => {
    if (!code || !code.trim()) {
      return { success: false, error: 'Please enter a doctor secret code.' };
    }

    const cleanCode = code.trim().toLowerCase();
    const target = roster.find((d) => d.secretCode.trim().toLowerCase() === cleanCode);

    if (!target) {
      return { success: false, error: 'Invalid doctor secret code. Please verify credentials or contact administration.' };
    }

    const updatedRoster = roster.map((d) =>
      d.id === target.id ? { ...d, loginCount: target.loginCount + 1 } : d
    );
    setRoster(updatedRoster);
    try {
      localStorage.setItem('voicerx_doctor_roster', JSON.stringify(updatedRoster));
    } catch {
      // storage error
    }

    const authenticatedDoc: DoctorProfile = { ...target, loginCount: target.loginCount + 1 };
    setDoctor(authenticatedDoc);
    setIsAuthenticated(true);

    return { success: true, doctor: authenticatedDoc };
  };

  const addDoctor = (
    newDoc: Omit<DoctorProfile, 'id' | 'loginCount' | 'patientsAttendedCount'> & { secretCode: string }
  ): boolean => {
    if (!newDoc.name || !newDoc.name.trim() || !newDoc.secretCode || !newDoc.secretCode.trim() || !newDoc.registrationNumber || !newDoc.registrationNumber.trim()) {
      return false;
    }

    const trimmedCode = newDoc.secretCode.trim().toLowerCase();
    const duplicate = roster.some((d) => d.secretCode.trim().toLowerCase() === trimmedCode);
    if (duplicate) {
      return false;
    }

    const cleanName = newDoc.name.trim();
    const initials =
      newDoc.avatarInitials ||
      cleanName
        .replace(/^(Dr\.|Dr)\s*/i, '')
        .split(' ')
        .filter(Boolean)
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() ||
      'DR';

    const createdDoctor: DoctorProfile = {
      ...newDoc,
      id: `doc_${Date.now()}`,
      name: cleanName,
      title: newDoc.title?.trim() || 'Consultant Physician',
      department: newDoc.department?.trim() || 'General Medicine',
      registrationNumber: newDoc.registrationNumber.trim(),
      hospital: newDoc.hospital?.trim() || 'Apex Healthcare',
      avatarInitials: initials,
      secretCode: newDoc.secretCode.trim().toUpperCase(),
      loginCount: 0,
      patientsAttendedCount: 0,
    };

    const updated = [...roster, createdDoctor];
    setRoster(updated);
    try {
      localStorage.setItem('voicerx_doctor_roster', JSON.stringify(updated));
    } catch {
      // storage error
    }

    return true;
  };

  const removeDoctor = (id: string): boolean => {
    const updated = roster.filter((d) => d.id !== id);
    setRoster(updated);
    try {
      localStorage.setItem('voicerx_doctor_roster', JSON.stringify(updated));
    } catch {
      // storage error
    }

    if (doctor?.id === id) {
      logout();
    }

    return true;
  };

  const recordPatientAttended = (doctorId?: string) => {
    const targetId = doctorId || doctor?.id;
    if (!targetId) return;

    const updated = roster.map((d) =>
      d.id === targetId ? { ...d, patientsAttendedCount: (d.patientsAttendedCount || 0) + 1 } : d
    );
    setRoster(updated);
    try {
      localStorage.setItem('voicerx_doctor_roster', JSON.stringify(updated));
    } catch {
      // storage error
    }

    if (doctor && doctor.id === targetId) {
      setDoctor((prev) => (prev ? { ...prev, patientsAttendedCount: (prev.patientsAttendedCount || 0) + 1 } : null));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        doctor,
        isAuthenticated,
        roster,
        login,
        logout,
        authenticateWithSecretCode,
        addDoctor,
        removeDoctor,
        recordPatientAttended,
      }}
    >
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
