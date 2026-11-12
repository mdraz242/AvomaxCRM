-- ============================================================================
-- Migration 001: Extensions and PostgreSQL ENUM Types
-- Admission & Visa Tracking Management System
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Staff Roles
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'counselor', 'viewer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Gender
DO $$ BEGIN
  CREATE TYPE gender_type AS ENUM ('Male', 'Female', 'Other', 'Prefer not to say');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- A. Admission Status
DO $$ BEGIN
  CREATE TYPE admission_status_enum AS ENUM (
    'Application Pending',
    'Documents Required',
    'Under Review',
    'Conditional Offer Received',
    'Unconditional Offer Received',
    'Admission Confirmed',
    'Rejected'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- B. Admission Fee Status
DO $$ BEGIN
  CREATE TYPE fee_status_enum AS ENUM (
    'Pending',
    'Partially Paid',
    'Paid',
    'Waived'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- C. Visa Documentation Status
DO $$ BEGIN
  CREATE TYPE visa_doc_status_enum AS ENUM (
    'Not Started',
    'Documents Pending',
    'Compiling Visa Documents',
    'Documents Ready',
    'Submitted',
    'Additional Documents Required',
    'Completed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- D. Visa Eligibility Status
DO $$ BEGIN
  CREATE TYPE visa_eligibility_status_enum AS ENUM (
    'Not Evaluated',
    'Eligible to Proceed with Visa',
    'Not Eligible',
    'On Hold',
    'Under Review'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- E. Flight Ticket Status
DO $$ BEGIN
  CREATE TYPE flight_status_enum AS ENUM (
    'Not Booked',
    'Searching for Flights',
    'Flight Ticket Booked',
    'Rescheduled',
    'Cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- F1. Accommodation Payment Status
DO $$ BEGIN
  CREATE TYPE accommodation_payment_status_enum AS ENUM (
    'Paid Upon Arrival',
    'Pre-paid'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- F2. Accommodation Requirement Status
DO $$ BEGIN
  CREATE TYPE accommodation_requirement_enum AS ENUM (
    'Hostel Required',
    'Off-campus Accommodation',
    'Hostel Reserved',
    'Off-campus Accommodation Reserved',
    'Accommodation Not Required'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Document Categories
DO $$ BEGIN
  CREATE TYPE document_category_enum AS ENUM (
    'Passport',
    'Academic Certificates',
    'Transcripts',
    'Admission Letter',
    'Fee Receipt',
    'Bank Statement',
    'Financial Documents',
    'Visa Application Documents',
    'Flight Ticket',
    'Accommodation Confirmation',
    'Other Documents'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Document Verification Status
DO $$ BEGIN
  CREATE TYPE document_verification_status_enum AS ENUM (
    'Pending',
    'Verified',
    'Rejected',
    'Needs Revision'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- Migration 002: Core Normalized Tables, Constraints & Indexes
-- ============================================================================

-- Sequence for human-readable Student ID (e.g. STU-2026-0001)
CREATE SEQUENCE IF NOT EXISTS student_code_seq START 1 INCREMENT 1;

-- 1. Profiles (Staff & Admin Users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'viewer',
  phone VARCHAR(40),
  department VARCHAR(100),
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_active ON public.profiles(is_active);

-- 2. Students
CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_code VARCHAR(32) NOT NULL UNIQUE,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(40) NOT NULL,
  whatsapp_number VARCHAR(40),
  passport_number VARCHAR(64) NOT NULL,
  nationality VARCHAR(100) NOT NULL,
  date_of_birth DATE NOT NULL,
  gender gender_type NOT NULL DEFAULT 'Prefer not to say',
  passport_expiry_date DATE NOT NULL,
  destination_country VARCHAR(100) NOT NULL,
  university_name VARCHAR(200) NOT NULL,
  course_name VARCHAR(200) NOT NULL,
  intake VARCHAR(60) NOT NULL,
  academic_year VARCHAR(30) NOT NULL,
  assigned_counselor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  application_date DATE NOT NULL DEFAULT CURRENT_DATE,
  internal_remarks TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_passport_expiry_after_dob CHECK (passport_expiry_date > date_of_birth)
);

CREATE INDEX IF NOT EXISTS idx_students_code ON public.students(student_code);
CREATE INDEX IF NOT EXISTS idx_students_counselor ON public.students(assigned_counselor_id);
CREATE INDEX IF NOT EXISTS idx_students_country ON public.students(destination_country);
CREATE INDEX IF NOT EXISTS idx_students_university ON public.students(university_name);
CREATE INDEX IF NOT EXISTS idx_students_intake ON public.students(intake);
CREATE INDEX IF NOT EXISTS idx_students_deleted_at ON public.students(deleted_at);
CREATE INDEX IF NOT EXISTS idx_students_created_at ON public.students(created_at DESC);

-- 9. Student Documents (Declared before references from payments/flights/accommodations)
CREATE TABLE IF NOT EXISTS public.student_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  document_group_id UUID NOT NULL DEFAULT gen_random_uuid(),
  category document_category_enum NOT NULL,
  title VARCHAR(200) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  storage_bucket VARCHAR(100) NOT NULL DEFAULT 'student-documents',
  storage_path TEXT NOT NULL UNIQUE,
  mime_type VARCHAR(120) NOT NULL,
  file_size BIGINT NOT NULL CHECK (file_size > 0),
  version_number INTEGER NOT NULL DEFAULT 1 CHECK (version_number >= 1),
  is_latest BOOLEAN NOT NULL DEFAULT TRUE,
  verification_status document_verification_status_enum NOT NULL DEFAULT 'Pending',
  verification_remarks TEXT,
  verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_docs_student ON public.student_documents(student_id);
CREATE INDEX IF NOT EXISTS idx_student_docs_category ON public.student_documents(category);
CREATE INDEX IF NOT EXISTS idx_student_docs_group ON public.student_documents(document_group_id);
CREATE INDEX IF NOT EXISTS idx_student_docs_latest ON public.student_documents(student_id, is_latest) WHERE deleted_at IS NULL;

-- 3. Admissions
CREATE TABLE IF NOT EXISTS public.admissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL UNIQUE REFERENCES public.students(id) ON DELETE CASCADE,
  status admission_status_enum NOT NULL DEFAULT 'Application Pending',
  offer_reference VARCHAR(120),
  offer_received_date DATE,
  decision_date DATE,
  remarks TEXT,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admissions_status ON public.admissions(status);

-- 4. Fee Payments
CREATE TABLE IF NOT EXISTS public.fee_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  payment_status fee_status_enum NOT NULL DEFAULT 'Pending',
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  total_fee NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (total_fee >= 0),
  amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  outstanding_amount NUMERIC(12, 2) GENERATED ALWAYS AS (
    CASE
      WHEN payment_status = 'Waived' THEN 0
      ELSE GREATEST(total_fee - amount_paid, 0)
    END
  ) STORED,
  payment_date DATE,
  payment_reference VARCHAR(120),
  receipt_document_id UUID REFERENCES public.student_documents(id) ON DELETE SET NULL,
  remarks TEXT,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_amount_paid_lte_total CHECK (amount_paid <= total_fee OR total_fee = 0)
);

CREATE INDEX IF NOT EXISTS idx_fee_payments_student ON public.fee_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_status ON public.fee_payments(payment_status);

-- 5. Visa Applications
CREATE TABLE IF NOT EXISTS public.visa_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL UNIQUE REFERENCES public.students(id) ON DELETE CASCADE,
  doc_status visa_doc_status_enum NOT NULL DEFAULT 'Not Started',
  eligibility_status visa_eligibility_status_enum NOT NULL DEFAULT 'Not Evaluated',
  eligibility_remarks TEXT,
  verification_date DATE,
  verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  submission_date DATE,
  visa_reference VARCHAR(120),
  remarks TEXT,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visa_doc_status ON public.visa_applications(doc_status);
CREATE INDEX IF NOT EXISTS idx_visa_eligibility_status ON public.visa_applications(eligibility_status);

-- 6. Visa Documents (Checklist / Linked Visa Files)
CREATE TABLE IF NOT EXISTS public.visa_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visa_application_id UUID NOT NULL REFERENCES public.visa_applications(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  document_id UUID REFERENCES public.student_documents(id) ON DELETE SET NULL,
  document_name VARCHAR(180) NOT NULL,
  is_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
  status document_verification_status_enum NOT NULL DEFAULT 'Pending',
  remarks TEXT,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visa_docs_app ON public.visa_documents(visa_application_id);
CREATE INDEX IF NOT EXISTS idx_visa_docs_student ON public.visa_documents(student_id);

-- 7. Flights
CREATE TABLE IF NOT EXISTS public.flights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  flight_status flight_status_enum NOT NULL DEFAULT 'Not Booked',
  airline VARCHAR(120),
  flight_number VARCHAR(50),
  departure_date TIMESTAMPTZ,
  departure_airport VARCHAR(120),
  arrival_airport VARCHAR(120),
  booking_reference VARCHAR(100),
  ticket_document_id UUID REFERENCES public.student_documents(id) ON DELETE SET NULL,
  remarks TEXT,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flights_student ON public.flights(student_id);
CREATE INDEX IF NOT EXISTS idx_flights_status ON public.flights(flight_status);

-- 8. Accommodations
CREATE TABLE IF NOT EXISTS public.accommodations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  requirement_status accommodation_requirement_enum NOT NULL DEFAULT 'Hostel Required',
  payment_status accommodation_payment_status_enum NOT NULL DEFAULT 'Paid Upon Arrival',
  provider VARCHAR(150),
  property_name VARCHAR(200),
  address TEXT,
  check_in_date DATE,
  check_out_date DATE,
  payment_amount NUMERIC(12, 2) DEFAULT 0 CHECK (payment_amount >= 0),
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  booking_confirmation VARCHAR(150),
  confirmation_document_id UUID REFERENCES public.student_documents(id) ON DELETE SET NULL,
  remarks TEXT,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_accommodation_dates CHECK (
    check_out_date IS NULL OR check_in_date IS NULL OR check_out_date >= check_in_date
  )
);

CREATE INDEX IF NOT EXISTS idx_accommodations_student ON public.accommodations(student_id);
CREATE INDEX IF NOT EXISTS idx_accommodations_req ON public.accommodations(requirement_status);
CREATE INDEX IF NOT EXISTS idx_accommodations_pay ON public.accommodations(payment_status);

-- 10. Staff Assignments History
CREATE TABLE IF NOT EXISTS public.staff_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  counselor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unassigned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_assign_student ON public.staff_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_staff_assign_counselor ON public.staff_assignments(counselor_id);

-- 11. Activity Logs
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  entity_type VARCHAR(60) NOT NULL,
  entity_id UUID,
  action VARCHAR(80) NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_student ON public.activity_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_activity_actor ON public.activity_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_activity_entity ON public.activity_logs(entity_type, entity_id);

-- 12. Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  event_type VARCHAR(80) NOT NULL,
  title VARCHAR(180) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_id, is_read, created_at DESC);

-- 13. System Settings (Super Admin configuration)
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Migration 003: Triggers, Auto-Generated Codes & Helper Functions
-- ============================================================================

-- Generic updated_at trigger function
CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Student code auto-generator: STU-YYYY-XXXX
CREATE OR REPLACE FUNCTION public.trigger_generate_student_code()
RETURNS TRIGGER AS $$
DECLARE
  seq_val BIGINT;
BEGIN
  IF NEW.student_code IS NULL OR BTRIM(NEW.student_code) = '' THEN
    seq_val := NEXTVAL('student_code_seq');
    NEW.student_code := 'STU-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(seq_val::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_student_code_before_insert ON public.students;
CREATE TRIGGER set_student_code_before_insert
  BEFORE INSERT ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_generate_student_code();

-- Apply updated_at triggers to all mutable tables
DO $$
DECLARE
  tbl TEXT;
  tables_list TEXT[] := ARRAY[
    'profiles',
    'students',
    'admissions',
    'fee_payments',
    'visa_applications',
    'visa_documents',
    'flights',
    'accommodations',
    'student_documents',
    'staff_assignments',
    'notifications',
    'system_settings'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables_list LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON public.%I;', tbl);
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();',
      tbl
    );
  END LOOP;
END $$;

-- Authoritative 6-stage progress calculation (never counts in-progress as complete)
CREATE OR REPLACE FUNCTION public.get_student_progress_percentage(
  p_admission_status admission_status_enum,
  p_fee_status fee_status_enum,
  p_visa_doc_status visa_doc_status_enum,
  p_visa_eligibility_status visa_eligibility_status_enum,
  p_flight_status flight_status_enum,
  p_accommodation_req accommodation_requirement_enum
) RETURNS INTEGER AS $$
DECLARE
  completed_count INTEGER := 0;
BEGIN
  IF p_admission_status = 'Admission Confirmed' THEN
    completed_count := completed_count + 1;
  END IF;

  IF p_fee_status IN ('Paid', 'Waived') THEN
    completed_count := completed_count + 1;
  END IF;

  IF p_visa_doc_status = 'Completed' THEN
    completed_count := completed_count + 1;
  END IF;

  IF p_visa_eligibility_status = 'Eligible to Proceed with Visa' THEN
    completed_count := completed_count + 1;
  END IF;

  IF p_flight_status = 'Flight Ticket Booked' THEN
    completed_count := completed_count + 1;
  END IF;

  IF p_accommodation_req IN (
    'Hostel Reserved',
    'Off-campus Accommodation Reserved',
    'Accommodation Not Required'
  ) THEN
    completed_count := completed_count + 1;
  END IF;

  RETURN ROUND((completed_count::NUMERIC / 6.0) * 100)::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- Migration 004: Row Level Security (RLS) & Private Supabase Storage Bucket
-- ============================================================================

-- Helper functions to extract authenticated user ID and role from JWT claims
CREATE OR REPLACE FUNCTION public.current_app_user_id()
RETURNS UUID AS $$
DECLARE
  claims JSONB;
  uid UUID;
BEGIN
  uid := auth.uid();
  IF uid IS NOT NULL THEN
    RETURN uid;
  END IF;
  claims := NULLIF(current_setting('request.jwt.claims', true), '')::JSONB;
  IF claims IS NOT NULL AND claims ? 'sub' THEN
    RETURN (claims ->> 'sub')::UUID;
  END IF;
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.current_app_user_role()
RETURNS user_role AS $$
DECLARE
  r user_role;
  uid UUID;
BEGIN
  uid := public.current_app_user_id();
  IF uid IS NULL THEN
    RETURN NULL;
  END IF;
  SELECT role INTO r FROM public.profiles WHERE id = uid AND is_active = TRUE;
  RETURN r;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.can_access_student(p_student_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  r user_role;
  uid UUID;
BEGIN
  uid := public.current_app_user_id();
  r := public.current_app_user_role();
  IF r IN ('super_admin', 'admin', 'viewer') THEN
    RETURN TRUE;
  ELSIF r = 'counselor' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = p_student_id
        AND s.deleted_at IS NULL
        AND s.assigned_counselor_id = uid
    );
  END IF;
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.can_modify_student(p_student_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  r user_role;
  uid UUID;
BEGIN
  uid := public.current_app_user_id();
  r := public.current_app_user_role();
  IF r IN ('super_admin', 'admin') THEN
    RETURN TRUE;
  ELSIF r = 'counselor' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = p_student_id
        AND s.deleted_at IS NULL
        AND s.assigned_counselor_id = uid
    );
  END IF;
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visa_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visa_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accommodations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS profiles_select_policy ON public.profiles;
CREATE POLICY profiles_select_policy ON public.profiles
  FOR SELECT USING (
    public.current_app_user_role() IN ('super_admin', 'admin', 'counselor', 'viewer')
  );

DROP POLICY IF EXISTS profiles_manage_policy ON public.profiles;
CREATE POLICY profiles_manage_policy ON public.profiles
  FOR ALL USING (public.current_app_user_role() = 'super_admin')
  WITH CHECK (public.current_app_user_role() = 'super_admin');

-- Students Policies
DROP POLICY IF EXISTS students_select_policy ON public.students;
CREATE POLICY students_select_policy ON public.students
  FOR SELECT USING (
    deleted_at IS NULL AND public.can_access_student(id)
  );

DROP POLICY IF EXISTS students_insert_policy ON public.students;
CREATE POLICY students_insert_policy ON public.students
  FOR INSERT WITH CHECK (
    public.current_app_user_role() IN ('super_admin', 'admin')
  );

DROP POLICY IF EXISTS students_update_policy ON public.students;
CREATE POLICY students_update_policy ON public.students
  FOR UPDATE USING (public.can_modify_student(id))
  WITH CHECK (public.can_modify_student(id));

DROP POLICY IF EXISTS students_delete_policy ON public.students;
CREATE POLICY students_delete_policy ON public.students
  FOR DELETE USING (public.current_app_user_role() IN ('super_admin', 'admin'));

-- Student Child Module Policies (Admissions, Fees, Visa, Flights, Accommodations, Docs)
DO $$
DECLARE
  tbl TEXT;
  child_tables TEXT[] := ARRAY[
    'admissions',
    'fee_payments',
    'visa_applications',
    'visa_documents',
    'flights',
    'accommodations',
    'student_documents'
  ];
BEGIN
  FOREACH tbl IN ARRAY child_tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_select_policy ON public.%I;', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY %I_select_policy ON public.%I FOR SELECT USING (public.can_access_student(student_id));',
      tbl, tbl
    );

    EXECUTE format('DROP POLICY IF EXISTS %I_modify_policy ON public.%I;', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY %I_modify_policy ON public.%I FOR ALL USING (public.can_modify_student(student_id)) WITH CHECK (public.can_modify_student(student_id));',
      tbl, tbl
    );
  END LOOP;
END $$;

-- Staff Assignments
DROP POLICY IF EXISTS staff_assignments_select ON public.staff_assignments;
CREATE POLICY staff_assignments_select ON public.staff_assignments
  FOR SELECT USING (public.can_access_student(student_id));

DROP POLICY IF EXISTS staff_assignments_manage ON public.staff_assignments;
CREATE POLICY staff_assignments_manage ON public.staff_assignments
  FOR ALL USING (public.current_app_user_role() IN ('super_admin', 'admin'))
  WITH CHECK (public.current_app_user_role() IN ('super_admin', 'admin'));

-- Activity Logs (Read for authorized staff, Insert for any authenticated staff)
DROP POLICY IF EXISTS activity_logs_select ON public.activity_logs;
CREATE POLICY activity_logs_select ON public.activity_logs
  FOR SELECT USING (
    public.current_app_user_role() IN ('super_admin', 'admin', 'viewer')
    OR (public.current_app_user_role() = 'counselor' AND (student_id IS NULL OR public.can_access_student(student_id)))
  );

DROP POLICY IF EXISTS activity_logs_insert ON public.activity_logs;
CREATE POLICY activity_logs_insert ON public.activity_logs
  FOR INSERT WITH CHECK (public.current_app_user_id() IS NOT NULL);

-- Notifications (Users see/update only their own notifications)
DROP POLICY IF EXISTS notifications_own_select ON public.notifications;
CREATE POLICY notifications_own_select ON public.notifications
  FOR SELECT USING (recipient_id = public.current_app_user_id());

DROP POLICY IF EXISTS notifications_own_update ON public.notifications;
CREATE POLICY notifications_own_update ON public.notifications
  FOR UPDATE USING (recipient_id = public.current_app_user_id())
  WITH CHECK (recipient_id = public.current_app_user_id());

-- System Settings
DROP POLICY IF EXISTS system_settings_select ON public.system_settings;
CREATE POLICY system_settings_select ON public.system_settings
  FOR SELECT USING (public.current_app_user_id() IS NOT NULL);

DROP POLICY IF EXISTS system_settings_manage ON public.system_settings;
CREATE POLICY system_settings_manage ON public.system_settings
  FOR ALL USING (public.current_app_user_role() = 'super_admin')
  WITH CHECK (public.current_app_user_role() = 'super_admin');

-- ============================================================================
-- Private Supabase Storage Bucket: student-documents
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'student-documents',
  'student-documents',
  FALSE,
  10485760, -- 10 MB
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = FALSE,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Deny anonymous/public access to storage objects; only authenticated staff with student access
DROP POLICY IF EXISTS "Private student documents read" ON storage.objects;
CREATE POLICY "Private student documents read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'student-documents'
    AND public.current_app_user_id() IS NOT NULL
  );

DROP POLICY IF EXISTS "Private student documents write" ON storage.objects;
CREATE POLICY "Private student documents write" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'student-documents'
    AND public.current_app_user_role() IN ('super_admin', 'admin', 'counselor')
  );

DROP POLICY IF EXISTS "Private student documents delete" ON storage.objects;
CREATE POLICY "Private student documents delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'student-documents'
    AND public.current_app_user_role() IN ('super_admin', 'admin')
  );

-- ============================================================================
-- Seed Data: Admission & Visa Tracking Management System
-- Default password for all seeded staff accounts: Admin@123456
-- ============================================================================

INSERT INTO public.profiles (id, full_name, email, password_hash, role, phone, department, is_active)
VALUES
  ('11111111-1111-4111-8111-111111111101', 'Elena Vance', 'superadmin@educrm.io', '$2b$12$HHrepXFMqbl/rJf2/9GbTucpZ9a7sln1r2oP6r/w2V5QEHZ5EooiK', 'super_admin', '+1-555-0101', 'Executive Leadership', TRUE),
  ('11111111-1111-4111-8111-111111111102', 'Marcus Chen', 'admin@educrm.io', '$2b$12$HHrepXFMqbl/rJf2/9GbTucpZ9a7sln1r2oP6r/w2V5QEHZ5EooiK', 'admin', '+1-555-0102', 'Admissions Operations', TRUE),
  ('11111111-1111-4111-8111-111111111103', 'Priya Sharma', 'counselor1@educrm.io', '$2b$12$HHrepXFMqbl/rJf2/9GbTucpZ9a7sln1r2oP6r/w2V5QEHZ5EooiK', 'counselor', '+1-555-0103', 'UK & Europe Counseling', TRUE),
  ('11111111-1111-4111-8111-111111111104', 'David Miller', 'counselor2@educrm.io', '$2b$12$HHrepXFMqbl/rJf2/9GbTucpZ9a7sln1r2oP6r/w2V5QEHZ5EooiK', 'counselor', '+1-555-0104', 'North America & Australia', TRUE),
  ('11111111-1111-4111-8111-111111111105', 'Sarah Jenkins', 'viewer@educrm.io', '$2b$12$HHrepXFMqbl/rJf2/9GbTucpZ9a7sln1r2oP6r/w2V5QEHZ5EooiK', 'viewer', '+1-555-0105', 'Compliance & Audit', TRUE)
ON CONFLICT (email) DO NOTHING;

-- System Settings
INSERT INTO public.system_settings (setting_key, setting_value, description, updated_by)
VALUES
  ('organization_name', '"AvomaxCRM"'::jsonb, 'Organization display name', '11111111-1111-4111-8111-111111111101'),
  ('default_currency', '"USD"'::jsonb, 'Default billing currency for admission fees', '11111111-1111-4111-8111-111111111101'),
  ('active_academic_year', '"2026-2027"'::jsonb, 'Default academic year for new student applications', '11111111-1111-4111-8111-111111111101'),
  ('supported_intakes', '["Fall 2026", "Spring 2027", "Summer 2027"]'::jsonb, 'Standard intake cycles', '11111111-1111-4111-8111-111111111101'),
  ('max_upload_mb', '10'::jsonb, 'Maximum document upload size in MB', '11111111-1111-4111-8111-111111111101')
ON CONFLICT (setting_key) DO NOTHING;

-- Sample Students
INSERT INTO public.students (
  id, student_code, full_name, email, phone, whatsapp_number, passport_number,
  nationality, date_of_birth, gender, passport_expiry_date,
  destination_country, university_name, course_name, intake, academic_year,
  assigned_counselor_id, application_date, internal_remarks, created_by
)
VALUES
  ('22222222-2222-4222-8222-222222222201', '', 'Aarav Patel', 'aarav.patel@example.com', '+91-9820111222', '+91-9820111222', 'Z4829104', 'Indian', '2003-04-12', 'Male', '2030-08-15', 'United Kingdom', 'University of Manchester', 'MSc Data Science', 'Fall 2026', '2026-2027', '11111111-1111-4111-8111-111111111103', '2026-08-10', 'Strong academic background; IELTS 7.5 cleared.', '11111111-1111-4111-8111-111111111102'),
  ('22222222-2222-4222-8222-222222222202', '', 'Sofia Rodriguez', 'sofia.r@example.com', '+52-5540123456', '+52-5540123456', 'G9102837', 'Mexican', '2002-11-23', 'Female', '2031-03-20', 'Canada', 'University of Toronto', 'Master of Engineering', 'Fall 2026', '2026-2027', '11111111-1111-4111-8111-111111111104', '2026-08-22', 'Awaiting updated financial sponsor statement.', '11111111-1111-4111-8111-111111111102'),
  ('22222222-2222-4222-8222-222222222203', '', 'Liam O''Connor', 'liam.oconnor@example.com', '+353-871234567', '+353-871234567', 'P3391022', 'Irish', '2004-02-08', 'Male', '2029-11-30', 'Australia', 'University of Melbourne', 'BSc Computer Science', 'Spring 2027', '2026-2027', '11111111-1111-4111-8111-111111111104', '2026-09-05', 'Preparing visa SOP and OSHC insurance.', '11111111-1111-4111-8111-111111111102'),
  ('22222222-2222-4222-8222-222222222204', '', 'Zainab Al-Mansoor', 'zainab.m@example.com', '+971-501122334', '+971-501122334', 'N7721094', 'Emirati', '2001-07-19', 'Female', '2031-06-10', 'United States', 'Boston University', 'MBA Global Business', 'Fall 2026', '2026-2027', '11111111-1111-4111-8111-111111111103', '2026-09-18', 'All 6 stages complete; ready for departure.', '11111111-1111-4111-8111-111111111102'),
  ('22222222-2222-4222-8222-222222222205', '', 'Min-jun Park', 'minjun.park@example.com', '+82-1044556677', '+82-1044556677', 'M5540192', 'South Korean', '2003-09-30', 'Male', '2030-01-14', 'Germany', 'TU Munich', 'MSc Robotics & AI', 'Spring 2027', '2026-2027', '11111111-1111-4111-8111-111111111103', '2026-10-02', 'Blocked account confirmation pending.', '11111111-1111-4111-8111-111111111102'),
  ('22222222-2222-4222-8222-222222222206', '', 'Chidinma Okafor', 'chidinma.o@example.com', '+234-8031122334', '+234-8031122334', 'A8812033', 'Nigerian', '2002-05-14', 'Female', '2029-09-01', 'United Kingdom', 'University of Leeds', 'MSc Public Health', 'Fall 2026', '2026-2027', '11111111-1111-4111-8111-111111111104', '2026-10-15', 'Conditional offer received; awaiting final transcript.', '11111111-1111-4111-8111-111111111102')
ON CONFLICT (id) DO NOTHING;

-- Admissions
INSERT INTO public.admissions (student_id, status, offer_reference, offer_received_date, decision_date, remarks, updated_by)
VALUES
  ('22222222-2222-4222-8222-222222222201', 'Admission Confirmed', 'UOM-2026-991', '2026-08-20', '2026-09-01', 'CAS issued and seat confirmed.', '11111111-1111-4111-8111-111111111102'),
  ('22222222-2222-4222-8222-222222222202', 'Unconditional Offer Received', 'UOT-2026-441', '2026-09-02', NULL, 'Offer accepted verbally; deposit pending.', '11111111-1111-4111-8111-111111111104'),
  ('22222222-2222-4222-8222-222222222203', 'Admission Confirmed', 'MELB-2027-112', '2026-09-14', '2026-09-25', 'COE generated.', '11111111-1111-4111-8111-111111111102'),
  ('22222222-2222-4222-8222-222222222204', 'Admission Confirmed', 'BU-2026-778', '2026-09-22', '2026-09-28', 'I-20 issued.', '11111111-1111-4111-8111-111111111102'),
  ('22222222-2222-4222-8222-222222222205', 'Under Review', NULL, NULL, NULL, 'Application forwarded to admissions committee.', '11111111-1111-4111-8111-111111111103'),
  ('22222222-2222-4222-8222-222222222206', 'Conditional Offer Received', 'LEEDS-2026-310', '2026-10-22', NULL, 'Condition: submit attested degree certificate.', '11111111-1111-4111-8111-111111111104')
ON CONFLICT (student_id) DO NOTHING;

-- Fee Payments
INSERT INTO public.fee_payments (student_id, payment_status, currency, total_fee, amount_paid, payment_date, payment_reference, remarks, updated_by)
VALUES
  ('22222222-2222-4222-8222-222222222201', 'Paid', 'USD', 4500.00, 4500.00, '2026-09-02', 'TXN-UOM-8821', 'Full admission deposit received.', '11111111-1111-4111-8111-111111111102'),
  ('22222222-2222-4222-8222-222222222202', 'Partially Paid', 'USD', 5000.00, 2000.00, '2026-09-10', 'TXN-UOT-3310', 'Initial installment received; balance due next week.', '11111111-1111-4111-8111-111111111102'),
  ('22222222-2222-4222-8222-222222222203', 'Paid', 'USD', 3800.00, 3800.00, '2026-09-24', 'TXN-MELB-551', 'Cleared via wire transfer.', '11111111-1111-4111-8111-111111111102'),
  ('22222222-2222-4222-8222-222222222204', 'Waived', 'USD', 2500.00, 0.00, '2026-09-27', 'SCHOLAR-MERIT-100', '100% merit fee waiver approved.', '11111111-1111-4111-8111-111111111101'),
  ('22222222-2222-4222-8222-222222222205', 'Pending', 'USD', 1500.00, 0.00, NULL, NULL, 'Awaiting invoice issuance.', '11111111-1111-4111-8111-111111111102'),
  ('22222222-2222-4222-8222-222222222206', 'Pending', 'USD', 3000.00, 0.00, NULL, NULL, 'Payable upon unconditional offer.', '11111111-1111-4111-8111-111111111102');

-- Visa Applications
INSERT INTO public.visa_applications (student_id, doc_status, eligibility_status, eligibility_remarks, verification_date, verified_by, submission_date, visa_reference, remarks, updated_by)
VALUES
  ('22222222-2222-4222-8222-222222222201', 'Compiling Visa Documents', 'Eligible to Proceed with Visa', 'Bank statement and CAS verified.', '2026-09-10', '11111111-1111-4111-8111-111111111102', NULL, NULL, 'Biometrics slot scheduled.', '11111111-1111-4111-8111-111111111103'),
  ('22222222-2222-4222-8222-222222222202', 'Documents Pending', 'Under Review', 'Pending sponsor notarized affidavit.', NULL, NULL, NULL, NULL, 'Counselor following up.', '11111111-1111-4111-8111-111111111104'),
  ('22222222-2222-4222-8222-222222222203', 'Documents Ready', 'Eligible to Proceed with Visa', 'All financial & GTE checks cleared.', '2026-10-01', '11111111-1111-4111-8111-111111111102', NULL, NULL, 'Ready for ImmiAccount submission.', '11111111-1111-4111-8111-111111111104'),
  ('22222222-2222-4222-8222-222222222204', 'Completed', 'Eligible to Proceed with Visa', 'F-1 Visa stamped and verified.', '2026-10-05', '11111111-1111-4111-8111-111111111101', '2026-10-08', 'US-F1-90812', 'Visa approved.', '11111111-1111-4111-8111-111111111103'),
  ('22222222-2222-4222-8222-222222222205', 'Not Started', 'Not Evaluated', NULL, NULL, NULL, NULL, NULL, 'Starts after admission offer.', '11111111-1111-4111-8111-111111111103'),
  ('22222222-2222-4222-8222-222222222206', 'Not Started', 'On Hold', 'Waiting on final academic transcript.', NULL, NULL, NULL, NULL, 'On hold until condition cleared.', '11111111-1111-4111-8111-111111111104')
ON CONFLICT (student_id) DO NOTHING;

-- Flights
INSERT INTO public.flights (student_id, flight_status, airline, flight_number, departure_date, departure_airport, arrival_airport, booking_reference, remarks, updated_by)
VALUES
  ('22222222-2222-4222-8222-222222222201', 'Searching for Flights', 'British Airways', NULL, NULL, 'BOM', 'MAN', NULL, 'Comparing direct and one-stop fares.', '11111111-1111-4111-8111-111111111103'),
  ('22222222-2222-4222-8222-222222222202', 'Not Booked', NULL, NULL, NULL, 'MEX', 'YYZ', NULL, 'Pending visa submission.', '11111111-1111-4111-8111-111111111104'),
  ('22222222-2222-4222-8222-222222222203', 'Flight Ticket Booked', 'Qatar Airways', 'QR018', '2027-01-18T10:30:00Z', 'DUB', 'MEL', 'QR-MEL-7741', 'Student baggage allowance included.', '11111111-1111-4111-8111-111111111104'),
  ('22222222-2222-4222-8222-222222222204', 'Flight Ticket Booked', 'Emirates', 'EK237', '2026-12-01T08:15:00Z', 'DXB', 'BOS', 'EK-BOS-9910', 'Confirmed business class ticket.', '11111111-1111-4111-8111-111111111103'),
  ('22222222-2222-4222-8222-222222222205', 'Not Booked', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '11111111-1111-4111-8111-111111111103'),
  ('22222222-2222-4222-8222-222222222206', 'Not Booked', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '11111111-1111-4111-8111-111111111104');

-- Accommodations
INSERT INTO public.accommodations (student_id, requirement_status, payment_status, provider, property_name, address, check_in_date, check_out_date, payment_amount, currency, booking_confirmation, remarks, updated_by)
VALUES
  ('22222222-2222-4222-8222-222222222201', 'Hostel Reserved', 'Pre-paid', 'University Residences', 'Oak House Residence', 'Fallowfield Campus, Manchester M14 6HD', '2026-09-15', '2027-06-30', 1200.00, 'USD', 'UOM-ACC-441', 'En-suite single room reserved.', '11111111-1111-4111-8111-111111111103'),
  ('22222222-2222-4222-8222-222222222202', 'Off-campus Accommodation', 'Paid Upon Arrival', 'CampusLiving', NULL, 'Downtown Toronto', NULL, NULL, 0.00, 'USD', NULL, 'Shortlisting studio apartments near St. George campus.', '11111111-1111-4111-8111-111111111104'),
  ('22222222-2222-4222-8222-222222222203', 'Off-campus Accommodation Reserved', 'Pre-paid', 'UniLodge', 'UniLodge Lincoln House', 'Carlton VIC 3053, Melbourne', '2027-01-20', '2027-12-20', 1800.00, 'USD', 'UL-MEL-8812', 'Deposit paid; lease signed.', '11111111-1111-4111-8111-111111111104'),
  ('22222222-2222-4222-8222-222222222204', 'Accommodation Not Required', 'Paid Upon Arrival', NULL, NULL, 'Family residence in Brookline, MA', NULL, NULL, 0.00, 'USD', 'SELF-ARRANGED', 'Student staying with family.', '11111111-1111-4111-8111-111111111103'),
  ('22222222-2222-4222-8222-222222222205', 'Hostel Required', 'Paid Upon Arrival', NULL, NULL, NULL, NULL, NULL, 0.00, 'USD', NULL, 'Will apply for Studentenwerk dorm.', '11111111-1111-4111-8111-111111111103'),
  ('22222222-2222-4222-8222-222222222206', 'Hostel Required', 'Paid Upon Arrival', NULL, NULL, NULL, NULL, NULL, 0.00, 'USD', NULL, NULL, '11111111-1111-4111-8111-111111111104');

-- Staff Assignment Audit
INSERT INTO public.staff_assignments (student_id, counselor_id, assigned_by, is_active, notes)
VALUES
  ('22222222-2222-4222-8222-222222222201', '11111111-1111-4111-8111-111111111103', '11111111-1111-4111-8111-111111111102', TRUE, 'UK counselor assigned'),
  ('22222222-2222-4222-8222-222222222202', '11111111-1111-4111-8111-111111111104', '11111111-1111-4111-8111-111111111102', TRUE, 'Canada counselor assigned'),
  ('22222222-2222-4222-8222-222222222203', '11111111-1111-4111-8111-111111111104', '11111111-1111-4111-8111-111111111102', TRUE, 'Australia counselor assigned'),
  ('22222222-2222-4222-8222-222222222204', '11111111-1111-4111-8111-111111111103', '11111111-1111-4111-8111-111111111102', TRUE, 'US counselor assigned'),
  ('22222222-2222-4222-8222-222222222205', '11111111-1111-4111-8111-111111111103', '11111111-1111-4111-8111-111111111102', TRUE, 'Europe counselor assigned'),
  ('22222222-2222-4222-8222-222222222206', '11111111-1111-4111-8111-111111111104', '11111111-1111-4111-8111-111111111102', TRUE, 'UK counselor assigned');

-- Sample Activity Logs
INSERT INTO public.activity_logs (actor_id, student_id, entity_type, action, description)
VALUES
  ('11111111-1111-4111-8111-111111111102', '22222222-2222-4222-8222-222222222201', 'admission', 'admission_status_updated', 'Admission status for Aarav Patel updated to "Admission Confirmed"'),
  ('11111111-1111-4111-8111-111111111102', '22222222-2222-4222-8222-222222222201', 'payment', 'payment_recorded', 'Fee payment of USD 4500.00 (Paid) recorded for Aarav Patel'),
  ('11111111-1111-4111-8111-111111111103', '22222222-2222-4222-8222-222222222204', 'flight', 'flight_booked', 'Flight EK237 booked for Zainab Al-Mansoor'),
  ('11111111-1111-4111-8111-111111111104', '22222222-2222-4222-8222-222222222203', 'accommodation', 'accommodation_reserved', 'Off-campus Accommodation Reserved at UniLodge Lincoln House for Liam O''Connor'),
  ('11111111-1111-4111-8111-111111111102', '22222222-2222-4222-8222-222222222203', 'visa', 'visa_eligibility_approved', 'Liam O''Connor marked Eligible to Proceed with Visa');

-- Sample Notifications
INSERT INTO public.notifications (recipient_id, student_id, event_type, title, message, is_read)
VALUES
  ('11111111-1111-4111-8111-111111111101', '22222222-2222-4222-8222-222222222204', 'flight_booked', 'Flight Ticket Booked', 'Emirates EK237 confirmed for Zainab Al-Mansoor.', FALSE),
  ('11111111-1111-4111-8111-111111111103', '22222222-2222-4222-8222-222222222201', 'payment_received', 'Fee Payment Received', 'Full fee payment USD 4500.00 confirmed for Aarav Patel.', FALSE),
  ('11111111-1111-4111-8111-111111111104', '22222222-2222-4222-8222-222222222203', 'visa_eligibility_approved', 'Visa Eligibility Approved', 'Liam O''Connor is Eligible to Proceed with Visa.', FALSE);

