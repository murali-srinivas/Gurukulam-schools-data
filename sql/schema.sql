-- ============================================
-- School Data Portal - Supabase Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Schools Table
CREATE TABLE IF NOT EXISTS schools (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    district TEXT,
    school_name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Students Table
CREATE TABLE IF NOT EXISTS students (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    class_number TEXT NOT NULL CHECK (class_number IN ('1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jr Inter MPC', 'Jr Inter BiPC', 'Jr Inter CEC', 'Jr Inter HEC', 'Jr Inter MEC', 'Jr Inter A&T', 'Jr Inter CGA', 'Sr Inter MPC', 'Sr Inter BiPC', 'Sr Inter CEC', 'Sr Inter HEC', 'Sr Inter MEC', 'Sr Inter A&T', 'Sr Inter CGA')),
    section TEXT NOT NULL CHECK (section IN ('A', 'B')),
    roll_number INTEGER NOT NULL CHECK (roll_number >= 1),
    student_name TEXT NOT NULL DEFAULT '',
    gender TEXT NOT NULL DEFAULT '' CHECK (gender IN ('', 'Boy', 'Girl')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, class_number, section, roll_number)
);

-- 3. Exam Marks Table
CREATE TABLE IF NOT EXISTS exam_marks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    class_number TEXT NOT NULL,
    exam_type TEXT NOT NULL CHECK (exam_type IN ('FA1','FA2','FA3','FA4','SA1','SA2','MBLP Exam1','MBLP Exam2','MBLP Exam3','End line test','Unit-1','Unit-2','Unit-3','Unit-4','Quarterly','Half Yearly','Prefinal')),
    subject TEXT NOT NULL,
    marks INTEGER,
    pass_fail TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, exam_type, subject)
);

-- ============================================
-- Indexes for Performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_students_school_id ON students(school_id);
CREATE INDEX IF NOT EXISTS idx_students_class_section ON students(school_id, class_number, section);
CREATE INDEX IF NOT EXISTS idx_exam_marks_student ON exam_marks(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_marks_school ON exam_marks(school_id);
CREATE INDEX IF NOT EXISTS idx_exam_marks_filter ON exam_marks(school_id, class_number, exam_type);

-- ============================================
-- Row Level Security (Permissive for anon key)
-- Access control enforced in application layer
-- ============================================
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_marks ENABLE ROW LEVEL SECURITY;

-- Allow all operations via anon key
CREATE POLICY "Allow all on schools" ON schools
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all on students" ON students
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all on exam_marks" ON exam_marks
    FOR ALL USING (true) WITH CHECK (true);

-- 4. Staff Table
CREATE TABLE IF NOT EXISTS staff (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    staff_name TEXT NOT NULL,
    designation TEXT NOT NULL,
    employment_type TEXT NOT NULL CHECK (employment_type IN ('Regular', 'Out Sourcing', 'Contract', 'MTS')),
    subject TEXT NOT NULL,
    qualification TEXT,
    qualification_inter BOOLEAN DEFAULT FALSE,
    qualification_degree BOOLEAN DEFAULT FALSE,
    degree_type TEXT,
    degree_subjects TEXT,
    degree_marks TEXT,
    qualification_pg BOOLEAN DEFAULT FALSE,
    pg_type TEXT,
    pg_subjects TEXT,
    pg_marks TEXT,
    qualification_bed BOOLEAN DEFAULT FALSE,
    bed_subjects TEXT,
    bed_marks TEXT,
    qualification_pandit BOOLEAN DEFAULT FALSE,
    pandit_subjects TEXT,
    pandit_marks TEXT,
    qualification_tet_p1 BOOLEAN DEFAULT FALSE,
    tet_p1_subjects TEXT,
    tet_p1_marks TEXT,
    qualification_tet_p2 BOOLEAN DEFAULT FALSE,
    tet_p2_subjects TEXT,
    tet_p2_marks TEXT,
    qualification_others TEXT,
    joined_service_date DATE,
    joined_institution_date DATE,
    phone_1 TEXT,
    phone_2 TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_school ON staff(school_id);

ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on staff" ON staff
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- Seed Admin Account
-- ============================================
INSERT INTO schools (school_name, username, password, is_admin)
VALUES ('System Administrator', 'admin', 'Admin@2024', TRUE)
ON CONFLICT (username) DO NOTHING;

-- ============================================
-- MIGRATION: Update exam_type check constraint for Inter classes Unit exams
-- Run this in Supabase SQL editor if your database is already created:
-- ============================================
-- ALTER TABLE exam_marks DROP CONSTRAINT IF EXISTS exam_marks_exam_type_check;
-- ALTER TABLE exam_marks ADD CONSTRAINT exam_marks_exam_type_check CHECK (exam_type IN ('FA1','FA2','FA3','FA4','SA1','SA2','MBLP Exam1','MBLP Exam2','MBLP Exam3','End line test','Unit-1','Unit-2','Unit-3','Unit-4','Quarterly','Half Yearly','Prefinal'));

-- ============================================
-- MIGRATION: Combine Maths-A and Maths-B into Maths for Inter exams
-- Run this in Supabase SQL editor to merge existing records:
-- ============================================
-- -- 1. If Maths records don't exist for the student/exam, rename Maths-A to Maths
-- UPDATE exam_marks SET subject = 'Maths' WHERE subject = 'Maths-A';
-- -- 2. If student has Maths-B marks but no Maths marks, rename Maths-B to Maths
-- UPDATE exam_marks SET subject = 'Maths' WHERE subject = 'Maths-B' AND NOT EXISTS (
--     SELECT 1 FROM exam_marks em WHERE em.student_id = exam_marks.student_id AND em.exam_type = exam_marks.exam_type AND em.subject = 'Maths'
-- );
-- -- 3. Delete any residual Maths-B or Maths-A records
-- DELETE FROM exam_marks WHERE subject = 'Maths-B' OR subject = 'Maths-A';

-- ============================================
-- MIGRATION: Combine Botany and Zoology into Biology for Inter BiPC exams
-- Run this in Supabase SQL editor to merge existing records:
-- ============================================
-- -- 1. If Biology records don't exist for the student/exam, rename Botany to Biology
-- UPDATE exam_marks SET subject = 'Biology' WHERE subject = 'Botany';
-- -- 2. If student has Zoology marks but no Biology marks, rename Zoology to Biology
-- UPDATE exam_marks SET subject = 'Biology' WHERE subject = 'Zoology' AND NOT EXISTS (
--     SELECT 1 FROM exam_marks em WHERE em.student_id = exam_marks.student_id AND em.exam_type = exam_marks.exam_type AND em.subject = 'Biology'
-- );
-- -- 3. Delete any residual Botany or Zoology records
-- DELETE FROM exam_marks WHERE subject = 'Botany' OR subject = 'Zoology';

-- ============================================
-- MIGRATION: Split Science into PS and NS for 8th, 9th, and 10th classes
-- Run this in Supabase SQL editor to migrate existing records:
-- ============================================
-- -- 1. Create PS records from existing Science records for classes 8, 9, 10
-- INSERT INTO exam_marks (student_id, school_id, class_number, exam_type, subject, marks, pass_fail)
-- SELECT student_id, school_id, class_number, exam_type, 'PS', 
--        CASE 
--             WHEN exam_type IN ('SA1', 'SA2') AND class_number = '10' AND marks IS NOT NULL THEN (marks / 2)
--             ELSE marks 
--        END,
--        CASE 
--             WHEN exam_type IN ('SA1', 'SA2') AND class_number = '10' AND marks IS NOT NULL THEN 
--                  -- Recalculate pass_fail status for PS out of 50 marks (pass mark 18)
--                  CASE WHEN (marks / 2) >= 18 THEN 'Grade-C' ELSE 'Grade-D' END
--             ELSE pass_fail
--        END
-- FROM exam_marks 
-- WHERE subject = 'Science' AND class_number IN ('8', '9', '10')
-- ON CONFLICT (student_id, exam_type, subject) DO NOTHING;
--
-- -- 2. Create NS records from existing Science records for classes 8, 9, 10
-- INSERT INTO exam_marks (student_id, school_id, class_number, exam_type, subject, marks, pass_fail)
-- SELECT student_id, school_id, class_number, exam_type, 'NS', 
--        CASE 
--             WHEN exam_type IN ('SA1', 'SA2') AND class_number = '10' AND marks IS NOT NULL THEN (marks / 2)
--             ELSE marks 
--        END,
--        CASE 
--             WHEN exam_type IN ('SA1', 'SA2') AND class_number = '10' AND marks IS NOT NULL THEN 
--                  -- Recalculate pass_fail status for NS out of 50 marks (pass mark 18)
--                  CASE WHEN (marks / 2) >= 18 THEN 'Grade-C' ELSE 'Grade-D' END
--             ELSE pass_fail
--        END
-- FROM exam_marks 
-- WHERE subject = 'Science' AND class_number IN ('8', '9', '10')
-- ON CONFLICT (student_id, exam_type, subject) DO NOTHING;
--
-- -- 3. Delete old Science records for classes 8, 9, 10
-- DELETE FROM exam_marks WHERE subject = 'Science' AND class_number IN ('8', '9', '10');

-- ============================================
-- MIGRATION: Add district column to schools table
-- Run this in Supabase SQL editor to support school districts:
-- ============================================
-- ALTER TABLE schools ADD COLUMN IF NOT EXISTS district TEXT;

-- ============================================
-- MIGRATION: Add phone columns to staff table
-- Run this in Supabase SQL editor to support staff phone numbers:
-- ============================================
-- ALTER TABLE staff ADD COLUMN IF NOT EXISTS phone_1 TEXT;
-- ALTER TABLE staff ADD COLUMN IF NOT EXISTS phone_2 TEXT;

-- ============================================
-- MIGRATION: Update check constraint for student genders (Male/Female/Other to Boy/Girl)
-- Run this in Supabase SQL editor:
-- ============================================
-- ALTER TABLE students DROP CONSTRAINT IF EXISTS students_gender_check;
-- ALTER TABLE students ADD CONSTRAINT students_gender_check CHECK (gender IN ('', 'Boy', 'Girl'));
-- UPDATE students SET gender = 'Boy' WHERE gender IN ('Male', 'Other');
-- UPDATE students SET gender = 'Girl' WHERE gender = 'Female';

-- ============================================
-- MIGRATION: Remove max roll number limit (max 40 restriction)
-- Run this in Supabase SQL editor:
-- ============================================
-- ALTER TABLE students DROP CONSTRAINT IF EXISTS students_roll_number_check;
-- ALTER TABLE students ADD CONSTRAINT students_roll_number_check CHECK (roll_number >= 1);

-- ============================================
-- MIGRATION: Create staffing_particulars table
-- Run this in Supabase SQL editor:
-- ============================================
-- CREATE TABLE IF NOT EXISTS staffing_particulars (
--     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
--     school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
--     post_name TEXT NOT NULL,
--     status TEXT NOT NULL CHECK (status IN ('Filled', 'Vacant')),
--     employee_name TEXT,
--     employment_type TEXT CHECK (employment_type IN ('Regular', 'Out Sourcing', 'Contract', 'MTS', 'Others')),
--     joining_date DATE,
--     remarks TEXT,
--     created_at TIMESTAMPTZ DEFAULT NOW()
-- );
--
-- ALTER TABLE staffing_particulars ENABLE ROW LEVEL SECURITY;
--
-- CREATE POLICY "Allow all on staffing_particulars" ON staffing_particulars
--     FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- MIGRATION: Add Aadhar, APCOS ID, and Days Present to staffing_particulars
-- Run this in Supabase SQL editor:
-- ============================================
-- ALTER TABLE staffing_particulars ADD COLUMN IF NOT EXISTS aadhar_no VARCHAR(12);
-- ALTER TABLE staffing_particulars ADD COLUMN IF NOT EXISTS apcos_id VARCHAR(50);
-- ALTER TABLE staffing_particulars ADD COLUMN IF NOT EXISTS days_present NUMERIC;
--
-- ALTER TABLE staffing_particulars DROP CONSTRAINT IF EXISTS staffing_particulars_aadhar_check;
-- ALTER TABLE staffing_particulars ADD CONSTRAINT staffing_particulars_aadhar_check 
--     CHECK (aadhar_no IS NULL OR aadhar_no ~ '^\d{12}$');

-- ============================================
-- MIGRATION: Update status CHECK constraint to include 'Not Sanctioned'
-- Run this in Supabase SQL editor:
-- ============================================
-- ALTER TABLE staffing_particulars DROP CONSTRAINT IF EXISTS staffing_particulars_status_check;
-- ALTER TABLE staffing_particulars ADD CONSTRAINT staffing_particulars_status_check 
--     CHECK (status IN ('Filled', 'Vacant', 'Not Sanctioned'));

-- ============================================
-- MIGRATION: Create outsourcing_attendance table
-- Run this in Supabase SQL editor:
-- ============================================
-- CREATE TABLE IF NOT EXISTS outsourcing_attendance (
--     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--     school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
--     month VARCHAR(20) NOT NULL, -- Format: YYYY-MM
--     employee_name TEXT NOT NULL,
--     designation TEXT NOT NULL,
--     aadhar_no TEXT,
--     apcos_id TEXT,
--     days_present NUMERIC NOT NULL CHECK (days_present >= 0 AND days_present <= 31),
--     remarks TEXT,
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
-- );
--
-- ALTER TABLE outsourcing_attendance ADD COLUMN IF NOT EXISTS apcos_id TEXT;
-- ALTER TABLE outsourcing_attendance ADD COLUMN IF NOT EXISTS aadhar_no TEXT;

--
-- ALTER TABLE outsourcing_attendance ENABLE ROW LEVEL SECURITY;
--
-- CREATE POLICY "Allow all on outsourcing_attendance" ON outsourcing_attendance
--     FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- MIGRATION: Add caste, sub_caste, first_appointment_date to staff table
-- Run this in Supabase SQL editor:
-- ============================================
-- ALTER TABLE staff ADD COLUMN IF NOT EXISTS caste TEXT;
-- ALTER TABLE staff ADD COLUMN IF NOT EXISTS sub_caste TEXT;
-- ALTER TABLE staff ADD COLUMN IF NOT EXISTS first_appointment_date DATE;

-- ============================================
-- MIGRATION: Create mblp_grades table
-- Run this in Supabase SQL editor:
-- ============================================
-- DROP TABLE IF EXISTS mblp_grades;
-- CREATE TABLE IF NOT EXISTS mblp_grades (
--     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--     school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
--     class_number VARCHAR(10) NOT NULL, -- '3', '4', '5', '6', '7', '8', '9'
--     grade_a_count INTEGER NOT NULL DEFAULT 0 CHECK (grade_a_count >= 0),
--     grade_b_count INTEGER NOT NULL DEFAULT 0 CHECK (grade_b_count >= 0),
--     grade_c_count INTEGER NOT NULL DEFAULT 0 CHECK (grade_c_count >= 0),
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
--     UNIQUE(school_id, class_number)
-- );
--
-- ALTER TABLE mblp_grades ENABLE ROW LEVEL SECURITY;
--
-- CREATE POLICY "Allow all on mblp_grades" ON mblp_grades
--     FOR ALL USING (true) WITH CHECK (true);











