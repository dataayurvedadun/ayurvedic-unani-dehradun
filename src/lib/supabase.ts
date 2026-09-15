import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  HospitalMaster,
  MedicineItem,
  MonthlyProgressReport,
  DynamicForm,
  DynamicFormResponse,
  MedicineDemandResponse,
  ActivityLog,
} from '../types';
import {
  INITIAL_HOSPITALS,
  INITIAL_MEDICINES,
  INITIAL_DYNAMIC_FORMS,
  INITIAL_MPR_REPORTS,
  INITIAL_DEMANDS,
  INITIAL_ACTIVITY_LOGS,
} from './seedData';

// Supabase Environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== 'https://your-project.supabase.co' &&
    supabaseAnonKey !== 'your-anon-key'
  );
};

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Local Storage Keys for offline / demo mode fallback
const STORAGE_KEYS = {
  HOSPITALS: 'ayush_ddn_hospitals_v3',

  MEDICINES: 'ayush_ddn_medicines_v1',
  FORMS: 'ayush_ddn_forms_v1',
  FORM_RESPONSES: 'ayush_ddn_form_responses_v1',
  MPR: 'ayush_ddn_mpr_v1',
  DEMANDS: 'ayush_ddn_demands_v1',
  LOGS: 'ayush_ddn_logs_v1',
};

// Local storage helpers
function getLocal<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key);
    if (!data) return fallback;
    return JSON.parse(data) as T;
  } catch {
    return fallback;
  }
}

function setLocal<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error('Error saving to localStorage', err);
  }
}

// Database Service with Supabase first, graceful fallback to local storage
export const dbService = {
  isConfigured(): boolean {
    return isSupabaseConfigured();
  },

  async pingDatabase(): Promise<{ success: boolean; message: string; latency_ms: number }> {
    const start = Date.now();
    if (!supabase) {
      return {
        success: true,
        message: 'Local fallback active (configure VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY for live PostgreSQL connection)',
        latency_ms: Date.now() - start,
      };
    }
    try {
      const { count, error } = await supabase
        .from('hospitals_master')
        .select('*', { count: 'exact', head: true })
        .like('contact_phone', 'DDN%');
      if (error) throw error;
      return {
        success: true,
        message: `Connected to Supabase PostgreSQL. Registered facilities: ${count ?? 0}`,
        latency_ms: Date.now() - start,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Supabase ping failed',
        latency_ms: Date.now() - start,
      };
    }
  },

  // ==================== HOSPITALS ====================
  async getHospitals(): Promise<HospitalMaster[]> {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('hospitals_master')
          .select('*')
          .like('contact_phone', 'DDN%')
          .order('contact_phone', { ascending: true });
        if (!error && data && data.length > 0) {
          return data.map((h: any) => ({
            ...h,
            uid: h.contact_phone || h.uid || h.id,
            category: h.category || h.block_name || 'State Ayurvedic Dispensary',
          })) as HospitalMaster[];
        }
      } catch (err) {
        console.warn('Failed to fetch hospitals from Supabase, using local data', err);
      }
    }
    return getLocal<HospitalMaster[]>(STORAGE_KEYS.HOSPITALS, INITIAL_HOSPITALS);
  },


  async addHospital(hospital: Omit<HospitalMaster, 'id'>): Promise<HospitalMaster> {
    const newHospital: HospitalMaster = {
      ...hospital,
      id: 'hosp-' + Math.random().toString(36).substring(2, 9),
      created_at: new Date().toISOString(),
    };

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('hospitals_master')
          .insert([newHospital])
          .select()
          .single();
        if (!error && data) return data as HospitalMaster;
      } catch (err) {
        console.warn('Supabase addHospital failed, falling back to local', err);
      }
    }

    const current = await this.getHospitals();
    const updated = [...current, newHospital];
    setLocal(STORAGE_KEYS.HOSPITALS, updated);
    return newHospital;
  },

  async updateHospitalPassword(id: string, newPassword: string): Promise<boolean> {
    if (supabase) {
      try {
        const { error } = await supabase
          .from('hospitals_master')
          .update({ assigned_password: newPassword })
          .eq('id', id);
        if (!error) return true;
      } catch (err) {
        console.warn('Supabase update password failed', err);
      }
    }
    const current = await this.getHospitals();
    const updated = current.map((h) =>
      h.id === id ? { ...h, assigned_password: newPassword } : h
    );
    setLocal(STORAGE_KEYS.HOSPITALS, updated);
    return true;
  },

  // ==================== MEDICINES CATALOG ====================
  async getMedicines(): Promise<MedicineItem[]> {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('admin_uploads')
          .select('*')
          .order('medicine_name', { ascending: true });
        if (!error && data && data.length > 0) return data as MedicineItem[];
      } catch (err) {
        console.warn('Failed to fetch medicines from Supabase', err);
      }
    }
    return getLocal<MedicineItem[]>(STORAGE_KEYS.MEDICINES, INITIAL_MEDICINES);
  },

  async addMedicine(medicine: Omit<MedicineItem, 'id'>): Promise<MedicineItem> {
    const newMed: MedicineItem = {
      ...medicine,
      id: 'med-' + Math.random().toString(36).substring(2, 9),
      uploaded_at: new Date().toISOString(),
    };

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('admin_uploads')
          .insert([newMed])
          .select()
          .single();
        if (!error && data) return data as MedicineItem;
      } catch (err) {
        console.warn('Supabase addMedicine failed', err);
      }
    }

    const current = await this.getMedicines();
    const updated = [...current, newMed];
    setLocal(STORAGE_KEYS.MEDICINES, updated);
    return newMed;
  },

  async deleteMedicine(id: string): Promise<boolean> {
    if (supabase) {
      try {
        await supabase.from('admin_uploads').delete().eq('id', id);
      } catch (err) {
        console.warn('Supabase deleteMedicine failed', err);
      }
    }
    const current = await this.getMedicines();
    const updated = current.filter((m) => m.id !== id);
    setLocal(STORAGE_KEYS.MEDICINES, updated);
    return true;
  },

  // ==================== MEDICINE DEMANDS ====================
  async getDemands(hospitalId?: string): Promise<MedicineDemandResponse[]> {
    if (supabase) {
      try {
        let query = supabase.from('medicine_demands_responses').select('*');
        if (hospitalId) {
          query = query.eq('hospital_id', hospitalId);
        }
        const { data, error } = await query;
        if (!error && data && data.length > 0) return data as MedicineDemandResponse[];
      } catch (err) {
        console.warn('Supabase getDemands failed', err);
      }
    }
    const all = getLocal<MedicineDemandResponse[]>(STORAGE_KEYS.DEMANDS, INITIAL_DEMANDS);
    return hospitalId ? all.filter((d) => d.hospital_id === hospitalId) : all;
  },

  async submitDemands(records: MedicineDemandResponse[]): Promise<boolean> {
    if (supabase) {
      try {
        const { error } = await supabase
          .from('medicine_demands_responses')
          .upsert(records, { onConflict: 'hospital_id,medicine_id,batch_year' });
        if (!error) return true;
      } catch (err) {
        console.warn('Supabase submitDemands failed', err);
      }
    }

    const current = await this.getDemands();
    // Remove existing matching hospital & batch year to replace with new set
    const sampleHospId = records[0]?.hospital_id;
    const sampleBatch = records[0]?.batch_year;
    const filtered = current.filter(
      (d) => !(d.hospital_id === sampleHospId && d.batch_year === sampleBatch)
    );
    const updated = [...filtered, ...records];
    setLocal(STORAGE_KEYS.DEMANDS, updated);
    return true;
  },

  // ==================== MONTHLY PROGRESS REPORTS (MPR) ====================
  async getMprReports(hospitalId?: string, monthYear?: string): Promise<MonthlyProgressReport[]> {
    if (supabase) {
      try {
        let query = supabase.from('monthly_progress_reports').select('*');
        if (hospitalId) query = query.eq('hospital_id', hospitalId);
        if (monthYear) query = query.eq('month_year', monthYear);
        const { data, error } = await query.order('submitted_at', { ascending: false });
        if (!error && data && data.length > 0) return data as MonthlyProgressReport[];
      } catch (err) {
        console.warn('Supabase getMprReports failed', err);
      }
    }
    let all = getLocal<MonthlyProgressReport[]>(STORAGE_KEYS.MPR, INITIAL_MPR_REPORTS);
    if (hospitalId) all = all.filter((r) => r.hospital_id === hospitalId);
    if (monthYear) all = all.filter((r) => r.month_year === monthYear);
    return all;
  },

  async submitMpr(report: Omit<MonthlyProgressReport, 'id'>): Promise<MonthlyProgressReport> {
    const newReport: MonthlyProgressReport = {
      ...report,
      id: 'mpr-' + Math.random().toString(36).substring(2, 9),
    };

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('monthly_progress_reports')
          .upsert([newReport], { onConflict: 'hospital_id,month_year' })
          .select()
          .single();
        if (!error && data) return data as MonthlyProgressReport;
      } catch (err) {
        console.warn('Supabase submitMpr failed', err);
      }
    }

    const current = await this.getMprReports();
    const filtered = current.filter(
      (r) => !(r.hospital_id === report.hospital_id && r.month_year === report.month_year)
    );
    const updated = [newReport, ...filtered];
    setLocal(STORAGE_KEYS.MPR, updated);
    return newReport;
  },

  // ==================== DYNAMIC FORMS ====================
  async getDynamicForms(activeOnly: boolean = false): Promise<DynamicForm[]> {
    if (supabase) {
      try {
        let query = supabase.from('dynamic_forms').select('*');
        if (activeOnly) query = query.eq('is_active', true);
        const { data, error } = await query.order('created_at', { ascending: false });
        if (!error && data && data.length > 0) return data as DynamicForm[];
      } catch (err) {
        console.warn('Supabase getDynamicForms failed', err);
      }
    }
    const forms = getLocal<DynamicForm[]>(STORAGE_KEYS.FORMS, INITIAL_DYNAMIC_FORMS);
    return activeOnly ? forms.filter((f) => f.is_active) : forms;
  },

  async createDynamicForm(form: Omit<DynamicForm, 'id' | 'created_at'>): Promise<DynamicForm> {
    const newForm: DynamicForm = {
      ...form,
      id: 'form-' + Math.random().toString(36).substring(2, 9),
      created_at: new Date().toISOString(),
    };

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('dynamic_forms')
          .insert([newForm])
          .select()
          .single();
        if (!error && data) return data as DynamicForm;
      } catch (err) {
        console.warn('Supabase createDynamicForm failed', err);
      }
    }

    const current = await this.getDynamicForms();
    const updated = [newForm, ...current];
    setLocal(STORAGE_KEYS.FORMS, updated);
    return newForm;
  },

  async toggleDynamicFormStatus(id: string, isActive: boolean): Promise<boolean> {
    if (supabase) {
      try {
        await supabase.from('dynamic_forms').update({ is_active: isActive }).eq('id', id);
      } catch (err) {
        console.warn('Supabase toggleDynamicFormStatus failed', err);
      }
    }
    const current = await this.getDynamicForms();
    const updated = current.map((f) => (f.id === id ? { ...f, is_active: isActive } : f));
    setLocal(STORAGE_KEYS.FORMS, updated);
    return true;
  },

  async getDynamicFormResponses(formId?: string, hospitalId?: string): Promise<DynamicFormResponse[]> {
    if (supabase) {
      try {
        let query = supabase.from('dynamic_form_responses').select('*');
        if (formId) query = query.eq('form_id', formId);
        if (hospitalId) query = query.eq('hospital_id', hospitalId);
        const { data, error } = await query.order('submitted_at', { ascending: false });
        if (!error && data && data.length > 0) return data as DynamicFormResponse[];
      } catch (err) {
        console.warn('Supabase getDynamicFormResponses failed', err);
      }
    }
    let all = getLocal<DynamicFormResponse[]>(STORAGE_KEYS.FORM_RESPONSES, []);
    if (formId) all = all.filter((r) => r.form_id === formId);
    if (hospitalId) all = all.filter((r) => r.hospital_id === hospitalId);
    return all;
  },

  async submitDynamicFormResponse(response: Omit<DynamicFormResponse, 'id'>): Promise<DynamicFormResponse> {
    const newResponse: DynamicFormResponse = {
      ...response,
      id: 'resp-' + Math.random().toString(36).substring(2, 9),
    };

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('dynamic_form_responses')
          .insert([newResponse])
          .select()
          .single();
        if (!error && data) return data as DynamicFormResponse;
      } catch (err) {
        console.warn('Supabase submitDynamicFormResponse failed', err);
      }
    }

    const current = await this.getDynamicFormResponses();
    const filtered = current.filter(
      (r) => !(r.form_id === response.form_id && r.hospital_id === response.hospital_id)
    );
    const updated = [newResponse, ...filtered];
    setLocal(STORAGE_KEYS.FORM_RESPONSES, updated);
    return newResponse;
  },

  // ==================== AUDIT & ACTIVITY LOGS ====================
  async getActivityLogs(): Promise<ActivityLog[]> {
    return getLocal<ActivityLog[]>(STORAGE_KEYS.LOGS, INITIAL_ACTIVITY_LOGS);
  },

  async addActivityLog(log: Omit<ActivityLog, 'id'>): Promise<void> {
    const newLog: ActivityLog = {
      ...log,
      id: 'log-' + Math.random().toString(36).substring(2, 9),
    };
    const current = await this.getActivityLogs();
    const updated = [newLog, ...current].slice(0, 100); // keep last 100
    setLocal(STORAGE_KEYS.LOGS, updated);
  },
};
