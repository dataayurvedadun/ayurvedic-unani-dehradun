import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { LoginModal } from './components/LoginModal';
import { HospitalPortal } from './components/hospital/HospitalPortal';
import { AdminPortal } from './components/admin/AdminPortal';
import { AntiSleepModal } from './components/AntiSleepModal';
import { Activity, ShieldCheck, Heart } from 'lucide-react';

const MainApp: React.FC = () => {
  const { session, isLoading } = useAuth();
  const [isAntiSleepOpen, setIsAntiSleepOpen] = useState<boolean>(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-semibold tracking-wide text-emerald-300">
            Loading Ayurvedic & Unani Services Portal...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-900">
      {/* Header */}
      <Navbar onOpenAntiSleepModal={() => setIsAntiSleepOpen(true)} />

      {/* Main Content Area */}
      <main className="flex-1">
        {!session ? (
          <LoginModal onOpenAntiSleepModal={() => setIsAntiSleepOpen(true)} />
        ) : session.role === 'admin' ? (
          <AdminPortal />
        ) : (
          <HospitalPortal />
        )}
      </main>

      {/* Official Government Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-6 border-t border-slate-800 mt-12 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <p className="font-semibold text-slate-300">
              Ayurvedic & Unani Services, District Dehradun
            </p>
            <p className="text-slate-500 text-[11px] mt-0.5">
              Department of AYUSH, Government of Uttarakhand • Central Medical Indent & MIS System
            </p>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <button
              onClick={() => setIsAntiSleepOpen(true)}
              className="text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1 cursor-pointer font-medium"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Anti-Sleep Free Tier Setup</span>
            </button>
            <span className="text-slate-700">|</span>
            <span className="text-slate-500">Database: ayurvedic_unani_dehradun</span>
          </div>
        </div>
      </footer>

      {/* Anti-Sleep Modal */}
      <AntiSleepModal
        isOpen={isAntiSleepOpen}
        onClose={() => setIsAntiSleepOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
