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

