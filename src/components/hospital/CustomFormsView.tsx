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
  HelpCircle,
  Calendar,
  Sparkles,
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
    const [allForms, userResponses] = await Promise.all([
      dbService.getDynamicForms(true), // active forms
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

  const handleInputChange = (fieldId: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hospital || !selectedForm) return;

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

      setNotification(`Response for "${selectedForm.form_title}" successfully saved!`);
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

  const selectedForm = forms.find((f) => f.id === selectedFormId);
  const selectedFormResponse = responses.find((r) => r.form_id === selectedFormId);

  return (
    <div className="space-y-6">
      {/* Top Notification */}
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

      {/* Forms Hub Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold tracking-wider uppercase text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            District Administration Surveys
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            Custom Administrative Data Collection Forms
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Official questionnaires and compliance surveys published by the District Ayurvedic Officer Dehradun.
          </p>
        </div>
      </div>

      {forms.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
          <FileCode className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800">No Active Forms Published</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
            There are currently no additional administrative surveys requiring hospital response. Check back later.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Form Selector List */}
          <div className="lg:col-span-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
              Active Surveys ({forms.length})
            </h3>
            {forms.map((form) => {
              const hasSubmitted = responses.some((r) => r.form_id === form.id);
              const isSelected = form.id === selectedFormId;
              return (
                <div
                  key={form.id}
                  onClick={() => handleSelectForm(form.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50 border-emerald-500 shadow-sm ring-1 ring-emerald-500/20'
                      : 'bg-white hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-bold text-slate-800 line-clamp-1">
                      {form.form_title}
                    </span>
                    {hasSubmitted ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        <Check className="w-3 h-3" />
                        Submitted
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                        <Clock className="w-3 h-3" />
                        Pending
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2">{form.description}</p>
                  <div className="text-[10px] text-slate-400 mt-2">
                    {form.form_fields.length} question fields • Published{' '}
                    {new Date(form.created_at).toLocaleDateString('en-IN')}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Form Rendering & Submissions */}
          <div className="lg:col-span-8">
            {selectedForm ? (
              <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm">
                <div className="border-b border-slate-200 pb-4 mb-6">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h3 className="text-xl font-bold text-slate-900">{selectedForm.form_title}</h3>
                    {selectedFormResponse && (
                      <span className="text-xs text-emerald-800 bg-emerald-100 font-semibold px-2.5 py-1 rounded-full border border-emerald-300">
                        Submitted on {new Date(selectedFormResponse.submitted_at).toLocaleDateString('en-IN')}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{selectedForm.description}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {selectedForm.form_fields.map((field, idx) => {
                    const value = formData[field.id] ?? '';
                    return (
                      <div key={field.id} className="space-y-1.5">
                        <label className="block text-sm font-semibold text-slate-800">
                          {idx + 1}. {field.label}{' '}
                          {field.required && <span className="text-red-500">*</span>}
                        </label>

                        {field.type === 'text' && (
                          <input
                            type="text"
                            required={field.required}
                            value={value}
                            onChange={(e) => handleInputChange(field.id, e.target.value)}
                            placeholder={field.placeholder || 'Enter response text'}
                            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900"
                          />
                        )}

                        {field.type === 'number' && (
                          <input
                            type="number"
                            required={field.required}
                            value={value}
                            onChange={(e) => handleInputChange(field.id, e.target.value)}
                            placeholder={field.placeholder || '0'}
                            className="w-full sm:w-64 px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold text-slate-900"
                          />
                        )}

                        {field.type === 'select' && (
                          <select
                            required={field.required}
                            value={value}
                            onChange={(e) => handleInputChange(field.id, e.target.value)}
                            className="w-full sm:w-80 px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900"
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
                            value={value}
                            onChange={(e) => handleInputChange(field.id, e.target.value)}
                            placeholder={field.placeholder || 'Provide detailed information...'}
                            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900"
                          />
                        )}

                        {field.type === 'date' && (
                          <input
                            type="date"
                            required={field.required}
                            value={value}
                            onChange={(e) => handleInputChange(field.id, e.target.value)}
                            className="w-full sm:w-64 px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900"
                          />
                        )}
                      </div>
                    );
                  })}

                  <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      Submitting as: <strong className="text-slate-800">{officerName}</strong>
                    </span>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-md disabled:opacity-60 cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      <span>{isSubmitting ? 'Submitting...' : selectedFormResponse ? 'Update Form Response' : 'Submit Form'}</span>
                    </button>
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
