import React, { useState, useEffect, useMemo } from 'react';
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
  Layers,
  Sparkles,
} from 'lucide-react';

export const AdminMprTracker: React.FC = () => {
  const [viewMode, setViewMode] = useState<'monthly' | 'annual'>('monthly');
  const [hospitals, setHospitals] = useState<HospitalMaster[]>([]);
  const [monthlyReports, setMonthlyReports] = useState<MonthlyProgressReport[]>([]);
  const [allFyReports, setAllFyReports] = useState<MonthlyProgressReport[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'submitted' | 'pending'>('all');

  // Print Modal State
  const [selectedReportForPrint, setSelectedReportForPrint] = useState<MonthlyProgressReport | null>(null);
  const [printModalTitle, setPrintModalTitle] = useState<string | undefined>(undefined);
  const [printModalPeriodLabel, setPrintModalPeriodLabel] = useState<string | undefined>(undefined);

  // Financial Year and eligible months calculation (excluding advance months)
  const { fyStartYear, fyEndYear, eligibleMonths, defaultEligibleMonth } = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1 to 12
    const lastDayOfMonth = new Date(currentYear, currentMonth, 0).getDate();
    const isLastDay = now.getDate() === lastDayOfMonth;

    const startYr = currentMonth >= 4 ? currentYear : currentYear - 1;
    const endYr = startYr + 1;

    const fyMonths = [
      { m: 4, name: 'April', y: startYr },
      { m: 5, name: 'May', y: startYr },
      { m: 6, name: 'June', y: startYr },
      { m: 7, name: 'July', y: startYr },
      { m: 8, name: 'August', y: startYr },
      { m: 9, name: 'September', y: startYr },
      { m: 10, name: 'October', y: startYr },
      { m: 11, name: 'November', y: startYr },
      { m: 12, name: 'December', y: startYr },
      { m: 1, name: 'January', y: endYr },
      { m: 2, name: 'February', y: endYr },
      { m: 3, name: 'March', y: endYr },
    ];

    // Filter out advance / future months (e.g. in September, September or later are omitted unless on last day)
    const validMonths = fyMonths
      .filter((item) => {
        if (item.y < currentYear) return true;
        if (item.y > currentYear) return false;
        if (item.m < currentMonth) return true;
        if (item.m === currentMonth && isLastDay) return true;
        return false;
      })
      .map((item) => ({
        value: `${item.y}-${String(item.m).padStart(2, '0')}`,
        label: `${item.name} ${item.y}`,
      }));

    const defaultMonth = validMonths.length > 0 ? validMonths[validMonths.length - 1].value : '2026-08';

    return {
      fyStartYear: startYr,
      fyEndYear: endYr,
      eligibleMonths: validMonths,
      defaultEligibleMonth: defaultMonth,
    };
  }, []);

  const [selectedMonth, setSelectedMonth] = useState<string>(defaultEligibleMonth);

  useEffect(() => {
    loadData();
  }, [selectedMonth, viewMode]);

  const loadData = async () => {
    const allHosp = await dbService.getHospitals();
    setHospitals(allHosp);

    if (viewMode === 'monthly') {
      const reports = await dbService.getMprReports(undefined, selectedMonth);
      setMonthlyReports(reports);
    } else {
      const allReports = await dbService.getMprReports();
      // Filter reports within current Financial Year (April startYr to March endYr)
      const fyReports = allReports.filter((r) => {
        const parts = r.month_year.split('-');
        if (parts.length < 2) return false;
        const yr = parseInt(parts[0], 10);
        const mo = parseInt(parts[1], 10);
        if (yr === fyStartYear && mo >= 4) return true;
        if (yr === fyEndYear && mo <= 3) return true;
        return false;
      });
      setAllFyReports(fyReports);
    }
  };

  // Helper: Aggregate multiple MonthlyProgressReport items into one
  const aggregateReports = (
    reportList: MonthlyProgressReport[],
    targetHospId: string,
    targetHospName: string,
    periodLabelText: string
  ): MonthlyProgressReport => {
    let totalOpd = 0;
    let totalPanchakarma = 0;
    const aggNewOpd = { male: 0, female: 0, other: 0, total: 0 };
    const aggOldOpd = { male: 0, female: 0, other: 0, total: 0 };
    const aggIpd = { male: 0, female: 0, other: 0, total: 0 };
    const aggPk = { male: 0, female: 0, other: 0, total: 0 };
    const aggLevi = { opd_levi: 0, panchakarma_levi: 0, medical_levi: 0, other_levi: 0, total_levi: 0 };
    let aggMobileSeeded = 0;
    let aggAadhaarSeeded = 0;
    let aggOutsideDdn = 0;
    let aggForeigners = 0;
    let aggTotalCamps = 0;
    const aggCampBen = { male: 0, female: 0, other: 0, children: 0, total: 0 };
    const aggYogaBen = { male: 0, female: 0, other: 0, total: 0 };
    const aggDiseaseDetails: Record<string, any> = {};

    MPR_DISEASE_LIST.forEach((d) => {
      aggDiseaseDetails[String(d.sNo)] = {
        sNo: d.sNo,
        hindi: d.hindi,
        english: d.english,
        new_cases: 0,
        old_cases: 0,
        total_cases: 0,
      };
    });

    reportList.forEach((r) => {
      totalOpd += r.opd_count || 0;
      totalPanchakarma += r.panchakarma_count || 0;
      const m = r.other_metrics || {};

      if (m.new_opd) {
        aggNewOpd.male += m.new_opd.male || 0;
        aggNewOpd.female += m.new_opd.female || 0;
        aggNewOpd.other += m.new_opd.other || 0;
        aggNewOpd.total += m.new_opd.total || 0;
      }
      if (m.old_opd) {
        aggOldOpd.male += m.old_opd.male || 0;
        aggOldOpd.female += m.old_opd.female || 0;
        aggOldOpd.other += m.old_opd.other || 0;
        aggOldOpd.total += m.old_opd.total || 0;
      }
      if (m.ipd_patients) {
        aggIpd.male += m.ipd_patients.male || 0;
        aggIpd.female += m.ipd_patients.female || 0;
        aggIpd.other += m.ipd_patients.other || 0;
        aggIpd.total += m.ipd_patients.total || 0;
      } else if (m.ipd_admissions) {
        aggIpd.total += m.ipd_admissions;
      }
      if (m.panchakarma_patients) {
        aggPk.male += m.panchakarma_patients.male || 0;
        aggPk.female += m.panchakarma_patients.female || 0;
        aggPk.other += m.panchakarma_patients.other || 0;
        aggPk.total += m.panchakarma_patients.total || 0;
      }
      if (m.levi) {
        aggLevi.opd_levi += m.levi.opd_levi || 0;
        aggLevi.panchakarma_levi += m.levi.panchakarma_levi || 0;
        aggLevi.medical_levi += m.levi.medical_levi || 0;
        aggLevi.other_levi += m.levi.other_levi || 0;
        aggLevi.total_levi += m.levi.total_levi || 0;
      }
      aggMobileSeeded += m.mobile_seeded || 0;
      aggAadhaarSeeded += m.aadhaar_seeded || 0;
      aggOutsideDdn += m.patients_outside_dehradun || 0;
      aggForeigners += m.patients_foreigners || 0;
      aggTotalCamps += m.total_camps || m.ayush_camps_conducted || 0;

      if (m.camp_beneficiaries) {
        aggCampBen.male += m.camp_beneficiaries.male || 0;
        aggCampBen.female += m.camp_beneficiaries.female || 0;
        aggCampBen.other += m.camp_beneficiaries.other || 0;
        aggCampBen.children += m.camp_beneficiaries.children || 0;
        aggCampBen.total += m.camp_beneficiaries.total || 0;
      }
      if (m.yoga_beneficiaries) {
        aggYogaBen.male += m.yoga_beneficiaries.male || 0;
        aggYogaBen.female += m.yoga_beneficiaries.female || 0;
        aggYogaBen.other += m.yoga_beneficiaries.other || 0;
        aggYogaBen.total += m.yoga_beneficiaries.total || 0;
      } else if (m.yoga_participants) {
        aggYogaBen.total += m.yoga_participants;
      }

      if (m.disease_details) {
        Object.entries(m.disease_details).forEach(([sNoKey, item]: [string, any]) => {
          if (aggDiseaseDetails[sNoKey]) {
            aggDiseaseDetails[sNoKey].new_cases += item.new_cases || 0;
            aggDiseaseDetails[sNoKey].old_cases += item.old_cases || 0;
            aggDiseaseDetails[sNoKey].total_cases += item.total_cases || (item.new_cases || 0) + (item.old_cases || 0);
          }
        });
      }
    });

    return {
      id: `agg-${targetHospId}`,
      hospital_id: targetHospId,
      hospital_name: targetHospName,
      month_year: periodLabelText,
      opd_count: totalOpd,
      panchakarma_count: totalPanchakarma,
      other_metrics: {
        new_opd: aggNewOpd,
        old_opd: aggOldOpd,
        ipd_patients: aggIpd,
        panchakarma_patients: aggPk,
        levi: aggLevi,
        mobile_seeded: aggMobileSeeded,
        aadhaar_seeded: aggAadhaarSeeded,
        patients_outside_dehradun: aggOutsideDdn,
        patients_foreigners: aggForeigners,
        total_camps: aggTotalCamps,
        camp_beneficiaries: aggCampBen,
        yoga_beneficiaries: aggYogaBen,
        disease_details: aggDiseaseDetails,
      },
      officer_name: 'Medical Officer In-Charge / CMO',
      submitted_at: new Date().toISOString(),
    };
  };

  // Hospital map for monthly mode
  const monthlyReportMap = useMemo(() => {
    const map = new Map<string, MonthlyProgressReport>();
    monthlyReports.forEach((r) => map.set(r.hospital_id, r));
    return map;
  }, [monthlyReports]);

  // Annual data per hospital
  const annualHospitalData = useMemo(() => {
    const map = new Map<
      string,
      {
        submittedCount: number;
        submittedMonths: string[];
        totalOpd: number;
        totalIpd: number;
        totalPk: number;
        totalLevi: number;
        reports: MonthlyProgressReport[];
      }
    >();

    hospitals.forEach((h) => {
      const hospReports = allFyReports.filter((r) => r.hospital_id === h.id);
      const totalOpd = hospReports.reduce((sum, r) => sum + (r.opd_count || 0), 0);
      const totalIpd = hospReports.reduce((sum, r) => sum + (r.other_metrics?.ipd_patients?.total || r.other_metrics?.ipd_admissions || 0), 0);
      const totalPk = hospReports.reduce((sum, r) => sum + (r.panchakarma_count || 0), 0);
      const totalLevi = hospReports.reduce((sum, r) => sum + (r.other_metrics?.levi?.total_levi || 0), 0);

      map.set(h.id, {
        submittedCount: hospReports.length,
        submittedMonths: hospReports.map((r) => r.month_year),
        totalOpd,
        totalIpd,
        totalPk,
        totalLevi,
        reports: hospReports,
      });
    });

    return map;
  }, [hospitals, allFyReports]);

  // Filtered hospitals
  const filteredHospitals = hospitals.filter((h) => {
    const matchesSearch =
      h.hospital_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (h.category && h.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (h.block_name && h.block_name.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (viewMode === 'monthly') {
      const hasSubmitted = monthlyReportMap.has(h.id);
      if (statusFilter === 'submitted') return hasSubmitted;
      if (statusFilter === 'pending') return !hasSubmitted;
    } else {
      const data = annualHospitalData.get(h.id);
      const hasAnySubmission = Boolean(data && data.submittedCount > 0);
      if (statusFilter === 'submitted') return hasAnySubmission;
      if (statusFilter === 'pending') return !hasAnySubmission;
    }

    return true;
  });

  // Monthly Aggregate Computations
  const totalMonthlyOpd = monthlyReports.reduce((acc, r) => acc + (r.opd_count || 0), 0);
  const totalMonthlyIpd = monthlyReports.reduce((acc, r) => {
    const m = r.other_metrics || {};
    return acc + (m.ipd_patients?.total || m.ipd_admissions || 0);
  }, 0);
  const totalMonthlyPanchakarma = monthlyReports.reduce((acc, r) => acc + (r.panchakarma_count || 0), 0);
  const totalMonthlyLevi = monthlyReports.reduce((acc, r) => {
    const m = r.other_metrics || {};
    return acc + (m.levi?.total_levi || 0);
  }, 0);
  const totalMonthlyCamps = monthlyReports.reduce((acc, r) => {
    const m = r.other_metrics || {};
    return acc + (m.total_camps || m.ayush_camps_conducted || 0);
  }, 0);
  const totalMonthlyCampBen = monthlyReports.reduce((acc, r) => {
    const m = r.other_metrics || {};
    return acc + (m.camp_beneficiaries?.total || 0);
  }, 0);
  const totalMonthlyYogaBen = monthlyReports.reduce((acc, r) => {
    const m = r.other_metrics || {};
    return acc + (m.yoga_beneficiaries?.total || m.yoga_participants || 0);
  }, 0);

  // Annual District Aggregate Computations
  const totalAnnualOpd = allFyReports.reduce((acc, r) => acc + (r.opd_count || 0), 0);
  const totalAnnualIpd = allFyReports.reduce((acc, r) => {
    const m = r.other_metrics || {};
    return acc + (m.ipd_patients?.total || m.ipd_admissions || 0);
  }, 0);
  const totalAnnualPanchakarma = allFyReports.reduce((acc, r) => acc + (r.panchakarma_count || 0), 0);
  const totalAnnualLevi = allFyReports.reduce((acc, r) => {
    const m = r.other_metrics || {};
    return acc + (m.levi?.total_levi || 0);
  }, 0);
  const totalAnnualCamps = allFyReports.reduce((acc, r) => {
    const m = r.other_metrics || {};
    return acc + (m.total_camps || m.ayush_camps_conducted || 0);
  }, 0);
  const totalAnnualBeneficiaries = allFyReports.reduce((acc, r) => {
    const m = r.other_metrics || {};
    const c = m.camp_beneficiaries?.total || 0;
    const y = m.yoga_beneficiaries?.total || m.yoga_participants || 0;
    return acc + c + y;
  }, 0);

  const complianceRate =
    hospitals.length > 0
      ? Math.round(((viewMode === 'monthly' ? monthlyReports.length : allFyReports.length / (eligibleMonths.length || 1)) / hospitals.length) * 100)
      : 0;

  // Export Monthly Multi-Sheet Excel (.xlsx)
  const handleExportMonthlyExcel = () => {
    const consolidatedRows = monthlyReports.map((r, i) => {
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
        'Total Levi (₹)': levi.total_levi,
        'Mobile Seeded': m.mobile_seeded || 0,
        'Aadhaar Seeded': m.aadhaar_seeded || 0,
        'Total Camps': m.total_camps || 0,
        'Camp Beneficiaries': campBen.total,
        'Yoga Beneficiaries': yogaBen.total,
        'Submitting Officer': r.officer_name,
        'Submission Timestamp': new Date(r.submitted_at).toLocaleString('en-IN'),
      };
    });

    const diseaseRows = monthlyReports.map((r, i) => {
      const row: Record<string, any> = {
        'S.No': i + 1,
        'Hospital Name': r.hospital_name,
        'Month': r.month_year,
      };
      const dMap = r.other_metrics?.disease_details || {};
      MPR_DISEASE_LIST.forEach((d) => {
        const item = dMap[d.sNo] || dMap[d.id] || { new_cases: 0, old_cases: 0, total_cases: 0 };
        row[`${d.sNo}. ${d.hindi} (New)`] = item.new_cases;
        row[`${d.sNo}. ${d.hindi} (Old)`] = item.old_cases;
        row[`${d.sNo}. ${d.hindi} (Total)`] = item.total_cases;
      });
      return row;
    });

    const complianceRows = hospitals.map((h, i) => {
      const rep = monthlyReportMap.get(h.id);
      return {
        'S.No': i + 1,
        'Hospital Name': h.hospital_name,
        'Facility Type': h.category || h.block_name || 'State Ayurvedic Dispensary',
        'Status': rep ? 'SUBMITTED' : 'PENDING',
        'Total OPD': rep ? rep.opd_count : '-',
        'Total Levi (₹)': rep ? rep.other_metrics?.levi?.total_levi || 0 : '-',
        'Submitting Officer': rep ? rep.officer_name : '-',
        'Submission Time': rep ? new Date(rep.submitted_at).toLocaleString('en-IN') : '-',
      };
    });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(consolidatedRows), 'Monthly_Overview');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(diseaseRows), '38_Disease_Morbidity');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(complianceRows), 'Facility_Compliance');
    XLSX.writeFile(workbook, `Dehradun_Ayush_MPR_${selectedMonth}_Consolidated.xlsx`);
  };

  // Export Annual Multi-Sheet Excel (.xlsx)
  const handleExportAnnualExcel = () => {
    const annualOverviewRows = hospitals.map((h, i) => {
      const data = annualHospitalData.get(h.id);
      return {
        'S.No': i + 1,
        'Hospital Name': h.hospital_name,
        'Facility Type': h.category || h.block_name || 'State Ayurvedic Dispensary',
        'UID': h.uid || h.contact_phone || '',
        'Months Submitted': `${data?.submittedCount || 0} / ${eligibleMonths.length}`,
        'Compliance Rate': `${Math.round(((data?.submittedCount || 0) / (eligibleMonths.length || 1)) * 100)}%`,
        'Total Annual OPD': data?.totalOpd || 0,
        'Total Annual IPD': data?.totalIpd || 0,
        'Total Annual Panchakarma': data?.totalPk || 0,
        'Total Annual Levi (₹)': data?.totalLevi || 0,
      };
    });

    // 38 Disease Annual Aggregation
    const annualDiseaseRows = hospitals.map((h, i) => {
      const row: Record<string, any> = {
        'S.No': i + 1,
        'Hospital Name': h.hospital_name,
        'Facility Type': h.category || h.block_name || '',
      };
      const hospReports = allFyReports.filter((r) => r.hospital_id === h.id);
      MPR_DISEASE_LIST.forEach((d) => {
        let newTotal = 0;
        let oldTotal = 0;
        hospReports.forEach((r) => {
          const dMap = r.other_metrics?.disease_details || {};
          const item = dMap[d.sNo] || dMap[d.id] || { new_cases: 0, old_cases: 0 };
          newTotal += item.new_cases || 0;
          oldTotal += item.old_cases || 0;
        });
        row[`${d.sNo}. ${d.hindi} (New)`] = newTotal;
        row[`${d.sNo}. ${d.hindi} (Old)`] = oldTotal;
        row[`${d.sNo}. ${d.hindi} (Annual Total)`] = newTotal + oldTotal;
      });
      return row;
    });

    // Month-by-month compliance matrix
    const complianceMatrixRows = hospitals.map((h, i) => {
      const data = annualHospitalData.get(h.id);
      const row: Record<string, any> = {
        'S.No': i + 1,
        'Hospital Name': h.hospital_name,
        'Type': h.category || h.block_name || '',
        'Total Submitted': `${data?.submittedCount || 0} / ${eligibleMonths.length}`,
      };
      eligibleMonths.forEach((m) => {
        const submitted = data?.submittedMonths.includes(m.value);
        row[m.label] = submitted ? 'SUBMITTED' : 'PENDING';
      });
      return row;
    });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(annualOverviewRows), 'Annual_Facility_Overview');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(annualDiseaseRows), 'Annual_38_Disease_Matrix');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(complianceMatrixRows), 'Month_Compliance_Grid');
    XLSX.writeFile(workbook, `Dehradun_Ayush_Annual_MPR_FY${fyStartYear}-${fyEndYear}.xlsx`);
  };

  // Open District Annual A4 PDF
  const handlePrintDistrictAnnual = () => {
    const districtReport = aggregateReports(
      allFyReports,
      'district-dehradun',
      'समस्त राजकीय आयुर्वेदिक एवं यूनानी चिकित्सालय, जनपद देहरादून',
      `वित्तीय वर्ष ${fyStartYear}-${fyEndYear}`
    );
    setSelectedReportForPrint(districtReport);
    setPrintModalTitle(`जनपद देहरादून वार्षिक संकलित प्रगति आख्या (ANNUAL DISTRICT RETURN - FY ${fyStartYear}-${fyEndYear})`);
    setPrintModalPeriodLabel('वित्तीय वर्ष / Financial Year');
  };

  // Open Hospital Annual A4 PDF
  const handlePrintHospitalAnnual = (hosp: HospitalMaster) => {
    const hospReports = allFyReports.filter((r) => r.hospital_id === hosp.id);
    const hospAnnual = aggregateReports(
      hospReports,
      hosp.id,
      hosp.hospital_name,
      `वित्तीय वर्ष ${fyStartYear}-${fyEndYear}`
    );
    setSelectedReportForPrint(hospAnnual);
    setPrintModalTitle(`वार्षिक संकलित प्रगति आख्या (ANNUAL CONSOLIDATED RETURN - FY ${fyStartYear}-${fyEndYear})`);
    setPrintModalPeriodLabel('वित्तीय वर्ष / Financial Year');
  };

  // Open Hospital Monthly A4 PDF
  const handlePrintHospitalMonthly = (rep: MonthlyProgressReport) => {
    setSelectedReportForPrint(rep);
    setPrintModalTitle(undefined);
    setPrintModalPeriodLabel(undefined);
  };

  const selectedMonthLabel =
    eligibleMonths.find((m) => m.value === selectedMonth)?.label || selectedMonth;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold tracking-wider uppercase text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              District Central MIS
            </span>
            <span className="text-xs text-slate-500">• 87 Facilities • Financial Year {fyStartYear}–{fyEndYear}</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900">
            Monthly & Annual Progress Report (MPR) Console
          </h2>
          <p className="text-sm text-slate-600">
            Consolidated monitoring of patient demographics, IPD, Panchakarma, Levi collection, outreach camps, and 38-disease morbidity returns.
          </p>
        </div>

        {/* View Mode Toggle & Actions */}
        <div className="flex items-center gap-2 flex-wrap no-print">
          {/* Toggle buttons */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('monthly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === 'monthly'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              माहवार प्रगति आख्या
            </button>
            <button
              type="button"
              onClick={() => setViewMode('annual')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === 'annual'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              वार्षिक संकलित आख्या ({fyStartYear}-{fyEndYear % 100})
            </button>
          </div>

          {/* Month Selector in Monthly Mode (Strictly closed/eligible months only) */}
          {viewMode === 'monthly' && (
            <div className="flex items-center gap-1.5 bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-xl">
              <Calendar className="w-3.5 h-3.5 text-teal-700" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent border-0 text-xs font-bold text-teal-950 focus:ring-0 p-0 cursor-pointer"
              >
                {eligibleMonths.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Excel Export Button */}
          <button
            type="button"
            onClick={viewMode === 'monthly' ? handleExportMonthlyExcel : handleExportAnnualExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition cursor-pointer shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>{viewMode === 'monthly' ? 'Export Monthly Excel (.xlsx)' : 'Export Annual Excel (.xlsx)'}</span>
          </button>

          {/* District Annual A4 PDF Button */}
          {viewMode === 'annual' && (
            <button
              type="button"
              onClick={handlePrintDistrictAnnual}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold transition cursor-pointer shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>District Annual A4 PDF</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-semibold">
            {viewMode === 'monthly' ? 'Monthly OPD' : 'Total Annual OPD'}
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-1">
            {(viewMode === 'monthly' ? totalMonthlyOpd : totalAnnualOpd).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">New + Old Patients</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-semibold">
            {viewMode === 'monthly' ? 'Monthly IPD' : 'Total Annual IPD'}
          </div>
          <div className="text-2xl font-black text-indigo-700 mt-1">
            {(viewMode === 'monthly' ? totalMonthlyIpd : totalAnnualIpd).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">In-Patient Admissions</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-semibold">
            {viewMode === 'monthly' ? 'Monthly Panchakarma' : 'Annual Panchakarma'}
          </div>
          <div className="text-2xl font-black text-amber-700 mt-1">
            {(viewMode === 'monthly' ? totalMonthlyPanchakarma : totalAnnualPanchakarma).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Therapy Sessions</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-semibold">
            {viewMode === 'monthly' ? 'Monthly Levi' : 'Total Annual Levi'}
          </div>
          <div className="text-2xl font-black text-emerald-900 mt-1">
            ₹{(viewMode === 'monthly' ? totalMonthlyLevi : totalAnnualLevi).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Govt. Treasury Levi</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-semibold">
            {viewMode === 'monthly' ? 'Camps & Yoga' : 'Outreach Total'}
          </div>
          <div className="text-2xl font-black text-teal-700 mt-1">
            {(viewMode === 'monthly'
              ? totalMonthlyCampBen + totalMonthlyYogaBen
              : totalAnnualBeneficiaries
            ).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {viewMode === 'monthly' ? `${totalMonthlyCamps} Camps` : `${totalAnnualCamps} Total Camps`}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-semibold">Compliance Rate</div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {complianceRate}%
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {viewMode === 'monthly'
              ? `${monthlyReports.length}/${hospitals.length} Submitted`
              : `${allFyReports.length} returns received`}
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 no-print">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search facility name or type..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-slate-900"
          />
        </div>

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
            Submitted
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              statusFilter === 'pending'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            Pending
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
                <th className="py-3 px-3 w-44">Facility Type</th>
                <th className="py-3 px-3 w-32 text-center">
                  {viewMode === 'monthly' ? `Status (${selectedMonthLabel})` : `FY ${fyStartYear}-${fyEndYear} Compliance`}
                </th>
                <th className="py-3 px-3 w-24 text-right">
                  {viewMode === 'monthly' ? 'Monthly OPD' : 'Annual OPD'}
                </th>
                <th className="py-3 px-3 w-20 text-right">IPD</th>
                <th className="py-3 px-3 w-24 text-right">Panchakarma</th>
                <th className="py-3 px-3 w-24 text-right">Total Levi</th>
                <th className="py-3 px-3 w-40">
                  {viewMode === 'monthly' ? 'Medical Officer' : 'Submissions Log'}
                </th>
                <th className="py-3 px-3 w-28 text-center">A4 Printable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredHospitals.map((h, i) => {
                if (viewMode === 'monthly') {
                  const rep = monthlyReportMap.get(h.id);
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
                        <span className="text-[10px] text-slate-400 font-mono">
                          {h.uid || h.contact_phone || ''}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-block px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-medium">
                          {h.category || h.block_name || 'State Ayurvedic Dispensary'}
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
                      <td className="py-2.5 px-3 text-slate-800 font-medium text-[11px]">
                        {rep ? (
                          <div>
                            <div>{rep.officer_name}</div>
                            <div className="text-[10px] text-slate-400">
                              {new Date(rep.submitted_at).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                              })}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Not submitted</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {rep ? (
                          <button
                            onClick={() => handlePrintHospitalMonthly(rep)}
                            className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[10px] font-bold inline-flex items-center gap-1 shadow-xs transition cursor-pointer"
                            title="Download or Print Monthly A4 PDF"
                          >
                            <Printer className="w-3 h-3" />
                            <span>A4 PDF</span>
                          </button>
                        ) : (
                          <span className="text-slate-300 text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  );
                } else {
                  // Annual Mode row
                  const data = annualHospitalData.get(h.id);
                  const subCount = data?.submittedCount || 0;
                  const totalEligible = eligibleMonths.length || 1;
                  const isComplete = subCount >= totalEligible;

                  return (
                    <tr key={h.id} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3 text-center text-slate-400 font-mono">
                        {i + 1}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-slate-900 block">{h.hospital_name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {h.uid || h.contact_phone || ''}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-block px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-medium">
                          {h.category || h.block_name || 'State Ayurvedic Dispensary'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                            isComplete
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : subCount > 0
                              ? 'bg-blue-100 text-blue-800 border-blue-300'
                              : 'bg-amber-100 text-amber-800 border-amber-300'
                          }`}
                        >
                          {subCount} / {totalEligible} Months
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                        {data?.totalOpd ? data.totalOpd.toLocaleString() : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-700">
                        {data?.totalIpd ? data.totalIpd.toLocaleString() : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-700">
                        {data?.totalPk ? data.totalPk.toLocaleString() : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-900">
                        {data?.totalLevi ? `₹${data.totalLevi.toLocaleString()}` : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                        {subCount > 0 ? (
                          <span className="text-emerald-700 font-semibold">
                            {data?.submittedMonths.join(', ')}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">No returns yet</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {subCount > 0 ? (
                          <button
                            onClick={() => handlePrintHospitalAnnual(h)}
                            className="px-2.5 py-1 bg-teal-800 hover:bg-teal-900 text-white rounded-lg text-[10px] font-bold inline-flex items-center gap-1 shadow-xs transition cursor-pointer"
                            title="Download or Print Annual Consolidated A4 PDF"
                          >
                            <Printer className="w-3 h-3" />
                            <span>Annual PDF</span>
                          </button>
                        ) : (
                          <span className="text-slate-300 text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  );
                }
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
          reportTypeTitle={printModalTitle}
          periodLabel={printModalPeriodLabel}
        />
      )}
    </div>
  );
};
