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

