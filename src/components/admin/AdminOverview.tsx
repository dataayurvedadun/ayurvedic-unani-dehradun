import React, { useState, useEffect, useMemo } from 'react';
import { dbService } from '../../lib/supabase';
import {
  HospitalMaster,
  MedicineDemandResponse,
  MedicineDemandDrive,
  MedicineDriveSubmission,
  MonthlyProgressReport,
} from '../../types';
import {
  Building2,
  CheckCircle2,
  Clock,
  Pill,
  FileText,
  Users,
  Search,
  ChevronDown,
  Calendar,
} from 'lucide-react';

interface AdminOverviewProps {
  onNavigateTab: (tab: string) => void;
}

export const AdminOverview: React.FC<AdminOverviewProps> = ({ onNavigateTab }) => {
  const [hospitals, setHospitals] = useState<HospitalMaster[]>([]);
  const [drives, setDrives] = useState<MedicineDemandDrive[]>([]);
  const [selectedDriveId, setSelectedDriveId] = useState<string>('');
  const [driveSubmissions, setDriveSubmissions] = useState<MedicineDriveSubmission[]>([]);
  const [demands, setDemands] = useState<MedicineDemandResponse[]>([]);
  const [mprReports, setMprReports] = useState<MonthlyProgressReport[]>([]);

  // Default eligible month calculation: If today is not the last day of current month, default to previous month
  const getDefaultReportingMonth = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed: 8 for September
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    const isLastDay = now.getDate() === lastDayOfMonth;

    // If last day of current month, current month is eligible. Otherwise previous month.
    const targetDate = isLastDay ? new Date(year, month, 1) : new Date(year, month - 1, 1);
    const y = targetDate.getFullYear();
    const m = String(targetDate.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  };

  const [selectedMonth, setSelectedMonth] = useState<string>(getDefaultReportingMonth);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'demand_pending' | 'mpr_pending' | 'all_completed'>('all');

  // Available Financial Year months list (April to March)
  const availableMonths = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1 to 12
    const fyStartYear = currentMonth >= 4 ? currentYear : currentYear - 1;
    const fyEndYear = fyStartYear + 1;

    const fySequence = [
      { m: 4, name: 'April', y: fyStartYear },
      { m: 5, name: 'May', y: fyStartYear },
      { m: 6, name: 'June', y: fyStartYear },
      { m: 7, name: 'July', y: fyStartYear },
      { m: 8, name: 'August', y: fyStartYear },
      { m: 9, name: 'September', y: fyStartYear },
      { m: 10, name: 'October', y: fyStartYear },
      { m: 11, name: 'November', y: fyStartYear },
      { m: 12, name: 'December', y: fyStartYear },
      { m: 1, name: 'January', y: fyEndYear },
      { m: 2, name: 'February', y: fyEndYear },
      { m: 3, name: 'March', y: fyEndYear },
    ];

    return fySequence.map((item) => ({
      value: `${item.y}-${String(item.m).padStart(2, '0')}`,
      label: `${item.name} ${item.y}`,
    }));
  }, []);

  useEffect(() => {
    loadOverviewData();
  }, [selectedMonth]);

  const loadOverviewData = async () => {
    const [allHosp, allDrives, allDemands, allMpr, allDriveSubs] = await Promise.all([
      dbService.getHospitals(),
      dbService.getDemandDrives(),
      dbService.getDemands(),
      dbService.getMprReports(undefined, selectedMonth),
      dbService.getDriveSubmissions(),
    ]);

    setHospitals(allHosp);
    setDemands(allDemands);
    setMprReports(allMpr);
    setDriveSubmissions(allDriveSubs);

    // Sort demand lists: latest created list first
    const sortedDrives = [...allDrives].sort(
      (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );
    setDrives(sortedDrives);

    // Default to the latest created drive list if none selected
    setSelectedDriveId((prevId) => {
      if (prevId && sortedDrives.some((d) => d.id === prevId)) {
        return prevId;
      }
      return sortedDrives.length > 0 ? sortedDrives[0].id : '';
    });
  };

  // Currently selected drive
  const selectedDrive = drives.find((d) => d.id === selectedDriveId) || drives[0];

  // Map of submissions for the selected demand list: hospital_id -> MedicineDriveSubmission
  const currentDriveSubmissionsMap = useMemo(() => {
    const map: Record<string, MedicineDriveSubmission> = {};
    driveSubmissions.forEach((s) => {
      if (!selectedDriveId || s.drive_id === selectedDriveId) {
        map[s.hospital_id] = s;
      }
    });
    return map;
  }, [driveSubmissions, selectedDriveId]);

  // Set of hospital IDs that submitted MPR for selectedMonth
  const hospitalsWithMpr = useMemo(() => {
    return new Set(mprReports.map((r) => r.hospital_id));
  }, [mprReports]);

  // Calculate Metrics
  const totalHospitals = hospitals.length;

  const demandSubmittedCount = hospitals.filter((h) => {
    if (currentDriveSubmissionsMap[h.id]) return true;
    if (!selectedDriveId && demands.some((d) => d.hospital_id === h.id)) return true;
    return false;
  }).length;

  const demandPercent = totalHospitals > 0 ? Math.round((demandSubmittedCount / totalHospitals) * 100) : 0;

  const mprSubmittedCount = hospitals.filter((h) => hospitalsWithMpr.has(h.id)).length;
  const mprPercent = totalHospitals > 0 ? Math.round((mprSubmittedCount / totalHospitals) * 100) : 0;

  // Total OPD & Panchakarma across Dehradun for selected month
  const districtTotalOpd = mprReports.reduce((acc, r) => acc + (r.opd_count || 0), 0);
  const districtTotalPanchakarma = mprReports.reduce((acc, r) => acc + (r.panchakarma_count || 0), 0);

  // Filtered hospital status list
  const filteredHospitals = hospitals.filter((h) => {
    const hasDemand = Boolean(currentDriveSubmissionsMap[h.id]) || (!selectedDriveId && demands.some((d) => d.hospital_id === h.id));
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

  const selectedMonthLabel =
    availableMonths.find((m) => m.value === selectedMonth)?.label || selectedMonth;

  return (
    <div className="space-y-6">
      {/* Top Welcome & KPI Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
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

        {/* Global Quick Selectors */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Medicine Demand List Quick Selector */}
          <div className="flex items-center gap-1.5 bg-blue-50/70 border border-blue-200 px-3 py-1.5 rounded-xl">
            <Pill className="w-3.5 h-3.5 text-blue-700 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">Demand List</span>
              <select
                value={selectedDriveId}
                onChange={(e) => setSelectedDriveId(e.target.value)}
                className="text-xs font-bold text-slate-800 bg-transparent border-0 focus:ring-0 p-0 cursor-pointer pr-2"
              >
                {drives.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title} {d.is_active ? '✓' : '(Closed)'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Selected Month for MPR tracking */}
          <div className="flex items-center gap-1.5 bg-teal-50/70 border border-teal-200 px-3 py-1.5 rounded-xl">
            <Calendar className="w-3.5 h-3.5 text-teal-700 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider">MPR Cycle</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="text-xs font-bold text-slate-800 bg-transparent border-0 focus:ring-0 p-0 cursor-pointer pr-2"
              >
                {availableMonths.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
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
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-500 transition cursor-pointer group"
          title="Click to view all Medicine Demand indents"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider truncate max-w-[170px]" title={selectedDrive?.title || 'Medicine Demands'}>
              {selectedDrive?.title ? selectedDrive.title.substring(0, 22) + '...' : 'Medicine Indents'}
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
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${demandPercent}%` }}
            ></div>
          </div>
        </div>

        {/* MPR Submission Rate */}
        <div
          onClick={() => onNavigateTab('mpr')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-teal-500 transition cursor-pointer group"
          title="Click to view Monthly Progress Reports"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              MPR ({selectedMonthLabel})
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
              className="bg-teal-600 h-1.5 rounded-full transition-all duration-300"
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
        <div className="p-5 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-base">
                Facility-Wise Submission Status Tracker
              </h3>
              <span className="px-2 py-0.5 text-[11px] font-semibold bg-slate-100 text-slate-600 rounded-md">
                87 Facilities
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Live status for <span className="font-semibold text-blue-700">"{selectedDrive?.title || 'Selected Demand List'}"</span> and <span className="font-semibold text-teal-700">{selectedMonthLabel} MPR</span>.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative w-full sm:w-60">
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
                className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition ${
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
                className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition ${
                  filterStatus === 'demand_pending'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-amber-700 hover:text-amber-900'
                }`}
              >
                Demand Pending ({totalHospitals - demandSubmittedCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('mpr_pending')}
                className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition ${
                  filterStatus === 'mpr_pending'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-amber-700 hover:text-amber-900'
                }`}
              >
                MPR Pending ({totalHospitals - mprSubmittedCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('all_completed')}
                className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition ${
                  filterStatus === 'all_completed'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-emerald-700 hover:text-emerald-900'
                }`}
              >
                Both Done
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 text-[11px] font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4">Hospital / Dispensary Name</th>
                <th className="py-3 px-4 w-28">Block</th>

                {/* Medicine Demand Header with Dropdown Selector */}
                <th className="py-2.5 px-3 min-w-[240px] text-center bg-blue-50/50 border-x border-slate-200">
                  <div className="flex flex-col gap-1 items-stretch">
                    <div className="flex items-center justify-between text-[11px] font-bold text-blue-900 uppercase tracking-wider">
                      <span className="flex items-center gap-1">
                        <Pill className="w-3.5 h-3.5 text-blue-700" />
                        Medicine Demand List
                      </span>
                      <span className="text-[10px] text-blue-700 font-normal">
                        ({demandSubmittedCount}/{totalHospitals})
                      </span>
                    </div>
                    <div className="relative">
                      <select
                        value={selectedDriveId}
                        onChange={(e) => setSelectedDriveId(e.target.value)}
                        className="w-full text-xs font-bold py-1.5 pl-2.5 pr-7 bg-white border border-blue-300 rounded-lg text-slate-800 shadow-xs focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none truncate"
                        title="Select Medicine Demand List to track"
                      >
                        {drives.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.title} {d.is_active ? '— [Active]' : '— [Closed]'}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-slate-500 pointer-events-none" />
                    </div>
                  </div>
                </th>

                {/* MPR Header with Month Dropdown Selector */}
                <th className="py-2.5 px-3 min-w-[220px] text-center bg-teal-50/50 border-x border-slate-200">
                  <div className="flex flex-col gap-1 items-stretch">
                    <div className="flex items-center justify-between text-[11px] font-bold text-teal-900 uppercase tracking-wider">
                      <span className="flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-teal-700" />
                        MPR Reporting Month
                      </span>
                      <span className="text-[10px] text-teal-700 font-normal">
                        ({mprSubmittedCount}/{totalHospitals})
                      </span>
                    </div>
                    <div className="relative">
                      <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="w-full text-xs font-bold py-1.5 pl-2.5 pr-7 bg-white border border-teal-300 rounded-lg text-slate-800 shadow-xs focus:ring-2 focus:ring-teal-500 cursor-pointer appearance-none truncate"
                        title="Select MPR Month to track"
                      >
                        {availableMonths.map((m) => (
                          <option key={m.value} value={m.value}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-slate-500 pointer-events-none" />
                    </div>
                  </div>
                </th>

                <th className="py-3 px-4 w-32 text-right">Contact</th>
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
                  // Demand submission for selected drive
                  const hospDriveSub = currentDriveSubmissionsMap[hosp.id];
                  const legacyHospDemands = demands.filter((d) => d.hospital_id === hosp.id);
                  const hasDemand = Boolean(hospDriveSub) || (!selectedDriveId && legacyHospDemands.length > 0);

                  const demandUnits =
                    hospDriveSub?.total_units ||
                    legacyHospDemands.reduce((a, b) => a + b.requested_quantity, 0);
                  const demandVarieties =
                    hospDriveSub?.total_varieties || legacyHospDemands.length;
                  const demandOfficer =
                    hospDriveSub?.officer_name || legacyHospDemands[0]?.officer_name;
                  const demandDate =
                    hospDriveSub?.submitted_at || legacyHospDemands[0]?.submitted_at;

                  // MPR submission for selected month
                  const hospMpr = mprReports.find((r) => r.hospital_id === hosp.id);
                  const hasMpr = Boolean(hospMpr);

                  return (
                    <tr key={hosp.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 text-center text-xs text-slate-400 font-mono">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{hosp.hospital_name}</div>
                        {hasDemand && demandOfficer && (
                          <div className="text-[11px] text-slate-400">
                            Submitting MO: {demandOfficer}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs font-medium text-slate-600">
                        {hosp.block_name}
                      </td>

                      {/* Demand Status for Selected List */}
                      <td className="py-3 px-4 text-center bg-blue-50/10">
                        {hasDemand ? (
                          <div className="flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Submitted ({demandUnits} units)
                            </span>
                            <span className="text-[10px] text-slate-400 mt-0.5">
                              {demandVarieties} medicines {demandDate ? `• ${new Date(demandDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` : ''}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            Pending
                          </span>
                        )}
                      </td>

                      {/* MPR Status for Selected Month */}
                      <td className="py-3 px-4 text-center bg-teal-50/10">
                        {hasMpr ? (
                          <div className="flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-800 border border-teal-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                              Submitted ({hospMpr?.opd_count} OPD)
                            </span>
                            <span className="text-[10px] text-slate-400 mt-0.5">
                              {hospMpr?.officer_name || 'MO I/C'} {hospMpr?.submitted_at ? `• ${new Date(hospMpr.submitted_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` : ''}
                            </span>
                          </div>
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
