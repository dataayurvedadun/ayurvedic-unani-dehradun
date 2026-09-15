import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dbService } from '../../lib/supabase';
import { MedicineDemandDrive, MedicineDriveSubmission } from '../../types';
import confetti from 'canvas-confetti';
import {
  Pill,
  Search,
  CheckCircle2,
  Clock,
  Printer,
  AlertCircle,
  Building2,
  Calendar,
  Send,
  Sparkles,
  Lock,
  Archive,
} from 'lucide-react';

export const MedicineDemandsView: React.FC = () => {
  const { session } = useAuth();
  const hospital = session?.hospital;
  const officerName = session?.officerName || 'Medical Officer In-Charge';

  const [drives, setDrives] = useState<MedicineDemandDrive[]>([]);
  const [submissionsMap, setSubmissionsMap] = useState<Record<string, MedicineDriveSubmission>>({});
  const [selectedDriveId, setSelectedDriveId] = useState<string>('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    loadDrivesAndDemands();
  }, [hospital?.id]);

  const loadDrivesAndDemands = async () => {
    if (!hospital) return;
    // Load ALL demand drives (both active and expired)
    const allDrives = await dbService.getDemandDrives();
    setDrives(allDrives);

    // Load submissions for all drives for this hospital
    const subsMap: Record<string, MedicineDriveSubmission> = {};
    for (const d of allDrives) {
      const subs = await dbService.getDriveSubmissions(d.id, hospital.id);
      if (subs && subs.length > 0) {
        subsMap[d.id] = subs[0];
      }
    }
    setSubmissionsMap(subsMap);

    if (allDrives.length > 0) {
      const initialId = allDrives[0].id;
      setSelectedDriveId(initialId);
      loadHospitalSubmission(initialId, allDrives[0], subsMap);
    }
  };

  const loadHospitalSubmission = (
    driveId: string,
    driveObj?: MedicineDemandDrive,
    subsMap = submissionsMap
  ) => {
    const activeDrive = driveObj || drives.find((d) => d.id === driveId);
    const existingSub = subsMap[driveId];

    if (existingSub) {
      setQuantities(existingSub.quantities || {});
    } else {
      // Initialize zero quantities
      const initialQty: Record<string, number> = {};
      if (activeDrive && activeDrive.medicines) {
        activeDrive.medicines.forEach((m) => {
          initialQty[m.id] = 0;
        });
      }
      setQuantities(initialQty);
    }
  };

  const handleSelectDrive = (driveId: string) => {
    setSelectedDriveId(driveId);
    const targetDrive = drives.find((d) => d.id === driveId);
    loadHospitalSubmission(driveId, targetDrive);
    setSearchTerm('');
    setNotification(null);
  };

  const currentDrive = drives.find((d) => d.id === selectedDriveId) || drives[0];
  const currentSubmission = selectedDriveId ? submissionsMap[selectedDriveId] : undefined;
  const isSubmitted = Boolean(currentSubmission);
  const isActive = Boolean(currentDrive?.is_active);

  // Status computation for current drive:
  // 1. submitted: if hospital has submitted (permanently locked / uneditable)
  // 2. pending: if active and not submitted (editable)
  // 3. expired: if !is_active (uneditable)
  const currentStatus: 'submitted' | 'pending' | 'expired' = isSubmitted
    ? 'submitted'
    : isActive
    ? 'pending'
    : 'expired';

  // Can the user edit quantities? Only if status is pending!
  const isEditable = currentStatus === 'pending';

  const handleQtyChange = (medicineId: string, value: string) => {
    if (!isEditable) return; // Prevent any modifications if submitted or expired
    const val = parseInt(value, 10);
    setQuantities((prev) => ({
      ...prev,
      [medicineId]: isNaN(val) || val < 0 ? 0 : val,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hospital || !currentDrive || !isEditable) return;

    // Filter quantities > 0
    let totalUnits = 0;
    let totalVarieties = 0;
    const cleanedQty: Record<string, number> = {};

    Object.entries(quantities).forEach(([medId, q]) => {
      if (q > 0) {
        cleanedQty[medId] = q;
        totalUnits += q;
        totalVarieties += 1;
      }
    });

    if (totalVarieties === 0) {
      setNotification('Please enter required quantities for at least one medicine before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      const sub = await dbService.submitDriveDemand({
        drive_id: currentDrive.id,
        drive_title: currentDrive.title,
        hospital_id: hospital.id,
        hospital_name: hospital.hospital_name,
        officer_name: officerName,
        quantities: cleanedQty,
        total_varieties: totalVarieties,
        total_units: totalUnits,
      });

      await dbService.addActivityLog({
        action: 'Medicine Demands Submitted',
        details: `Submitted demand for "${currentDrive.title}" (${totalVarieties} varieties, ${totalUnits} units)`,
        user: `${hospital.hospital_name} (${officerName})`,
        timestamp: sub.submitted_at,
        category: 'medicine',
      });

      // Update submissions map
      const updatedMap = {
        ...submissionsMap,
        [currentDrive.id]: sub,
      };
      setSubmissionsMap(updatedMap);

      setNotification(
        `Medicine Demands for "${currentDrive.title}" successfully submitted and locked on ${new Date(
          sub.submitted_at
        ).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} at ${new Date(
          sub.submitted_at
        ).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}! Once submitted, demands cannot be altered.`
      );

      // Celebration confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (err) {}
    } catch (err: any) {
      setNotification(`Failed to submit demands: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Filtered medicines in current drive
  const filteredMeds = (currentDrive?.medicines || []).filter((med) =>
    med.medicine_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalItemsDemanded = Object.values(quantities).filter((q) => q > 0).length;
  const totalUnitsDemanded = Object.values(quantities).reduce((acc, q) => acc + (q || 0), 0);

  if (!currentDrive) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
        <Pill className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-700">No Medicine Demand Lists Found</h3>
        <p className="text-sm text-slate-500 mt-1">
          The District Office has not created any demand lists yet. Please check back later.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-sm font-semibold flex items-center justify-between shadow-sm animate-fade-in no-print">
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

      {/* Demand Drives Selector Cards / Tabs */}
      <div className="space-y-2 no-print">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Available Medicine Demand Lists ({drives.length})
          </span>
          <span className="text-[11px] text-slate-500">
            Click any list to view status or submit demands
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {drives.map((d) => {
            const isSub = Boolean(submissionsMap[d.id]);
            const status: 'submitted' | 'pending' | 'expired' = isSub
              ? 'submitted'
              : d.is_active
              ? 'pending'
              : 'expired';
            const isSelected = selectedDriveId === d.id;

            return (
              <div
                key={d.id}
                onClick={() => handleSelectDrive(d.id)}
                className={`p-4 rounded-2xl border transition cursor-pointer text-left relative ${
                  isSelected
                    ? 'bg-emerald-900 text-white border-emerald-900 shadow-md ring-2 ring-emerald-500/20'
                    : 'bg-white hover:bg-slate-50 text-slate-900 border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        isSelected
                          ? 'bg-emerald-800 text-emerald-200 border-emerald-700'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {d.category}
                    </span>
                    <h4 className="font-bold text-sm mt-1.5 line-clamp-1">{d.title}</h4>
                  </div>

                  {/* Status Badge */}
                  {status === 'submitted' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 flex-shrink-0">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      SUBMITTED
                    </span>
                  ) : status === 'pending' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 flex-shrink-0">
                      <Clock className="w-3 h-3 text-amber-600" />
                      PENDING
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-200 text-slate-700 border border-slate-300 flex-shrink-0">
                      <Archive className="w-3 h-3 text-slate-500" />
                      EXPIRED
                    </span>
                  )}
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100/30 text-[11px] space-y-1">
                  <div className={isSelected ? 'text-emerald-200' : 'text-slate-500'}>
                    <strong>Admin Activated:</strong>{' '}
                    {new Date(d.created_at).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </div>
                  {status === 'submitted' && submissionsMap[d.id] && (
                    <div className={isSelected ? 'text-emerald-300 font-semibold' : 'text-emerald-700 font-semibold'}>
                      <strong>Submitted:</strong>{' '}
                      {new Date(submissionsMap[d.id].submitted_at).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>
                  )}
                  {d.due_date && (
                    <div className={isSelected ? 'text-slate-300' : 'text-slate-500'}>
                      <strong>Due Date:</strong>{' '}
                      {new Date(d.due_date).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Drive Header Details */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-bold tracking-wider uppercase text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              {currentDrive.category}
            </span>
            <span className="text-xs text-slate-500">
              Admin Activated:{' '}
              <strong className="text-slate-800">
                {new Date(currentDrive.created_at).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </strong>
            </span>
            {currentDrive.due_date && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-blue-600" />
                Due: {new Date(currentDrive.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            )}
          </div>
          <h2 className="text-2xl font-bold text-slate-900">
            {currentDrive.title}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {currentDrive.description || 'Enter required units based on average patient footfall.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {isSubmitted && (
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition border border-slate-300 cursor-pointer shadow-xs"
            >
              <Printer className="w-4 h-4 text-slate-700" />
              <span>Print Acknowledgment Voucher</span>
            </button>
          )}
        </div>
      </div>

      {/* Dynamic Lifecycle Status Banner */}
      {currentStatus === 'submitted' ? (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-700" />
                Submitted & Locked in District Central Registry (Uneditable)
              </div>
              <div className="text-sm font-bold text-emerald-950 mt-0.5">
                Submitted on{' '}
                {new Date(currentSubmission!.submitted_at).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}{' '}
                at{' '}
                {new Date(currentSubmission!.submitted_at).toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                by <span className="font-extrabold">{currentSubmission!.officer_name}</span>
              </div>
              <div className="text-xs text-emerald-800 mt-0.5">
                Total Units Demanded: <strong>{currentSubmission!.total_units} units</strong> across{' '}
                <strong>{currentSubmission!.total_varieties} varieties</strong>. (Submitted demands cannot be edited).
              </div>
            </div>
          </div>

          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition cursor-pointer self-start sm:self-auto"
          >
            <Printer className="w-4 h-4" />
            <span>Print Receipt</span>
          </button>
        </div>
      ) : currentStatus === 'pending' ? (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-amber-950 flex items-center gap-3 shadow-xs">
          <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div className="text-xs">
            <strong className="text-amber-900 font-bold uppercase tracking-wider block text-sm">
              Demand Requisition Pending for {currentDrive.title}
            </strong>
            Admin activated this requisition list on{' '}
            <strong>
              {new Date(currentDrive.created_at).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </strong>
            . Please enter your required quantities for medicines and click <strong>"Submit Official Demand"</strong>.
            {currentDrive.due_date && (
              <span> Last date for submission is <strong>{new Date(currentDrive.due_date).toLocaleDateString('en-IN')}</strong>.</span>
            )}
          </div>
        </div>
      ) : (
        <div className="p-4 bg-slate-100 border border-slate-300 rounded-2xl text-slate-800 flex items-center gap-3 shadow-xs">
          <Archive className="w-5 h-5 text-slate-500 flex-shrink-0" />
          <div className="text-xs">
            <strong className="text-slate-900 font-bold uppercase tracking-wider block text-sm">
              Demand Requisition Closed / Expired
            </strong>
            This list was activated on{' '}
            <strong>
              {new Date(currentDrive.created_at).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </strong>{' '}
            and has now been deactivated by the District Office.
            {isSubmitted
              ? ' You previously submitted demands for this list. View your submitted record below in uneditable mode.'
              : ' No demands were submitted for this list prior to expiration.'}
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 no-print">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Medicines in List</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{currentDrive.medicines?.length || 0}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">{currentDrive.category}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Demanded Items</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{totalItemsDemanded} Varieties</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Selected by facility</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Total Quantity</div>
          <div className="text-2xl font-bold text-teal-700 mt-1">{totalUnitsDemanded.toLocaleString()} Units</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Packs / Jars / Bottles</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Form Status</div>
          <div className="text-lg font-bold mt-1">
            {currentStatus === 'submitted' ? (
              <span className="text-emerald-700 flex items-center gap-1">
                <Lock className="w-4 h-4" /> Locked (Submitted)
              </span>
            ) : currentStatus === 'pending' ? (
              <span className="text-amber-600 flex items-center gap-1">
                <Clock className="w-4 h-4" /> Open (Pending)
              </span>
            ) : (
              <span className="text-slate-500 flex items-center gap-1">
                <Archive className="w-4 h-4" /> Closed (Expired)
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">{currentDrive.batch_year} Batch</div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between no-print">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={`Search ${currentDrive.title}...`}
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-slate-900 font-medium"
          />
        </div>
        <div className="text-xs text-slate-500">
          Showing: <strong className="text-slate-800">{filteredMeds.length}</strong> of {currentDrive.medicines?.length || 0}
        </div>
      </div>

      {/* Printable Header (Visible only when printing) */}
      <div className="hidden print-only mb-6 border-b-2 border-slate-800 pb-4 text-center">
        <h1 className="text-xl font-bold uppercase tracking-wider text-slate-900">
          Office of the District Ayurvedic & Unani Officer, Dehradun
        </h1>
        <h2 className="text-sm font-semibold text-slate-700 mt-1">
          Official Requisition Form: {currentDrive.title} ({currentDrive.batch_year})
        </h2>
        <div className="mt-3 text-xs text-slate-800 flex justify-between">
          <div>
            <strong>Facility:</strong> {hospital?.hospital_name}
          </div>
          <div>
            <strong>Medical Officer:</strong> {officerName}
          </div>
          <div>
            <strong>Date:</strong> {currentSubmission ? new Date(currentSubmission.submitted_at).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')}
          </div>
        </div>
      </div>

      {/* Main Table Form */}
      <form onSubmit={handleSubmit}>
        {/* Bulk Preset Fill Toolbar (Only visible when pending/editable) */}
        {isEditable && (
          <div className="bg-emerald-50/70 p-3 rounded-2xl border border-emerald-200 flex flex-wrap items-center justify-between gap-2.5 text-xs no-print mb-3">
            <div className="flex items-center gap-1.5 font-bold text-emerald-950">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Bulk Quick Fill:</span>
              <span className="text-[11px] text-emerald-700 font-normal hidden sm:inline">
                (Set uniform quantity for all items)
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[10, 20, 50, 100].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    const updated: Record<string, number> = { ...quantities };
                    filteredMeds.forEach((m) => {
                      updated[m.id] = preset;
                    });
                    setQuantities(updated);
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg text-xs font-bold cursor-pointer transition shadow-xs active:scale-95"
                >
                  All = {preset}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  const updated: Record<string, number> = { ...quantities };
                  filteredMeds.forEach((m) => {
                    updated[m.id] = 0;
                  });
                  setQuantities(updated);
                }}
                className="px-2.5 py-1 bg-white hover:bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-semibold cursor-pointer transition active:scale-95"
              >
                Clear all
              </button>
            </div>
          </div>
        )}

        {/* Medicine Table - Mobile Optimized (No Horizontal Scrolling) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200 uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-2 sm:px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-2 sm:px-3">Medicine & Pack Size</th>
                  <th className="py-2.5 px-2 sm:px-3 w-32 sm:w-44 text-right">Quantity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredMeds.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-slate-500 text-xs">
                      No medicines match the search term.
                    </td>
                  </tr>
                ) : (
                  filteredMeds.map((med, idx) => {
                    const qty = quantities[med.id] || 0;
                    const prevMed = idx > 0 ? filteredMeds[idx - 1] : null;
                    const prevQty = prevMed ? quantities[prevMed.id] || 0 : 0;

                    return (
                      <tr
                        key={med.id}
                        className={`hover:bg-slate-50 transition-colors ${
                          qty > 0 ? 'bg-emerald-50/30' : ''
                        }`}
                      >
                        <td className="py-2.5 px-2 sm:px-3 text-center text-xs text-slate-400 font-mono">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-2 sm:px-3">
                          <div className="font-bold text-slate-900 text-xs sm:text-sm leading-tight">
                            {med.medicine_name}
                          </div>
                          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] sm:text-[11px] font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-semibold">
                              {med.pack_size}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-2 sm:px-3 text-right align-middle">
                          {isEditable ? (
                            <div className="flex flex-col items-end gap-1">
                              <input
                                type="number"
                                min="0"
                                max="10000"
                                value={qty === 0 ? '' : qty}
                                onChange={(e) => handleQtyChange(med.id, e.target.value)}
                                placeholder="0"
                                className="w-20 sm:w-28 px-2 py-1 text-right font-mono font-bold text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-slate-900"
                              />
                              {idx > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleQtyChange(med.id, String(prevQty))}
                                  className="text-[10px] text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded px-1.5 py-0.5 inline-flex items-center gap-0.5 cursor-pointer whitespace-nowrap active:scale-95 transition"
                                  title="Copy quantity from the medicine above"
                                >
                                  <span>↑ Same as above</span>
                                  {prevQty > 0 && <span className="font-bold font-mono">({prevQty})</span>}
                                </button>
                              )}
                            </div>
                          ) : (
                            <span
                              className={`font-mono font-bold text-sm ${
                                qty > 0 ? 'text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded inline-block' : 'text-slate-400'
                              }`}
                            >
                              {qty > 0 ? `${qty} units` : '—'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer with Submit Action */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 no-print">
            <div className="text-xs text-slate-600">
              List: <strong className="text-slate-900">{currentDrive.title}</strong> • Total Demanded:{' '}
              <strong className="text-emerald-700">
                {totalItemsDemanded} varieties ({totalUnitsDemanded} units)
              </strong>
            </div>

            <div className="flex items-center gap-3">
              {isEditable ? (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? 'Saving...' : 'Submit Official Demand'}</span>
                </button>
              ) : isSubmitted ? (
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-700" />
                  Demand Locked (Non-Editable)
                </span>
              ) : (
                <span className="text-xs font-bold text-slate-600 bg-slate-200 px-3 py-1.5 rounded-xl">
                  Requisition Expired
                </span>
              )}
            </div>
          </div>
        </div>
      </form>

      {/* Official Signature area when printing */}
      <div className="hidden print-only mt-12 pt-8 border-t border-slate-300 flex justify-between text-xs">
        <div>
          <p className="font-semibold text-slate-900">Forwarded by:</p>
          <p className="mt-8 font-bold">{officerName}</p>
          <p className="text-slate-600">Medical Officer In-Charge</p>
          <p className="text-slate-500">{hospital?.hospital_name}</p>
        </div>
        <div className="text-right">
          <p className="font-semibold text-slate-900">Received & Approved by:</p>
          <p className="mt-8 font-bold">District Ayurvedic & Unani Officer</p>
          <p className="text-slate-600">District Dehradun, Uttarakhand</p>
        </div>
      </div>
    </div>
  );
};
