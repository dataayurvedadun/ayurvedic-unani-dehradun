import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../lib/supabase';
import {
  ShieldCheck,
  Building2,
  LogOut,
  Database,
  Activity,
  User,
  ExternalLink,
  Info,
  Download,
} from 'lucide-react';

interface NavbarProps {
  onOpenAntiSleepModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAntiSleepModal }) => {
  const { session, logout } = useAuth();
  const [dbStatus, setDbStatus] = useState<{ isSupabase: boolean; message: string }>({
    isSupabase: false,
    message: 'Checking...',
  });
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);

  useEffect(() => {
    const isConfig = dbService.isConfigured();
    if (isConfig) {
      dbService.pingDatabase().then((res) => {
        setDbStatus({
          isSupabase: res.success,
          message: res.success ? 'Supabase Live DB' : 'Supabase Ping Failed',
        });
      });
    } else {
      setDbStatus({
        isSupabase: false,
        message: 'Free Tier Ready (Local Store)',
      });
    }

    if (
      typeof window !== 'undefined' &&
      (window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true)
    ) {
      setIsStandalone(true);
      return;
    }

    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallApp = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      const res = await installPrompt.userChoice;
      if (res.outcome === 'accepted') {
        setInstallPrompt(null);
      }
    } else {
      // Dispatch custom event for iOS or generic install guidance
      window.dispatchEvent(new CustomEvent('open-pwa-install'));
    }
  };

  return (
    <header className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white shadow-lg border-b border-emerald-700/40 sticky top-0 z-40">
      {/* Top micro banner for state/district notification */}
      <div className="bg-emerald-950/80 px-4 py-1 text-xs border-b border-emerald-800/40 text-emerald-200/90 flex justify-between items-center flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-semibold tracking-wider uppercase text-[11px]">
            Department of AYUSH • Government of Uttarakhand
          </span>
          <span className="hidden sm:inline text-emerald-400">|</span>
          <span className="hidden sm:inline">District Dehradun Central Repository</span>
        </div>
        <div className="flex items-center gap-3">
          {!isStandalone && (
            <button
              onClick={handleInstallApp}
              className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors cursor-pointer text-[11px] shadow-sm border border-emerald-400/40"
              title="Install AYUSH Dehradun App on your Phone or Computer"
            >
              <Download className="w-3 h-3 text-emerald-100" />
              <span>Install App</span>
            </button>
          )}

          <button
            onClick={onOpenAntiSleepModal}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-800/60 hover:bg-emerald-700/60 text-emerald-200 transition-colors cursor-pointer text-[11px]"
            title="Click to view Free Tier Anti-Sleep Keep-Alive setup"
          >
            <Activity className="w-3 h-3 text-emerald-300 animate-spin" style={{ animationDuration: '6s' }} />
            <span>Anti-Sleep Cron: <strong className="text-emerald-300">Active</strong></span>
            <Info className="w-3 h-3 text-emerald-400" />
          </button>

          <span
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${
              dbStatus.isSupabase
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            }`}
            title={dbStatus.message}
          >
            <Database className="w-3 h-3" />
            <span className="hidden md:inline">{dbStatus.message}</span>
            <span className="md:hidden">{dbStatus.isSupabase ? 'Supabase' : 'Free Demo'}</span>
          </span>
        </div>
      </div>

      {/* Main Header Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
        {/* Logo & Portal Title */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md ring-2 ring-emerald-400/30 flex-shrink-0">
            <svg
              className="w-7 h-7 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {/* Ayush Kalash / Leaf emblem */}
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 3v1m0 16v1m8.66-14l-.86.5M4.2 18.5l-.86.5M20.66 18.5l-.86-.5M4.2 4.5l-.86-.5M12 7a5 5 0 00-5 5c0 3.5 5 9 5 9s5-5.5 5-9a5 5 0 00-5-5z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-white leading-tight">
              Ayurvedic Unani Services, District Dehradun
            </h1>
            <p className="text-xs sm:text-sm text-emerald-200/80 font-medium">
              Medicine Demands, Monthly Progress Reports (MPR) & District Health MIS
            </p>
          </div>
        </div>

        {/* User Session Info & Actions */}
        {session && (
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="flex items-center justify-end gap-1.5 text-xs font-semibold text-emerald-300">
                {session.role === 'admin' ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>District Officer (Admin)</span>
                  </>
                ) : (
                  <>
                    <Building2 className="w-3.5 h-3.5 text-teal-400" />
                    <span className="truncate max-w-[200px]" title={session.hospital?.hospital_name}>
                      {session.hospital?.hospital_name}
                    </span>
                  </>
                )}
              </div>
              <div className="text-[11px] text-slate-300 flex items-center justify-end gap-1">
                <User className="w-3 h-3 text-slate-400" />
                <span>{session.officerName || 'Official'}</span>
              </div>
            </div>

            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-900/60 hover:bg-red-800 text-red-200 hover:text-white rounded-lg text-xs font-medium border border-red-700/50 transition shadow-sm cursor-pointer"
              title="Sign Out of Session"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
