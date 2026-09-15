import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dbService } from '../../lib/supabase';
import { MonthlyProgressReport, OtherMprMetrics } from '../../types';
import { MPR_DISEASE_LIST } from '../../constants/mprDiseases';
import { PrintableMprReport } from '../mpr/PrintableMprReport';
import confetti from 'canvas-confetti';
import {
  FileText,
  Calendar,
  CheckCircle2,
  Clock,
  Send,
  Users,
  HeartPulse,
  Printer,
  IndianRupee,
  Search,
  ShieldCheck,
  Activity,
  Lock,
  AlertTriangle,
} from 'lucide-react';

export const MprView: React.FC = () => {
  const { session } = useAuth();
  const hospital = session?.hospital;
  const officerName = session?.officerName || 'Medical Officer In-Charge';

  // Helper to generate eligible months
  const getEligibleMonths = (submittedMonths: Set<string>) => {
    const list: { value: string; label: string; isEligibleToFill: boolean }[] = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-11
    const currentDate = now.getDate();
    const lastDayOfCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const isLastDay = currentDate === lastDayOfCurrentMonth;

    // Last 6 months
    for (let i = 0; i <= 6; i++) {
      const d = new Date(currentYear, currentMonth - i, 1);
      const yr = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      const val = `${yr}-${mo}`;
      const label = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

      const isCurrent = i === 0;
      const isSubmitted = submittedMonths.has(val);

      if (isCurrent) {
        // Current month is only eligible to fill on the final day of the month, or viewable if already submitted
        if (isLastDay || isSubmitted) {
          list.push({ value: val, label, isEligibleToFill: isLastDay });
        }
      } else {
        // Completed past months are always available to fill (if pending) or view (if submitted)
        list.push({ value: val, label, isEligibleToFill: true });
      }
    }

    // Include any older submitted months
    submittedMonths.forEach((m) => {
      if (!list.some((item) => item.value === m)) {
        list.push({ value: m, label: m, isEligibleToFill: false });
      }
    });

    return list;
  };

  const [existingReports, setExistingReports] = useState<MonthlyProgressReport[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-08');
  const [currentReport, setCurrentReport] = useState<MonthlyProgressReport | null>(null);

  // 1. Patient Demographics
  const [newOpd, setNewOpd] = useState({ male: 0, female: 0, other: 0 });
  const [oldOpd, setOldOpd] = useState({ male: 0, female: 0, other: 0 });
  const [ipdPatients, setIpdPatients] = useState({ male: 0, female: 0, other: 0 });
  const [panchakarmaPatients, setPanchakarmaPatients] = useState({ male: 0, female: 0, other: 0 });

  // 2. Levi Collection (₹)
  const [opdLevi, setOpdLevi] = useState<number>(0);
  const [panchakarmaLevi, setPanchakarmaLevi] = useState<number>(0);
  const [medicalLevi, setMedicalLevi] = useState<number>(0);
  const [otherLevi, setOtherLevi] = useState<number>(0);

  // 3. Digital Seeding & Origin
  const [mobileSeeded, setMobileSeeded] = useState<number>(0);
  const [aadhaarSeeded, setAadhaarSeeded] = useState<number>(0);
  const [patientsOutsideDdn, setPatientsOutsideDdn] = useState<number>(0);
  const [patientsForeigners, setPatientsForeigners] = useState<number>(0);

  // 4. Camps & Outreach
  const [totalCamps, setTotalCamps] = useState<number>(0);
  const [campBeneficiaries, setCampBeneficiaries] = useState({ male: 0, female: 0, other: 0, children: 0 });
  const [yogaBeneficiaries, setYogaBeneficiaries] = useState({ male: 0, female: 0, other: 0 });

  // 5. 38 Disease-Wise Matrix
  const [diseaseSearch, setDiseaseSearch] = useState<string>('');
  const [diseaseRecords, setDiseaseRecords] = useState<Record<number, { new_cases: number; old_cases: number }>>({});

  // 6. Notes
  const [stockShortageNotes, setStockShortageNotes] = useState<string>('');
  const [generalRemarks, setGeneralRemarks] = useState<string>('');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [printModalReport, setPrintModalReport] = useState<MonthlyProgressReport | null>(null);

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
      const m = reportForMonth.other_metrics || {};

      // Demographics
      if (m.new_opd) {
        setNewOpd({ male: m.new_opd.male || 0, female: m.new_opd.female || 0, other: m.new_opd.other || 0 });
      } else {
        setNewOpd({ male: m.opd_male || 0, female: m.opd_female || 0, other: m.opd_child || 0 });
      }

      if (m.old_opd) {
        setOldOpd({ male: m.old_opd.male || 0, female: m.old_opd.female || 0, other: m.old_opd.other || 0 });
      } else {
        setOldOpd({ male: 0, female: 0, other: 0 });
      }

      if (m.ipd_patients) {
        setIpdPatients({ male: m.ipd_patients.male || 0, female: m.ipd_patients.female || 0, other: m.ipd_patients.other || 0 });
      } else {
        setIpdPatients({ male: m.ipd_admissions || 0, female: 0, other: 0 });
      }

      if (m.panchakarma_patients) {
        setPanchakarmaPatients({
          male: m.panchakarma_patients.male || 0,
          female: m.panchakarma_patients.female || 0,
          other: m.panchakarma_patients.other || 0,
        });
      } else {
        setPanchakarmaPatients({
          male: reportForMonth.panchakarma_count || 0,
          female: 0,
          other: 0,
        });
      }

      // Levi
      if (m.levi) {
        setOpdLevi(m.levi.opd_levi || 0);
        setPanchakarmaLevi(m.levi.panchakarma_levi || 0);
        setMedicalLevi(m.levi.medical_levi || 0);
        setOtherLevi(m.levi.other_levi || 0);
      } else {
        setOpdLevi(0);
        setPanchakarmaLevi(0);
        setMedicalLevi(0);
        setOtherLevi(0);
      }

      // Seeding
      setMobileSeeded(m.mobile_seeded || 0);
      setAadhaarSeeded(m.aadhaar_seeded || 0);
      setPatientsOutsideDdn(m.patients_outside_dehradun || 0);
      setPatientsForeigners(m.patients_foreigners || 0);

      // Camps & Yoga
      setTotalCamps(m.total_camps || m.ayush_camps_conducted || 0);
      if (m.camp_beneficiaries) {
        setCampBeneficiaries({
          male: m.camp_beneficiaries.male || 0,
          female: m.camp_beneficiaries.female || 0,
          other: m.camp_beneficiaries.other || 0,
          children: m.camp_beneficiaries.children || 0,
        });
      } else {
        setCampBeneficiaries({ male: 0, female: 0, other: 0, children: 0 });
      }

      if (m.yoga_beneficiaries) {
        setYogaBeneficiaries({
          male: m.yoga_beneficiaries.male || 0,
          female: m.yoga_beneficiaries.female || 0,
          other: m.yoga_beneficiaries.other || 0,
        });
      } else {
        setYogaBeneficiaries({ male: m.yoga_participants || 0, female: 0, other: 0 });
      }

      // Diseases
      if (m.disease_details) {
        const dRec: Record<number, { new_cases: number; old_cases: number }> = {};
        Object.entries(m.disease_details).forEach(([key, val]) => {
          dRec[Number(key)] = { new_cases: val.new_cases || 0, old_cases: val.old_cases || 0 };
        });
        setDiseaseRecords(dRec);
      } else {
        setDiseaseRecords({});
      }

      setStockShortageNotes(m.stock_shortage_notes || '');
      setGeneralRemarks(m.remarks || '');
    } else {
      setCurrentReport(null);
      resetForm();
    }
  };

  const resetForm = () => {
    setNewOpd({ male: 0, female: 0, other: 0 });
    setOldOpd({ male: 0, female: 0, other: 0 });
    setIpdPatients({ male: 0, female: 0, other: 0 });
    setPanchakarmaPatients({ male: 0, female: 0, other: 0 });
    setOpdLevi(0);
    setPanchakarmaLevi(0);
    setMedicalLevi(0);
    setOtherLevi(0);
    setMobileSeeded(0);
    setAadhaarSeeded(0);
    setPatientsOutsideDdn(0);
    setPatientsForeigners(0);
    setTotalCamps(0);
    setCampBeneficiaries({ male: 0, female: 0, other: 0, children: 0 });
    setYogaBeneficiaries({ male: 0, female: 0, other: 0 });
    setDiseaseRecords({});
    setStockShortageNotes('');
    setGeneralRemarks('');
  };

  // Computations
  const totalNewOpd = newOpd.male + newOpd.female + newOpd.other;
  const totalOldOpd = oldOpd.male + oldOpd.female + oldOpd.other;
  const grandTotalOpd = totalNewOpd + totalOldOpd;
  const totalIpd = ipdPatients.male + ipdPatients.female + ipdPatients.other;
  const totalPanchakarma = panchakarmaPatients.male + panchakarmaPatients.female + panchakarmaPatients.other;
  const totalLevi = opdLevi + panchakarmaLevi + medicalLevi + otherLevi;
  const totalCampBen = campBeneficiaries.male + campBeneficiaries.female + campBeneficiaries.other + campBeneficiaries.children;
  const totalYogaBen = yogaBeneficiaries.male + yogaBeneficiaries.female + yogaBeneficiaries.other;

  // Lifecycle check: Is this month's report submitted?
  // Once submitted, user cannot edit any data (uneditable permanent record)
  const isSubmitted = Boolean(currentReport);
  const isReadOnly = isSubmitted;

  const handleDiseaseChange = (diseaseId: number, field: 'new_cases' | 'old_cases', val: number) => {
    if (isReadOnly) return;
    setDiseaseRecords((prev) => ({
      ...prev,
      [diseaseId]: {
        new_cases: field === 'new_cases' ? val : prev[diseaseId]?.new_cases || 0,
        old_cases: field === 'old_cases' ? val : prev[diseaseId]?.old_cases || 0,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hospital || isReadOnly) return;

    if (grandTotalOpd === 0) {
      setNotification('Please enter the OPD patient counts before submitting the MPR.');
      return;
    }

    setIsSubmitting(true);
    const submissionTime = new Date().toISOString();

    const diseaseMapPayload: Record<string, any> = {};
    MPR_DISEASE_LIST.forEach((d) => {
      const rec = diseaseRecords[d.id] || { new_cases: 0, old_cases: 0 };
      diseaseMapPayload[d.id] = {
        sNo: d.sNo,
        hindi: d.hindi,
        english: d.english,
        new_cases: rec.new_cases,
        old_cases: rec.old_cases,
        total_cases: rec.new_cases + rec.old_cases,
      };
    });

    const otherMetricsPayload: OtherMprMetrics = {
      new_opd: { ...newOpd, total: totalNewOpd },
      old_opd: { ...oldOpd, total: totalOldOpd },
      ipd_patients: { ...ipdPatients, total: totalIpd },
      panchakarma_patients: { ...panchakarmaPatients, total: totalPanchakarma },
      levi: {
        opd_levi: opdLevi,
        panchakarma_levi: panchakarmaLevi,
        medical_levi: medicalLevi,
        other_levi: otherLevi,
        total_levi: totalLevi,
      },
      mobile_seeded: mobileSeeded,
      aadhaar_seeded: aadhaarSeeded,
      patients_outside_dehradun: patientsOutsideDdn,
      patients_foreigners: patientsForeigners,
      total_camps: totalCamps,
      camp_beneficiaries: { ...campBeneficiaries, total: totalCampBen },
      yoga_beneficiaries: { ...yogaBeneficiaries, total: totalYogaBen },
      disease_details: diseaseMapPayload,
      stock_shortage_notes: stockShortageNotes,
      remarks: generalRemarks,

      // Legacy fallback fields
      opd_male: newOpd.male + oldOpd.male,
      opd_female: newOpd.female + oldOpd.female,
      opd_child: newOpd.other + oldOpd.other,
      ipd_admissions: totalIpd,
      yoga_participants: totalYogaBen,
      ayush_camps_conducted: totalCamps,
    };

    const reportPayload: Omit<MonthlyProgressReport, 'id'> = {
      hospital_id: hospital.id,
      hospital_name: hospital.hospital_name,
      month_year: selectedMonth,
      opd_count: grandTotalOpd,
      panchakarma_count: totalPanchakarma,
      officer_name: officerName,
      submitted_at: submissionTime,
      other_metrics: otherMetricsPayload,
    };

    try {
      const saved = await dbService.submitMpr(reportPayload);
      setCurrentReport(saved);

      await dbService.addActivityLog({
        action: 'Submitted Monthly Progress Report',
        user: `${hospital.hospital_name} (${officerName})`,
        category: 'mpr',
        details: `Submitted MPR for ${selectedMonth} (Total OPD: ${grandTotalOpd}, Total Levi: ₹${totalLevi}).`,
        timestamp: submissionTime,
      });

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });

      setNotification(
        `Official MPR for ${selectedMonth} submitted and permanently locked on ${new Date(
          submissionTime
        ).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} at ${new Date(
          submissionTime
        ).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}! Once submitted, returns cannot be edited.`
      );
      loadHospitalReports();
    } catch (err: any) {
      setNotification(`Submission failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredDiseases = MPR_DISEASE_LIST.filter(
    (d) =>
      d.hindi.toLowerCase().includes(diseaseSearch.toLowerCase()) ||
      d.english.toLowerCase().includes(diseaseSearch.toLowerCase()) ||
      d.sNo.toString() === diseaseSearch.trim()
  );

  const submittedMonthSet = new Set(existingReports.map((r) => r.month_year));
  const availableMonths = getEligibleMonths(submittedMonthSet);

  return (
    <div className="space-y-6">
      {/* Reporting Period (माहवार प्रगति आख्या) Dropdown Selector */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
        <div>
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-emerald-700" />
            Reporting Period (माहवार प्रगति आख्या)
          </label>
          <span className="text-[11px] text-slate-500">
            Select reporting month to view submitted returns or file pending returns.
          </span>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {/* Status Badge for Selected Month */}
          {submittedMonthSet.has(selectedMonth) ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 flex-shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              SUBMITTED
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-extrabold bg-amber-100 text-amber-900 border border-amber-300 flex-shrink-0">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              PENDING
            </span>
          )}

          {/* Month Dropdown Button */}
          <div className="relative min-w-[240px] sm:min-w-[300px]">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full pl-3 pr-8 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-xs"
            >
              {availableMonths.map((m) => {
                const isSub = submittedMonthSet.has(m.value);
                const subRec = existingReports.find((r) => r.month_year === m.value);
                const statusText = isSub
                  ? `✓ [SUBMITTED${subRec ? ` - ${new Date(subRec.submitted_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` : ''}]`
                  : `⏳ [PENDING]`;

                return (
                  <option key={m.value} value={m.value}>
                    {m.label} — {statusText}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold tracking-wider uppercase text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Uttarakhand Ayush Directorate Format
            </span>
            <span className="text-xs text-slate-500">• 38 Morbidity Diseases</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900">
            Monthly Progress Report: {availableMonths.find((m) => m.value === selectedMonth)?.label || selectedMonth}
          </h2>
          <p className="text-sm text-slate-600">
            {isSubmitted
              ? 'This report has been officially submitted and authenticated. View your submitted returns in uneditable mode or print the official A4 PDF.'
              : 'Enter patient footfall, IPD, Panchakarma, Levi collection, digital seeding, outreach camps, and disease morbidity.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {currentReport && (
            <button
              onClick={() => setPrintModalReport(currentReport)}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition cursor-pointer"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>Download / Print Official PDF</span>
            </button>
          )}
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-sm font-semibold flex items-center justify-between shadow-sm animate-fade-in no-print">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{notification}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-xs text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Lifecycle Status Bar */}
      {isSubmitted ? (
        <div className="bg-emerald-50/90 rounded-2xl p-5 border border-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold flex-shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-700" />
                Submitted & Locked in District Registry (Non-Editable)
              </div>
              <div className="text-sm font-bold text-slate-900 mt-0.5">
                MPR for {selectedMonth} was submitted on{' '}
                <span className="text-emerald-900 font-extrabold">
                  {new Date(currentReport!.submitted_at).toLocaleString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>{' '}
                by <span className="font-extrabold text-slate-900">{currentReport!.officer_name}</span>
              </div>
              <div className="text-xs text-emerald-800 mt-0.5">
                Total OPD: <strong>{currentReport!.opd_count}</strong> • Total Levi: <strong>₹{currentReport!.other_metrics?.levi?.total_levi || 0}</strong> • Once submitted, monthly returns are permanently locked.
              </div>
            </div>
          </div>

          <button
            onClick={() => setPrintModalReport(currentReport)}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow transition cursor-pointer self-start sm:self-auto"
          >
            <Printer className="w-4 h-4" />
            <span>Download Official Signed PDF</span>
          </button>
        </div>
      ) : (
        <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 flex items-center gap-3 shadow-xs text-amber-950 text-xs">
          <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div>
            <strong className="text-amber-900 font-bold uppercase tracking-wider block text-sm">
              MPR Pending for {availableMonths.find((m) => m.value === selectedMonth)?.label || selectedMonth}
            </strong>
            Enter the patient counts, revenue, outreach, and 38 disease figures below and click <strong>"Submit Official MPR"</strong>.
          </div>
        </div>
      )}

      {/* Live Summary Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 no-print">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-slate-500 text-xs font-semibold">Total OPD</div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{grandTotalOpd}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            New: {totalNewOpd} | Old: {totalOldOpd}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-slate-500 text-xs font-semibold">IPD Admissions</div>
          <div className="text-2xl font-black text-indigo-700 mt-1">{totalIpd}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">M: {ipdPatients.male} | F: {ipdPatients.female}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-slate-500 text-xs font-semibold">Panchakarma</div>
          <div className="text-2xl font-black text-amber-700 mt-1">{totalPanchakarma}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">M: {panchakarmaPatients.male} | F: {panchakarmaPatients.female}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-slate-500 text-xs font-semibold">Total Levi Collected</div>
          <div className="text-2xl font-black text-emerald-900 mt-1">₹{totalLevi}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">All Categories</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs col-span-2 sm:col-span-1">
          <div className="text-slate-500 text-xs font-semibold">Camps & Yoga</div>
          <div className="text-2xl font-black text-teal-700 mt-1">{totalCampBen + totalYogaBen}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Camps: {totalCamps} ({totalCampBen})
          </div>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Patient Footfall & Demographics */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-700" />
              <h3 className="text-base font-bold text-slate-900">
                1. Patient Demographics & Service Utilization (ओ.पी.डी., आई.पी.डी. एवं पंचकर्म)
              </h3>
            </div>
            {isReadOnly && (
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Uneditable
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 text-xs uppercase font-bold">
                  <th className="py-2.5 px-3">Service / Category</th>
                  <th className="py-2.5 px-3 w-28 text-center">Male (पुरुष)</th>
                  <th className="py-2.5 px-3 w-28 text-center">Female (महिला)</th>
                  <th className="py-2.5 px-3 w-28 text-center">Other (अन्य)</th>
                  <th className="py-2.5 px-3 w-32 text-center bg-slate-100">Total (योग)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* New OPD */}
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-800">
                    New OPD Patients <span className="text-xs text-slate-500 block">नवीन ओ.पी.डी. रोगी</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <input
                      type="number"
                      min={0}
                      disabled={isReadOnly}
                      value={newOpd.male || ''}
                      onChange={(e) => setNewOpd({ ...newOpd, male: Math.max(0, parseInt(e.target.value) || 0) })}
                      placeholder="0"
                      className="w-full text-center py-1.5 px-2 bg-slate-50 disabled:bg-slate-100/80 disabled:text-slate-800 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-emerald-500"
                    />
                  </td>
                  <td className="py-2.5 px-3">
                    <input
                      type="number"
                      min={0}
                      disabled={isReadOnly}
                      value={newOpd.female || ''}
                      onChange={(e) => setNewOpd({ ...newOpd, female: Math.max(0, parseInt(e.target.value) || 0) })}
                      placeholder="0"
                      className="w-full text-center py-1.5 px-2 bg-slate-50 disabled:bg-slate-100/80 disabled:text-slate-800 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-emerald-500"
                    />
                  </td>
                  <td className="py-2.5 px-3">
                    <input
                      type="number"
                      min={0}
                      disabled={isReadOnly}
                      value={newOpd.other || ''}
                      onChange={(e) => setNewOpd({ ...newOpd, other: Math.max(0, parseInt(e.target.value) || 0) })}
                      placeholder="0"
                      className="w-full text-center py-1.5 px-2 bg-slate-50 disabled:bg-slate-100/80 disabled:text-slate-800 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-emerald-500"
                    />
                  </td>
                  <td className="py-2.5 px-3 text-center font-bold text-slate-900 bg-slate-50 text-base">
                    {totalNewOpd}
                  </td>
                </tr>

                {/* Old OPD */}
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-800">
                    Old OPD Patients <span className="text-xs text-slate-500 block">पुरातन ओ.पी.डी. रोगी</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <input
                      type="number"
                      min={0}
                      disabled={isReadOnly}
                      value={oldOpd.male || ''}
                      onChange={(e) => setOldOpd({ ...oldOpd, male: Math.max(0, parseInt(e.target.value) || 0) })}
                      placeholder="0"
                      className="w-full text-center py-1.5 px-2 bg-slate-50 disabled:bg-slate-100/80 disabled:text-slate-800 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-emerald-500"
                    />
                  </td>
                  <td className="py-2.5 px-3">
                    <input
                      type="number"
                      min={0}
                      disabled={isReadOnly}
                      value={oldOpd.female || ''}
                      onChange={(e) => setOldOpd({ ...oldOpd, female: Math.max(0, parseInt(e.target.value) || 0) })}
                      placeholder="0"
                      className="w-full text-center py-1.5 px-2 bg-slate-50 disabled:bg-slate-100/80 disabled:text-slate-800 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-emerald-500"
                    />
                  </td>
                  <td className="py-2.5 px-3">
                    <input
                      type="number"
                      min={0}
                      disabled={isReadOnly}
                      value={oldOpd.other || ''}
                      onChange={(e) => setOldOpd({ ...oldOpd, other: Math.max(0, parseInt(e.target.value) || 0) })}
                      placeholder="0"
                      className="w-full text-center py-1.5 px-2 bg-slate-50 disabled:bg-slate-100/80 disabled:text-slate-800 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-emerald-500"
                    />
                  </td>
                  <td className="py-2.5 px-3 text-center font-bold text-slate-900 bg-slate-50 text-base">
                    {totalOldOpd}
                  </td>
                </tr>

                {/* Total Combined OPD Row */}
                <tr className="bg-emerald-50/70 font-extrabold text-emerald-950">
                  <td className="py-2.5 px-3">Total Combined OPD (New + Old)</td>
                  <td className="py-2.5 px-3 text-center">{newOpd.male + oldOpd.male}</td>
                  <td className="py-2.5 px-3 text-center">{newOpd.female + oldOpd.female}</td>
                  <td className="py-2.5 px-3 text-center">{newOpd.other + oldOpd.other}</td>
                  <td className="py-2.5 px-3 text-center text-lg text-emerald-900 bg-emerald-100">
                    {grandTotalOpd}
                  </td>
                </tr>

                {/* IPD Patients */}
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-800">
                    IPD Patients (Admissions) <span className="text-xs text-slate-500 block">आई.पी.डी. भर्ती रोगी</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <input
                      type="number"
                      min={0}
                      disabled={isReadOnly}
                      value={ipdPatients.male || ''}
                      onChange={(e) => setIpdPatients({ ...ipdPatients, male: Math.max(0, parseInt(e.target.value) || 0) })}
                      placeholder="0"
                      className="w-full text-center py-1.5 px-2 bg-slate-50 disabled:bg-slate-100/80 disabled:text-slate-800 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-emerald-500"
                    />
                  </td>
                  <td className="py-2.5 px-3">
                    <input
                      type="number"
                      min={0}
                      disabled={isReadOnly}
                      value={ipdPatients.female || ''}
                      onChange={(e) => setIpdPatients({ ...ipdPatients, female: Math.max(0, parseInt(e.target.value) || 0) })}
                      placeholder="0"
                      className="w-full text-center py-1.5 px-2 bg-slate-50 disabled:bg-slate-100/80 disabled:text-slate-800 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-emerald-500"
                    />
                  </td>
                  <td className="py-2.5 px-3">
                    <input
                      type="number"
                      min={0}
                      disabled={isReadOnly}
                      value={ipdPatients.other || ''}
                      onChange={(e) => setIpdPatients({ ...ipdPatients, other: Math.max(0, parseInt(e.target.value) || 0) })}
                      placeholder="0"
                      className="w-full text-center py-1.5 px-2 bg-slate-50 disabled:bg-slate-100/80 disabled:text-slate-800 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-emerald-500"
                    />
                  </td>
                  <td className="py-2.5 px-3 text-center font-bold text-slate-900 bg-slate-50 text-base">
                    {totalIpd}
                  </td>
                </tr>

                {/* Panchakarma Patients */}
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-800">
                    Panchakarma Patients <span className="text-xs text-slate-500 block">पंचकर्म रोगी</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <input
                      type="number"
                      min={0}
                      disabled={isReadOnly}
                      value={panchakarmaPatients.male || ''}
                      onChange={(e) => setPanchakarmaPatients({ ...panchakarmaPatients, male: Math.max(0, parseInt(e.target.value) || 0) })}
                      placeholder="0"
                      className="w-full text-center py-1.5 px-2 bg-slate-50 disabled:bg-slate-100/80 disabled:text-slate-800 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-emerald-500"
                    />
                  </td>
                  <td className="py-2.5 px-3">
                    <input
                      type="number"
                      min={0}
                      disabled={isReadOnly}
                      value={panchakarmaPatients.female || ''}
                      onChange={(e) => setPanchakarmaPatients({ ...panchakarmaPatients, female: Math.max(0, parseInt(e.target.value) || 0) })}
                      placeholder="0"
                      className="w-full text-center py-1.5 px-2 bg-slate-50 disabled:bg-slate-100/80 disabled:text-slate-800 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-emerald-500"
                    />
                  </td>
                  <td className="py-2.5 px-3">
                    <input
                      type="number"
                      min={0}
                      disabled={isReadOnly}
                      value={panchakarmaPatients.other || ''}
                      onChange={(e) => setPanchakarmaPatients({ ...panchakarmaPatients, other: Math.max(0, parseInt(e.target.value) || 0) })}
                      placeholder="0"
                      className="w-full text-center py-1.5 px-2 bg-slate-50 disabled:bg-slate-100/80 disabled:text-slate-800 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-emerald-500"
                    />
                  </td>
                  <td className="py-2.5 px-3 text-center font-bold text-slate-900 bg-slate-50 text-base">
                    {totalPanchakarma}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 2: Levi Collection (₹) & Origin / Verification */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Levi Collection */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <IndianRupee className="w-5 h-5 text-emerald-700" />
                <h3 className="text-base font-bold text-slate-900">
                  2. Levi Collection (लेवी संग्रह विवरण)
                </h3>
              </div>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Total: ₹{totalLevi}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  OPD Levi (₹) <span className="text-slate-400 font-normal">ओ.पी.डी. लेवी</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 text-xs">₹</span>
                  <input
                    type="number"
                    min={0}
                    disabled={isReadOnly}
                    value={opdLevi || ''}
                    onChange={(e) => setOpdLevi(Math.max(0, parseInt(e.target.value) || 0))}
                    placeholder="0"
                    className="w-full pl-6 pr-3 py-2 bg-slate-50 disabled:bg-slate-100/80 disabled:text-slate-800 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Panchakarma Levi (₹) <span className="text-slate-400 font-normal">पंचकर्म लेवी</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 text-xs">₹</span>
                  <input
                    type="number"
                    min={0}
                    disabled={isReadOnly}
                    value={panchakarmaLevi || ''}
                    onChange={(e) => setPanchakarmaLevi(Math.max(0, parseInt(e.target.value) || 0))}
                    placeholder="0"
                    className="w-full pl-6 pr-3 py-2 bg-slate-50 disabled:bg-slate-100/80 disabled:text-slate-800 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Medical Cert. Levi (₹) <span className="text-slate-400 font-normal">प्रमाण पत्र लेवी</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 text-xs">₹</span>
                  <input
                    type="number"
                    min={0}
                    disabled={isReadOnly}
                    value={medicalLevi || ''}
                    onChange={(e) => setMedicalLevi(Math.max(0, parseInt(e.target.value) || 0))}
                    placeholder="0"
                    className="w-full pl-6 pr-3 py-2 bg-slate-50 disabled:bg-slate-100/80 disabled:text-slate-800 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Other Levi (₹) <span className="text-slate-400 font-normal">अन्य लेवी</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 text-xs">₹</span>
                  <input
                    type="number"
                    min={0}
                    disabled={isReadOnly}
                    value={otherLevi || ''}
                    onChange={(e) => setOtherLevi(Math.max(0, parseInt(e.target.value) || 0))}
                    placeholder="0"
                    className="w-full pl-6 pr-3 py-2 bg-slate-50 disabled:bg-slate-100/80 disabled:text-slate-800 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 flex items-center justify-between text-xs">
              <span className="font-bold text-emerald-900">Total Levi Deposit / Collection:</span>
              <span className="font-extrabold text-base text-emerald-950">₹{totalLevi}</span>
            </div>
          </div>

          {/* Digital Seeding & Patient Origin */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
              <ShieldCheck className="w-5 h-5 text-indigo-700" />
              <h3 className="text-base font-bold text-slate-900">
                3. Seeding & Patient Origin (सीडिंग एवं रोगी मूल)
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mobile Seeded <span className="text-slate-400 font-normal">मोबाइल सीडेड</span>
                </label>
                <input
                  type="number"
                  min={0}
                  disabled={isReadOnly}
                  value={mobileSeeded || ''}
                  onChange={(e) => setMobileSeeded(Math.max(0, parseInt(e.target.value) || 0))}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-slate-50 disabled:bg-slate-100/80 disabled:text-slate-800 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Aadhaar Seeded <span className="text-slate-400 font-normal">आधार सीडेड</span>
                </label>
                <input
                  type="number"
                  min={0}
                  disabled={isReadOnly}
                  value={aadhaarSeeded || ''}
                  onChange={(e) => setAadhaarSeeded(Math.max(0, parseInt(e.target.value) || 0))}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-slate-50 disabled:bg-slate-100/80 disabled:text-slate-800 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Outside Dehradun Patients <span className="text-slate-400 font-normal">जनपद से बाहर</span>
                </label>
                <input
                  type="number"
                  min={0}
                  disabled={isReadOnly}
                  value={patientsOutsideDdn || ''}
                  onChange={(e) => setPatientsOutsideDdn(Math.max(0, parseInt(e.target.value) || 0))}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-slate-50 disabled:bg-slate-100/80 disabled:text-slate-800 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Foreigner Patients <span className="text-slate-400 font-normal">विदेशी रोगी</span>
                </label>
                <input
                  type="number"
                  min={0}
                  disabled={isReadOnly}
                  value={patientsForeigners || ''}
                  onChange={(e) => setPatientsForeigners(Math.max(0, parseInt(e.target.value) || 0))}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-slate-50 disabled:bg-slate-100/80 disabled:text-slate-800 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <p className="text-[11px] text-slate-500">
              Captures digital registry compliance under ABDM and tourist/migrant patient footfall in Dehradun.
            </p>
          </div>
        </div>

        {/* Section 3: Camps & Yoga Beneficiaries */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <HeartPulse className="w-5 h-5 text-teal-700" />
            <h3 className="text-base font-bold text-slate-900">
              4. Outreach Camps & Yoga Beneficiaries (शिविर एवं योग सत्र)
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
            {/* Total camps */}
            <div className="md:col-span-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Total Ayush Camps <span className="text-slate-400 font-normal">कुल आयोजित शिविर</span>
              </label>
              <input
                type="number"
                min={0}
                disabled={isReadOnly}
                value={totalCamps || ''}
                onChange={(e) => setTotalCamps(Math.max(0, parseInt(e.target.value) || 0))}
                placeholder="0"
                className="w-full px-3 py-2 bg-white disabled:bg-slate-100 disabled:text-slate-800 border border-slate-300 rounded-xl text-lg font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">Number of health camps organized</span>
            </div>

            {/* Camp Beneficiaries Breakdown */}
            <div className="md:col-span-5 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="text-xs font-bold text-slate-700 flex justify-between">
                <span>Camp Beneficiaries (शिविर लाभार्थी)</span>
                <span className="text-emerald-800 font-bold">Total: {totalCampBen}</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 block">Male</label>
                  <input
                    type="number"
                    min={0}
                    disabled={isReadOnly}
                    value={campBeneficiaries.male || ''}
                    onChange={(e) => setCampBeneficiaries({ ...campBeneficiaries, male: Math.max(0, parseInt(e.target.value) || 0) })}
                    placeholder="0"
                    className="w-full text-center py-1 px-1 text-xs font-semibold bg-white disabled:bg-slate-100 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block">Female</label>
                  <input
                    type="number"
                    min={0}
                    disabled={isReadOnly}
                    value={campBeneficiaries.female || ''}
                    onChange={(e) => setCampBeneficiaries({ ...campBeneficiaries, female: Math.max(0, parseInt(e.target.value) || 0) })}
                    placeholder="0"
                    className="w-full text-center py-1 px-1 text-xs font-semibold bg-white disabled:bg-slate-100 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block">Other</label>
                  <input
                    type="number"
                    min={0}
                    disabled={isReadOnly}
                    value={campBeneficiaries.other || ''}
                    onChange={(e) => setCampBeneficiaries({ ...campBeneficiaries, other: Math.max(0, parseInt(e.target.value) || 0) })}
                    placeholder="0"
                    className="w-full text-center py-1 px-1 text-xs font-semibold bg-white disabled:bg-slate-100 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block">Children</label>
                  <input
                    type="number"
                    min={0}
                    disabled={isReadOnly}
                    value={campBeneficiaries.children || ''}
                    onChange={(e) => setCampBeneficiaries({ ...campBeneficiaries, children: Math.max(0, parseInt(e.target.value) || 0) })}
                    placeholder="0"
                    className="w-full text-center py-1 px-1 text-xs font-semibold bg-white disabled:bg-slate-100 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Yoga Beneficiaries Breakdown */}
            <div className="md:col-span-4 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="text-xs font-bold text-slate-700 flex justify-between">
                <span>Yoga Beneficiaries (योग लाभार्थी)</span>
                <span className="text-emerald-800 font-bold">Total: {totalYogaBen}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 block">Male</label>
                  <input
                    type="number"
                    min={0}
                    disabled={isReadOnly}
                    value={yogaBeneficiaries.male || ''}
                    onChange={(e) => setYogaBeneficiaries({ ...yogaBeneficiaries, male: Math.max(0, parseInt(e.target.value) || 0) })}
                    placeholder="0"
                    className="w-full text-center py-1 px-1 text-xs font-semibold bg-white disabled:bg-slate-100 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block">Female</label>
                  <input
                    type="number"
                    min={0}
                    disabled={isReadOnly}
                    value={yogaBeneficiaries.female || ''}
                    onChange={(e) => setYogaBeneficiaries({ ...yogaBeneficiaries, female: Math.max(0, parseInt(e.target.value) || 0) })}
                    placeholder="0"
                    className="w-full text-center py-1 px-1 text-xs font-semibold bg-white disabled:bg-slate-100 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block">Other</label>
                  <input
                    type="number"
                    min={0}
                    disabled={isReadOnly}
                    value={yogaBeneficiaries.other || ''}
                    onChange={(e) => setYogaBeneficiaries({ ...yogaBeneficiaries, other: Math.max(0, parseInt(e.target.value) || 0) })}
                    placeholder="0"
                    className="w-full text-center py-1 px-1 text-xs font-semibold bg-white disabled:bg-slate-100 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: 38 Disease-Wise Morbidity Record */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-700" />
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  5. Disease-Wise Morbidity Data (रोगवार विवरण - 38 श्रेणियां)
                </h3>
                <span className="text-xs text-slate-500">
                  Official 38 disease classification prescribed by Directorate of Ayurvedic Services.
                </span>
              </div>
            </div>

            {/* Search Disease */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search disease / रोग खोजें..."
                value={diseaseSearch}
                onChange={(e) => setDiseaseSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto max-h-[500px] overflow-y-auto border border-slate-200 rounded-xl">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="sticky top-0 bg-slate-100 text-slate-700 font-bold border-b border-slate-300 uppercase z-10">
                <tr>
                  <th className="py-2 px-3 w-14 text-center">क्र. / S.No</th>
                  <th className="py-2 px-3">Disease Category (रोग का नाम - हिन्दी / English)</th>
                  <th className="py-2 px-3 w-28 text-center">New (नवीन)</th>
                  <th className="py-2 px-3 w-28 text-center">Old (पुरातन)</th>
                  <th className="py-2 px-3 w-28 text-center bg-slate-200">Total (योग)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDiseases.map((d) => {
                  const rec = diseaseRecords[d.id] || { new_cases: 0, old_cases: 0 };
                  const rowTotal = rec.new_cases + rec.old_cases;

                  return (
                    <tr
                      key={d.id}
                      className={`hover:bg-slate-50/80 transition ${
                        rowTotal > 0 ? 'bg-emerald-50/30' : ''
                      }`}
                    >
                      <td className="py-2 px-3 text-center font-bold text-slate-500">
                        {d.sNo}
                      </td>
                      <td className="py-2 px-3">
                        <span className="font-bold text-slate-900 text-sm">{d.hindi}</span>
                        <span className="text-slate-500 text-xs ml-2">({d.english})</span>
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          min={0}
                          disabled={isReadOnly}
                          value={rec.new_cases || ''}
                          onChange={(e) =>
                            handleDiseaseChange(
                              d.id,
                              'new_cases',
                              Math.max(0, parseInt(e.target.value) || 0)
                            )
                          }
                          placeholder="0"
                          className="w-full text-center py-1 px-2 bg-slate-50 disabled:bg-slate-100/80 disabled:text-slate-800 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          min={0}
                          disabled={isReadOnly}
                          value={rec.old_cases || ''}
                          onChange={(e) =>
                            handleDiseaseChange(
                              d.id,
                              'old_cases',
                              Math.max(0, parseInt(e.target.value) || 0)
                            )
                          }
                          placeholder="0"
                          className="w-full text-center py-1 px-2 bg-slate-50 disabled:bg-slate-100/80 disabled:text-slate-800 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="py-2 px-3 text-center font-bold text-slate-900 bg-slate-50">
                        {rowTotal}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 5: Shortages, Remarks & Final Submission */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <FileText className="w-5 h-5 text-emerald-700" />
            <h3 className="text-base font-bold text-slate-900">
              6. Stock Shortages & Remarks (औषधि अभाव एवं टिप्पणी)
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Medicine Stock Shortages / Urgent Requirements
              </label>
              <textarea
                rows={3}
                disabled={isReadOnly}
                value={stockShortageNotes}
                onChange={(e) => setStockShortageNotes(e.target.value)}
                placeholder="Mention any critical medicines in short supply (e.g. Mahasudarshan, Yograj Guggulu, etc.)..."
                className="w-full p-3 bg-slate-50 disabled:bg-slate-100/80 disabled:text-slate-800 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                General Administrative Remarks / Special Achievements
              </label>
              <textarea
                rows={3}
                disabled={isReadOnly}
                value={generalRemarks}
                onChange={(e) => setGeneralRemarks(e.target.value)}
                placeholder="Any special camp notes, VIP visits, infrastructure updates..."
                className="w-full p-3 bg-slate-50 disabled:bg-slate-100/80 disabled:text-slate-800 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Submitting Officer Footer */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                Submitting Authority (प्रभारी चिकित्साधिकारी)
              </span>
              <span className="text-sm font-bold text-slate-900">{officerName}</span>
              <span className="text-xs text-slate-600 block">{hospital?.hospital_name}</span>
            </div>

            <div className="flex items-center gap-3">
              {currentReport && (
                <button
                  type="button"
                  onClick={() => setPrintModalReport(currentReport)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Preview & Print Official A4 PDF</span>
                </button>
              )}

              {isReadOnly ? (
                <span className="px-4 py-2.5 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-700" />
                  Return Locked (Submitted)
                </span>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition cursor-pointer disabled:opacity-60"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? 'Submitting Return...' : 'Submit Official MPR'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </form>

      {/* PDF / Print Modal */}
      {printModalReport && (
        <PrintableMprReport
          report={printModalReport}
          onClose={() => setPrintModalReport(null)}
        />
      )}
    </div>
  );
};
