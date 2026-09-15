import React, { useState } from 'react';
import { AdminOverview } from './AdminOverview';
import { AdminMedicineDemands } from './AdminMedicineDemands';
import { AdminMprTracker } from './AdminMprTracker';
import { AdminFormBuilder } from './AdminFormBuilder';
import { AdminHospitals } from './AdminHospitals';
import { AdminActivityLogs } from './AdminActivityLogs';
import {
  LayoutDashboard,
  Pill,
  FileText,
  FileCode,
  Building2,
  History,
  ShieldCheck,
} from 'lucide-react';

export const AdminPortal: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('overview');

  const tabs = [
    { id: 'overview', label: 'Overview Dashboard', icon: LayoutDashboard },
    { id: 'demands', label: 'Medicine Demands', icon: Pill },
    { id: 'mpr', label: 'MPR Tracker', icon: FileText },
    { id: 'forms', label: 'Dynamic Forms', icon: FileCode },
    { id: 'hospitals', label: 'Facilities & Passwords', icon: Building2 },
    { id: 'logs', label: 'Audit & Activity Logs', icon: History },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Admin Identity Header */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-teal-950 text-white rounded-2xl p-6 shadow-md border border-emerald-800/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-600/90 text-white flex items-center justify-center shadow-lg ring-2 ring-emerald-400/40">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 bg-emerald-900/60 px-2 py-0.5 rounded border border-emerald-700/50">
                District Administrative Master Console
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold mt-1">
              District Ayurvedic & Unani Officer, Dehradun
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              Department of AYUSH, Government of Uttarakhand • Central Repository
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-200 bg-white rounded-xl p-1 shadow-sm gap-1 overflow-x-auto no-print">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`py-2.5 px-3.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 whitespace-nowrap transition cursor-pointer ${
                isActive
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Tab View */}
      <div>
        {activeTab === 'overview' && <AdminOverview onNavigateTab={(tab) => setActiveTab(tab)} />}
        {activeTab === 'demands' && <AdminMedicineDemands />}
        {activeTab === 'mpr' && <AdminMprTracker />}
        {activeTab === 'forms' && <AdminFormBuilder />}
        {activeTab === 'hospitals' && <AdminHospitals />}
        {activeTab === 'logs' && <AdminActivityLogs />}
      </div>
    </div>
  );
};
