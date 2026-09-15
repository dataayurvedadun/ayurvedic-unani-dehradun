import React, { useState, useEffect } from 'react';
import { dbService } from '../../lib/supabase';
import { MedicineDemandDrive, MedicineDriveSubmission, HospitalMaster } from '../../types';
import * as XLSX from 'xlsx';
import {
  Pill,
  Download,
  Printer,
  Plus,
  Trash2,
  Search,
  Filter,
  Layers,
  Building2,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronRight,
  Calendar,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  ListPlus,
  FileSpreadsheet,
  X,
} from 'lucide-react';

export const AdminMedicineDemands: React.FC = () => {
  const [drives, setDrives] = useState<MedicineDemandDrive[]>([]);
  const [selectedDriveId, setSelectedDriveId] = useState<string>('');
  const [submissions, setSubmissions] = useState<MedicineDriveSubmission[]>([]);
  const [hospitals, setHospitals] = useState<HospitalMaster[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'medicines' | 'compliance'>('medicines');
  const [expandedMedId, setExpandedMedId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Create Drive Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newCategory, setNewCategory] = useState<'Patent Medicine' | 'Classical Medicine' | 'All'>('Patent Medicine');
  const [newBatchYear, setNewBatchYear] = useState<string>('2026-2027');
  const [newDueDate, setNewDueDate] = useState<string>('');
  const [newDescription, setNewDescription] = useState<string>('');
  const [newIsActive, setNewIsActive] = useState<boolean>(true);

  // Medicines builder inside modal
  const [builderTab, setBuilderTab] = useState<'bulk' | 'manual'>('bulk');
  const [bulkText, setBulkText] = useState<string>('');
  const [manualName, setManualName] = useState<string>('');
  const [manualPack, setManualPack] = useState<string>('');
  const [pendingMeds, setPendingMeds] = useState<Array<{ id: string; medicine_name: string; pack_size: string; category: any }>>([]);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    const [allDrives, allHosp] = await Promise.all([
      dbService.getDemandDrives(),
      dbService.getHospitals(),
    ]);

    setDrives(allDrives);
    setHospitals(allHosp);

    if (allDrives.length > 0) {
      const firstId = allDrives[0].id;
      setSelectedDriveId(firstId);
      loadSubmissionsForDrive(firstId);
    }
  };

  const loadSubmissionsForDrive = async (driveId: string) => {
    const subs = await dbService.getDriveSubmissions(driveId);
    setSubmissions(subs);
  };

  const handleSelectDrive = (driveId: string) => {
    setSelectedDriveId(driveId);
    loadSubmissionsForDrive(driveId);
  };

  const currentDrive = drives.find((d) => d.id === selectedDriveId) || drives[0];

  const handleToggleDriveActive = async () => {
    if (!currentDrive) return;
    const updatedStatus = !currentDrive.is_active;
    await dbService.toggleDemandDriveStatus(currentDrive.id, updatedStatus);
    setDrives((prev) =>
      prev.map((d) => (d.id === currentDrive.id ? { ...d, is_active: updatedStatus } : d))
    );
    setNotification(
      `Requisition Drive "${currentDrive.title}" is now ${
        updatedStatus ? 'ACTIVE (Open for Hospitals)' : 'CLOSED / INACTIVE'
      }.`
    );
  };

  // Submission map by hospital_id
  const submissionByHospital: Record<string, MedicineDriveSubmission> = {};
  submissions.forEach((s) => {
    if (s.hospital_id) submissionByHospital[s.hospital_id] = s;
    if (s.hospital_uid) submissionByHospital[s.hospital_uid] = s;
    if (s.hospital_name) submissionByHospital[s.hospital_name.toLowerCase()] = s;
  });

  const getHospSub = (h: HospitalMaster) => {
    return (
      submissionByHospital[h.id] ||
      (h.uid ? submissionByHospital[h.uid] : undefined) ||
      (h.hospital_name ? submissionByHospital[h.hospital_name.toLowerCase()] : undefined)
    );
  };

  const submittedCount = hospitals.filter((h) => Boolean(getHospSub(h))).length;
  const pendingCount = hospitals.length - submittedCount;

  // Group demand quantities by medicine
  const quantitiesByMedicine: Record<string, number> = {};
  const hospitalDemandsByMedicine: Record<string, Array<{ hospital_name: string; qty: number; officer_name: string; date: string }>> = {};

  if (currentDrive && currentDrive.medicines) {
    currentDrive.medicines.forEach((med) => {
      quantitiesByMedicine[med.id] = 0;
      hospitalDemandsByMedicine[med.id] = [];
    });
  }

  submissions.forEach((sub) => {
    Object.entries(sub.quantities).forEach(([medId, qty]) => {
      if (qty > 0) {
        quantitiesByMedicine[medId] = (quantitiesByMedicine[medId] || 0) + qty;
        if (!hospitalDemandsByMedicine[medId]) hospitalDemandsByMedicine[medId] = [];
        hospitalDemandsByMedicine[medId].push({
          hospital_name: sub.hospital_name,
          qty,
          officer_name: sub.officer_name,
          date: sub.submitted_at,
        });
      }
    });
  });

  const totalUnitsInDrive = Object.values(quantitiesByMedicine).reduce((a, b) => a + b, 0);

  // Filtered medicines in current drive
  const filteredMedicines = (currentDrive?.medicines || []).filter((med) =>
    med.medicine_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filtered hospitals for compliance tab
  const filteredHospitals = hospitals.filter(
    (h) =>
      h.hospital_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (h.uid && h.uid.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (h.category && h.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Add medicine manually in modal
  const handleAddManualMed = () => {
    if (!manualName.trim() || !manualPack.trim()) return;
    setPendingMeds((prev) => [
      ...prev,
      {
        id: 'med-' + Math.random().toString(36).substring(2, 9),
        medicine_name: manualName.trim(),
        pack_size: manualPack.trim(),
        category: newCategory === 'All' ? 'Patent Medicine' : newCategory,
      },
    ]);
    setManualName('');
    setManualPack('');
  };

  // Parse bulk text in modal
  const handleParseBulk = () => {
    if (!bulkText.trim()) return;
    const lines = bulkText.split('\n');
    const parsed: Array<{ id: string; medicine_name: string; pack_size: string; category: any }> = [];

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      // Format can be "Name, Pack Size" or "Name | Pack Size" or "Name	Pack Size"
      let parts = trimmed.split(/[,|\t]/);
      if (parts.length >= 2) {
        const name = parts[0].trim();
        const pack = parts.slice(1).join(',').trim();
        if (name && pack) {
          parsed.push({
            id: 'med-' + Math.random().toString(36).substring(2, 9),
            medicine_name: name,
            pack_size: pack,
            category: newCategory === 'All' ? 'Patent Medicine' : newCategory,
          });
        }
      } else {
        // Just name with default pack
        parsed.push({
          id: 'med-' + Math.random().toString(36).substring(2, 9),
          medicine_name: trimmed,
          pack_size: 'Standard Pack',
          category: newCategory === 'All' ? 'Patent Medicine' : newCategory,
        });
      }
    });

    setPendingMeds((prev) => [...prev, ...parsed]);
    setBulkText('');
  };

  // Submit Create New Demand List
  const handleCreateDrive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      alert('Please enter a Title for this Medicine Demand List.');
      return;
    }
    if (pendingMeds.length === 0) {
      alert('Please add at least one medicine to this list.');
      return;
    }

    try {
      const created = await dbService.createDemandDrive({
        title: newTitle.trim(),
        category: newCategory,
        batch_year: newBatchYear.trim() || '2026-2027',
        due_date: newDueDate || '',
        description: newDescription.trim() || undefined,
        is_active: newIsActive,
        medicines: pendingMeds,
      });

      await dbService.addActivityLog({
        action: 'New Medicine Demand List Created',
        details: `Created "${created.title}" with ${created.medicines.length} medicines (Due: ${created.due_date || 'N/A'})`,
        user: 'District Ayurvedic Officer (Admin)',
        timestamp: new Date().toISOString(),
        category: 'medicine',
      });

      setDrives((prev) => [created, ...prev]);
      setSelectedDriveId(created.id);
      loadSubmissionsForDrive(created.id);
      setIsCreateModalOpen(false);
      setNewTitle('');
      setNewDueDate('');
      setNewDescription('');
      setPendingMeds([]);
      setNotification(`Medicine Demand List "${created.title}" created successfully with ${created.medicines.length} medicines!`);
    } catch (err: any) {
      alert(`Failed to create list: ${err.message}`);
    }
  };

  // Export to Excel (.xlsx) for selected drive
  const handleExportExcel = () => {
    if (!currentDrive) return;

    const excelRows = (currentDrive.medicines || []).map((med, idx) => {
      const facilityList = hospitalDemandsByMedicine[med.id] || [];
      const totalQty = quantitiesByMedicine[med.id] || 0;
      const breakdown = facilityList
        .map((f) => `${f.hospital_name}: ${f.qty} units`)
        .join('; ');

      return {
        'S.No.': idx + 1,
        'Medicine Name': med.medicine_name,
        'Category': med.category,
        'Pack Size': med.pack_size,
        'District Total Demanded': totalQty,
        'Demanding Facilities Count': facilityList.length,
        'Hospital Breakdown': breakdown || 'None',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Demand Summary');

    // Also add Facility Compliance sheet
    const complianceRows = hospitals.map((hosp, idx) => {
      const sub = getHospSub(hosp);
      return {
        '#': idx + 1,
        'UID': hosp.uid || hosp.contact_phone || '—',
        'Hospital / Dispensary': hosp.hospital_name,
        'Category': hosp.category || hosp.block_name || '—',
        'Submission Status': sub ? 'SUBMITTED' : 'PENDING',
        'Submission Date & Time': sub ? new Date(sub.submitted_at).toLocaleString('en-IN') : 'Not Submitted',
        'Medical Officer': sub ? sub.officer_name : '—',
        'Total Varieties': sub ? sub.total_varieties : 0,
        'Total Units Demanded': sub ? sub.total_units : 0,
      };
    });

    const compWorksheet = XLSX.utils.json_to_sheet(complianceRows);
    XLSX.utils.book_append_sheet(workbook, compWorksheet, 'Facility Compliance');

    const cleanTitle = currentDrive.title.replace(/[^a-zA-Z0-9]/g, '_');
    XLSX.writeFile(workbook, `Dehradun_Demand_${cleanTitle}_${currentDrive.batch_year}.xlsx`);
  };

  // Export CSV
  const handleExportCsv = () => {
    if (!currentDrive) return;
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'S.No,Medicine Name,Category,Pack Size,District Total Demanded,Hospitals Count\n';

    (currentDrive.medicines || []).forEach((med, idx) => {
      const totalQty = quantitiesByMedicine[med.id] || 0;
      const hospCount = (hospitalDemandsByMedicine[med.id] || []).length;
      csvContent += `${idx + 1},"${med.medicine_name}","${med.category}","${med.pack_size}",${totalQty},${hospCount}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const cleanTitle = currentDrive.title.replace(/[^a-zA-Z0-9]/g, '_');
    link.setAttribute('download', `Dehradun_Demand_${cleanTitle}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Notification */}
      {notification && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-sm flex items-center justify-between no-print shadow-xs">
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

      {/* Header & List Drive Selector */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-bold tracking-wider uppercase text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              List-Wise Requisition Drives
            </span>
            {currentDrive && (
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                  currentDrive.is_active
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-slate-100 text-slate-600 border-slate-300'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${currentDrive.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                {currentDrive.is_active ? 'Active (Open for Hospitals)' : 'Closed / Inactive'}
              </span>
            )}
            {currentDrive?.due_date && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-blue-600" />
                Due: {new Date(currentDrive.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            )}
          </div>
          <h2 className="text-2xl font-bold text-slate-900">
            {currentDrive ? currentDrive.title : 'Medicine Demand Management'}
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            {currentDrive?.description || 'Manage separate requisition campaigns with custom submission dates and hospital compliance.'}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Active Toggle Button */}
          {currentDrive && (
            <button
              onClick={handleToggleDriveActive}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer border ${
                currentDrive.is_active
                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300'
              }`}
              title="Toggle whether hospitals can submit demands for this list"
            >
              {currentDrive.is_active ? (
                <>
                  <ToggleRight className="w-4 h-4 text-emerald-600" />
                  <span>Close Requisition</span>
                </>
              ) : (
                <>
                  <ToggleLeft className="w-4 h-4 text-slate-400" />
                  <span>Set Active (Open)</span>
                </>
              )}
            </button>
          )}

          {/* Create New List Button */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
          >
            <ListPlus className="w-4 h-4" />
            <span>Create New Demand List</span>
          </button>

          {/* Export Dropdown / Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition cursor-pointer border border-slate-200"
              title="Export complete report with facility breakdown to Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              <span>Excel</span>
            </button>
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1 px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer border border-slate-200"
              title="Export CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Demand Drives Selector Bar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2 overflow-x-auto">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider px-2 whitespace-nowrap">
          Available Lists:
        </span>
        {drives.map((d) => (
          <button
            key={d.id}
            onClick={() => handleSelectDrive(d.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-2 cursor-pointer ${
              selectedDriveId === d.id
                ? 'bg-emerald-700 text-white shadow'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${d.is_active ? 'bg-emerald-400' : 'bg-slate-400'}`}></span>
            <span>{d.title}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                selectedDriveId === d.id ? 'bg-emerald-800 text-emerald-200' : 'bg-slate-200 text-slate-600'
              }`}
            >
              {d.medicines?.length || 0} items
            </span>
          </button>
        ))}
      </div>

      {/* KPI Cards for the Selected List */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Medicines in List</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{currentDrive?.medicines?.length || 0}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">{currentDrive?.category || 'Patent Medicine'}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Facilities Submitted</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">
            {submittedCount} <span className="text-xs text-slate-400 font-normal">/ {hospitals.length}</span>
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-0.5">
            {hospitals.length > 0 ? Math.round((submittedCount / hospitals.length) * 100) : 0}% Compliance
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Pending Facilities</div>
          <div className="text-2xl font-bold text-amber-700 mt-1">{pendingCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Awaiting demand entry</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Total Units Demanded</div>
          <div className="text-2xl font-bold text-teal-700 mt-1">{totalUnitsInDrive.toLocaleString()}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Packs / Jars / Bottles</div>
        </div>
      </div>

      {/* Navigation Tabs (Medicines Summary vs Hospital Compliance) */}
      <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('medicines')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'medicines'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Pill className="w-4 h-4" />
            <span>Medicines Demand Summary ({filteredMedicines.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('compliance')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'compliance'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Facility Submissions & Dates ({hospitals.length})</span>
          </button>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={activeTab === 'medicines' ? 'Search medicine name...' : 'Search facility / UID...'}
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-medium"
          />
        </div>
      </div>

      {/* TAB 1: MEDICINES SUMMARY */}
      {activeTab === 'medicines' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200 uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Medicine Name</th>
                  <th className="py-3 px-4 w-36">Category</th>
                  <th className="py-3 px-4 w-28">Pack Size</th>
                  <th className="py-3 px-4 w-40 text-center">Facilities Demanding</th>
                  <th className="py-3 px-4 w-40 text-right">District Total Demanded</th>
                  <th className="py-3 px-4 w-24 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredMedicines.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500 text-sm">
                      No medicines found in this list.
                    </td>
                  </tr>
                ) : (
                  filteredMedicines.map((med, idx) => {
                    const totalQty = quantitiesByMedicine[med.id] || 0;
                    const facilityList = hospitalDemandsByMedicine[med.id] || [];
                    const isExpanded = expandedMedId === med.id;

                    return (
                      <React.Fragment key={med.id}>
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 text-center text-xs text-slate-400 font-mono">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-900">
                            <div className="flex items-center gap-2">
                              <Pill className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                              <span>{med.medicine_name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-xs font-medium">
                            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px]">
                              {med.category}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs font-mono text-slate-600">
                            {med.pack_size}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                facilityList.length > 0
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {facilityList.length} facilities
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span
                              className={`font-mono font-bold text-sm ${
                                totalQty > 0 ? 'text-emerald-700' : 'text-slate-400'
                              }`}
                            >
                              {totalQty > 0 ? `${totalQty.toLocaleString()} units` : '0'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {facilityList.length > 0 && (
                              <button
                                onClick={() => setExpandedMedId(isExpanded ? null : med.id)}
                                className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold cursor-pointer underline flex items-center justify-center gap-1"
                              >
                                {isExpanded ? 'Hide' : 'Details'}
                                {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                              </button>
                            )}
                          </td>
                        </tr>

                        {/* Expandable row showing demanding hospitals */}
                        {isExpanded && facilityList.length > 0 && (
                          <tr className="bg-emerald-50/40">
                            <td colSpan={7} className="p-4">
                              <div className="bg-white rounded-xl p-3 border border-emerald-200 shadow-xs">
                                <div className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                                  Facility Breakdown for {med.medicine_name}:
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                  {facilityList.map((f, fIdx) => (
                                    <div
                                      key={fIdx}
                                      className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs flex justify-between items-center"
                                    >
                                      <div>
                                        <div className="font-semibold text-slate-900">{f.hospital_name}</div>
                                        <div className="text-[11px] text-slate-500">
                                          By {f.officer_name} • {new Date(f.date).toLocaleDateString('en-IN')}
                                        </div>
                                      </div>
                                      <span className="font-mono font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                                        {f.qty} units
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: FACILITY COMPLIANCE & SUBMISSION DATES */}
      {activeTab === 'compliance' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
            <div className="text-slate-600">
              Showing compliance for: <strong className="text-slate-900">{currentDrive?.title}</strong>
              {currentDrive?.due_date && (
                <span className="ml-2 text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-semibold">
                  Last Date: {new Date(currentDrive.due_date).toLocaleDateString('en-IN')}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4">
              <span className="text-emerald-700 font-bold">
                ✓ Submitted: {submittedCount} ({Math.round((submittedCount / hospitals.length) * 100)}%)
              </span>
              <span className="text-amber-700 font-bold">
                ⏳ Pending: {pendingCount}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200 uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4 w-28">UID</th>
                  <th className="py-3 px-4">Hospital / Dispensary Name</th>
                  <th className="py-3 px-4 w-52">Category</th>
                  <th className="py-3 px-4 w-36 text-center">Status</th>
                  <th className="py-3 px-4 w-48">Submission Date & Time</th>
                  <th className="py-3 px-4 w-36 text-right">Units Demanded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredHospitals.map((hosp, idx) => {
                  const sub = getHospSub(hosp);
                  const isSubmitted = Boolean(sub);

                  return (
                    <tr
                      key={hosp.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        isSubmitted ? 'bg-emerald-50/20' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-center text-xs text-slate-400 font-mono">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                          {hosp.uid || hosp.contact_phone || `DDN${String(idx + 1).padStart(3, '0')}`}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          <span>{hosp.hospital_name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs font-medium text-slate-600">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200">
                          {hosp.category || hosp.block_name || 'Ayurvedic Facility'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isSubmitted ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Submitted</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>Pending</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs">
                        {sub ? (
                          <div>
                            <div className="font-semibold text-slate-900 font-mono">
                              {new Date(sub.submitted_at).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}{' '}
                              •{' '}
                              {new Date(sub.submitted_at).toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                            <div className="text-[11px] text-slate-500">By {sub.officer_name}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono italic">Not yet submitted</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {sub ? (
                          <span className="font-mono font-bold text-sm text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded">
                            {sub.total_units} units ({sub.total_varieties} meds)
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE NEW DEMAND LIST MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Create New Medicine Demand List</h3>
                <p className="text-xs text-slate-500">
                  Launch a new requisition drive for Patent, Classical, or Emergency medicines with a specific submission deadline.
                </p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDrive} className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Demand List Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Classical Medicine List 2026-27"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
                  >
                    <option value="Patent Medicine">Patent Medicine</option>
                    <option value="Classical Medicine">Classical Medicine</option>
                    <option value="All">Mixed / All Formulations</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Last Date of Submission (Due Date) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Financial Year / Batch
                  </label>
                  <input
                    type="text"
                    value={newBatchYear}
                    onChange={(e) => setNewBatchYear(e.target.value)}
                    placeholder="2026-2027"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Administrative Description / Instructions (Optional)
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Official instructions for Medical Officers in-charge..."
                  rows={2}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
                />
              </div>

              <div className="flex items-center gap-2 p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                <input
                  type="checkbox"
                  id="makeActive"
                  checked={newIsActive}
                  onChange={(e) => setNewIsActive(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="makeActive" className="text-xs font-bold text-emerald-900 cursor-pointer">
                  Activate Immediately (Hospitals will see and start filling this list right away)
                </label>
              </div>

              {/* Medicines Builder */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50">
                <div className="flex justify-between items-center mb-3">
                  <div className="text-xs font-bold uppercase text-slate-700">
                    Add Medicines to this List ({pendingMeds.length} added)
                  </div>
                  <div className="flex gap-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setBuilderTab('bulk')}
                      className={`px-3 py-1 rounded-lg font-semibold ${
                        builderTab === 'bulk' ? 'bg-emerald-700 text-white' : 'bg-white text-slate-600 border'
                      }`}
                    >
                      Bulk Paste
                    </button>
                    <button
                      type="button"
                      onClick={() => setBuilderTab('manual')}
                      className={`px-3 py-1 rounded-lg font-semibold ${
                        builderTab === 'manual' ? 'bg-emerald-700 text-white' : 'bg-white text-slate-600 border'
                      }`}
                    >
                      Add One by One
                    </button>
                  </div>
                </div>

                {builderTab === 'bulk' ? (
                  <div className="space-y-2">
                    <textarea
                      value={bulkText}
                      onChange={(e) => setBulkText(e.target.value)}
                      placeholder="Paste lines formatted as: Medicine Name, Pack Size&#10;e.g.&#10;Triphala Churna, 100 gm&#10;Sitopaladi Churna, 60 gm&#10;Ashwagandharishta, 450 ml"
                      rows={4}
                      className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-xl text-slate-900"
                    />
                    <button
                      type="button"
                      onClick={handleParseBulk}
                      className="px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer hover:bg-emerald-800"
                    >
                      + Parse & Add Pasted Medicines
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={manualName}
                      onChange={(e) => setManualName(e.target.value)}
                      placeholder="Medicine Name (e.g. Amritarishta)"
                      className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900"
                    />
                    <input
                      type="text"
                      value={manualPack}
                      onChange={(e) => setManualPack(e.target.value)}
                      placeholder="Pack (e.g. 450 ml)"
                      className="w-32 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900"
                    />
                    <button
                      type="button"
                      onClick={handleAddManualMed}
                      className="px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer hover:bg-emerald-800"
                    >
                      Add
                    </button>
                  </div>
                )}

                {/* Pending Medicines List Preview */}
                {pendingMeds.length > 0 && (
                  <div className="mt-3 max-h-36 overflow-y-auto bg-white rounded-xl p-2 border border-slate-200 divide-y divide-slate-100 text-xs">
                    {pendingMeds.map((pm, idx) => (
                      <div key={pm.id} className="py-1.5 px-2 flex justify-between items-center">
                        <span className="font-medium text-slate-900">
                          {idx + 1}. {pm.medicine_name}{' '}
                          <span className="text-slate-500 font-mono">({pm.pack_size})</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setPendingMeds((prev) => prev.filter((p) => p.id !== pm.id))}
                          className="text-red-500 hover:text-red-700 p-0.5 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow cursor-pointer"
                >
                  Create Requisition List
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
