import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { MedicineDemandsView } from './MedicineDemandsView';
import { MprView } from './MprView';
import { CustomFormsView } from './CustomFormsView';
import {
  Pill,
  FileText,
  FileCode,
  Building2,
  MapPin,
  User,
  CheckCircle,
} from 'lucide-react';

export const HospitalPortal: React.FC = () => {
  const { session, updateOfficerName } = useAuth();
  const hospital = session?.hospital;
  const [activeTab, setActiveTab] = useState<'demands' | 'mpr' | 'custom'>('demands');
  const [isEditingOfficer, setIsEditingOfficer] = useState<boolean>(false);
  const [tempOfficerName, setTempOfficerName] = useState<string>(session?.officerName || '');

  const handleSaveOfficer = () => {
    if (tempOfficerName.trim()) {
      updateOfficerName(tempOfficerName.trim());
      setIsEditingOfficer(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Hospital Identity Header Card */}
      <div className="bg-gradient-to-br from-white to-emerald-50/50 rounded-2xl p-6 border border-emerald-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md flex-shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                {hospital?.hospital_name}
              </h2>
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                <MapPin className="w-3 h-3" />
                Block: {hospital?.block_name}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-600 mt-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Doctor / Officer In-Charge:</span>
                {isEditingOfficer ? (
                  <div className="inline-flex items-center gap-1">
                    <input
                      type="text"
                      value={tempOfficerName}
                      onChange={(e) => setTempOfficerName(e.target.value)}
                      className="px-2 py-0.5 text-xs bg-white border border-emerald-400 rounded focus:ring-1 focus:ring-emerald-500 font-bold"
                    />
                    <button
                      onClick={handleSaveOfficer}
                      className="px-2 py-0.5 bg-emerald-700 text-white rounded text-[11px] font-semibold"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <span className="font-bold text-slate-800">
                    {session?.officerName || 'Not Set'}{' '}
                    <button
                      onClick={() => {
                        setTempOfficerName(session?.officerName || '');
                        setIsEditingOfficer(true);
                      }}
                      className="text-emerald-700 hover:text-emerald-900 font-semibold underline text-[11px] ml-1 cursor-pointer"
                    >
                      Edit
                    </button>
                  </span>
                )}
              </div>
              {hospital?.contact_phone && (
                <span className="text-slate-500">Tel: {hospital.contact_phone}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Hospital Portal Navigation Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-xl p-1 shadow-sm gap-1 no-print">
        <button
          type="button"
          onClick={() => setActiveTab('demands')}
          className={`flex-1 py-3 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
            activeTab === 'demands'
              ? 'bg-emerald-700 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Pill className="w-4 h-4" />
          <span>1. Medicine Demands Indent</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('mpr')}
          className={`flex-1 py-3 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
            activeTab === 'mpr'
              ? 'bg-emerald-700 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>2. Monthly Progress Report (MPR)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('custom')}
          className={`flex-1 py-3 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
            activeTab === 'custom'
              ? 'bg-emerald-700 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileCode className="w-4 h-4" />
          <span>3. Custom Surveys / Forms</span>
        </button>
      </div>

      {/* Tab Content Panels */}
      <div>
        {activeTab === 'demands' && <MedicineDemandsView />}
        {activeTab === 'mpr' && <MprView />}
        {activeTab === 'custom' && <CustomFormsView />}
      </div>
    </div>
  );
};
