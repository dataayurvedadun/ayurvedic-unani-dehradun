import React, { useState, useEffect } from 'react';
import { dbService } from '../../lib/supabase';
import { MonthlyProgressReport, HospitalMaster } from '../../types';
import * as XLSX from 'xlsx';
import {
  FileText,
  Calendar,
  Search,
  Download,
  Printer,
  Users,
  HeartPulse,
  BedDouble,
  Eye,
  CheckCircle2,
  Building2,
} from 'lucide-react';

export const AdminMprTracker: React.FC = () => {
  const [reports, setReports] = useState<MonthlyProgressReport[]>([]);
  const [hospitals, setHospitals] = useState<HospitalMaster[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-08');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedReport, setSelectedReport] = useState<MonthlyProgressReport | null>(null);

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

  // Aggregated sums across filtered reports
  const filteredReports = reports.filter((r) =>
    r.hospital_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalDistrictOpd = filteredReports.reduce((a, b) => a + (b.opd_count || 0), 0);
  const totalMaleOpd = filteredReports.reduce((a, b) => a + (b.other_metrics.opd_male || 0), 0);
  const totalFemaleOpd = filteredReports.reduce((a, b) => a + (b.other_metrics.opd_female || 0), 0);
  const totalChildOpd = filteredReports.reduce((a, b) => a + (b.other_metrics.opd_child || 0), 0);
  const totalPanchakarma = filteredReports.reduce((a, b) => a + (b.panchakarma_count || 0), 0);
  const totalYoga = filteredReports.reduce((a, b) => a + (b.other_metrics.yoga_participants || 0), 0);
  const totalCamps = filteredReports.reduce((a, b) => a + (b.other_metrics.ayush_camps_conducted || 0), 0);
  const totalIpd = filteredReports.reduce((a, b) => a + (b.other_metrics.ipd_admissions || 0), 0);

  // Export Consolidated MPR to Excel (.xlsx)
  const handleExportExcel = () => {
    const rows = filteredReports.map((r, i) => ({
      'S.No': i + 1,
      'Hospital Name': r.hospital_name,
      'Month/Year': r.month_year,
      'Total OPD': r.opd_count,
      'Male OPD': r.other_metrics.opd_male || 0,
      'Female OPD': r.other_metrics.opd_female || 0,
      'Child OPD': r.other_metrics.opd_child || 0,
      'Panchakarma Procedures': r.panchakarma_count,
      'IPD Admissions': r.other_metrics.ipd_admissions || 0,
      'Yoga Attendees': r.other_metrics.yoga_participants || 0,
      'Ayush Camps': r.other_metrics.ayush_camps_conducted || 0,
      'Submitting Officer': r.officer_name,
      'Submission Timestamp': new Date(r.submitted_at).toLocaleString('en-IN'),
      'Stock Notes': r.other_metrics.stock_shortage_notes || '',
      'Remarks': r.other_metrics.remarks || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `MPR_${selectedMonth}`);
    XLSX.writeFile(workbook, `Dehradun_Ayush_MPR_Consolidated_${selectedMonth}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold tracking-wider uppercase text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            District Health Indicator MIS
          </span>
          <h2 className="text-2xl font-bold text-slate-900 mt-1">
            Monthly Progress Report (MPR) Tracker
          </h2>
          <p className="text-sm text-slate-600">
            Monitor patient footfall, Panchakarma therapies, outreach camps, and drug supply status.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap no-print">
          {/* Month Selector */}
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
            Export Excel
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Print Report
          </button>
        </div>
      </div>

      {/* District Totals Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-semibold uppercase">Total OPD Patients</div>
          <div className="text-2xl font-black text-emerald-700 mt-1">
            {totalDistrictOpd.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            M: {totalMaleOpd} | F: {totalFemaleOpd} | C: {totalChildOpd}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-semibold uppercase">Panchakarma Sessions</div>
          <div className="text-2xl font-black text-teal-700 mt-1">
            {totalPanchakarma.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Snehan, Basti, Nasya, Shirodhara</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-semibold uppercase">Yoga Outreach</div>
          <div className="text-2xl font-black text-indigo-700 mt-1">
            {totalYoga.toLocaleString()} Attendees
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">{totalCamps} Health camps held</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-semibold uppercase">Submissions Received</div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {reports.length} of {hospitals.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {hospitals.length > 0 ? Math.round((reports.length / hospitals.length) * 100) : 0}% reporting rate
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-3 no-print">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search facility name..."
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-slate-900"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Reporting Cycle: <strong className="text-slate-800">{selectedMonth}</strong>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200 uppercase text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4">Hospital / Dispensary</th>
                <th className="py-3 px-4 w-28 text-right">Total OPD</th>
                <th className="py-3 px-4 w-28 text-right">Panchakarma</th>
                <th className="py-3 px-4 w-24 text-right">IPD</th>
                <th className="py-3 px-4 w-28 text-right">Yoga</th>
                <th className="py-3 px-4 w-44">Submitting Officer</th>
                <th className="py-3 px-4 w-32">Submitted On</th>
                <th className="py-3 px-4 w-20 text-center no-print">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    No monthly reports submitted yet for {selectedMonth}.
                  </td>
                </tr>
              ) : (
                filteredReports.map((rep, idx) => (
                  <tr key={rep.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-center text-xs text-slate-400 font-mono">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span>{rep.hospital_name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                      {rep.opd_count}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-teal-700">
                      {rep.panchakarma_count}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700">
                      {rep.other_metrics.ipd_admissions || 0}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-indigo-700">
                      {rep.other_metrics.yoga_participants || 0}
                    </td>
                    <td className="py-3 px-4 text-xs font-medium text-slate-800">
                      {rep.officer_name}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500">
                      {new Date(rep.submitted_at).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-center no-print">
                      <button
                        type="button"
                        onClick={() => setSelectedReport(rep)}
                        className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-900 font-semibold cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h4 className="font-bold text-base text-slate-900">
                  {selectedReport.hospital_name}
                </h4>
                <p className="text-xs text-slate-500">
                  Monthly Progress Report for {selectedReport.month_year} • Submitted by {selectedReport.officer_name}
                </p>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-700 max-h-[70vh] overflow-y-auto pr-1">
              {/* OPD */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="font-bold text-slate-800 text-xs mb-2">OPD Demographics</div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="bg-white p-2 rounded">
                    <div className="text-slate-400 text-[10px]">Total</div>
                    <div className="font-bold text-emerald-700 text-sm">{selectedReport.opd_count}</div>
                  </div>
                  <div className="bg-white p-2 rounded">
                    <div className="text-slate-400 text-[10px]">Male</div>
                    <div className="font-bold text-slate-800 text-sm">{selectedReport.other_metrics.opd_male || 0}</div>
                  </div>
                  <div className="bg-white p-2 rounded">
                    <div className="text-slate-400 text-[10px]">Female</div>
                    <div className="font-bold text-slate-800 text-sm">{selectedReport.other_metrics.opd_female || 0}</div>
                  </div>
                  <div className="bg-white p-2 rounded">
                    <div className="text-slate-400 text-[10px]">Children</div>
                    <div className="font-bold text-slate-800 text-sm">{selectedReport.other_metrics.opd_child || 0}</div>
                  </div>
                </div>
              </div>

              {/* Panchakarma procedures */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="font-bold text-slate-800 text-xs mb-2">
                  Panchakarma & Regimenal Procedures ({selectedReport.panchakarma_count} total)
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex justify-between bg-white p-2 rounded">
                    <span>Snehan / Swedan:</span>
                    <strong className="text-teal-700">{selectedReport.other_metrics.snehan_swedan || 0}</strong>
                  </div>
                  <div className="flex justify-between bg-white p-2 rounded">
                    <span>Basti Karma:</span>
                    <strong className="text-teal-700">{selectedReport.other_metrics.basti_karma || 0}</strong>
                  </div>
                  <div className="flex justify-between bg-white p-2 rounded">
                    <span>Nasya Karma:</span>
                    <strong className="text-teal-700">{selectedReport.other_metrics.nasya_karma || 0}</strong>
                  </div>
                  <div className="flex justify-between bg-white p-2 rounded">
                    <span>Shirodhara:</span>
                    <strong className="text-teal-700">{selectedReport.other_metrics.shirodhara || 0}</strong>
                  </div>
                  <div className="flex justify-between bg-white p-2 rounded">
                    <span>Unani Cupping:</span>
                    <strong className="text-teal-700">{selectedReport.other_metrics.unani_cupping_regimenal || 0}</strong>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedReport.other_metrics.stock_shortage_notes && (
                <div>
                  <span className="font-bold text-slate-800 block mb-1">Medicine Stock Shortages:</span>
                  <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                    {selectedReport.other_metrics.stock_shortage_notes}
                  </div>
                </div>
              )}

              {selectedReport.other_metrics.remarks && (
                <div>
                  <span className="font-bold text-slate-800 block mb-1">General Remarks:</span>
                  <div className="p-2.5 rounded-lg bg-slate-100 text-slate-800 text-xs">
                    {selectedReport.other_metrics.remarks}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 text-right">
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
