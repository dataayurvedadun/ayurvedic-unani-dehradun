# Ayurvedic Unani Services, District Dehradun

A secure, role-based, full-stack central health administration web portal designed for the **Department of AYUSH, Government of Uttarakhand (District Dehradun)**.

This system centralizes **Annual Medicine Indents/Demands**, **Monthly Progress Reports (MPR)**, and **Dynamic Administrative Surveys** across all Ayurvedic and Unani hospitals and dispensaries in Dehradun district.

Architected for **100% Free-Tier Deployment** on **Vercel** (Frontend & Serverless Keep-Alive API) and **Supabase** (PostgreSQL Database), featuring an automated **Anti-Sleep Health-Check Mechanism** to eliminate inactivity pauses.

---

## 🏛️ System Features & Modules

### 1. Dual-Role Authentication & Access Control
- **Landing Screen**: Clean tabbed interface to switch between Hospital and Admin logins.
- **Admin Login**: Protected by a master password check.
- **Hospital Login**: Pre-populated selector of Dehradun facilities, assigned facility password authentication, and mandatory capture of the Submitting Officer / Doctor In-Charge name.
- **Offline / Free-Demo Fallback**: Works immediately with localStorage state even before live Supabase credentials are configured.

### 2. Hospital Portal (Medical Officers & Dispensaries)
- **Medicine Demands Indent**:
  - Filterable catalog of **Classical Medicines** and **Patent Medicines** with pack sizes.
  - Interactive requisition quantity input.
  - Real-time tally of selected varieties and units.
  - View-only summary when submitted, with print-ready requisition slips (including signature & official seal spaces).
- **Monthly Progress Report (MPR)**:
  - Month/Year selector (e.g., August 2026).
  - Patient OPD metrics: Male, Female, and Child footfall with automated total calculation.
  - Panchakarma & Regimenal procedures: Snehan/Swedan, Basti, Nasya, Shirodhara, and Unani Cupping (Hijama).
  - IPD admissions, bed occupancy days, Yoga attendees, and health camps.
  - Emergency stock shortage alerts and administrative notes.
  - History log of previous months with detailed inspection modals.
- **Custom Administrative Forms**:
  - View and fill out surveys published by the District Ayurvedic Officer (e.g. Monsoon Preparedness Audit).
  - Dynamic input rendering (text, number, dropdown, textarea, date) with validation.
  - Status badges indicating *Submitted* vs. *Pending*.

### 3. Admin Panel (District Ayurvedic & Unani Officer - DAO)
- **Overview Dashboard**:
  - Key performance indicators (Total Facilities, Medicine Demand Completion Rate, MPR Reporting Rate, District-wide OPD count).
  - Live facility-by-facility submission matrix with status badges.
- **Medicine Demands Aggregation & Analytics**:
  - District-wide total quantity demanded per formulation.
  - Item-wise breakdown drilldown showing exactly which hospitals requested what quantities.
  - One-click **Excel (.xlsx)** and **CSV** export for procurement tenders.
  - Print-friendly consolidated demand report.
  - Catalog manager to add new formulations, edit pack sizes, or archive items.
- **MPR Tracker**:
  - District-wide patient statistics aggregator.
  - Filter by month/year and search by facility name.
  - One-click **Excel (.xlsx)** export of consolidated monthly reports.
  - Drilldown modal to inspect complete clinic-level metrics.
- **Dynamic Form Creator**:
  - Intuitive form builder: add questions, select input types (Text, Number, Dropdown, Textarea, Date), define options, set required flags.
  - Instantly publishes to all hospital dashboards across Dehradun.
  - Inspect hospital responses with one-click Excel export.
  - Toggle form status (Active / Archived).
- **Facility Directory & Credentials**:
  - Manage 15 pre-configured hospitals/dispensaries across Dehradun Sadar, Rishikesh, Vikasnagar, Chakrata, Doiwala, Sahaspur, Raipur, and Kalsi.
  - 1-click copy passwords or reset facility access keys.
  - Register new dispensaries.
- **Audit & Activity Logs**:
  - Chronological trail recording timestamps, actions, user accounts, and submitted metrics.

### 4. 100% Free & Anti-Sleep Mechanism
- **Vercel Serverless Function** at `/api/health`.
- Periodically pings the Supabase database (`hospitals_master`) to reset Supabase's 7-day inactivity counter.
- Ready to be linked to free cron services like **cron-job.org** or **UptimeRobot** at zero cost.

---

## 🔑 Pre-Configured Credentials

### Administrator (DAO Dehradun)
- **Role**: District Admin
- **Master Password**: `admin@123`


### Sample Pre-Configured Hospitals
| Hospital / Dispensary Name | Block | Assigned Password |
| :--- | :--- | :--- |
| District Ayurvedic Hospital, Tilak Road, Dehradun | Dehradun Sadar | `ayush@dehradun1` |
| Government Ayurvedic Hospital, Rishikesh | Rishikesh | `ayush@rishi2` |
| Government Ayurvedic Dispensary, Vikasnagar | Vikasnagar | `ayush@vikas3` |
| Government Ayurvedic Hospital, Chakrata | Chakrata | `ayush@chak4` |
| Government Ayurvedic Dispensary, Doiwala | Doiwala | `ayush@doi5` |
| Government Ayurvedic Dispensary, Sahaspur | Sahaspur | `ayush@sahas6` |
| Government Ayurvedic Dispensary, Kalsi | Kalsi | `ayush@kalsi7` |
| Government Ayurvedic Dispensary, Raipur | Raipur | `ayush@raipur8` |
| Government Ayurvedic Dispensary, Mussoorie | Mussoorie | `ayush@muss9` |
| Government Ayurvedic Dispensary, Premnagar | Sahaspur | `ayush@prem10` |
| Government Unani Dispensary, Dehradun City | Dehradun Sadar | `unani@ddn11` |

*(All passwords can be modified by the Administrator in the "Facilities & Passwords" tab).*

---

## 🗄️ Database Schema (`ayurvedic_unani_dehradun`)

The file `supabase_schema.sql` contains the complete PostgreSQL database structure:
1. `hospitals_master`: Facility accounts, assigned passwords, blocks, and contact details.
2. `admin_uploads`: Classical and Patent medicine catalog items and pack sizes.
3. `monthly_progress_reports`: Monthly OPD, Panchakarma, IPD, Yoga, and stock metrics.
4. `dynamic_forms`: Custom questionnaires published by the DAO.
5. `dynamic_form_responses`: Responses to dynamic questionnaires submitted by facilities.
6. `medicine_demands_responses`: Annual medicine quantities requested per facility.

---

## 🚀 100% Free Deployment Guide

### Step 1: Create Free Database on Supabase
1. Go to [supabase.com](https://supabase.com) and create a free account.
2. Create a new project named: `ayurvedic_unani_dehradun`.
3. Open the **SQL Editor** in your Supabase dashboard.
4. Open the file `supabase_schema.sql` from this repository, paste the entire SQL script, and click **Run**.
   - This creates all 6 tables, indexes, RLS policies, and seeds all Dehradun hospitals and medicines.
5. Go to **Project Settings -> API** and copy:
   - **Project URL**
   - **Project API Key (`anon` / `public`)**

### Step 2: Deploy to Vercel (100% Free)
1. Push this codebase to a GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of Ayurvedic Unani Services Dehradun"
   git branch -M main
   git remote add origin https://github.com/your-username/dehradun-ayush.git
   git push -u origin main
   ```
2. Go to [vercel.com](https://vercel.com) and click **Add New... -> Project**.
3. Import your GitHub repository.
4. Under **Environment Variables**, add:
   - `VITE_SUPABASE_URL`: Your Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase `anon` key
   - `VITE_ADMIN_PASSWORD`: `admin@123` (or your preferred admin password)

5. Click **Deploy**. Your application is live within 60 seconds!

### Step 3: Setup Anti-Sleep Cron (Keep Supabase Awake Forever)
1. Go to [cron-job.org](https://cron-job.org) (free).
2. Click **Create Cronjob**.
3. Set the Title to: `Dehradun Ayush Supabase Keep-Alive`.
4. Set the URL to:
   ```text
   https://your-vercel-domain.vercel.app/api/health
   ```
5. Set Schedule to: **Every 3 days** (or every 24 hours).
6. Click **Save**. Your free Supabase project will never enter inactivity pause!

---

## 💻 Local Development

```bash
# 1. Install dependencies
npm install

# 2. Run local development server
npm run dev

# 3. Build production bundle
npm run build
```

---

## 🛡️ License & Authority
Official web application developed for public health reporting under the **Department of AYUSH, Government of Uttarakhand**.
