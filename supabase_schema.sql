-- ==============================================================================
-- AYURVEDIC UNANI SERVICES, DISTRICT DEHRADUN
-- Database Project Identifier: ayurvedic_unani_dehradun
-- Target Database: Supabase PostgreSQL (Free Tier Compatible)
-- ==============================================================================

-- 1. Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 2. TABLE DEFINITIONS
-- ==============================================================================

-- 2.1 Hospitals Master Table
CREATE TABLE IF NOT EXISTS hospitals_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_name TEXT NOT NULL UNIQUE,
    assigned_password TEXT NOT NULL DEFAULT 'ayush@123',
    block_name TEXT DEFAULT 'Dehradun',
    contact_phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.2 Admin Uploads / Medicine Catalog Table
CREATE TABLE IF NOT EXISTS admin_uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category TEXT NOT NULL CHECK (category IN ('Classical Medicine', 'Patent Medicine')),
    medicine_name TEXT NOT NULL,
    pack_size TEXT NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.3 Monthly Progress Reports (MPR) Table
CREATE TABLE IF NOT EXISTS monthly_progress_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID REFERENCES hospitals_master(id) ON DELETE CASCADE,
    hospital_name TEXT NOT NULL,
    month_year TEXT NOT NULL, -- Format: YYYY-MM e.g. "2026-08"
    opd_count INTEGER NOT NULL DEFAULT 0,
    panchakarma_count INTEGER NOT NULL DEFAULT 0,
    other_metrics JSONB DEFAULT '{}'::jsonb, -- opd_male, opd_female, opd_child, ipd_count, yoga_sessions, camps_held, notes
    officer_name TEXT NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_hospital_month UNIQUE (hospital_id, month_year)
);

-- 2.4 Dynamic Custom Forms Table
CREATE TABLE IF NOT EXISTS dynamic_forms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_title TEXT NOT NULL,
    description TEXT,
    form_fields JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of { id, label, type, options, required, placeholder }
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.5 Dynamic Form Responses Table
CREATE TABLE IF NOT EXISTS dynamic_form_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_id UUID REFERENCES dynamic_forms(id) ON DELETE CASCADE,
    hospital_id UUID REFERENCES hospitals_master(id) ON DELETE CASCADE,
    hospital_name TEXT NOT NULL,
    response_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    officer_name TEXT NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.6 Medicine Demands Responses Table
CREATE TABLE IF NOT EXISTS medicine_demands_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID REFERENCES hospitals_master(id) ON DELETE CASCADE,
    hospital_name TEXT NOT NULL,
    medicine_id UUID REFERENCES admin_uploads(id) ON DELETE CASCADE,
    medicine_name TEXT NOT NULL,
    category TEXT NOT NULL,
    pack_size TEXT NOT NULL,
    requested_quantity INTEGER NOT NULL DEFAULT 0,
    officer_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Submitted',
    batch_year TEXT DEFAULT '2026-2027',
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_hospital_med_batch UNIQUE (hospital_id, medicine_id, batch_year)
);

-- ==============================================================================
-- 3. INDEXES FOR HIGH QUERY EFFICIENCY
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_mpr_hospital_month ON monthly_progress_reports(hospital_id, month_year);
CREATE INDEX IF NOT EXISTS idx_med_demand_hospital ON medicine_demands_responses(hospital_id);
CREATE INDEX IF NOT EXISTS idx_med_demand_medicine ON medicine_demands_responses(medicine_id);
CREATE INDEX IF NOT EXISTS idx_dyn_responses_form ON dynamic_form_responses(form_id, hospital_id);

-- ==============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE hospitals_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_progress_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE dynamic_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE dynamic_form_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicine_demands_responses ENABLE ROW LEVEL SECURITY;

-- Allow read & write access for application operations
CREATE POLICY "Allow public read on hospitals_master" ON hospitals_master FOR SELECT USING (true);
CREATE POLICY "Allow public insert on hospitals_master" ON hospitals_master FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on hospitals_master" ON hospitals_master FOR UPDATE USING (true);

CREATE POLICY "Allow public all on admin_uploads" ON admin_uploads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all on monthly_progress_reports" ON monthly_progress_reports FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all on dynamic_forms" ON dynamic_forms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all on dynamic_form_responses" ON dynamic_form_responses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all on medicine_demands_responses" ON medicine_demands_responses FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- 5. INITIAL SEED DATA (Dehradun District Hospitals & Essential Medicines)
-- ==============================================================================

-- Seed Hospitals across Dehradun, Rishikesh, Chakrata, Vikasnagar, Doiwala, Mussoorie, Kalsi, Raipur, Sahaspur
INSERT INTO hospitals_master (hospital_name, assigned_password, block_name) VALUES
('District Ayurvedic Hospital, Tilak Road, Dehradun', 'ayush@123', 'Dehradun Sadar'),
('Government Ayurvedic Hospital, Rishikesh', 'ayush@123', 'Rishikesh'),
('Government Ayurvedic Dispensary, Vikasnagar', 'ayush@123', 'Vikasnagar'),
('Government Ayurvedic Hospital, Chakrata', 'ayush@123', 'Chakrata'),
('Government Ayurvedic Dispensary, Doiwala', 'ayush@123', 'Doiwala'),
('Government Ayurvedic Dispensary, Sahaspur', 'ayush@123', 'Sahaspur'),
('Government Ayurvedic Dispensary, Kalsi', 'ayush@123', 'Kalsi'),
('Government Ayurvedic Dispensary, Raipur', 'ayush@123', 'Raipur'),
('Government Ayurvedic Dispensary, Mussoorie', 'ayush@123', 'Mussoorie'),
('Government Ayurvedic Dispensary, Premnagar', 'ayush@123', 'Sahaspur'),
('Government Unani Dispensary, Dehradun City', 'ayush@123', 'Dehradun Sadar'),
('Government Ayurvedic Dispensary, Tyuni', 'ayush@123', 'Chakrata'),
('Government Ayurvedic Dispensary, Selaqui', 'ayush@123', 'Sahaspur'),
('Government Ayurvedic Dispensary, Clement Town', 'ayush@123', 'Dehradun Sadar'),
('Government Ayurvedic Dispensary, Bhogpur', 'ayush@123', 'Doiwala')
ON CONFLICT (hospital_name) DO UPDATE SET assigned_password = 'ayush@123';


-- Seed Classical Medicines
INSERT INTO admin_uploads (category, medicine_name, pack_size) VALUES
('Classical Medicine', 'Triphala Churna', '100 gm'),
('Classical Medicine', 'Sitopaladi Churna', '60 gm'),
('Classical Medicine', 'Ashwagandharishta', '450 ml'),
('Classical Medicine', 'Draksharishta', '450 ml'),
('Classical Medicine', 'Amritarishta', '450 ml'),
('Classical Medicine', 'Dashmularishta', '450 ml'),
('Classical Medicine', 'Chyawanprash Awaleha', '500 gm'),
('Classical Medicine', 'Khadiradi Vati', '40 tab'),
('Classical Medicine', 'Sanjivani Vati', '40 tab'),
('Classical Medicine', 'Arogyavardhini Vati', '40 tab'),
('Classical Medicine', 'Chandraprabha Vati', '40 tab'),
('Classical Medicine', 'Yograj Guggulu', '40 tab'),
('Classical Medicine', 'Kaishore Guggulu', '40 tab'),
('Classical Medicine', 'Mahanarayan Taila', '100 ml'),
('Classical Medicine', 'Pinda Taila', '100 ml'),
('Classical Medicine', 'Kasis Bhasma', '10 gm'),
('Classical Medicine', 'Shankh Bhasma', '10 gm'),
('Classical Medicine', 'Hingwashtak Churna', '100 gm'),
('Classical Medicine', 'Avipattikar Churna', '100 gm'),
('Classical Medicine', 'Mahasudarshan Churna', '100 gm')
ON CONFLICT DO NOTHING;

-- Seed Patent Medicines & Unani Formulations
INSERT INTO admin_uploads (category, medicine_name, pack_size) VALUES
('Patent Medicine', 'Liver Protective Syrup (Hepato-Tonic)', '200 ml'),
('Patent Medicine', 'Joint Pain Relief Liniment/Oil', '60 ml'),
('Patent Medicine', 'Herbal Cough Syrup (Kas-Shamak)', '100 ml'),
('Patent Medicine', 'Antacid & Digestive Syrup', '200 ml'),
('Patent Medicine', 'Immunity Booster Drops', '30 ml'),
('Patent Medicine', 'Anti-Diabetic Herbal Tablets', '60 tab'),
('Patent Medicine', 'Anti-Hypertensive Capsules', '30 cap'),
('Patent Medicine', 'Herbal Iron & Calcium Tonic', '200 ml'),
('Patent Medicine', 'Memory & Neuro-Vitalizer Syrup', '200 ml'),
('Patent Medicine', 'Skin Allergy Ointment', '30 gm'),
('Patent Medicine', 'Majun Suranjan (Unani)', '125 gm'),
('Patent Medicine', 'Sharbat Bazoori Motadil (Unani)', '200 ml'),
('Patent Medicine', 'Roghan Badam Shirin (Unani)', '50 ml'),
('Patent Medicine', 'Khamira Abresham Hakim Arshad Wala', '75 gm')
ON CONFLICT DO NOTHING;

-- Seed Sample Dynamic Admin Form
INSERT INTO dynamic_forms (form_title, description, form_fields, is_active) VALUES
(
    'Monsoon Disease Preparedness & Stock Audit 2026',
    'Special survey by District Ayurvedic Officer Dehradun regarding availability of ORS, emergency fever medicines, water purification, and vector-borne illness cases.',
    '[
        {"id": "emergency_stock_status", "label": "Status of Emergency Fever & Diarrhea Medicines", "type": "select", "options": ["Adequate (>30 days)", "Moderate (15-30 days)", "Critical Shortage (<15 days)"], "required": true},
        {"id": "water_purification_tablets", "label": "Halazone / Chlorine Tablets Available (Count)", "type": "number", "required": true, "placeholder": "e.g. 500"},
        {"id": "dengue_chikungunya_cases", "label": "Total Suspected Vector-Borne Cases Treated This Month", "type": "number", "required": true, "placeholder": "0"},
        {"id": "panchakarma_equipment_operational", "label": "Are Panchakarma Droni & Steam Chambers Fully Operational?", "type": "select", "options": ["Yes - Fully Functional", "Partially Functional", "Requires Maintenance", "Not Installed"], "required": true},
        {"id": "inspection_remarks", "label": "Infrastructure Remarks / Urgent Requirements", "type": "textarea", "required": false, "placeholder": "Mention roof seepage, electricity backup, or staff shortages if any..."}
    ]'::jsonb,
    true
)
ON CONFLICT DO NOTHING;
