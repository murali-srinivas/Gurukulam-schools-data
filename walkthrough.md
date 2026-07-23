# School Data Portal - Setup & Walkthrough

## Project Structure

```
school-data-portal/
├── index.html              ← Login page (glassmorphism design & on-screen debug console)
├── admin.html              ← Admin dashboard (manage schools, students, exam marks, and staff)
├── school.html             ← School dashboard (student entry, marks, staff management, reports)
├── css/
│   └── styles.css          ← Complete dark theme design system (includes solid select dropdown overrides)
├── js/
│   ├── supabase-config.js  ← Supabase REST client, base path resolver & shared utilities
│   ├── auth.js             ← Authentication, session management & subdirectory routing
│   ├── admin.js            ← Admin dashboard logic, CRUD handlers & exports
│   └── school.js           ← School dashboard logic, CRUD handlers & exports
├── sql/
│   └── schema.sql          ← Database schema (run in Supabase editor)
└── package.json            ← Dev server config
```

---

## 🔧 Setup Instructions

### Step 1: Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a free account.
2. Create a **New Project**.
3. Wait for the project to finish provisioning.

### Step 2: Run the Database Schema
1. In your Supabase dashboard, go to **SQL Editor**.
2. Open the file [schema.sql](file:///C:/Users/koman/.gemini/antigravity/scratch/school-data-portal/sql/schema.sql).
3. Copy the entire contents and paste into the SQL Editor.
4. Click **Run** — this creates the tables (`schools`, `students`, `exam_marks`, `staff`), indexes, RLS policies, and the default admin account.

### Step 3: Get Your Supabase Credentials
1. Go to **Settings → API** in your Supabase dashboard.
2. Copy the **Project URL** (e.g., `https://xxxxx.supabase.co`).
3. Copy the **anon public** API key.

### Step 4: Configure the App
1. Open [supabase-config.js](file:///C:/Users/koman/.gemini/antigravity/scratch/school-data-portal/js/supabase-config.js).
2. Replace the credentials on lines 5-6:
```javascript
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';
```

### Step 5: Run the App
Open a terminal in the project directory and run:
```bash
npm run dev
```
Then open `http://localhost:3000` in your browser.

---

## 🔐 Login Credentials

| Role | User ID | Password |
|------|---------|----------|
| **Admin** | `admin` | `Admin@2024` |
| **Schools** | *Created by admin* | *Set by admin* |

---

## 📋 Features Overview

### Admin Dashboard
| Tab | Features |
|-----|----------|
| **Overview** | Stats cards (schools, students, classes, exams), schools overview table |
| **Manage Schools** | Add, edit, delete school accounts with name/username/password |
| **Students** | View all students across all schools, filter by school/class/section |
| **Staff Data** | View staff across all schools, filter by school/employment type, edit, delete, add staff records, export to **Excel** & **PDF** |
| **Exam Marks** | View and edit marks for any school, auto pass/fail calculation |
| **Reports** | Export filtered students/marks data to **Excel** or **PDF** |

### School Dashboard
| Tab | Features |
|-----|----------|
| **Overview** | Own school stats, class-wise student count table |
| **Students** | 40-row data entry grid per class/section, save to database |
| **Staff Profile** | Complete staff management (Add, edit, delete staff records), fields: Name, Designation, Regular/Out Sourcing, Subject, Joined Service Date, Joined Institution Date |
| **Enter Marks** | Subject-wise marks entry, real-time pass/fail badges, validation |
| **Reports** | Export own school's data to **Excel** or **PDF** |

---

## 📊 Business Rules Implemented

### Classes and Groups
* **Classes 3 – 10**: Standard numbering format.
* **Junior Intermediate**: MPC, BiPC, CEC, HEC, MEC, A&T groups.
* **Senior Intermediate**: MPC, BiPC, CEC, HEC, MEC, A&T groups.

### Subjects Mapping
* **3rd – 5th Class**: Telugu, English, Maths, EVS
* **6th – 10th Class**: Telugu, Hindi, English, Maths, Science, Social
* **Intermediate MPC**: English, Second Language, Maths-A, Maths-B, Physics, Chemistry
* **Intermediate BiPC**: English, Second Language, Botany, Zoology, Physics, Chemistry
* **Intermediate CEC**: English, Second Language, Commerce, Economics, Civics
* **Intermediate HEC**: English, Second Language, History, Economics, Civics
* **Intermediate MEC**: English, Second Language, Maths, Economics, Commerce
* **Intermediate A&T**: English, Second Language, Agriculture, Technology, Vocational-Practical

### Pass Marks
| Exam | Max Marks | Pass Mark | Hindi Pass Mark |
|------|-----------|-----------|-----------------|
| FA1, FA2, FA3, FA4 | 50 | 18 | 10 |
| SA1, SA2 | 100 | 35 | 20 |

### Access Control
* **Admin**: Can view, edit, and export data for ALL schools (students, marks, staff)
* **Schools**: Can only view, edit, and export their OWN data

---

## ✅ What Was Built
* Premium dark theme UI with glassmorphism effects.
* Cross-browser visible solid dark select menus with white dropdown options.
* Dynamic cache-buster queries to force-refresh style and script changes instantly.
* Built subdirectory base-path resolver `getAppBaseUrl()` to support painless GitHub Pages deploys.
* Auto pass/fail calculation with per-subject rules (including Hindi pass exceptions).
* Excel export (via SheetJS) and PDF export (via jsPDF) for students, marks, and staff profiles.
* Supabase integration using lightweight native REST wrappers with no heavy library load dependencies.
