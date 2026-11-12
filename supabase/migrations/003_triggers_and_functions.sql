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

