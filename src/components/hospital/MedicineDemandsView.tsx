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
  Edit3,
  AlertCircle,
  Building2,
  Calendar,
  Send,
  Sparkles,
} from 'lucide-react';

export const MedicineDemandsView: React.FC = () => {
  const { session } = useAuth();
  const hospital = session?.hospital;
  const officerName = session?.officerName || 'Medical Officer In-Charge';

  const [drives, setDrives] = useState<MedicineDemandDrive[]>([]);
  const [selectedDriveId, setSelectedDriveId] = useState<string>('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionRecord, setSubmissionRecord] = useState<MedicineDriveSubmission | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    loadDrivesAndDemands();
  }, [hospital?.id]);

  const loadDrivesAndDemands = async () => {
    if (!hospital) return;
    const allDrives = await dbService.getDemandDrives();
    // Only show active drives, or all if none active
    const visibleDrives = allDrives.filter((d) => d.is_active);
    const driveList = visibleDrives.length > 0 ? visibleDrives : allDrives;

    setDrives(driveList);

    if (driveList.length > 0) {
      const initialId = driveList[0].id;
      setSelectedDriveId(initialId);
      loadHospitalSubmission(initialId, driveList[0]);
    }
  };

  const loadHospitalSubmission = async (driveId: string, driveObj?: MedicineDemandDrive) => {
    if (!hospital) return;
    const activeDrive = driveObj || drives.find((d) => d.id === driveId);
    const subs = await dbService.getDriveSubmissions(driveId, hospital.id);

    if (subs && subs.length > 0) {
      const latestSub = subs[0];
      setSubmissionRecord(latestSub);
      setQuantities(latestSub.quantities || {});
      setIsEditing(false);
    } else {
      setSubmissionRecord(null);
      // Initialize zero quantities
      const initialQty: Record<string, number> = {};
      if (activeDrive && activeDrive.medicines) {
        activeDrive.medicines.forEach((m) => {
          initialQty[m.id] = 0;
        });
      }
      setQuantities(initialQty);
      setIsEditing(true);
    }
  };

  const handleSelectDrive = (driveId: string) => {
    setSelectedDriveId(driveId);
    const targetDrive = drives.find((d) => d.id === driveId);
    loadHospitalSubmission(driveId, targetDrive);
    setSearchTerm('');
  };

  const currentDrive = drives.find((d) => d.id === selectedDriveId) || drives[0];

  const handleQtyChange = (medicineId: string, value: string) => {
    const val = parseInt(value, 10);
    setQuantities((prev) => ({
      ...prev,
      [medicineId]: isNaN(val) || val < 0 ? 0 : val,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hospital || !currentDrive) return;

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

      setSubmissionRecord(sub);
      setIsEditing(false);
      setNotification(
        `Medicine Demands for "${currentDrive.title}" successfully submitted and officially recorded on ${new Date(
          sub.submitted_at
        ).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} at ${new Date(
          sub.submitted_at
        ).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}!`
      );

      // Celebration confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (err) {
        // optional
      }
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
  const isSubmitted = Boolean(submissionRecord);

  if (!currentDrive) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800">No Active Medicine Requisition Drives</h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
          The District Ayurvedic Office has not published an active demand list at this moment. Please check back shortly or contact the administrative office.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Notification Banner */}
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

      {/* Demand Drives Selector Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-bold tracking-wider uppercase text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Annual Medicine Indent
            </span>
            <span
              className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                currentDrive.is_active
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-slate-100 text-slate-600 border-slate-300'
              }`}
            >
              {currentDrive.is_active ? '● Active Requisition' : 'Closed'}
            </span>
            {currentDrive.due_date && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-blue-600" />
                Due Date: {new Date(currentDrive.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
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

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {isSubmitted && (
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition border border-slate-200 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Print Acknowledgment</span>
            </button>
          )}

          {isSubmitted && !isEditing && currentDrive.is_active && (
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit / Update Demands</span>
            </button>
          )}
        </div>
      </div>

      {/* Demand Drives Tab Selector (If multiple drives exist) */}
      {drives.length > 1 && (
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2 overflow-x-auto no-print">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider px-2 whitespace-nowrap">
            Select Demand List:
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
      )}

      {/* Submission Status Alert Banner */}
      {isSubmitted ? (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                Requisition Submitted & Locked in District Registry
              </div>
              <div className="text-sm font-semibold text-emerald-950">
                Submitted on{' '}
                {new Date(submissionRecord!.submitted_at).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}{' '}
                at{' '}
                {new Date(submissionRecord!.submitted_at).toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
              <div className="text-xs text-emerald-700">
                Verified by Medical Officer: <strong>{submissionRecord!.officer_name}</strong> • Total Units Demanded:{' '}
                <strong>{submissionRecord!.total_units} units</strong> across{' '}
                <strong>{submissionRecord!.total_varieties} varieties</strong>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-950 flex items-center gap-3 shadow-xs">
          <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div className="text-xs">
            <strong className="text-amber-900 font-bold uppercase tracking-wider block">
              Demand Requisition Pending for {currentDrive.title}
            </strong>
            Enter the required quantity for each medicine in this list and click <strong>"Submit Medicine Demands"</strong> before the due date ({currentDrive.due_date ? new Date(currentDrive.due_date).toLocaleDateString('en-IN') : 'announced deadline'}).
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
          <div className="text-xs text-slate-500 font-medium">Portal Status</div>
          <div className="text-xl font-bold mt-1 text-slate-900">
            {isEditing ? (
              <span className="text-amber-600">Editing</span>
            ) : isSubmitted ? (
              <span className="text-emerald-600">Saved</span>
            ) : (
              <span className="text-slate-600">Draft</span>
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
            <strong>Facility:</strong> {hospital?.hospital_name} [{hospital?.uid || hospital?.id}]
          </div>
          <div>
            <strong>Medical Officer:</strong> {officerName}
          </div>
          <div>
            <strong>Date:</strong> {submissionRecord ? new Date(submissionRecord.submitted_at).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')}
          </div>
        </div>
      </div>

      {/* Main Table Form */}
      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200 uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Medicine Name</th>
                  <th className="py-3 px-4 w-40">Category</th>
                  <th className="py-3 px-4 w-32">Pack Size</th>
                  <th className="py-3 px-4 w-44 text-right">Requested Quantity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredMeds.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      No medicines match the search term.
                    </td>
                  </tr>
                ) : (
                  filteredMeds.map((med, idx) => {
                    const qty = quantities[med.id] || 0;

                    return (
                      <tr
                        key={med.id}
                        className={`hover:bg-slate-50 transition-colors ${
                          qty > 0 ? 'bg-emerald-50/30' : ''
                        }`}
                      >
                        <td className="py-3 px-4 text-center text-xs text-slate-400 font-mono">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          <div className="flex items-center gap-2">
                            <Pill className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                            <span>{med.medicine_name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs font-medium text-slate-600">
                          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px]">
                            {med.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs font-mono text-slate-600">
                          {med.pack_size}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {isEditing ? (
                            <input
                              type="number"
                              min="0"
                              max="10000"
                              value={qty === 0 ? '' : qty}
                              onChange={(e) => handleQtyChange(med.id, e.target.value)}
                              placeholder="0"
                              className="w-28 px-3 py-1 text-right font-mono font-bold text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-slate-900"
                            />
                          ) : (
                            <span
                              className={`font-mono font-bold text-sm ${
                                qty > 0 ? 'text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded' : 'text-slate-400'
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
              {isEditing ? (
                <>
                  {isSubmitted && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
                    >
                      Cancel Edit
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isSubmitting || !currentDrive.is_active}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSubmitting ? 'Saving...' : 'Submit Medicine Demands'}</span>
                  </button>
                </>
              ) : (
                currentDrive.is_active && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Edit Demands</span>
                  </button>
                )
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
