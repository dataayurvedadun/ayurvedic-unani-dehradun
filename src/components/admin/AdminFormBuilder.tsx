import React, { useState, useEffect } from 'react';
import { dbService } from '../../lib/supabase';
import { DynamicForm, DynamicFormField, DynamicFormResponse, HospitalMaster } from '../../types';
import * as XLSX from 'xlsx';
import {
  FileCode,
  Plus,
  Trash2,
  CheckCircle2,
  Eye,
  Download,
  ToggleLeft,
  ToggleRight,
  ListPlus,
  Send,
  Building2,
  Clock,
} from 'lucide-react';

export const AdminFormBuilder: React.FC = () => {
  const [forms, setForms] = useState<DynamicForm[]>([]);
  const [responses, setResponses] = useState<DynamicFormResponse[]>([]);
  const [hospitals, setHospitals] = useState<HospitalMaster[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);

  // New Form Creator State
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newDescription, setNewDescription] = useState<string>('');
  const [newFields, setNewFields] = useState<DynamicFormField[]>([
    {
      id: 'field_1',
      label: 'Sample Question / Metric',
      type: 'text',
      required: true,
      placeholder: 'Enter response...',
    },
  ]);

  // Current Field Draft state
  const [fieldLabel, setFieldLabel] = useState<string>('');
  const [fieldType, setFieldType] = useState<DynamicFormField['type']>('text');
  const [fieldOptions, setFieldOptions] = useState<string>('');
  const [fieldRequired, setFieldRequired] = useState<boolean>(true);
  const [fieldPlaceholder, setFieldPlaceholder] = useState<string>('');

  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    loadForms();
  }, []);

  const loadForms = async () => {
    const [allForms, allResponses, allHosp] = await Promise.all([
      dbService.getDynamicForms(),
      dbService.getDynamicFormResponses(),
      dbService.getHospitals(),
    ]);
    setForms(allForms);
    setResponses(allResponses);
    setHospitals(allHosp);
    if (allForms.length > 0 && !selectedFormId) {
      setSelectedFormId(allForms[0].id);
    }
  };

  const handleAddFieldToDraft = () => {
    if (!fieldLabel.trim()) return;

    const newField: DynamicFormField = {
      id: 'field_' + Math.random().toString(36).substring(2, 8),
      label: fieldLabel.trim(),
      type: fieldType,
      required: fieldRequired,
      placeholder: fieldPlaceholder.trim(),
      options:
        fieldType === 'select'
          ? fieldOptions
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined,
    };

    setNewFields((prev) => [...prev, newField]);
    setFieldLabel('');
    setFieldOptions('');
    setFieldPlaceholder('');
  };

  const handleRemoveField = (fieldId: string) => {
    setNewFields((prev) => prev.filter((f) => f.id !== fieldId));
  };

  const handlePublishForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setNotification('Form Title is required.');
      return;
    }
    if (newFields.length === 0) {
      setNotification('Please add at least one question field.');
      return;
    }

    try {
      const created = await dbService.createDynamicForm({
        form_title: newTitle.trim(),
        description: newDescription.trim(),
        form_fields: newFields,
        is_active: true,
      });

      await dbService.addActivityLog({
        action: 'New Custom Form Published',
        details: `Published "${created.form_title}" with ${newFields.length} fields`,
        user: 'District Ayurvedic Officer (Admin)',
        timestamp: new Date().toISOString(),
        category: 'form',
      });

      setNotification(`Form "${created.form_title}" successfully published to all hospitals!`);
      setIsCreating(false);
      setNewTitle('');
      setNewDescription('');
      setNewFields([]);
      loadForms();
    } catch (err: any) {
      setNotification(`Failed to publish form: ${err.message}`);
    }
  };

  const handleToggleStatus = async (form: DynamicForm) => {
    const nextStatus = !form.is_active;
    await dbService.toggleDynamicFormStatus(form.id, nextStatus);
    setForms((prev) =>
      prev.map((f) => (f.id === form.id ? { ...f, is_active: nextStatus } : f))
    );
    setNotification(
      `Form "${form.form_title}" is now ${nextStatus ? 'Active' : 'Archived / Inactive'}.`
    );
  };

  const selectedForm = forms.find((f) => f.id === selectedFormId);
  const selectedFormResponses = responses.filter((r) => r.form_id === selectedFormId);

  // Export Responses to Excel
  const handleExportResponses = () => {
    if (!selectedForm) return;

    const rows = selectedFormResponses.map((r, i) => {
      const rowObj: Record<string, any> = {
        'S.No': i + 1,
        'Hospital Name': r.hospital_name,
        'Submitting Officer': r.officer_name,
        'Submitted Date': new Date(r.submitted_at).toLocaleString('en-IN'),
      };
      selectedForm.form_fields.forEach((f) => {
        rowObj[f.label] = r.response_data[f.id] ?? '—';
      });
      return rowObj;
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Survey Responses');
    XLSX.writeFile(workbook, `${selectedForm.form_title.replace(/\s+/g, '_')}_Responses.xlsx`);
  };

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

      {/* Header & Builder Toggle */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold tracking-wider uppercase text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            Administrative Survey Engine
          </span>
          <h2 className="text-2xl font-bold text-slate-900 mt-1">
            Dynamic Form Creator & Survey Responses
          </h2>
          <p className="text-sm text-slate-600">
            Build, publish and inspect custom administrative data-collection questionnaires across hospitals.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreating(!isCreating)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{isCreating ? 'Cancel Builder' : 'Create New Form'}</span>
        </button>
      </div>

      {/* New Form Creator Drawer */}
      {isCreating && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border-2 border-emerald-500 shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Design New Administrative Survey / Form
              </h3>
              <p className="text-xs text-slate-500">
                Define the form metadata, add multiple input questions, and publish directly to hospital dashboards.
              </p>
            </div>
            <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full">
              Live Form Builder
            </span>
          </div>

          <form onSubmit={handlePublishForm} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Form Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Winter Stock Contingency & Panchakarma Audit 2026"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Description / Administrative Instructions
                </label>
                <input
                  type="text"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Instructions for Medical Officers filling this form..."
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900"
                />
              </div>
            </div>

            {/* Questions Builder Section */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <ListPlus className="w-4 h-4 text-emerald-600" />
                Add Question Field to Form
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Question Label
                  </label>
                  <input
                    type="text"
                    value={fieldLabel}
                    onChange={(e) => setFieldLabel(e.target.value)}
                    placeholder="e.g. Availability of Halazone Tablets"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Input Type
                  </label>
                  <select
                    value={fieldType}
                    onChange={(e) => setFieldType(e.target.value as any)}
                    className="w-full px-2 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900"
                  >
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="select">Dropdown</option>
                    <option value="textarea">Textarea</option>
                    <option value="date">Date</option>
                  </select>
                </div>

                {fieldType === 'select' ? (
                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Options (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={fieldOptions}
                      onChange={(e) => setFieldOptions(e.target.value)}
                      placeholder="Adequate, Shortage, None"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900"
                    />
                  </div>
                ) : (
                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Placeholder (Optional)
                    </label>
                    <input
                      type="text"
                      value={fieldPlaceholder}
                      onChange={(e) => setFieldPlaceholder(e.target.value)}
                      placeholder="e.g. 0 or enter comments"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900"
                    />
                  </div>
                )}

                <div className="sm:col-span-1 flex items-center justify-center pb-2">
                  <label className="flex items-center gap-1 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={fieldRequired}
                      onChange={(e) => setFieldRequired(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Req</span>
                  </label>
                </div>

                <div className="sm:col-span-2">
                  <button
                    type="button"
                    onClick={handleAddFieldToDraft}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    + Add Field
                  </button>
                </div>
              </div>

              {/* Current Question Fields List */}
              <div className="mt-4 pt-4 border-t border-slate-200">
                <div className="text-xs font-bold text-slate-600 mb-2">
                  Configured Question Fields ({newFields.length})
                </div>
                {newFields.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No fields added yet.</p>
                ) : (
                  <div className="space-y-2">
                    {newFields.map((f, i) => (
                      <div
                        key={f.id}
                        className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center font-mono font-bold text-[10px]">
                            {i + 1}
                          </span>
                          <span className="font-bold text-slate-900">{f.label}</span>
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] uppercase font-mono">
                            {f.type}
                          </span>
                          {f.required && (
                            <span className="text-[10px] text-red-600 font-semibold bg-red-50 px-1 rounded">
                              Required
                            </span>
                          )}
                          {f.options && (
                            <span className="text-[10px] text-slate-500">
                              [{f.options.join(', ')}]
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveField(f.id)}
                          className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Publish Form to All Dispensaries</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Forms Hub & Responses Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Forms List */}
        <div className="lg:col-span-4 space-y-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
            Published Surveys ({forms.length})
          </h3>

          {forms.map((form) => {
            const formResps = responses.filter((r) => r.form_id === form.id);
            const isSelected = form.id === selectedFormId;

            return (
              <div
                key={form.id}
                onClick={() => setSelectedFormId(form.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-50 border-emerald-500 shadow-sm ring-1 ring-emerald-500/20'
                    : 'bg-white hover:bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{form.form_title}</h4>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleStatus(form);
                    }}
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full cursor-pointer ${
                      form.is_active
                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                        : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                    }`}
                  >
                    {form.is_active ? 'Active' : 'Archived'}
                  </button>
                </div>
                <p className="text-xs text-slate-500 line-clamp-2">{form.description}</p>
                <div className="flex items-center justify-between mt-3 text-[11px] text-slate-400">
                  <span>{form.form_fields.length} questions</span>
                  <span className="font-bold text-emerald-700">
                    {formResps.length} / {hospitals.length} Responses
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Responses Inspector */}
        <div className="lg:col-span-8">
          {selectedForm ? (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{selectedForm.form_title}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{selectedForm.description}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportResponses}
                    disabled={selectedFormResponses.length === 0}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Excel</span>
                  </button>
                </div>
              </div>

              {/* Responses Table */}
              <div>
                <div className="text-xs font-bold text-slate-700 mb-2">
                  Hospital Submissions ({selectedFormResponses.length})
                </div>

                {selectedFormResponses.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 text-xs text-slate-500">
                    No hospital submissions recorded yet for this survey.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-semibold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Hospital</th>
                          <th className="py-2.5 px-3">Officer</th>
                          {selectedForm.form_fields.slice(0, 3).map((f) => (
                            <th key={f.id} className="py-2.5 px-3">
                              {f.label}
                            </th>
                          ))}
                          <th className="py-2.5 px-3">Submitted</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {selectedFormResponses.map((res) => (
                          <tr key={res.id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-semibold text-slate-900">
                              {res.hospital_name}
                            </td>
                            <td className="py-2.5 px-3">{res.officer_name}</td>
                            {selectedForm.form_fields.slice(0, 3).map((f) => (
                              <td key={f.id} className="py-2.5 px-3 max-w-[150px] truncate">
                                {String(res.response_data[f.id] ?? '—')}
                              </td>
                            ))}
                            <td className="py-2.5 px-3 text-slate-400">
                              {new Date(res.submitted_at).toLocaleDateString('en-IN')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-sm">
              Select a form to inspect responses or click "Create New Form".
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
