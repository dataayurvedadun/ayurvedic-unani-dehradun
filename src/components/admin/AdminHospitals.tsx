import React, { useState, useEffect } from 'react';
import { dbService } from '../../lib/supabase';
import { HospitalMaster } from '../../types';
import {
  Building2,
  KeyRound,
  Plus,
  Search,
  CheckCircle2,
  Lock,
  Edit2,
  Copy,
  Check,
  Trash2,
  AlertTriangle,
  X,
  Phone,
} from 'lucide-react';

const FACILITY_TYPES = [
  'State Ayurvedic Dispensary',
  'State Unani Dispensary',
  '50 Bedded Ayurvedic Hospital',
  'Ayush Health & Wellness Centre',
  'District Ayurvedic Hospital',
  'CHC / PHC / Ayush Wing',
  'Government Homeopathic Dispensary',
  'Other Ayush Facility',
];

export const AdminHospitals: React.FC = () => {
  const [hospitals, setHospitals] = useState<HospitalMaster[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Add Hospital state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [addName, setAddName] = useState<string>('');
  const [addType, setAddType] = useState<string>('State Ayurvedic Dispensary');
  const [addUid, setAddUid] = useState<string>('');
  const [addPassword, setAddPassword] = useState<string>('ayush@123');

  // Edit Hospital state
  const [editingHospital, setEditingHospital] = useState<HospitalMaster | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editType, setEditType] = useState<string>('');
  const [editUid, setEditUid] = useState<string>('');
  const [editPassword, setEditPassword] = useState<string>('');
  const [editPhone, setEditPhone] = useState<string>('');

  // Delete Hospital state
  const [deletingHospital, setDeletingHospital] = useState<HospitalMaster | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  useEffect(() => {
    loadHospitals();
  }, []);

  const loadHospitals = async () => {
    const list = await dbService.getHospitals();
    setHospitals(list);
  };

  const handleAddHospital = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim()) return;

    try {
      const generatedUid = addUid.trim() || `DDN${String(hospitals.length + 1).padStart(3, '0')}`;
      const added = await dbService.addHospital({
        hospital_name: addName.trim(),
        block_name: addType.trim(),
        category: addType.trim(),
        assigned_password: addPassword.trim() || 'ayush@123',
        contact_phone: generatedUid,
        uid: generatedUid,
      });

      await dbService.addActivityLog({
        action: 'New Facility Enrolled',
        details: `Enrolled ${added.hospital_name} [${generatedUid}] (${addType.trim()})`,
        user: 'District Ayurvedic Officer (Admin)',
        timestamp: new Date().toISOString(),
        category: 'admin',
      });

      setHospitals((prev) => [...prev, added]);
      setIsAddModalOpen(false);
      setAddName('');
      setAddUid('');
      setAddPassword('ayush@123');
      setNotification(`Facility "${added.hospital_name}" [${generatedUid}] enrolled successfully.`);
    } catch (err: any) {
      setNotification(`Failed to add hospital: ${err.message}`);
    }
  };

  const openEditModal = (hosp: HospitalMaster) => {
    setEditingHospital(hosp);
    setEditName(hosp.hospital_name);
    setEditType(hosp.category || hosp.block_name || 'State Ayurvedic Dispensary');
    setEditUid(hosp.uid || hosp.contact_phone || '');
    setEditPassword(hosp.assigned_password || 'ayush@123');
    setEditPhone(hosp.contact_phone || '');
  };

  const handleUpdateHospital = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHospital || !editName.trim()) return;

    try {
      const updates: Partial<HospitalMaster> = {
        hospital_name: editName.trim(),
        category: editType.trim(),
        block_name: editType.trim(),
        assigned_password: editPassword.trim() || 'ayush@123',
        uid: editUid.trim(),
        contact_phone: editPhone.trim() || editUid.trim(),
      };

      await dbService.updateHospital(editingHospital.id, updates);

      await dbService.addActivityLog({
        action: 'Facility Details Updated',
        details: `Updated ${editName.trim()} [${editUid.trim()}] Type: ${editType.trim()}`,
        user: 'District Ayurvedic Officer (Admin)',
        timestamp: new Date().toISOString(),
        category: 'admin',
      });

      setHospitals((prev) =>
        prev.map((h) => (h.id === editingHospital.id ? { ...h, ...updates } : h))
      );
      setEditingHospital(null);
      setNotification(`Facility "${editName.trim()}" updated successfully.`);
    } catch (err: any) {
      setNotification(`Failed to update facility: ${err.message}`);
    }
  };

  const handleDeleteHospital = async () => {
    if (!deletingHospital) return;
    setIsDeleting(true);
    try {
      await dbService.deleteHospital(deletingHospital.id);

      await dbService.addActivityLog({
        action: 'Facility Removed',
        details: `Removed facility ${deletingHospital.hospital_name} (${deletingHospital.category || deletingHospital.block_name})`,
        user: 'District Ayurvedic Officer (Admin)',
        timestamp: new Date().toISOString(),
        category: 'admin',
      });

      setHospitals((prev) => prev.filter((h) => h.id !== deletingHospital.id));
      setNotification(`Facility "${deletingHospital.hospital_name}" was successfully removed.`);
      setDeletingHospital(null);
    } catch (err: any) {
      setNotification(`Failed to delete facility: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopyPassword = (pass: string, id: string) => {
    navigator.clipboard.writeText(pass);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredHospitals = hospitals.filter(
    (h) =>
      h.hospital_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (h.category && h.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (h.block_name && h.block_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (h.uid && h.uid.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (h.contact_phone && h.contact_phone.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Notification */}
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

      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold tracking-wider uppercase text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            Facility Directory & Access Control
          </span>
          <h2 className="text-2xl font-bold text-slate-900 mt-1">
            Registered Dehradun Facilities & Credentials
          </h2>
          <p className="text-sm text-slate-600">
            Add new dispensaries, edit facility name and type, manage access credentials, or remove facilities.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Facility</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search facility name or type..."
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-slate-900 font-medium"
          />
        </div>
        <div className="text-xs text-slate-500">
          Total Facilities: <strong className="text-slate-800">{hospitals.length}</strong>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200 uppercase text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4 w-28">UID</th>
                <th className="py-3 px-4">Hospital / Dispensary Name</th>
                <th className="py-3 px-4 w-52">Type</th>
                <th className="py-3 px-4 w-44">Assigned Password</th>
                <th className="py-3 px-4 w-32 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredHospitals.map((hosp, idx) => (
                <tr key={hosp.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 text-center text-xs text-slate-400 font-mono">
                    {idx + 1}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-200">
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
                    <span className="inline-block px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                      {hosp.category || hosp.block_name || 'State Ayurvedic Dispensary'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <code className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-mono font-bold text-xs border border-slate-200">
                        {hosp.assigned_password}
                      </code>
                      <button
                        type="button"
                        onClick={() => handleCopyPassword(hosp.assigned_password, hosp.id)}
                        className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                        title="Copy Password"
                      >
                        {copiedId === hosp.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(hosp)}
                        className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                        title="Edit Facility Name, Type, or Password"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingHospital(hosp)}
                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition cursor-pointer"
                        title="Remove Facility"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Hospital Modal */}
      {editingHospital && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-lg font-bold text-slate-900">
                Edit Facility Details
              </h3>
              <button
                type="button"
                onClick={() => setEditingHospital(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateHospital} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Dispensary / Hospital Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Facility Type / Classification <span className="text-red-500">*</span>
                </label>
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500"
                >
                  {FACILITY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Facility UID
                </label>
                <input
                  type="text"
                  value={editUid}
                  onChange={(e) => setEditUid(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Assigned Access Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingHospital(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingHospital && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-red-200">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 text-center mb-1">
              Remove Health Facility?
            </h3>
            <p className="text-xs text-slate-500 text-center mb-4">
              Are you sure you want to remove <strong className="text-slate-800">{deletingHospital.hospital_name}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeletingHospital(null)}
                disabled={isDeleting}
                className="w-1/2 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteHospital}
                disabled={isDeleting}
                className="w-1/2 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Removing...' : 'Yes, Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-lg font-bold text-slate-900">
                Register New Health Facility
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddHospital} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Dispensary / Hospital Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="e.g. Sahastradhara, Raiwala, Rishikesh"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Facility Type / Classification <span className="text-red-500">*</span>
                </label>
                <select
                  value={addType}
                  onChange={(e) => setAddType(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
                >
                  {FACILITY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Facility Assigned UID (Optional)
                </label>
                <input
                  type="text"
                  value={addUid}
                  onChange={(e) => setAddUid(e.target.value.toUpperCase())}
                  placeholder={`e.g. DDN${String(hospitals.length + 1).padStart(3, '0')}`}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Assigned Access Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={addPassword}
                  onChange={(e) => setAddPassword(e.target.value)}
                  placeholder="ayush@123"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono"
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
                  Save Facility
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

