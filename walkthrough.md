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
| **Overview** | Stats cards (schools, students, classes, exams), schools overview table, and a **School Search Dropdown** to preview student/staff stats for any individual school |
| **Manage Schools** | Add, edit, delete school accounts with name/username/password |
| **Students** | View all students across all schools, filter by school/class/section |
| **Staff Data** | View staff across all schools, filter by school/employment type (Regular, Out Sourcing, Contract, MTS), edit, delete, add staff records, export to **Excel** & **PDF** |
| **Exam Marks** | View and edit marks for any school, auto pass/fail calculation |
| **Reports** | Export filtered students/marks data to **Excel** or **PDF** |

### School Dashboard
| Tab | Features |
|-----|----------|
| **Overview** | Own school stats, class-wise student count table |
| **Students** | 40-row data entry grid per class/section, save to database |
| **Staff Profile** | Complete staff management (Add, edit, delete staff records), fields: Name, Designation, Employment Type (Regular, Out Sourcing, Contract, MTS), Subject, Joined Service Date, Joined Institution Date |
| **Enter Marks** | Subject-wise marks entry, real-time pass/fail badges, validation |
| **Reports** | Export own school's data to **Excel** or **PDF** |

---

## 📊 Business Rules Implemented

### Classes and Groups
* **Classes 1 – 10**: Standard numbering format.
* **Junior Intermediate**: MPC, BiPC, CEC, HEC, MEC, A&T, CGA groups.
* **Senior Intermediate**: MPC, BiPC, CEC, HEC, MEC, A&T, CGA groups.

### Subjects Mapping
* **1st – 2nd Class**: Telugu, English, Maths
* **3rd – 5th Class**: Telugu, English, Maths, EVS
* **6th – 10th Class**: Telugu, Hindi, English, Maths, Science, Social
* **Intermediate MPC**: English, Second Language, Maths-A, Maths-B, Physics, Chemistry
* **Intermediate BiPC**: English, Second Language, Botany, Zoology, Physics, Chemistry
* **Intermediate CEC**: English, Second Language, Commerce, Economics, Civics
* **Intermediate HEC**: English, Second Language, History, Economics, Civics
* **Intermediate MEC**: English, Second Language, Maths, Economics, Commerce
* **Intermediate A&T**: English, Second Language, Agriculture, Technology, Vocational-Practical
* **Intermediate CGA**: English, Second Language, CGA-Theory, Computer-Graphics, Animation-Practical

### Pass Marks
| Exam | Max Marks | Pass Mark | Hindi Pass Mark |
|------|-----------|-----------|-----------------|
| FA1, FA2, FA3, FA4 | 50 | 18 | 10 |
| SA1, SA2 | 100 | 35 | 20 |
| MBLP Exam1, MBLP Exam2, MBLP Exam3, End line test | Graded (A, B, C) | N/A | N/A |
| Unit-1, Unit-2, Unit-3, Unit-4 (Intermediate only) | 25 | 9 | N/A |
| Quarterly, Half Yearly, Prefinal (Intermediate only) | 100 | 35 | N/A |

### Graded Exams (MBLP & End line test)
* **Classes**: 3rd Class to 9th Class only.
* **Subjects**: Telugu, English, Maths only.
* **Grades**: Dropdown option list with A, B, and C groups (replaces marks input and pass/fail calculations).

### Staff Qualifications
* **Structured Details**: Grid layout to select and enter details (Type, Subjects, and Marks %) for multiple qualifications.
* **Degree Types**: BSc, BA, B.Com, B.Tech, Vidwan, Others.
* **PG Types**: MSc, MA, MCom, MTech, Sahitya Ratna, MBA, Others.
* **Other Options**: Inter, B.Ed, Pandit Training, TET Paper -1 Qualified, TET Paper-2 Qualified, and Others (with custom specify).

### Access Control
* **Admin**:
  * **Manage Schools**: Full Add, Edit, Delete capabilities.
  * **Manage Students**: Added full Add, Edit, Delete capabilities (via Student Modal).
  * **Manage Staff**: Full Add, Edit, Delete capabilities.
  * **Manage Exam Marks**: Add, Edit (via Marks Sheet), and Delete (added **Delete Marks** button to clear all exam marks for class/section/exam).
  * **Reports & Export**: Expanded reports to include four modes: **Exam Marks**, **Students List**, **Staff Directory**, and **Schools List** (all supporting Excel and PDF generation, complete with an on-screen preview generator). Added automatic **Grade Distribution Summaries** (A, B, C, D) for exam marks based on maximum marks (25, 50, 100).
* **Schools**: Can only view, edit, and export their OWN data. Also displays Grade Distribution summaries for their student reports.
* **Intermediate Subject Layout**: Merged the dual Maths subjects (`Maths-A` and `Maths-B`) for Jr/Sr Inter MPC classes into a single, unified `Maths` subject. Similarly, merged `Botany` and `Zoology` into a single, unified `Biology` subject for Jr/Sr Inter BiPC classes.
* **Secondary Subject Layout (PS & NS Split)**: Split the general `Science` subject into two distinct subjects: `PS` (Physical Science) and `NS` (Natural Science) for classes 8th, 9th, and 10th. Max marks for both subjects is 50 in FA1-FA4 exams. For 10th class, the SA1 and SA2 exams also have max marks of 50 for PS and NS, with a pass mark of 18 (matching standard FA exams where max is 50).
* **Hindi Pass Marks**: Customized pass marks for `Hindi` as 10 (out of 50) for FA1-FA4 exams and 20 (out of 100) for SA1/SA2 exams.
* **Present/Absent Support ('AB')**: Added support for entering `'AB'` or `'ab'` in the exam marks columns. Absent entries are stored in Supabase with a `null` marks value and `pass_fail = 'AB'`. These entries automatically bypass pass/fail grade mapping, subject grade distribution counts, and row-level failures, rendering as `'AB'` in previews and exports (Excel/PDF) and safely ignoring them in average score computations.
* **Exam Marks Total Column**: Added a dynamic **Total** column in both the Admin and School marks entry grids and all report exports (Excel and PDF sheets). The sum is calculated on-the-fly, excluding any absent subjects (`'AB'`), and saved in Supabase as a dedicated `'Total'` subject row.
* **Extended Grade Distribution Summary**: Added comprehensive subject-wise stats class-wise, including **No. of Students Passed**, **No. of Students Failed**, **Pass %**, **Average Marks**, **Average Marks %**, **Highest Mark**, and **Lowest Mark** to on-screen previews, Excel worksheets, and PDF reports. Absent students (`'AB'`) are automatically ignored in these computations.

### Search & Filtering
* **Admin Dashboard**:
  * **Search School**: Real-time school stats search filter.
  * **Search Student**: Real-time student search filter (by name/roll number/school).
  * **Search Staff**: Real-time staff search filter (by name/designation/subject/school).
* **School Dashboard**:
  * **Search Student (Data Entry)**: Real-time filter over active students list.
  * **Search Student (Marks Entry)**: Real-time filter over active students grid to easily locate specific rows.
  * **Search Staff**: Real-time filter over school staff list.

---

## ✅ What Was Built
* Premium dark theme UI with glassmorphism effects.
* Cross-browser visible solid dark select menus with white dropdown options.
* Dynamic cache-buster queries to force-refresh style and script changes instantly.
* Built subdirectory base-path resolver `getAppBaseUrl()` to support painless GitHub Pages deploys.
* Auto pass/fail calculation with per-subject rules (including Hindi pass exceptions).
* Excel export (via SheetJS) and PDF export (via jsPDF) for students, marks, and staff profiles.
* Supabase integration using lightweight native REST wrappers with no heavy library load dependencies.
