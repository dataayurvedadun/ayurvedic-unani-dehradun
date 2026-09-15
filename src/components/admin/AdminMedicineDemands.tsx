import React, { useState, useEffect } from 'react';
import { dbService } from '../../lib/supabase';
import { MedicineItem, MedicineDemandResponse, HospitalMaster } from '../../types';
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
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

export const AdminMedicineDemands: React.FC = () => {
  const [medicines, setMedicines] = useState<MedicineItem[]>([]);
  const [demands, setDemands] = useState<MedicineDemandResponse[]>([]);
  const [hospitals, setHospitals] = useState<HospitalMaster[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [expandedMedId, setExpandedMedId] = useState<string | null>(null);

  // Add Medicine Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [newMedName, setNewMedName] = useState<string>('');
  const [newMedCategory, setNewMedCategory] = useState<'Classical Medicine' | 'Patent Medicine'>('Classical Medicine');
  const [newMedPackSize, setNewMedPackSize] = useState<string>('');
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [medsList, demandsList, hospList] = await Promise.all([
      dbService.getMedicines(),
      dbService.getDemands(),
      dbService.getHospitals(),
    ]);
    setMedicines(medsList);
    setDemands(demandsList);
    setHospitals(hospList);
  };

  // Group demands by medicine
  const demandsByMedicine: Record<string, MedicineDemandResponse[]> = {};
  demands.forEach((d) => {
    if (!demandsByMedicine[d.medicine_id]) {
      demandsByMedicine[d.medicine_id] = [];
    }
    demandsByMedicine[d.medicine_id].push(d);
  });

  const getDistrictTotalForMedicine = (medId: string): number => {
    const list = demandsByMedicine[medId] || [];
    return list.reduce((acc, curr) => acc + (curr.requested_quantity || 0), 0);
  };

  const getHospitalsDemandedCount = (medId: string): number => {
    return (demandsByMedicine[medId] || []).length;
  };

  // Export to Excel (.xlsx)
  const handleExportExcel = () => {
    const excelRows = medicines.map((med, idx) => {
      const hospitalBreakdown = demandsByMedicine[med.id] || [];
      const totalQty = hospitalBreakdown.reduce((a, b) => a + b.requested_quantity, 0);
      const hospitalDetails = hospitalBreakdown
        .map((h) => `${h.hospital_name}: ${h.requested_quantity} units`)
        .join('; ');

      return {
        'S.No.': idx + 1,
        'Medicine Name': med.medicine_name,
        'Category': med.category,
        'Pack Size': med.pack_size,
        'District Total Demanded': totalQty,
        'Demanding Facilities Count': hospitalBreakdown.length,
        'Hospital Breakdown': hospitalDetails || 'None',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'District Medicine Demands');
    XLSX.writeFile(workbook, `Dehradun_Ayush_Medicine_Demands_2026-2027.xlsx`);
  };

  // Export CSV
  const handleExportCsv = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'S.No,Medicine Name,Category,Pack Size,District Total Demanded,Hospitals Count\n';

    medicines.forEach((med, idx) => {
      const totalQty = getDistrictTotalForMedicine(med.id);
      const hospCount = getHospitalsDemandedCount(med.id);
      csvContent += `"${idx + 1}","${med.medicine_name}","${med.category}","${med.pack_size}","${totalQty}","${hospCount}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Dehradun_Medicine_Demands_Consolidated.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle Add Medicine
  const handleAddMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMedName.trim() || !newMedPackSize.trim()) return;

    try {
      const added = await dbService.addMedicine({
        category: newMedCategory,
        medicine_name: newMedName.trim(),
        pack_size: newMedPackSize.trim(),
      });

      await dbService.addActivityLog({
        action: 'New Medicine Added to Catalog',
        details: `Added ${added.medicine_name} (${added.category}, ${added.pack_size})`,
        user: 'District Ayurvedic Officer (Admin)',
        timestamp: new Date().toISOString(),
        category: 'medicine',
      });

      setMedicines((prev) => [...prev, added]);
      setIsAddModalOpen(false);
      setNewMedName('');
      setNewMedPackSize('');
      setNotification(`Medicine "${added.medicine_name}" added to catalog.`);
    } catch (err: any) {
      setNotification(`Failed to add medicine: ${err.message}`);
    }
  };

  // Handle Delete Medicine
  const handleDeleteMedicine = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to remove "${name}" from the active catalog?`)) {
      await dbService.deleteMedicine(id);
      setMedicines((prev) => prev.filter((m) => m.id !== id));
      setNotification(`"${name}" removed from catalog.`);
    }
  };

  // Filter medicines
  const filteredMeds = medicines.filter((med) => {
    const matchesCat = categoryFilter === 'All' || med.category === categoryFilter;
    const matchesSearch = med.medicine_name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const grandTotalUnits = Object.values(demands).reduce((a, b) => a + (b.requested_quantity || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Notification */}
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

      {/* Header & Export Actions */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold tracking-wider uppercase text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            District-Wide Requisition Consolidation
          </span>
          <h2 className="text-2xl font-bold text-slate-900 mt-1">
            Medicine Demands Aggregation & Analytics
          </h2>
          <p className="text-sm text-slate-600">
            Consolidated totals for Annual Medicine Indent (2026-2027) with dispensary-level drilldowns.
          </p>
        </div>

        {/* Export & Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap no-print">
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition cursor-pointer shadow-sm"
            title="Download Excel Spreadsheet with Full Facility Breakdown"
          >
            <Download className="w-4 h-4" />
            Export Excel (.xlsx)
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
          >
            Export CSV
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Medicine
          </button>
        </div>
      </div>

      {/* Aggregate Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-semibold uppercase">Total Catalog Items</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{medicines.length} Formulations</div>
          <div className="text-xs text-slate-400 mt-0.5">Classical & Patent Approved List</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-semibold uppercase">Demanded Formulations</div>
          <div className="text-2xl font-black text-emerald-700 mt-1">
            {Object.keys(demandsByMedicine).length} of {medicines.length}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">Requested by at least one dispensary</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-semibold uppercase">Grand Total Units Demanded</div>
          <div className="text-2xl font-black text-teal-700 mt-1">{grandTotalUnits.toLocaleString()} Units</div>
          <div className="text-xs text-slate-400 mt-0.5">District Dehradun total indent volume</div>
        </div>
      </div>

      {/* Search & Category Filter */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 no-print">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search medicine catalog..."
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-slate-900 font-medium"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          {['All', 'Classical Medicine', 'Patent Medicine'].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Official Print Header */}
      <div className="hidden print-only mb-6 border-b-2 border-slate-900 pb-3 text-center">
        <h1 className="text-xl font-bold uppercase tracking-wider text-slate-900">
          Office of the District Ayurvedic & Unani Officer, Dehradun
        </h1>
        <h2 className="text-sm font-semibold text-slate-700 mt-1">
          Consolidated District Medicine Demand Statement (Session 2026-2027)
        </h2>
        <div className="text-xs text-slate-500 mt-1">
          Printed on {new Date().toLocaleDateString('en-IN')}
        </div>
      </div>

      {/* Demands Consolidation Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200 uppercase text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4">Medicine Formulation</th>
                <th className="py-3 px-4 w-40">Category</th>
                <th className="py-3 px-4 w-28">Pack Size</th>
                <th className="py-3 px-4 w-36 text-center">Facilities</th>
                <th className="py-3 px-4 w-44 text-right">District Demand</th>
                <th className="py-3 px-4 w-28 text-center no-print">Breakdown</th>
                <th className="py-3 px-4 w-16 text-center no-print">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredMeds.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No medicines found.
                  </td>
                </tr>
              ) : (
                filteredMeds.map((med, idx) => {
                  const breakdown = demandsByMedicine[med.id] || [];
                  const totalDemanded = breakdown.reduce((a, b) => a + b.requested_quantity, 0);
                  const isExpanded = expandedMedId === med.id;

                  return (
                    <React.Fragment key={med.id}>
                      <tr
                        className={`hover:bg-slate-50/80 transition-colors ${
                          totalDemanded > 0 ? 'bg-emerald-50/20' : ''
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
                        <td className="py-3 px-4 text-xs">
                          <span
                            className={`px-2 py-0.5 rounded font-semibold text-[11px] ${
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
                        <td className="py-3 px-4 text-center text-xs">
                          {breakdown.length > 0 ? (
                            <span className="font-bold text-slate-800">
                              {breakdown.length} / {hospitals.length}
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span
                            className={`font-mono font-bold text-sm ${
                              totalDemanded > 0
                                ? 'text-emerald-700 bg-emerald-100/70 px-2.5 py-0.5 rounded'
                                : 'text-slate-400'
                            }`}
                          >
                            {totalDemanded > 0 ? `${totalDemanded.toLocaleString()} units` : '0 units'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center no-print">
                          {breakdown.length > 0 ? (
                            <button
                              type="button"
                              onClick={() => setExpandedMedId(isExpanded ? null : med.id)}
                              className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-900 font-semibold cursor-pointer"
                            >
                              <span>{isExpanded ? 'Hide' : 'View'}</span>
                              {isExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5" />
                              )}
                            </button>
                          ) : (
                            <span className="text-slate-300 text-xs">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center no-print">
                          <button
                            type="button"
                            onClick={() => handleDeleteMedicine(med.id, med.medicine_name)}
                            className="text-red-400 hover:text-red-600 transition cursor-pointer p-1"
                            title="Delete medicine from catalog"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>

                      {/* Hospital-wise Drilldown Accordion Row */}
                      {isExpanded && breakdown.length > 0 && (
                        <tr className="bg-slate-50/80 border-t border-b border-slate-200">
                          <td colSpan={8} className="py-3 px-6">
                            <div className="bg-white rounded-xl p-4 border border-slate-200">
                              <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-emerald-600" />
                                Facility Breakdown for "{med.medicine_name}":
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                {breakdown.map((item) => (
                                  <div
                                    key={item.id}
                                    className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs flex justify-between items-center"
                                  >
                                    <div>
                                      <div className="font-semibold text-slate-800 line-clamp-1">
                                        {item.hospital_name}
                                      </div>
                                      <div className="text-[10px] text-slate-500">
                                        Officer: {item.officer_name}
                                      </div>
                                    </div>
                                    <span className="font-mono font-bold text-emerald-700 text-sm ml-2">
                                      {item.requested_quantity}
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

      {/* Add Medicine Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
              Add New Medicine to District Catalog
            </h3>
            <form onSubmit={handleAddMedicine} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Medicine / Formulation Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newMedName}
                  onChange={(e) => setNewMedName(e.target.value)}
                  placeholder="e.g. Giloy Ghanvati, Suvarna Bhasma"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={newMedCategory}
                  onChange={(e) =>
                    setNewMedCategory(e.target.value as 'Classical Medicine' | 'Patent Medicine')
                  }
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900"
                >
                  <option value="Classical Medicine">Classical Medicine</option>
                  <option value="Patent Medicine">Patent Medicine</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Pack Size / Specification <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newMedPackSize}
                  onChange={(e) => setNewMedPackSize(e.target.value)}
                  placeholder="e.g. 40 tab, 200 ml, 100 gm"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow cursor-pointer"
                >
                  Save to Catalog
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
