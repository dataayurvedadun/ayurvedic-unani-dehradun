import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../lib/supabase';
import { HospitalMaster } from '../types';
import {
  ShieldCheck,
  Building2,
  KeyRound,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Lock,
} from 'lucide-react';

interface LoginModalProps {
  onOpenAntiSleepModal?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onOpenAntiSleepModal }) => {
  const { loginAsAdmin, loginAsHospital } = useAuth();
  const [activeTab, setActiveTab] = useState<'hospital' | 'admin'>('hospital');

  // Hospital Login State
  const [hospitals, setHospitals] = useState<HospitalMaster[]>([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>('');
  const [hospitalPassword, setHospitalPassword] = useState<string>('');
  const [officerName, setOfficerName] = useState<string>('');

  // Admin Login State
  const [adminPassword, setAdminPassword] = useState<string>('');

  // Status & Error handling
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    dbService.getHospitals().then((list) => {
      setHospitals(list);
      if (list.length > 0) {
        setSelectedHospitalId(list[0].id);
      }
    });
  }, []);

  const handleHospitalChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedHospitalId(id);
    setHospitalPassword('');
    setError(null);
  };

  const handleHospitalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await loginAsHospital(selectedHospitalId, hospitalPassword, officerName);
      if (!res.success) {
        setError(res.error || 'Authentication failed');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await loginAsAdmin(adminPassword);
      if (!res.success) {
        setError(res.error || 'Authentication failed');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Welcome Banner */}
      <div className="text-center mb-8">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 mb-3">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          Official Central MIS & Medicine Demand Management System
        </span>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
          District Ayurvedic & Unani Services, Dehradun
        </h2>
        <p className="mt-2 text-slate-600 max-w-2xl mx-auto text-sm sm:text-base">
          Secure cloud repository for annual medicine demand consolidation, monthly progress reports (MPR), and special administrative surveys across all dispensaries and hospitals in District Dehradun.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Login Card */}
        <div className="lg:col-span-7 bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden">
          {/* Tabbed Switching */}
          <div className="flex border-b border-slate-200 bg-slate-50/70 p-1.5 gap-1.5">
            <button
              type="button"
              onClick={() => {
                setActiveTab('hospital');
                setError(null);
              }}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
                activeTab === 'hospital'
                  ? 'bg-white text-emerald-800 shadow-sm border border-emerald-200 ring-1 ring-emerald-500/10'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Building2 className={`w-4 h-4 ${activeTab === 'hospital' ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span>Hospital / Dispensary Login</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('admin');
                setError(null);
              }}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
                activeTab === 'admin'
                  ? 'bg-white text-emerald-800 shadow-sm border border-emerald-200 ring-1 ring-emerald-500/10'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <ShieldCheck className={`w-4 h-4 ${activeTab === 'admin' ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span>Admin / DAO Login</span>
            </button>
          </div>

          {/* Form Content */}
          <div className="p-6 sm:p-8">
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 font-medium">{error}</div>
              </div>
            )}

            {activeTab === 'hospital' ? (
              <form onSubmit={handleHospitalSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Select Your Hospital / Dispensary <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={selectedHospitalId}
                      onChange={handleHospitalChange}
                      required
                      className="w-full pl-3 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white transition text-slate-900 font-medium"
                    >
                      {hospitals.map((hosp) => (
                        <option key={hosp.id} value={hosp.id}>
                          [{hosp.uid || hosp.contact_phone || 'DDN'}] {hosp.hospital_name} ({hosp.category || hosp.block_name})
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Choose from {hospitals.length} registered State Ayurvedic Dispensaries, District Hospitals & CHCs.
                  </p>

                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Submitting Officer / Medical Officer Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={officerName}
                      onChange={(e) => setOfficerName(e.target.value)}
                      placeholder="e.g. Dr. Rajesh Kumar Sharma (AMO)"
                      required
                      className="w-full pl-10 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white transition text-slate-900"
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    This official name is permanently recorded on submitted medicine demands and reports.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Assigned Facility Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      value={hospitalPassword}
                      onChange={(e) => setHospitalPassword(e.target.value)}
                      placeholder="Enter assigned hospital password"
                      required
                      className="w-full pl-10 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white transition text-slate-900"
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Enter the assigned facility password provided by District Ayurvedic & Unani Office.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 focus:ring-4 focus:ring-emerald-300 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition shadow-md hover:shadow-lg disabled:opacity-60 cursor-pointer"
                >
                  <span>{isSubmitting ? 'Verifying Facility...' : 'Enter Hospital Dashboard'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <form onSubmit={handleAdminSubmit} className="space-y-5">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                  <div className="font-semibold text-slate-800 flex items-center gap-1.5 mb-1">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    District Administrative Authority
                  </div>
                  District Ayurvedic and Unani Officer (DAO) Dehradun office login for monitoring, medicine demand aggregation, report compilation, and dynamic form authoring.
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    District Administrative Master Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="Enter master admin password"
                      required
                      className="w-full pl-10 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white transition text-slate-900"
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Enter the district administrative master authorization key.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 bg-emerald-800 hover:bg-emerald-900 focus:ring-4 focus:ring-emerald-300 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition shadow-md hover:shadow-lg disabled:opacity-60 cursor-pointer"
                >
                  <span>{isSubmitting ? 'Verifying Admin Key...' : 'Enter District Admin Panel'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Right Column: Official Guidelines & Security Notice */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-gradient-to-br from-slate-900 to-emerald-950 text-white p-6 rounded-2xl shadow-xl border border-emerald-800/40">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-sm tracking-wide text-white uppercase">
                Official Access Guidelines
              </h3>
            </div>

            <p className="text-xs text-slate-300 mt-3 leading-relaxed">
              This system is strictly reserved for authorized officers and staff of the Department of Ayurvedic and Unani Services, District Dehradun.
            </p>

            <div className="mt-4 space-y-3 text-xs">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/70">
                <Building2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-100">Dispensary / Hospital Access</div>
                  <div className="text-slate-300 text-[11px] mt-0.5 leading-relaxed">
                    Select your facility from the dropdown, enter the attending Medical Officer name, and type your facility password.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/70">
                <Lock className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-100">Credential Confidentiality</div>
                  <div className="text-slate-300 text-[11px] mt-0.5 leading-relaxed">
                    Keep your facility login key confidential. Do not share credentials across unverified devices or unauthorized personnel.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/70">
                <UserCheck className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-100">Digital Audit Trail</div>
                  <div className="text-slate-300 text-[11px] mt-0.5 leading-relaxed">
                    Every submitted MPR report and medicine demand list is permanently stamped with the officer's name and submission timestamp.
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
              <span>District Office, Dehradun</span>
              <span className="text-emerald-400 font-semibold">Govt. of Uttarakhand</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

