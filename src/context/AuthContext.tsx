import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthSession, HospitalMaster } from '../types';
import { dbService } from '../lib/supabase';

interface AuthContextType {
  session: AuthSession | null;
  isLoading: boolean;
  loginAsAdmin: (password: string) => Promise<{ success: boolean; error?: string }>;
  loginAsHospital: (
    hospitalId: string,
    password: string,
    officerName: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateOfficerName: (name: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'ayush_ddn_auth_session_v1';
const DEFAULT_ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'admin@ayush2026';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      if (saved) {
        setSession(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to restore session', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveSession = (newSession: AuthSession | null) => {
    setSession(newSession);
    if (newSession) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newSession));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  };

  const loginAsAdmin = async (password: string): Promise<{ success: boolean; error?: string }> => {
    if (!password.trim()) {
      return { success: false, error: 'Please enter the administrative master password.' };
    }
    if (password !== DEFAULT_ADMIN_PASSWORD) {
      return { success: false, error: 'Invalid master password. Please verify credentials.' };
    }

    const adminSession: AuthSession = {
      role: 'admin',
      officerName: 'District Ayurvedic & Unani Officer, Dehradun',
    };
    saveSession(adminSession);

    await dbService.addActivityLog({
      action: 'Admin Logged In',
      details: 'Administrator accessed the district dashboard',
      user: 'District Ayurvedic & Unani Officer',
      timestamp: new Date().toISOString(),
      category: 'admin',
    });

    return { success: true };
  };

  const loginAsHospital = async (
    hospitalId: string,
    password: string,
    officerName: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!hospitalId) {
      return { success: false, error: 'Please select your hospital / dispensary from the list.' };
    }
    if (!officerName.trim()) {
      return { success: false, error: 'Please enter the Submitting Officer / In-Charge Doctor name.' };
    }
    if (!password.trim()) {
      return { success: false, error: 'Please enter your assigned facility password.' };
    }

    const hospitals = await dbService.getHospitals();
    const hospital = hospitals.find((h) => h.id === hospitalId);

    if (!hospital) {
      return { success: false, error: 'Hospital not found in master records.' };
    }

    if (hospital.assigned_password !== password.trim()) {
      return { success: false, error: 'Incorrect password for selected hospital.' };
    }

    const hospSession: AuthSession = {
      role: 'hospital',
      hospital,
      officerName: officerName.trim(),
    };
    saveSession(hospSession);

    await dbService.addActivityLog({
      action: 'Hospital Portal Login',
      details: `Dr./Officer ${officerName.trim()} logged in`,
      user: `${hospital.hospital_name}`,
      timestamp: new Date().toISOString(),
      category: 'admin',
    });

    return { success: true };
  };

  const logout = () => {
    saveSession(null);
  };

  const updateOfficerName = (name: string) => {
    if (session && session.role === 'hospital') {
      const updated: AuthSession = { ...session, officerName: name };
      saveSession(updated);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        isLoading,
        loginAsAdmin,
        loginAsHospital,
        logout,
        updateOfficerName,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
