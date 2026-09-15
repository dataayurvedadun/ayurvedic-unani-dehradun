import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dbService } from '../../lib/supabase';
import { MedicineItem, MedicineDemandResponse } from '../../types';
import confetti from 'canvas-confetti';
import {
  Pill,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Printer,
  Edit3,
  AlertCircle,
  FileSpreadsheet,
  Building2,
  Calendar,
  UserCheck,
  Send,
} from 'lucide-react';

export const MedicineDemandsView: React.FC = () => {
  const { session } = useAuth();
  const hospital = session?.hospital;
  const officerName = session?.officerName || 'Medical Officer In-Charge';

  const [medicines, setMedicines] = useState<MedicineItem[]>([]);
  const [demands, setDemands] = useState<MedicineDemandResponse[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [lastSubmissionTime, setLastSubmissionTime] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const BATCH_YEAR = '2026-2027';

  useEffect(() => {
    loadData();
  }, [hospital?.id]);

  const loadData = async () => {
    if (!hospital) return;
    const [allMeds, existingDemands] = await Promise.all([
      dbService.getMedicines(),
      dbService.getDemands(hospital.id),
    ]);

    setMedicines(allMeds);
    setDemands(existingDemands);

    const qtyMap: Record<string, number> = {};
    existingDemands.forEach((d) => {
      qtyMap[d.medicine_id] = d.requested_quantity;
    });
    setQuantities(qtyMap);

    if (existingDemands.length > 0) {
      setLastSubmissionTime(existingDemands[0].submitted_at);
      setIsEditing(false);
    } else {
      setIsEditing(true);
    }
  };

  const handleQtyChange = (medicineId: string, value: string) => {
    const val = parseInt(value, 10);
    setQuantities((prev) => ({
      ...prev,
      [medicineId]: isNaN(val) || val < 0 ? 0 : val,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hospital) return;

    // Filter out items with quantity > 0
    const itemsToSubmit: MedicineDemandResponse[] = [];
    const submissionTimestamp = new Date().toISOString();

    medicines.forEach((med) => {
      const qty = quantities[med.id] || 0;
      if (qty > 0) {
        itemsToSubmit.push({
          id: 'dem-' + Math.random().toString(36).substring(2, 9),
          hospital_id: hospital.id,
          hospital_name: hospital.hospital_name,
          medicine_id: med.id,
          medicine_name: med.medicine_name,
          category: med.category,
          pack_size: med.pack_size,
          requested_quantity: qty,
          officer_name: officerName,
          status: 'Submitted',
          batch_year: BATCH_YEAR,
          submitted_at: submissionTimestamp,
        });
      }
    });

    if (itemsToSubmit.length === 0) {
      setNotification('Please enter required quantities for at least one medicine before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      await dbService.submitDemands(itemsToSubmit);
      await dbService.addActivityLog({
        action: 'Medicine Demands Submitted',
        details: `Submitted demand for ${itemsToSubmit.length} items (${itemsToSubmit.reduce(
          (a, b) => a + b.requested_quantity,
          0
        )} total units)`,
        user: `${hospital.hospital_name} (${officerName})`,
        timestamp: submissionTimestamp,
        category: 'medicine',
      });

      setDemands(itemsToSubmit);
      setLastSubmissionTime(submissionTimestamp);
      setIsEditing(false);
      setNotification('Medicine Demands successfully submitted and recorded in central district registry!');

      // Celebration confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (err) {
        // confetti is optional
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

  // Filtered medicines
  const filteredMeds = medicines.filter((med) => {
    const matchesCategory = categoryFilter === 'All' || med.category === categoryFilter;
    const matchesSearch = med.medicine_name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const isSubmitted = demands.length > 0;
  const totalItemsDemanded = Object.values(quantities).filter((q) => q > 0).length;
  const totalUnitsDemanded = Object.values(quantities).reduce((acc, q) => acc + (q || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Notification Banner */}
      {notification && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-sm flex items-center justify-between no-print">
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

      {/* Header Status Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold tracking-wider uppercase text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Annual Medicine Indent • {BATCH_YEAR}
            </span>
            {isSubmitted ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Submitted
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">
                <Clock className="w-3.5 h-3.5" />
                Pending Submission
              </span>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            Medicine Indent & Demand Requisition
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Hospital: <span className="font-semibold text-slate-800">{hospital?.hospital_name}</span> | Submitting Officer:{' '}
            <span className="font-semibold text-slate-800">{officerName}</span>
          </p>
          {lastSubmissionTime && (
            <p className="text-xs text-slate-500 mt-0.5">
              Last submitted on: {new Date(lastSubmissionTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap no-print">
          {isSubmitted && !isEditing && (
            <>
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold transition cursor-pointer shadow-sm"
              >
                <Printer className="w-4 h-4" />
                Print Requisition Slip
              </button>

              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition cursor-pointer shadow-sm"
              >
                <Edit3 className="w-4 h-4" />
                Modify Quantities
              </button>
            </>
          )}

          {isEditing && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition cursor-pointer shadow-md disabled:opacity-60"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : 'Finalize & Submit Demand'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Catalog Available</div>
          <div className="text-xl font-bold text-slate-900 mt-1">{medicines.length} Medicines</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Classical & Patent</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Demanded Items</div>
          <div className="text-xl font-bold text-emerald-700 mt-1">{totalItemsDemanded} Varieties</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Selected by facility</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Total Quantity</div>
          <div className="text-xl font-bold text-teal-700 mt-1">{totalUnitsDemanded.toLocaleString()} Units</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Bottles / Packs / Jars</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Portal Status</div>
          <div className="text-xl font-bold mt-1 text-slate-900">
            {isEditing ? (
              <span className="text-amber-600">Editing</span>
            ) : isSubmitted ? (
              <span className="text-emerald-600">Locked / Saved</span>
            ) : (
              <span className="text-slate-600">Draft</span>
            )}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">District Registry</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 no-print">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search medicine by name..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white text-slate-900 font-medium"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          {['All', 'Classical Medicine', 'Patent Medicine'].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Official Print Header (Only visible when printing) */}
      <div className="hidden print-only mb-6 border-b-2 border-slate-800 pb-4 text-center">
        <h1 className="text-xl font-bold uppercase tracking-wider text-slate-900">
          Office of the District Ayurvedic & Unani Officer, Dehradun
        </h1>
        <h2 className="text-sm font-semibold text-slate-700 mt-1">
          Annual Medicine Indent / Demand Requisition Slip ({BATCH_YEAR})
        </h2>
        <div className="mt-3 text-xs text-slate-600 flex justify-between">
          <span>Facility: <strong>{hospital?.hospital_name}</strong></span>
          <span>Block: <strong>{hospital?.block_name}</strong></span>
          <span>Officer: <strong>{officerName}</strong></span>
          <span>Date: <strong>{lastSubmissionTime ? new Date(lastSubmissionTime).toLocaleDateString('en-IN') : 'Pending'}</strong></span>
        </div>
      </div>

      {/* Medicine Demand Table */}
      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200 uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Medicine Name</th>
                  <th className="py-3 px-4 w-44">Category</th>
                  <th className="py-3 px-4 w-32">Pack Size</th>
                  <th className="py-3 px-4 w-40 text-right">Requested Quantity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {filteredMeds.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      No medicines found matching the search or category.
                    </td>
                  </tr>
                ) : (
                  filteredMeds.map((med, index) => {
                    const qty = quantities[med.id] ?? 0;
                    return (
                      <tr
                        key={med.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          qty > 0 ? 'bg-emerald-50/30' : ''
                        }`}
                      >
                        <td className="py-3 px-4 text-center text-xs text-slate-400 font-mono">
                          {index + 1}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900">
                          <div className="flex items-center gap-2">
                            <Pill className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                            <span>{med.medicine_name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs">
                          <span
                            className={`px-2 py-0.5 rounded-md font-semibold text-[11px] ${
                              med.category === 'Classical Medicine'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
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
                              className="w-28 px-3 py-1.5 text-right font-mono font-bold text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            />
                          ) : (
                            <span
                              className={`font-mono font-bold text-sm ${
                                qty > 0 ? 'text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded' : 'text-slate-400'
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

          {/* Table Footer with Summary & Submit Button */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-600">
              Showing <strong>{filteredMeds.length}</strong> of {medicines.length} medicines • Total Demanded:{' '}
              <strong className="text-emerald-700">{totalItemsDemanded} varieties ({totalUnitsDemanded} units)</strong>
            </div>

            {isEditing && (
              <div className="flex items-center gap-3 no-print">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    loadData();
                  }}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow cursor-pointer disabled:opacity-60"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Recording Demands...' : 'Finalize & Submit Demand'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </form>

      {/* Official Signatures Block (For Printout / Verification) */}
      <div className="hidden print-only pt-16 mt-8 border-t border-slate-300">
        <div className="grid grid-cols-2 gap-8 text-center text-xs">
          <div>
            <div className="border-b border-dashed border-slate-400 w-48 mx-auto mb-2"></div>
            <p className="font-bold">{officerName}</p>
            <p className="text-slate-600">Medical Officer In-Charge / Submitting Officer</p>
            <p className="text-slate-500">{hospital?.hospital_name}</p>
          </div>
          <div>
            <div className="border-b border-dashed border-slate-400 w-48 mx-auto mb-2"></div>
            <p className="font-bold">Verified & Received</p>
            <p className="text-slate-600">District Ayurvedic & Unani Officer</p>
            <p className="text-slate-500">District Dehradun (Uttarakhand)</p>
          </div>
        </div>
      </div>
    </div>
  );
};
