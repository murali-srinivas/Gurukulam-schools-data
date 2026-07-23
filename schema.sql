-- ============================================
-- School Data Portal - Supabase Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Schools Table
CREATE TABLE IF NOT EXISTS schools (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
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
    roll_number INTEGER NOT NULL CHECK (roll_number BETWEEN 1 AND 40),
    student_name TEXT NOT NULL DEFAULT '',
    gender TEXT NOT NULL DEFAULT '' CHECK (gender IN ('', 'Male', 'Female', 'Other')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, class_number, section, roll_number)
);

-- 3. Exam Marks Table
CREATE TABLE IF NOT EXISTS exam_marks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    class_number TEXT NOT NULL,
    exam_type TEXT NOT NULL CHECK (exam_type IN ('FA1','FA2','FA3','FA4','SA1','SA2')),
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
    employment_type TEXT NOT NULL CHECK (employment_type IN ('Regular', 'Out Sourcing')),
    subject TEXT NOT NULL,
    joined_service_date DATE,
    joined_institution_date DATE,
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
