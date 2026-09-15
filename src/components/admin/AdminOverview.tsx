import React, { useState, useEffect } from 'react';
import { dbService } from '../../lib/supabase';
import { HospitalMaster, MedicineDemandResponse, MonthlyProgressReport } from '../../types';
import {
  Building2,
  CheckCircle2,
  Clock,
  Pill,
  FileText,
  Users,
  HeartPulse,
  Search,
  Filter,
  ArrowUpRight,
  Send,
} from 'lucide-react';

interface AdminOverviewProps {
  onNavigateTab: (tab: string) => void;
}

export const AdminOverview: React.FC<AdminOverviewProps> = ({ onNavigateTab }) => {
  const [hospitals, setHospitals] = useState<HospitalMaster[]>([]);
  const [demands, setDemands] = useState<MedicineDemandResponse[]>([]);
  const [mprReports, setMprReports] = useState<MonthlyProgressReport[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-08');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'demand_pending' | 'mpr_pending' | 'all_completed'>('all');

  useEffect(() => {
    loadOverviewData();
  }, [selectedMonth]);

  const loadOverviewData = async () => {
    const [allHosp, allDemands, allMpr, allDriveSubs] = await Promise.all([
      dbService.getHospitals(),
      dbService.getDemands(),
      dbService.getMprReports(undefined, selectedMonth),
      dbService.getDriveSubmissions(),
    ]);
    setHospitals(allHosp);
    setDemands(allDemands);
    setMprReports(allMpr);

    const submittedHospIds = new Set([
      ...allDemands.map((d) => d.hospital_id),
      ...allDriveSubs.map((s) => s.hospital_id),
    ]);
    setDemandSubmittedSet(submittedHospIds);
  };

  const [demandSubmittedSet, setDemandSubmittedSet] = useState<Set<string>>(new Set());

  // Calculate Metrics
  const totalHospitals = hospitals.length;
  const demandSubmittedCount = hospitals.filter((h) => demandSubmittedSet.has(h.id)).length;
  const demandPercent = totalHospitals > 0 ? Math.round((demandSubmittedCount / totalHospitals) * 100) : 0;

  // MPR submitted count for selected month
  const hospitalsWithMpr = new Set(mprReports.map((r) => r.hospital_id));
  const mprSubmittedCount = hospitals.filter((h) => hospitalsWithMpr.has(h.id)).length;
  const mprPercent = totalHospitals > 0 ? Math.round((mprSubmittedCount / totalHospitals) * 100) : 0;

  // Total OPD & Panchakarma across Dehradun
  const districtTotalOpd = mprReports.reduce((acc, r) => acc + (r.opd_count || 0), 0);
  const districtTotalPanchakarma = mprReports.reduce((acc, r) => acc + (r.panchakarma_count || 0), 0);

  // Filtered hospital status list
  const filteredHospitals = hospitals.filter((h) => {
    const hasDemand = demandSubmittedSet.has(h.id);
    const hasMpr = hospitalsWithMpr.has(h.id);

    const matchesSearch =
      h.hospital_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.block_name.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (filterStatus === 'demand_pending') return !hasDemand;
    if (filterStatus === 'mpr_pending') return !hasMpr;
    if (filterStatus === 'all_completed') return hasDemand && hasMpr;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Welcome & KPI Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold tracking-wider uppercase text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            District Administrative Control Room
          </span>
          <h2 className="text-2xl font-bold text-slate-900 mt-1">
            District Dehradun Central Monitoring
          </h2>
          <p className="text-sm text-slate-600">
            Real-time compliance tracker for annual medicine requisitions and monthly health indicators.
          </p>
        </div>

        {/* Selected Month for MPR tracking */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-500">MPR Cycle:</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="2026-09">September 2026</option>
            <option value="2026-08">August 2026</option>
            <option value="2026-07">July 2026</option>
            <option value="2026-06">June 2026</option>
          </select>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Hospitals */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Health Facilities
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{totalHospitals} Centers</div>
          <div className="text-xs text-slate-500 mt-1">Ayurvedic & Unani dispensaries</div>
        </div>

        {/* Medicine Demands Completion */}
        <div
          onClick={() => onNavigateTab('demands')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-500 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Medicine Indents (26-27)
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <Pill className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <div className="text-2xl font-black text-blue-700">
              {demandSubmittedCount}/{totalHospitals}
            </div>
            <span className="text-xs font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded">
              {demandPercent}%
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-blue-600 h-1.5 rounded-full"
              style={{ width: `${demandPercent}%` }}
            ></div>
          </div>
        </div>

        {/* MPR Submission Rate */}
        <div
          onClick={() => onNavigateTab('mpr')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-500 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              MPR ({selectedMonth})
            </span>
            <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <div className="text-2xl font-black text-teal-700">
              {mprSubmittedCount}/{totalHospitals}
            </div>
            <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded">
              {mprPercent}%
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-teal-600 h-1.5 rounded-full"
              style={{ width: `${mprPercent}%` }}
            ></div>
          </div>
        </div>

        {/* District OPD Patient Footfall */}
        <div
          onClick={() => onNavigateTab('mpr')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-500 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              District OPD Recorded
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-2">
            {districtTotalOpd.toLocaleString()} Patients
          </div>
          <div className="text-xs text-slate-500 mt-1">
            + {districtTotalPanchakarma.toLocaleString()} Panchakarma sessions
          </div>
        </div>
      </div>

      {/* Hospital Submission Status Matrix */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900 text-base">
              Facility-Wise Submission Status Tracker
            </h3>
            <p className="text-xs text-slate-500">
              Live status of Medicine Demands and {selectedMonth} Monthly Progress Reports
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filter hospital or block..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-slate-900"
              />
            </div>

            {/* Quick Status Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setFilterStatus('all')}
                className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${
                  filterStatus === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({hospitals.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('demand_pending')}
                className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${
                  filterStatus === 'demand_pending'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-amber-700 hover:text-amber-900'
                }`}
              >
                Demand Pending
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('mpr_pending')}
                className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${
                  filterStatus === 'mpr_pending'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-amber-700 hover:text-amber-900'
                }`}
              >
                MPR Pending
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100/80 text-slate-600 uppercase text-[11px] font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4">Hospital / Dispensary Name</th>
                <th className="py-3 px-4 w-32">Block</th>
                <th className="py-3 px-4 w-44 text-center">Medicine Demand (26-27)</th>
                <th className="py-3 px-4 w-44 text-center">MPR ({selectedMonth})</th>
                <th className="py-3 px-4 w-36 text-right">Contact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredHospitals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No hospitals found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredHospitals.map((hosp, idx) => {
                  const hospDemands = demands.filter((d) => d.hospital_id === hosp.id);
                  const hasDemand = hospDemands.length > 0;
                  const demandUnits = hospDemands.reduce((a, b) => a + b.requested_quantity, 0);

                  const hospMpr = mprReports.find((r) => r.hospital_id === hosp.id);
                  const hasMpr = Boolean(hospMpr);

                  return (
                    <tr key={hosp.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 text-center text-xs text-slate-400 font-mono">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{hosp.hospital_name}</div>
                        {hasDemand && (
                          <div className="text-[11px] text-slate-400">
                            Submitting Officer: {hospDemands[0].officer_name}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs font-medium text-slate-600">
                        {hosp.block_name}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {hasDemand ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Submitted ({demandUnits} units)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {hasMpr ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-100 text-teal-800 border border-teal-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                            Submitted ({hospMpr?.opd_count} OPD)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right text-xs text-slate-500 font-mono">
                        {hosp.contact_phone || '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
