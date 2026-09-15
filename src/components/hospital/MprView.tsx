import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dbService } from '../../lib/supabase';
import { MonthlyProgressReport } from '../../types';
import confetti from 'canvas-confetti';
import {
  FileText,
  Calendar,
  CheckCircle2,
  Clock,
  Send,
  Users,
  HeartPulse,
  BedDouble,
  Sparkles,
  History,
  Eye,
  AlertCircle,
} from 'lucide-react';

export const MprView: React.FC = () => {
  const { session } = useAuth();
  const hospital = session?.hospital;
  const officerName = session?.officerName || 'Medical Officer In-Charge';

  // Current selected month: e.g. "2026-08"
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-08');
  const [existingReports, setExistingReports] = useState<MonthlyProgressReport[]>([]);
  const [currentReport, setCurrentReport] = useState<MonthlyProgressReport | null>(null);

  // Form Fields
  const [opdMale, setOpdMale] = useState<number>(0);
  const [opdFemale, setOpdFemale] = useState<number>(0);
  const [opdChild, setOpdChild] = useState<number>(0);
  const [ipdAdmissions, setIpdAdmissions] = useState<number>(0);
  const [bedOccupancy, setBedOccupancy] = useState<number>(0);

  // Panchakarma & Regimenal therapies
  const [snehanSwedan, setSnehanSwedan] = useState<number>(0);
  const [bastiKarma, setBastiKarma] = useState<number>(0);
  const [nasyaKarma, setNasyaKarma] = useState<number>(0);
  const [shirodhara, setShirodhara] = useState<number>(0);
  const [unaniCupping, setUnaniCupping] = useState<number>(0);

  // Community & Outreach
  const [yogaParticipants, setYogaParticipants] = useState<number>(0);
  const [ayushCamps, setAyushCamps] = useState<number>(0);
  const [stockShortageNotes, setStockShortageNotes] = useState<string>('');
  const [generalRemarks, setGeneralRemarks] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [selectedHistoryReport, setSelectedHistoryReport] = useState<MonthlyProgressReport | null>(null);

  // Available months options
  const monthOptions = [
    { value: '2026-09', label: 'September 2026' },
    { value: '2026-08', label: 'August 2026' },
    { value: '2026-07', label: 'July 2026' },
    { value: '2026-06', label: 'June 2026' },
    { value: '2026-05', label: 'May 2026' },
  ];

  useEffect(() => {
    loadHospitalReports();
  }, [hospital?.id, selectedMonth]);

  const loadHospitalReports = async () => {
    if (!hospital) return;
    const reports = await dbService.getMprReports(hospital.id);
    setExistingReports(reports);

    const reportForMonth = reports.find((r) => r.month_year === selectedMonth);
    if (reportForMonth) {
      setCurrentReport(reportForMonth);
      setOpdMale(reportForMonth.other_metrics.opd_male || 0);
      setOpdFemale(reportForMonth.other_metrics.opd_female || 0);
      setOpdChild(reportForMonth.other_metrics.opd_child || 0);
      setIpdAdmissions(reportForMonth.other_metrics.ipd_admissions || 0);
      setBedOccupancy(reportForMonth.other_metrics.bed_occupancy_days || 0);

      setSnehanSwedan(reportForMonth.other_metrics.snehan_swedan || 0);
      setBastiKarma(reportForMonth.other_metrics.basti_karma || 0);
      setNasyaKarma(reportForMonth.other_metrics.nasya_karma || 0);
      setShirodhara(reportForMonth.other_metrics.shirodhara || 0);
      setUnaniCupping(reportForMonth.other_metrics.unani_cupping_regimenal || 0);

      setYogaParticipants(reportForMonth.other_metrics.yoga_participants || 0);
      setAyushCamps(reportForMonth.other_metrics.ayush_camps_conducted || 0);
      setStockShortageNotes(reportForMonth.other_metrics.stock_shortage_notes || '');
      setGeneralRemarks(reportForMonth.other_metrics.remarks || '');
    } else {
      setCurrentReport(null);
      // Reset form
      setOpdMale(0);
      setOpdFemale(0);
      setOpdChild(0);
      setIpdAdmissions(0);
      setBedOccupancy(0);
      setSnehanSwedan(0);
      setBastiKarma(0);
      setNasyaKarma(0);
      setShirodhara(0);
      setUnaniCupping(0);
      setYogaParticipants(0);
      setAyushCamps(0);
      setStockShortageNotes('');
      setGeneralRemarks('');
    }
  };

  const totalOpd = opdMale + opdFemale + opdChild;
  const totalPanchakarma = snehanSwedan + bastiKarma + nasyaKarma + shirodhara + unaniCupping;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hospital) return;

    if (totalOpd === 0) {
      setNotification('Please enter the OPD patient counts before submitting the MPR.');
      return;
    }

    setIsSubmitting(true);
    const submissionTime = new Date().toISOString();

    const reportPayload: Omit<MonthlyProgressReport, 'id'> = {
      hospital_id: hospital.id,
      hospital_name: hospital.hospital_name,
      month_year: selectedMonth,
      opd_count: totalOpd,
      panchakarma_count: totalPanchakarma,
      officer_name: officerName,
      submitted_at: submissionTime,
      other_metrics: {
        opd_male: opdMale,
        opd_female: opdFemale,
        opd_child: opdChild,
        ipd_admissions: ipdAdmissions,
        bed_occupancy_days: bedOccupancy,
        snehan_swedan: snehanSwedan,
        basti_karma: bastiKarma,
        nasya_karma: nasyaKarma,
        shirodhara: shirodhara,
        unani_cupping_regimenal: unaniCupping,
        yoga_participants: yogaParticipants,
        ayush_camps_conducted: ayushCamps,
        stock_shortage_notes: stockShortageNotes,
        remarks: generalRemarks,
      },
    };

    try {
      const saved = await dbService.submitMpr(reportPayload);
      await dbService.addActivityLog({
        action: 'Monthly Progress Report (MPR) Submitted',
        details: `Submitted MPR for ${selectedMonth} (Total OPD: ${totalOpd}, Panchakarma: ${totalPanchakarma})`,
        user: `${hospital.hospital_name} (${officerName})`,
        timestamp: submissionTime,
        category: 'mpr',
      });

      setCurrentReport(saved);
      setNotification(`Monthly Progress Report for ${selectedMonth} successfully submitted!`);
      loadHospitalReports();

      try {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 },
        });
      } catch (err) {}
    } catch (err: any) {
      setNotification(`Failed to submit MPR: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Notification */}
      {notification && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{notification}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-xs font-bold text-emerald-800 hover:text-emerald-950 underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header & Month Selector */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold tracking-wider uppercase text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Department of AYUSH • Monthly MIS
            </span>
            {currentReport ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Submitted for {selectedMonth}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">
                <Clock className="w-3.5 h-3.5" />
                Pending for {selectedMonth}
              </span>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            Monthly Progress Report (MPR) Filing
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Hospital: <span className="font-semibold text-slate-800">{hospital?.hospital_name}</span> | Submitting Officer:{' '}
            <span className="font-semibold text-slate-800">{officerName}</span>
          </p>
        </div>

        {/* Month Selector Dropdown */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Reporting Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="pl-3 pr-8 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              {monthOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* MPR Form Grid */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: OPD Statistics */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-slate-900 text-base">
                1. Outpatient Department (OPD) Patient Statistics
              </h3>
            </div>
            <div className="text-xs bg-emerald-50 text-emerald-800 font-bold px-3 py-1 rounded-lg border border-emerald-200">
              Total OPD: {totalOpd} Patients
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Male Patients <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                value={opdMale || ''}
                onChange={(e) => setOpdMale(parseInt(e.target.value, 10) || 0)}
                placeholder="0"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Female Patients <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                value={opdFemale || ''}
                onChange={(e) => setOpdFemale(parseInt(e.target.value, 10) || 0)}
                placeholder="0"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Child Patients (&lt;14 yrs)
              </label>
              <input
                type="number"
                min="0"
                value={opdChild || ''}
                onChange={(e) => setOpdChild(parseInt(e.target.value, 10) || 0)}
                placeholder="0"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold text-slate-900"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Panchakarma & Regimenal Therapies */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <HeartPulse className="w-5 h-5 text-teal-600" />
              <h3 className="font-bold text-slate-900 text-base">
                2. Panchakarma & Specialized Therapy Procedures
              </h3>
            </div>
            <div className="text-xs bg-teal-50 text-teal-800 font-bold px-3 py-1 rounded-lg border border-teal-200">
              Total Procedures: {totalPanchakarma}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Snehan / Swedan</label>
              <input
                type="number"
                min="0"
                value={snehanSwedan || ''}
                onChange={(e) => setSnehanSwedan(parseInt(e.target.value, 10) || 0)}
                placeholder="0"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Basti Karma</label>
              <input
                type="number"
                min="0"
                value={bastiKarma || ''}
                onChange={(e) => setBastiKarma(parseInt(e.target.value, 10) || 0)}
                placeholder="0"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nasya Karma</label>
              <input
                type="number"
                min="0"
                value={nasyaKarma || ''}
                onChange={(e) => setNasyaKarma(parseInt(e.target.value, 10) || 0)}
                placeholder="0"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Shirodhara</label>
              <input
                type="number"
                min="0"
                value={shirodhara || ''}
                onChange={(e) => setShirodhara(parseInt(e.target.value, 10) || 0)}
                placeholder="0"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Unani Hijama/Cupping</label>
              <input
                type="number"
                min="0"
                value={unaniCupping || ''}
                onChange={(e) => setUnaniCupping(parseInt(e.target.value, 10) || 0)}
                placeholder="0"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold text-slate-900"
              />
            </div>
          </div>
        </div>

        {/* Section 3: IPD, Yoga & Outreach Activities */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
            <BedDouble className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-base">
              3. IPD / Wellness & Outreach Activities
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">IPD New Admissions</label>
              <input
                type="number"
                min="0"
                value={ipdAdmissions || ''}
                onChange={(e) => setIpdAdmissions(parseInt(e.target.value, 10) || 0)}
                placeholder="0"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Bed Occupancy (Days)</label>
              <input
                type="number"
                min="0"
                value={bedOccupancy || ''}
                onChange={(e) => setBedOccupancy(parseInt(e.target.value, 10) || 0)}
                placeholder="0"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Yoga Attendees</label>
              <input
                type="number"
                min="0"
                value={yogaParticipants || ''}
                onChange={(e) => setYogaParticipants(parseInt(e.target.value, 10) || 0)}
                placeholder="0"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Ayush Health Camps</label>
              <input
                type="number"
                min="0"
                value={ayushCamps || ''}
                onChange={(e) => setAyushCamps(parseInt(e.target.value, 10) || 0)}
                placeholder="0"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-3 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Medicine Stock Shortage / Emergency Requirements
              </label>
              <textarea
                rows={2}
                value={stockShortageNotes}
                onChange={(e) => setStockShortageNotes(e.target.value)}
                placeholder="Specify any emergency shortage of Kwath, churnas or syrups..."
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Administrative Remarks / Notes
              </label>
              <textarea
                rows={2}
                value={generalRemarks}
                onChange={(e) => setGeneralRemarks(e.target.value)}
                placeholder="Any special camp highlights, infrastructure condition, staff notes..."
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900"
              />
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500">
            Submitting as: <strong className="text-slate-800">{officerName}</strong> ({hospital?.hospital_name})
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-sm font-bold transition shadow-md hover:shadow-lg disabled:opacity-60 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>{isSubmitting ? 'Recording MPR...' : currentReport ? 'Update Monthly Report' : 'Submit Monthly Progress Report'}</span>
          </button>
        </div>
      </form>

      {/* Historical Submissions Table */}
      {existingReports.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <History className="w-5 h-5 text-slate-600" />
            <h3 className="font-bold text-slate-900 text-base">
              Hospital MPR Submission History
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Month</th>
                  <th className="py-2.5 px-3">Total OPD</th>
                  <th className="py-2.5 px-3">Panchakarma</th>
                  <th className="py-2.5 px-3">Yoga Participants</th>
                  <th className="py-2.5 px-3">Submitted By</th>
                  <th className="py-2.5 px-3">Submission Date</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {existingReports.map((rep) => (
                  <tr key={rep.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-bold text-slate-900">{rep.month_year}</td>
                    <td className="py-2.5 px-3 font-semibold text-emerald-700">{rep.opd_count}</td>
                    <td className="py-2.5 px-3 font-semibold text-teal-700">{rep.panchakarma_count}</td>
                    <td className="py-2.5 px-3">{rep.other_metrics.yoga_participants || 0}</td>
                    <td className="py-2.5 px-3 text-xs">{rep.officer_name}</td>
                    <td className="py-2.5 px-3 text-xs text-slate-500">
                      {new Date(rep.submitted_at).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedHistoryReport(rep)}
                        className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-900 font-semibold cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* History Detail Modal */}
      {selectedHistoryReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h4 className="font-bold text-base text-slate-900">
                MPR Details: {selectedHistoryReport.month_year}
              </h4>
              <button
                onClick={() => setSelectedHistoryReport(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3 text-xs text-slate-700">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Facility:</span>
                <span className="font-semibold">{selectedHistoryReport.hospital_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Submitting Officer:</span>
                <span className="font-semibold">{selectedHistoryReport.officer_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Total OPD Count:</span>
                <span className="font-bold text-emerald-700">{selectedHistoryReport.opd_count} (M: {selectedHistoryReport.other_metrics.opd_male || 0}, F: {selectedHistoryReport.other_metrics.opd_female || 0}, C: {selectedHistoryReport.other_metrics.opd_child || 0})</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Panchakarma Procedures:</span>
                <span className="font-bold text-teal-700">{selectedHistoryReport.panchakarma_count}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">IPD Admissions:</span>
                <span className="font-semibold">{selectedHistoryReport.other_metrics.ipd_admissions || 0}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Yoga Participants:</span>
                <span className="font-semibold">{selectedHistoryReport.other_metrics.yoga_participants || 0}</span>
              </div>
              {selectedHistoryReport.other_metrics.stock_shortage_notes && (
                <div className="pt-2">
                  <span className="text-slate-500 font-semibold block mb-1">Stock Shortage Notes:</span>
                  <p className="bg-slate-50 p-2 rounded-lg text-slate-700">
                    {selectedHistoryReport.other_metrics.stock_shortage_notes}
                  </p>
                </div>
              )}
            </div>
            <div className="mt-6 text-right">
              <button
                onClick={() => setSelectedHistoryReport(null)}
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
