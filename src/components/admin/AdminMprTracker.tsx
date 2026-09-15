import React, { useState, useEffect } from 'react';
import { dbService } from '../../lib/supabase';
import { MonthlyProgressReport, HospitalMaster } from '../../types';
import { MPR_DISEASE_LIST } from '../../constants/mprDiseases';
import { PrintableMprReport } from '../mpr/PrintableMprReport';
import * as XLSX from 'xlsx';
import {
  FileText,
  Calendar,
  Search,
  Download,
  Printer,
  Users,
  HeartPulse,
  IndianRupee,
  CheckCircle2,
  Clock,
  Building2,
  Activity,
  AlertCircle,
} from 'lucide-react';

export const AdminMprTracker: React.FC = () => {
  const [reports, setReports] = useState<MonthlyProgressReport[]>([]);
  const [hospitals, setHospitals] = useState<HospitalMaster[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-09');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'submitted' | 'pending'>('all');
  const [selectedReportForPrint, setSelectedReportForPrint] = useState<MonthlyProgressReport | null>(null);

  useEffect(() => {
    loadMprData();
  }, [selectedMonth]);

  const loadMprData = async () => {
    const [allReports, allHosp] = await Promise.all([
      dbService.getMprReports(undefined, selectedMonth),
      dbService.getHospitals(),
    ]);
    setReports(allReports);
    setHospitals(allHosp);
  };

  // Map hospital id to report
  const reportMap = new Map<string, MonthlyProgressReport>();
  reports.forEach((r) => reportMap.set(r.hospital_id, r));

  // Filtered hospitals
  const filteredHospitals = hospitals.filter((h) => {
    const matchesSearch = h.hospital_name.toLowerCase().includes(searchTerm.toLowerCase());
    const hasSubmitted = reportMap.has(h.id);

    if (!matchesSearch) return false;
    if (statusFilter === 'submitted') return hasSubmitted;
    if (statusFilter === 'pending') return !hasSubmitted;
    return true;
  });

  // District Aggregate Computations
  const totalDistrictOpd = reports.reduce((acc, r) => acc + (r.opd_count || 0), 0);
  const totalDistrictIpd = reports.reduce((acc, r) => {
    const m = r.other_metrics || {};
    return acc + (m.ipd_patients?.total || m.ipd_admissions || 0);
  }, 0);
  const totalDistrictPanchakarma = reports.reduce((acc, r) => acc + (r.panchakarma_count || 0), 0);
  const totalDistrictLevi = reports.reduce((acc, r) => {
    const m = r.other_metrics || {};
    return acc + (m.levi?.total_levi || 0);
  }, 0);
  const totalDistrictCamps = reports.reduce((acc, r) => {
    const m = r.other_metrics || {};
    return acc + (m.total_camps || m.ayush_camps_conducted || 0);
  }, 0);
  const totalCampBeneficiaries = reports.reduce((acc, r) => {
    const m = r.other_metrics || {};
    return acc + (m.camp_beneficiaries?.total || 0);
  }, 0);
  const totalYogaBeneficiaries = reports.reduce((acc, r) => {
    const m = r.other_metrics || {};
    return acc + (m.yoga_beneficiaries?.total || m.yoga_participants || 0);
  }, 0);

  const complianceRate = hospitals.length > 0 ? Math.round((reports.length / hospitals.length) * 100) : 0;

  // Export Comprehensive Multi-Sheet Excel (.xlsx)
  const handleExportExcel = () => {
    // Sheet 1: Consolidated Overview
    const consolidatedRows = reports.map((r, i) => {
      const m = r.other_metrics || {};
      const newOpd = m.new_opd || { male: 0, female: 0, other: 0, total: 0 };
      const oldOpd = m.old_opd || { male: 0, female: 0, other: 0, total: 0 };
      const ipd = m.ipd_patients || { male: 0, female: 0, other: 0, total: 0 };
      const pk = m.panchakarma_patients || { male: 0, female: 0, other: 0, total: 0 };
      const levi = m.levi || { opd_levi: 0, panchakarma_levi: 0, medical_levi: 0, other_levi: 0, total_levi: 0 };
      const campBen = m.camp_beneficiaries || { male: 0, female: 0, other: 0, children: 0, total: 0 };
      const yogaBen = m.yoga_beneficiaries || { male: 0, female: 0, other: 0, total: 0 };

      return {
        'S.No': i + 1,
        'Hospital Name': r.hospital_name,
        'Reporting Month': r.month_year,
        'New OPD (Male)': newOpd.male,
        'New OPD (Female)': newOpd.female,
        'New OPD (Other)': newOpd.other,
        'New OPD Total': newOpd.total,
        'Old OPD (Male)': oldOpd.male,
        'Old OPD (Female)': oldOpd.female,
        'Old OPD (Other)': oldOpd.other,
        'Old OPD Total': oldOpd.total,
        'Total Combined OPD': r.opd_count,
        'IPD Patients': ipd.total,
        'Panchakarma Patients': pk.total || r.panchakarma_count,
        'OPD Levi (₹)': levi.opd_levi,
        'Panchakarma Levi (₹)': levi.panchakarma_levi,
        'Medical Cert Levi (₹)': levi.medical_levi,
        'Other Levi (₹)': levi.other_levi,
        'Total Levi (₹)': levi.total_levi,
        'Mobile Seeded': m.mobile_seeded || 0,
        'Aadhaar Seeded': m.aadhaar_seeded || 0,
        'Outside Dehradun Patients': m.patients_outside_dehradun || 0,
        'Foreigner Patients': m.patients_foreigners || 0,
        'Total Camps': m.total_camps || 0,
        'Camp Beneficiaries': campBen.total,
        'Yoga Beneficiaries': yogaBen.total,
        'Submitting Officer': r.officer_name,
        'Submission Timestamp': new Date(r.submitted_at).toLocaleString('en-IN'),
        'Stock Shortage Notes': m.stock_shortage_notes || '',
        'Remarks': m.remarks || '',
      };
    });

    // Sheet 2: 38 Disease Morbidity Matrix
    const diseaseRows = reports.map((r, i) => {
      const row: Record<string, any> = {
        'S.No': i + 1,
        'Hospital Name': r.hospital_name,
        'Month': r.month_year,
      };

      const dMap = r.other_metrics?.disease_details || {};
      MPR_DISEASE_LIST.forEach((d) => {
        const item = dMap[d.id] || { new_cases: 0, old_cases: 0, total_cases: 0 };
        row[`${d.sNo}. ${d.hindi} (New)`] = item.new_cases;
        row[`${d.sNo}. ${d.hindi} (Old)`] = item.old_cases;
        row[`${d.sNo}. ${d.hindi} (Total)`] = item.total_cases;
      });

      return row;
    });

    // Sheet 3: Facility Compliance Status
    const complianceRows = hospitals.map((h, i) => {
      const rep = reportMap.get(h.id);
      return {
        'S.No': i + 1,
        'Hospital Name': h.hospital_name,
        'Block': h.block_name || 'Dehradun',
        'Status': rep ? 'SUBMITTED' : 'PENDING',
        'Total OPD': rep ? rep.opd_count : '-',
        'Total Levi (₹)': rep ? rep.other_metrics?.levi?.total_levi || 0 : '-',
        'Submitting Officer': rep ? rep.officer_name : '-',
        'Submission Date & Time': rep ? new Date(rep.submitted_at).toLocaleString('en-IN') : '-',
      };
    });

    const workbook = XLSX.utils.book_new();

    const wsOverview = XLSX.utils.json_to_sheet(consolidatedRows);
    XLSX.utils.book_append_sheet(workbook, wsOverview, 'Consolidated_Overview');

    const wsDiseases = XLSX.utils.json_to_sheet(diseaseRows);
    XLSX.utils.book_append_sheet(workbook, wsDiseases, '38_Disease_Morbidity');

    const wsCompliance = XLSX.utils.json_to_sheet(complianceRows);
    XLSX.utils.book_append_sheet(workbook, wsCompliance, 'Facility_Compliance');

    XLSX.writeFile(workbook, `Dehradun_Ayush_MPR_${selectedMonth}_Consolidated.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold tracking-wider uppercase text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              District Central MIS
            </span>
            <span className="text-xs text-slate-500">• 87 Ayush Dispensaries</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900">
            Monthly Progress Report (MPR) Tracker
          </h2>
          <p className="text-sm text-slate-600">
            Consolidated monitoring of patient demographics, IPD, Panchakarma, Levi collection, outreach camps, and 38-disease morbidity returns.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap no-print">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-slate-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="2026-09">September 2026</option>
              <option value="2026-08">August 2026</option>
              <option value="2026-07">July 2026</option>
              <option value="2026-06">June 2026</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition cursor-pointer shadow-sm"
          >
            <Download className="w-4 h-4" />
            Export Multi-Sheet Excel (.xlsx)
          </button>
        </div>
      </div>

      {/* District Aggregate KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-semibold">Total District OPD</div>
          <div className="text-2xl font-black text-emerald-700 mt-1">
            {totalDistrictOpd.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">New + Old OPD</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-semibold">IPD Admissions</div>
          <div className="text-2xl font-black text-indigo-700 mt-1">
            {totalDistrictIpd.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">In-Patient Admissions</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-semibold">Panchakarma</div>
          <div className="text-2xl font-black text-amber-700 mt-1">
            {totalDistrictPanchakarma.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Therapy Sessions</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-semibold">Total Levi Revenue</div>
          <div className="text-2xl font-black text-emerald-900 mt-1">
            ₹{totalDistrictLevi.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Deposited in Treasury</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-semibold">Camps & Yoga</div>
          <div className="text-2xl font-black text-teal-700 mt-1">
            {(totalCampBeneficiaries + totalYogaBeneficiaries).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">{totalDistrictCamps} Camps Conducted</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-semibold">Compliance Rate</div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {complianceRate}%
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {reports.length} / {hospitals.length} Submitted
          </div>
        </div>
      </div>

      {/* Filter & Tabs Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 no-print">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search facility name..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-slate-900"
          />
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({hospitals.length})
          </button>
          <button
            onClick={() => setStatusFilter('submitted')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              statusFilter === 'submitted'
                ? 'bg-emerald-700 text-white'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            Submitted ({reports.length})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              statusFilter === 'pending'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            Pending ({hospitals.length - reports.length})
          </button>
        </div>
      </div>

      {/* Facilities Compliance & Performance Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-3 w-10 text-center">#</th>
                <th className="py-3 px-3">Dispensary / Hospital Name</th>
                <th className="py-3 px-3 w-28 text-center">Status</th>
                <th className="py-3 px-3 w-24 text-right">Total OPD</th>
                <th className="py-3 px-3 w-20 text-right">IPD</th>
                <th className="py-3 px-3 w-24 text-right">Panchakarma</th>
                <th className="py-3 px-3 w-24 text-right">Total Levi</th>
                <th className="py-3 px-3 w-40">Medical Officer</th>
                <th className="py-3 px-3 w-36">Submission Time</th>
                <th className="py-3 px-3 w-24 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredHospitals.map((h, i) => {
                const rep = reportMap.get(h.id);
                const m = rep?.other_metrics || {};
                const lev = m.levi?.total_levi || 0;
                const ipd = m.ipd_patients?.total || m.ipd_admissions || 0;

                return (
                  <tr key={h.id} className="hover:bg-slate-50 transition">
                    <td className="py-2.5 px-3 text-center text-slate-400 font-mono">
                      {i + 1}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-bold text-slate-900 block">{h.hospital_name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {h.block_name || 'Dehradun'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {rep ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          SUBMITTED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          <Clock className="w-3 h-3 text-amber-600" />
                          PENDING
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                      {rep ? rep.opd_count : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-700">
                      {rep ? ipd : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-700">
                      {rep ? rep.panchakarma_count : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-900">
                      {rep ? `₹${lev}` : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-800 font-medium">
                      {rep ? rep.officer_name : <span className="text-slate-400 italic">Not submitted</span>}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                      {rep ? (
                        new Date(rep.submitted_at).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {rep ? (
                        <button
                          onClick={() => setSelectedReportForPrint(rep)}
                          className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[10px] font-bold inline-flex items-center gap-1 shadow-xs transition cursor-pointer"
                        >
                          <Printer className="w-3 h-3" />
                          <span>PDF</span>
                        </button>
                      ) : (
                        <span className="text-slate-300 text-xs">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Printable PDF Modal */}
      {selectedReportForPrint && (
        <PrintableMprReport
          report={selectedReportForPrint}
          onClose={() => setSelectedReportForPrint(null)}
        />
      )}
    </div>
  );
};
