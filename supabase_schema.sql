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

-- Seed All 87 Official Dehradun District Ayurvedic & Unani Health Facilities
INSERT INTO hospitals_master (hospital_name, assigned_password, block_name, contact_phone) VALUES
('Sahastradhara', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN001'),
('Ambiwala', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN002'),
('Jassowala', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN003'),
('Horawala', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN004'),
('Jisau', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN005'),
('Jollygrant', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN006'),
('Kyara', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN007'),
('Niranjanpur', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN008'),
('Bullawala', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN009'),
('Itharna', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN010'),
('Kota', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN011'),
('Kerad', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN012'),
('Langha', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN013'),
('Nagthat', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN014'),
('Bhatta', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN015'),
('Maindal', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN016'),
('Kunain', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN017'),
('Majri Mafi', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN018'),
('Bhandaribagh', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN019'),
('Vidholi', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN020'),
('Selaqui', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN021'),
('Rajawala', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN022'),
('Bhaniyawala', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN023'),
('Majri Grant', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN024'),
('Majra', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN025'),
('Nathuwawala', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN026'),
('Dholas', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN027'),
('Sediya', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN028'),
('Deu', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN029'),
('Koptimarlu', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN030'),
('Dharampur', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN031'),
('Chidiyamandi', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN032'),
('Kuwasi', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN033'),
('Gujrada', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN034'),
('Rishikesh', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN035'),
('Kimadiplat', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN036'),
('Lakhamandal', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN037'),
('Barothan', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN038'),
('Matiyawa', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN039'),
('Chilhard', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN040'),
('Miyawala', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN041'),
('Jhajra', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN042'),
('Herbertpur', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN043'),
('Sachivalay', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN044'),
('Rajbhawan', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN045'),
('Bhauwala', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN046'),
('Mothorowala', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN047'),
('Kandoli', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN048'),
('Gangro', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN049'),
('Nagau', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN050'),
('Kwanu', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN051'),
('Darmigard', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN052'),
('Vidhansabha', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN053'),
('DH Male hospital', 'ayush@123', 'District Hospital', 'DDN054'),
('DH Female hospital', 'ayush@123', 'District Hospital', 'DDN055'),
('Barotha', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN056'),
('Bhataad', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN057'),
('Pingiri', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN058'),
('Kotikansar', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN059'),
('Manthat', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN060'),
('Dasau', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN061'),
('Bulhad', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN062'),
('Koti Sahaspur', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN063'),
('Khabau', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN064'),
('Nahikala', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN065'),
('Sarona', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN066'),
('Thaina', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN067'),
('Brimau', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN068'),
('Kamla', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN069'),
('Mairawana', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN070'),
('Katapathar', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN071'),
('Hatal', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN072'),
('Bhagwantpur', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN073'),
('Balawala', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN074'),
('Paschimwala', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN075'),
('Nayagaon', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN076'),
('Nehrugram', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN077'),
('Mehuwala', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN078'),
('Chiderwala', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN079'),
('Dhoodli', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN080'),
('Doiwala', 'ayush@123', 'CHC / PHC / Ayush Wing', 'DDN081'),
('Sahiya', 'ayush@123', 'CHC / PHC / Ayush Wing', 'DDN082'),
('Musoorie', 'ayush@123', 'CHC / PHC / Ayush Wing', 'DDN083'),
('Kalsi', 'ayush@123', 'CHC / PHC / Ayush Wing', 'DDN084'),
('Rudrapur', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN085'),
('Thano', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN086'),
('Raiwala', 'ayush@123', 'State Ayurvedic Dispensary', 'DDN087')
ON CONFLICT (hospital_name) DO UPDATE SET assigned_password = EXCLUDED.assigned_password, block_name = EXCLUDED.block_name, contact_phone = EXCLUDED.contact_phone;


-- Seed Official Patent Medicines List 1 (84 Formulations)
INSERT INTO admin_uploads (category, medicine_name, pack_size) VALUES
('Patent Medicine', 'Amavatari cap', '40 cap'),
('Patent Medicine', 'Colokam Tab', '20 tab'),
('Patent Medicine', 'Myelotone Tab.', '40 tab'),
('Patent Medicine', 'Throat c Tab.', '40 tab'),
('Patent Medicine', 'Mellit Tab', '40 tab'),
('Patent Medicine', 'Madhumehari Churna', '100 Gm'),
('Patent Medicine', 'Tensonil Tab', '40 Tab'),
('Patent Medicine', 'Rhumavin cap.', '40 cap'),
('Patent Medicine', 'Spasonil Tab.', '40 tab'),
('Patent Medicine', 'Medha Tab', '40 tab'),
('Patent Medicine', 'Uricare Tab.', '40 tab'),
('Patent Medicine', 'Uisacid Tab.', '40 tab'),
('Patent Medicine', 'Dysentil Plus Tab', '20 Tab'),
('Patent Medicine', 'Rheumalin Tab.', '40 tab'),
('Patent Medicine', 'Hrideshu Tab.', '40 tab'),
('Patent Medicine', 'Remedin Tab.', '40 tab'),
('Patent Medicine', 'Karansudha Drops', '10 ML'),
('Patent Medicine', 'Prostol Tab.', '40 tab'),
('Patent Medicine', 'Shilapex Tab.', '40 tab'),
('Patent Medicine', 'Tenz off cap.', '40 cap'),
('Patent Medicine', 'Realzyme Tab', '40 cap'),
('Patent Medicine', 'Arshonyl Tab', '40 Tab'),
('Patent Medicine', 'Feritone Syp.', '100 ML'),
('Patent Medicine', 'Rheumo Oil', '20 ML'),
('Patent Medicine', 'Kofnil Syp.', '100 ML'),
('Patent Medicine', 'Kofnil SF Syp.', '100 ML'),
('Patent Medicine', 'Krimihar Syp', '100 ml'),
('Patent Medicine', 'Crush Tab', '40 cap'),
('Patent Medicine', 'Fetone Syp.', '100 ML'),
('Patent Medicine', 'Pure-Up-Syp.', '100 ML'),
('Patent Medicine', 'Vitamrit SF Syp.', '100 ML'),
('Patent Medicine', 'Rheumo Pravhi Syp.', '100 ML'),
('Patent Medicine', 'Uritab Tab.', '40 Tab'),
('Patent Medicine', 'Shwasi Avaleha', '100 GM'),
('Patent Medicine', 'Brainton Syp.', '100 ML'),
('Patent Medicine', 'Rechak Syp.', '100 ML'),
('Patent Medicine', 'Crush-RT- SF-SYP.', '100 ML'),
('Patent Medicine', 'G-Amrita-Cap', '40 Cap.'),
('Patent Medicine', 'LivoSyp Tab', '40 Cap.'),
('Patent Medicine', 'Dysen-Cure Syp', '100 ML'),
('Patent Medicine', 'Granthika Cap', '40 cap'),
('Patent Medicine', 'Baijnath Arshoghan Syp.', '100 ml'),
('Patent Medicine', 'Asthi Sanhari Cap', '40 tab'),
('Patent Medicine', 'Shigru Plus Tab', '40 TAb'),
('Patent Medicine', 'Arjun-Plus Syp.', '100 ml'),
('Patent Medicine', 'Cardio Care Cap', '40 Cap'),
('Patent Medicine', 'Panch Ras Rasayan', '100 ml'),
('Patent Medicine', 'Slimtone Tab', '40 tab'),
('Patent Medicine', 'Baijnath caleule Syp.', '100 ml'),
('Patent Medicine', 'Anita Vati Without Ras Sindura', '40 tab'),
('Patent Medicine', 'Livo Haemostant Syp.', '100 ML'),
('Patent Medicine', 'Shirishasva', '100 ML'),
('Patent Medicine', 'Shigru Guggulu Tab. Without Ras Sindura', '40 Tab'),
('Patent Medicine', 'E-Brim Tab', '20 Tab'),
('Patent Medicine', 'Memofast SYP.', '100 ML'),
('Patent Medicine', 'karnani Janam Ghutti', '100 ML'),
('Patent Medicine', 'Hazmee Drops', '20 ML'),
('Patent Medicine', 'Neemsudha Syp.', '100 ML'),
('Patent Medicine', 'Rheuma Forte Oil', '20 ML'),
('Patent Medicine', 'Tulsi Cough Syp', '100 ML'),
('Patent Medicine', 'Superzyme Syp.', '100 ML'),
('Patent Medicine', 'Laxid Syp.', '100 ML'),
('Patent Medicine', 'Liv Samrat Syp.', '100 ML'),
('Patent Medicine', 'Rhumed Ointment', '20gm'),
('Patent Medicine', 'Mulzyme Syp.', '100 ml'),
('Patent Medicine', 'pachmeena Tonic', '100 ml'),
('Patent Medicine', 'Brainton Tab.', '40 tab'),
('Patent Medicine', 'Rhumed SG Tab', '40 tab'),
('Patent Medicine', 'Kuka Caugh Tab.', '40 tab'),
('Patent Medicine', 'Kasgo Syp.', '100 ml'),
('Patent Medicine', 'Iromin Cap.', '40 cap'),
('Patent Medicine', 'Diabetes Strong cap.', '40 cap'),
('Patent Medicine', 'Sarvin Tab.', '40 tab'),
('Patent Medicine', 'Asthmin cap.', '40 cap'),
('Patent Medicine', 'Triphala Tab.', '20Tab'),
('Patent Medicine', 'Muliv Strong Tab.', '40 tab'),
('Patent Medicine', 'Livrhex Cap.', '40 Cap'),
('Patent Medicine', 'Ayuimu', '40 tab'),
('Patent Medicine', 'Liv 52 Syp.', '100 ML'),
('Patent Medicine', 'Bresol Syp.', '100 gm'),
('Patent Medicine', 'Evecare', '100 ML'),
('Patent Medicine', 'Sepnil Syp.', '100 ml'),
('Patent Medicine', 'Tringasav Plus Syp.', '100 ml'),
('Patent Medicine', 'Amlax Granules', '100 GM')
ON CONFLICT DO NOTHING;

