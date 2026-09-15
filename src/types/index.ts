export type MedicineCategory = 'Classical Medicine' | 'Patent Medicine';

export interface HospitalMaster {
  id: string;
  hospital_name: string;
  assigned_password: string;
  block_name: string;
  category?: string;
  uid?: string;
  contact_phone?: string;
  created_at?: string;
}


export interface MedicineItem {
  id: string;
  category: MedicineCategory;
  medicine_name: string;
  pack_size: string;
  uploaded_at?: string;
}

export interface DemographicMetric {
  male: number;
  female: number;
  other: number;
  total: number;
}

export interface CampBeneficiariesMetric {
  male: number;
  female: number;
  other: number;
  children: number;
  total: number;
}

export interface LeviMetric {
  opd_levi: number;
  panchakarma_levi: number;
  medical_levi: number;
  other_levi: number;
  total_levi: number;
}

export interface DiseaseMorbidityEntry {
  sNo: number;
  hindi: string;
  english: string;
  new_cases: number;
  old_cases: number;
  total_cases: number;
}

export interface OtherMprMetrics {
  // Revised Comprehensive MPR Fields
  new_opd?: DemographicMetric;
  old_opd?: DemographicMetric;
  ipd_patients?: DemographicMetric;
  panchakarma_patients?: DemographicMetric;
  levi?: LeviMetric;
  mobile_seeded?: number;
  aadhaar_seeded?: number;
  patients_outside_dehradun?: number;
  patients_foreigners?: number;
  total_camps?: number;
  camp_beneficiaries?: CampBeneficiariesMetric;
  yoga_beneficiaries?: DemographicMetric;
  disease_details?: Record<string, DiseaseMorbidityEntry>;

  // Legacy backwards-compatible fields
  opd_male?: number;
  opd_female?: number;
  opd_child?: number;
  ipd_admissions?: number;
  bed_occupancy_days?: number;
  yoga_participants?: number;
  ayush_camps_conducted?: number;
  snehan_swedan?: number;
  basti_karma?: number;
  nasya_karma?: number;
  shirodhara?: number;
  unani_cupping_regimenal?: number;
  stock_shortage_notes?: string;
  remarks?: string;
}

export interface MonthlyProgressReport {
  id: string;
  hospital_id: string;
  hospital_name: string;
  month_year: string; // e.g. "2026-08"
  opd_count: number;
  panchakarma_count: number;
  other_metrics: OtherMprMetrics;
  officer_name: string;
  submitted_at: string;
}

export type FormFieldType = 'text' | 'number' | 'select' | 'textarea' | 'date';

export interface DynamicFormField {
  id: string;
  label: string;
  type: FormFieldType;
  options?: string[];
  required: boolean;
  placeholder?: string;
}

export interface DynamicForm {
  id: string;
  form_title: string;
  description: string;
  form_fields: DynamicFormField[];
  is_active: boolean;
  created_at: string;
}

export interface DynamicFormResponse {
  id: string;
  form_id: string;
  hospital_id: string;
  hospital_name: string;
  response_data: Record<string, any>;
  officer_name: string;
  submitted_at: string;
}

export interface MedicineDriveItem {
  id: string;
  medicine_name: string;
  pack_size: string;
  category: MedicineCategory;
}

export interface MedicineDemandDrive {
  id: string;
  title: string; // e.g. "Patent Medicine List 1"
  category: 'Patent Medicine' | 'Classical Medicine' | 'All';
  batch_year: string; // e.g. "2026-2027"
  due_date: string; // e.g. "2026-09-30"
  is_active: boolean; // active for hospital submissions
  description?: string;
  medicines: MedicineDriveItem[];
  created_at: string;
}

export interface MedicineDriveSubmission {
  id: string;
  drive_id: string;
  drive_title: string;
  hospital_id: string;
  hospital_name: string;
  officer_name: string;
  quantities: Record<string, number>; // medicine_id -> quantity
  total_varieties: number;
  total_units: number;
  submitted_at: string;
  hospital_uid?: string;
}

export interface MedicineDemandResponse {
  id: string;
  drive_id?: string;
  hospital_id: string;
  hospital_name: string;
  medicine_id: string;
  medicine_name: string;
  category: MedicineCategory;
  pack_size: string;
  requested_quantity: number;
  officer_name: string;
  status: 'Submitted';
  batch_year: string;
  submitted_at: string;
}

export interface ActivityLog {
  id: string;
  action: string;
  details: string;
  user: string;
  timestamp: string;
  category: 'medicine' | 'mpr' | 'form' | 'admin';
}

export interface AuthSession {
  role: 'admin' | 'hospital';
  hospital?: HospitalMaster;
  officerName?: string;
}
