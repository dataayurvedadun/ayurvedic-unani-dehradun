import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dbService } from '../../lib/supabase';
import { DynamicForm, DynamicFormResponse } from '../../types';
import confetti from 'canvas-confetti';
import {
  FileCode,
  CheckCircle2,
  Clock,
  Send,
  AlertCircle,
  Calendar,
  Lock,
  Archive,
  Check,
} from 'lucide-react';

export const CustomFormsView: React.FC = () => {
  const { session } = useAuth();
  const hospital = session?.hospital;
  const officerName = session?.officerName || 'Medical Officer In-Charge';

  const [forms, setForms] = useState<DynamicForm[]>([]);
  const [responses, setResponses] = useState<DynamicFormResponse[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [hospital?.id]);

  const loadData = async () => {
    if (!hospital) return;
    // Load ALL forms (both active and inactive) so previously submitted forms can still be inspected
    const [allForms, userResponses] = await Promise.all([
      dbService.getDynamicForms(false),
      dbService.getDynamicFormResponses(undefined, hospital.id),
    ]);

    setForms(allForms);
    setResponses(userResponses);

    if (allForms.length > 0) {
      const initialForm = allForms[0];
      setSelectedFormId(initialForm.id);
      loadResponseForForm(initialForm.id, userResponses);
    }
  };

  const loadResponseForForm = (formId: string, currentResponses = responses) => {
    const existing = currentResponses.find((r) => r.form_id === formId);
    if (existing) {
      setFormData(existing.response_data);
    } else {
      setFormData({});
    }
  };

  const handleSelectForm = (id: string) => {
    setSelectedFormId(id);
    loadResponseForForm(id);
    setNotification(null);
  };

  const selectedForm = forms.find((f) => f.id === selectedFormId);
  const selectedFormResponse = responses.find((r) => r.form_id === selectedFormId);

  const isSubmitted = Boolean(selectedFormResponse);
  const isActive = Boolean(selectedForm?.is_active);

  // Status:
  // 1. submitted: if user has submitted (permanently locked / uneditable)
  // 2. pending: if active and not submitted (editable)
  // 3. expired: if !is_active (uneditable)
  const currentStatus: 'submitted' | 'pending' | 'expired' = isSubmitted
    ? 'submitted'
    : isActive
    ? 'pending'
    : 'expired';

  const isReadOnly = currentStatus !== 'pending';

  const handleInputChange = (fieldId: string, value: any) => {
    if (isReadOnly) return; // Disallow any changes if submitted or expired
    setFormData((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hospital || !selectedForm || isReadOnly) return;

    // Validate required fields
    for (const field of selectedForm.form_fields) {
      if (field.required && (formData[field.id] === undefined || formData[field.id] === '')) {
        setNotification(`Field "${field.label}" is required.`);
        return;
      }
    }

    setIsSubmitting(true);
    const submissionTime = new Date().toISOString();

    try {
      await dbService.submitDynamicFormResponse({
        form_id: selectedForm.id,
        hospital_id: hospital.id,
        hospital_name: hospital.hospital_name,
        response_data: formData,
        officer_name: officerName,
        submitted_at: submissionTime,
      });

      await dbService.addActivityLog({
        action: 'Custom Survey Response Submitted',
        details: `Submitted response for "${selectedForm.form_title}"`,
        user: `${hospital.hospital_name} (${officerName})`,
        timestamp: submissionTime,
        category: 'form',
      });

      setNotification(`Response for "${selectedForm.form_title}" successfully submitted and locked! Once submitted, answers cannot be edited.`);
      const updatedResponses = await dbService.getDynamicFormResponses(undefined, hospital.id);
      setResponses(updatedResponses);

      try {
        confetti({
          particleCount: 60,
          spread: 60,
          origin: { y: 0.6 },
        });
      } catch (e) {}
    } catch (err: any) {
      setNotification(`Failed to submit response: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Notification */}
      {notification && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-sm flex items-center justify-between shadow-sm">
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

      {/* Forms Hub Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold tracking-wider uppercase text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            District Administration Surveys
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            Special Administrative Surveys & Data Returns
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Questionnaires and compliance surveys published by the District Ayurvedic & Unani Officer, Dehradun.
          </p>
        </div>
      </div>

      {forms.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
          <FileCode className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800">No Administrative Surveys Published</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
            There are currently no additional administrative surveys requiring hospital response.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Form Selector List */}
          <div className="lg:col-span-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
              Surveys & Forms ({forms.length})
            </h3>
            {forms.map((form) => {
              const res = responses.find((r) => r.form_id === form.id);
              const hasSub = Boolean(res);
              const status: 'submitted' | 'pending' | 'expired' = hasSub
                ? 'submitted'
                : form.is_active
                ? 'pending'
                : 'expired';
              const isSelected = form.id === selectedFormId;

              return (
                <div
                  key={form.id}
                  onClick={() => handleSelectForm(form.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-900 text-white border-emerald-900 shadow-md ring-2 ring-emerald-500/20'
                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="text-xs font-bold line-clamp-1">
                      {form.form_title}
                    </span>
                    {status === 'submitted' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300 flex-shrink-0">
                        <Check className="w-3 h-3 text-emerald-600" />
                        SUBMITTED
                      </span>
                    ) : status === 'pending' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300 flex-shrink-0">
                        <Clock className="w-3 h-3 text-amber-600" />
                        PENDING
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-slate-700 bg-slate-200 px-2 py-0.5 rounded-full border border-slate-300 flex-shrink-0">
                        <Archive className="w-3 h-3 text-slate-500" />
                        EXPIRED
                      </span>
                    )}
                  </div>

                  <p className={`text-xs line-clamp-2 ${isSelected ? 'text-slate-200' : 'text-slate-500'}`}>
                    {form.description}
                  </p>

                  <div className={`text-[10px] mt-2 pt-2 border-t space-y-0.5 ${
                    isSelected ? 'border-emerald-800 text-emerald-200' : 'border-slate-100 text-slate-500'
                  }`}>
                    <div>
                      <strong>Admin Activated:</strong>{' '}
                      {new Date(form.created_at).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>
                    {hasSub && res && (
                      <div className={isSelected ? 'text-emerald-300 font-semibold' : 'text-emerald-700 font-semibold'}>
                        <strong>Submitted:</strong>{' '}
                        {new Date(res.submitted_at).toLocaleDateString('en-IN', {
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

          {/* Right Column: Form Rendering & Submissions */}
          <div className="lg:col-span-8">
            {selectedForm ? (
              <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
                {/* Form Header */}
                <div className="border-b border-slate-200 pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <h3 className="text-xl font-bold text-slate-900">{selectedForm.form_title}</h3>

                    {currentStatus === 'submitted' ? (
                      <span className="text-xs text-emerald-800 bg-emerald-100 font-bold px-3 py-1 rounded-full border border-emerald-300 flex items-center gap-1 self-start sm:self-auto">
                        <Lock className="w-3.5 h-3.5 text-emerald-700" />
                        Submitted (Locked / Uneditable)
                      </span>
                    ) : currentStatus === 'pending' ? (
                      <span className="text-xs text-amber-900 bg-amber-100 font-bold px-3 py-1 rounded-full border border-amber-300 flex items-center gap-1 self-start sm:self-auto">
                        <Clock className="w-3.5 h-3.5 text-amber-700" />
                        Pending Response
                      </span>
                    ) : (
                      <span className="text-xs text-slate-700 bg-slate-200 font-bold px-3 py-1 rounded-full border border-slate-300 flex items-center gap-1 self-start sm:self-auto">
                        <Archive className="w-3.5 h-3.5 text-slate-500" />
                        Expired / Closed
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-slate-600 leading-relaxed">{selectedForm.description}</p>

                  {/* Metadata Chips */}
                  <div className="mt-3 flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                    <span className="bg-slate-100 px-2.5 py-1 rounded-lg">
                      <strong>Admin Activated:</strong>{' '}
                      {new Date(selectedForm.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    {selectedFormResponse && (
                      <span className="bg-emerald-50 text-emerald-900 px-2.5 py-1 rounded-lg border border-emerald-200">
                        <strong>User Submitted:</strong>{' '}
                        {new Date(selectedFormResponse.submitted_at).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        by {selectedFormResponse.officer_name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Form Fields */}
                <form onSubmit={handleSubmit} className="space-y-6">
                  {selectedForm.form_fields.map((field, idx) => {
                    const value = formData[field.id] ?? '';
                    return (
                      <div key={field.id} className="space-y-1.5">
                        <label className="block text-sm font-semibold text-slate-800">
                          {idx + 1}. {field.label}{' '}
                          {field.required && !isReadOnly && <span className="text-red-500">*</span>}
                        </label>

                        {field.type === 'text' && (
                          <input
                            type="text"
                            required={field.required}
                            disabled={isReadOnly}
                            value={value}
                            onChange={(e) => handleInputChange(field.id, e.target.value)}
                            placeholder={field.placeholder || 'Enter response text'}
                            className="w-full px-3 py-2 text-sm bg-slate-50 disabled:bg-slate-100/90 disabled:text-slate-800 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900"
                          />
                        )}

                        {field.type === 'number' && (
                          <input
                            type="number"
                            required={field.required}
                            disabled={isReadOnly}
                            value={value}
                            onChange={(e) => handleInputChange(field.id, e.target.value)}
                            placeholder={field.placeholder || '0'}
                            className="w-full sm:w-64 px-3 py-2 text-sm bg-slate-50 disabled:bg-slate-100/90 disabled:text-slate-800 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold text-slate-900"
                          />
                        )}

                        {field.type === 'select' && (
                          <select
                            required={field.required}
                            disabled={isReadOnly}
                            value={value}
                            onChange={(e) => handleInputChange(field.id, e.target.value)}
                            className="w-full sm:w-80 px-3 py-2 text-sm bg-slate-50 disabled:bg-slate-100/90 disabled:text-slate-800 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900"
                          >
                            <option value="">-- Select an option --</option>
                            {field.options?.map((opt, i) => (
                              <option key={i} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        )}

                        {field.type === 'textarea' && (
                          <textarea
                            rows={3}
                            required={field.required}
                            disabled={isReadOnly}
                            value={value}
                            onChange={(e) => handleInputChange(field.id, e.target.value)}
                            placeholder={field.placeholder || 'Provide detailed information...'}
                            className="w-full px-3 py-2 text-sm bg-slate-50 disabled:bg-slate-100/90 disabled:text-slate-800 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900"
                          />
                        )}

                        {field.type === 'date' && (
                          <input
                            type="date"
                            required={field.required}
                            disabled={isReadOnly}
                            value={value}
                            onChange={(e) => handleInputChange(field.id, e.target.value)}
                            className="w-full sm:w-64 px-3 py-2 text-sm bg-slate-50 disabled:bg-slate-100/90 disabled:text-slate-800 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900"
                          />
                        )}
                      </div>
                    );
                  })}

                  {/* Submission Action or Locked Indicator */}
                  <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <span className="text-xs text-slate-500">
                      Attending Officer: <strong className="text-slate-800">{officerName}</strong> ({hospital?.hospital_name})
                    </span>

                    {currentStatus === 'pending' ? (
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-md disabled:opacity-60 cursor-pointer"
                      >
                        <Send className="w-4 h-4" />
                        <span>{isSubmitting ? 'Submitting...' : 'Submit Official Response'}</span>
                      </button>
                    ) : currentStatus === 'submitted' ? (
                      <span className="px-4 py-2 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-300 flex items-center gap-1.5 self-start sm:self-auto">
                        <Lock className="w-3.5 h-3.5 text-emerald-700" />
                        Response Locked in Central Registry (Uneditable)
                      </span>
                    ) : (
                      <span className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto">
                        <Archive className="w-3.5 h-3.5 text-slate-500" />
                        Survey Expired / Closed
                      </span>
                    )}
                  </div>
                </form>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
