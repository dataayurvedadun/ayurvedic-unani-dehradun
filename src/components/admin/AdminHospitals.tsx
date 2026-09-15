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
} from 'lucide-react';

export const AdminHospitals: React.FC = () => {
  const [hospitals, setHospitals] = useState<HospitalMaster[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Add Hospital state
  const [name, setName] = useState<string>('');
  const [category, setCategory] = useState<string>('State Ayurvedic Dispensary');
  const [uid, setUid] = useState<string>('');
  const [password, setPassword] = useState<string>('ayush@123');

  // Password edit state
  const [editingHospId, setEditingHospId] = useState<string | null>(null);
  const [newPasswordVal, setNewPasswordVal] = useState<string>('');
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    loadHospitals();
  }, []);

  const loadHospitals = async () => {
    const list = await dbService.getHospitals();
    setHospitals(list);
  };

  const handleAddHospital = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const generatedUid = uid.trim() || `DDN${String(hospitals.length + 1).padStart(3, '0')}`;
      const added = await dbService.addHospital({
        hospital_name: name.trim(),
        block_name: category.trim(),
        category: category.trim(),
        assigned_password: password.trim() || 'ayush@123',
        contact_phone: generatedUid,
        uid: generatedUid,
      });

      await dbService.addActivityLog({
        action: 'New Facility Enrolled',
        details: `Enrolled ${added.hospital_name} [${generatedUid}] (${category.trim()})`,
        user: 'District Ayurvedic Officer (Admin)',
        timestamp: new Date().toISOString(),
        category: 'admin',
      });

      setHospitals((prev) => [...prev, added]);
      setIsAddModalOpen(false);
      setName('');
      setUid('');
      setNotification(`Facility "${added.hospital_name}" [${generatedUid}] enrolled successfully.`);
    } catch (err: any) {
      setNotification(`Failed to add hospital: ${err.message}`);
    }
  };

  const handleSavePassword = async (hospId: string) => {
    if (!newPasswordVal.trim()) return;
    await dbService.updateHospitalPassword(hospId, newPasswordVal.trim());
    setHospitals((prev) =>
      prev.map((h) => (h.id === hospId ? { ...h, assigned_password: newPasswordVal.trim() } : h))
    );
    setEditingHospId(null);
    setNewPasswordVal('');
    setNotification('Facility access password updated successfully.');
  };

  const handleCopyPassword = (pass: string, id: string) => {
    navigator.clipboard.writeText(pass);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredHospitals = hospitals.filter(
    (h) =>
      h.hospital_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.block_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (h.uid && h.uid.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (h.contact_phone && h.contact_phone.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (h.category && h.category.toLowerCase().includes(searchTerm.toLowerCase()))
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
            Manage pre-populated hospital accounts, assigned access passwords, and communication details.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Dispensary</span>
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
            placeholder="Search facility name or block..."
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
                <th className="py-3 px-4 w-60">Category</th>
                <th className="py-3 px-4 w-60">Assigned Password</th>
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
                    <span className="inline-block px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      {hosp.category || hosp.block_name || 'Ayurvedic Facility'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {editingHospId === hosp.id ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={newPasswordVal}
                          onChange={(e) => setNewPasswordVal(e.target.value)}
                          className="px-2 py-1 text-xs border border-emerald-500 rounded bg-white font-mono"
                          placeholder="New password"
                        />
                        <button
                          type="button"
                          onClick={() => handleSavePassword(hosp.id)}
                          className="px-2 py-1 bg-emerald-700 text-white rounded text-xs font-bold"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingHospId(null)}
                          className="px-2 py-1 bg-slate-200 text-slate-700 rounded text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
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
                        <button
                          type="button"
                          onClick={() => {
                            setEditingHospId(hosp.id);
                            setNewPasswordVal(hosp.assigned_password);
                          }}
                          className="text-slate-400 hover:text-emerald-700 p-1 cursor-pointer"
                          title="Change Password"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
              Register New Health Facility
            </h3>
            <form onSubmit={handleAddHospital} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Dispensary / Hospital Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sahastradhara, Raiwala, Rishikesh"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Category / Classification <span className="text-red-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
                >
                  <option value="State Ayurvedic Dispensary">State Ayurvedic Dispensary (SAD)</option>
                  <option value="District Ayurvedic Hospital">District Ayurvedic Hospital</option>
                  <option value="CHC / PHC / Ayush Wing">CHC / PHC / Ayush Wing</option>
                  <option value="Government Homoeopathic / Unani Dispensary">Government Homoeopathic / Unani Dispensary</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Facility Assigned UID (Optional - auto-assigned if blank)
                </label>
                <input
                  type="text"
                  value={uid}
                  onChange={(e) => setUid(e.target.value.toUpperCase())}
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
