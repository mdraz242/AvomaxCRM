import { getSupabase } from '../config/supabase.js';
import { sanitizeSearchTerm } from '../utils/sanitize.js';

const STUDENT_WITH_RELATIONS_SELECT = `
  *,
  counselor:profiles!students_assigned_counselor_id_fkey(id, full_name, email, role, department),
  admission:admissions(*, updated_by_profile:profiles!admissions_updated_by_fkey(id, full_name)),
  fee_payments(*, updated_by_profile:profiles!fee_payments_updated_by_fkey(id, full_name)),
  visa:visa_applications(*,
    updated_by_profile:profiles!visa_applications_updated_by_fkey(id, full_name),
    verified_by_profile:profiles!visa_applications_verified_by_fkey(id, full_name)
  ),
  flights(*, updated_by_profile:profiles!flights_updated_by_fkey(id, full_name)),
  accommodations(*, updated_by_profile:profiles!accommodations_updated_by_fkey(id, full_name))
`;

export async function findStudentById(id) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('students')
    .select(STUDENT_WITH_RELATIONS_SELECT)
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

export async function findStudents(filters = {}) {
  const supabase = getSupabase();
  const {
    search,
    destination_country,
    university_name,
    intake,
    assigned_counselor_id,
    admission_status,
    fee_status,
    visa_doc_status,
    visa_eligibility_status,
    flight_status,
    accommodation_requirement,
    accommodation_payment_status,
    sortBy = 'created_at',
    sortOrder = 'desc',
    page = 1,
    limit = 20,
    counselorScopeId = null,
    fetchAll = false
  } = filters;

  const allowedSortColumns = ['created_at', 'full_name', 'application_date', 'student_code', 'destination_country', 'university_name'];
  const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at';
  const ascending = String(sortOrder).toLowerCase() === 'asc';

  let query = supabase
    .from('students')
    .select(STUDENT_WITH_RELATIONS_SELECT)
    .is('deleted_at', null)
    .order(safeSortBy, { ascending });

  if (counselorScopeId) {
    query = query.eq('assigned_counselor_id', counselorScopeId);
  } else if (assigned_counselor_id) {
    query = query.eq('assigned_counselor_id', assigned_counselor_id);
  }

  if (destination_country) {
    query = query.ilike('destination_country', `%${sanitizeSearchTerm(destination_country)}%`);
  }
  if (university_name) {
    query = query.ilike('university_name', `%${sanitizeSearchTerm(university_name)}%`);
  }
  if (intake) {
    query = query.ilike('intake', `%${sanitizeSearchTerm(intake)}%`);
  }

  if (search) {
    const clean = sanitizeSearchTerm(search);
    if (clean) {
      query = query.or(
        `full_name.ilike.%${clean}%,email.ilike.%${clean}%,phone.ilike.%${clean}%,student_code.ilike.%${clean}%,passport_number.ilike.%${clean}%`
      );
    }
  }

  const { data, error } = await query;
  if (error) throw error;

  let records = data || [];

  // Apply relational status filters accurately on normalized 1:1 / latest child records
  if (admission_status) {
    records = records.filter((s) => {
      const adm = Array.isArray(s.admission) ? s.admission[0] : s.admission;
      return adm?.status === admission_status;
    });
  }

  if (fee_status) {
    records = records.filter((s) => {
      const latestFee = getLatestRecord(s.fee_payments);
      return (latestFee?.payment_status || 'Pending') === fee_status;
    });
  }

  if (visa_doc_status) {
    records = records.filter((s) => {
      const visa = Array.isArray(s.visa) ? s.visa[0] : s.visa;
      return (visa?.doc_status || 'Not Started') === visa_doc_status;
    });
  }

  if (visa_eligibility_status) {
    records = records.filter((s) => {
      const visa = Array.isArray(s.visa) ? s.visa[0] : s.visa;
      return (visa?.eligibility_status || 'Not Evaluated') === visa_eligibility_status;
    });
  }

  if (flight_status) {
    records = records.filter((s) => {
      const latestFlight = getLatestRecord(s.flights);
      return (latestFlight?.flight_status || 'Not Booked') === flight_status;
    });
  }

  if (accommodation_requirement) {
    records = records.filter((s) => {
      const latestAcc = getLatestRecord(s.accommodations);
      return (latestAcc?.requirement_status || 'Hostel Required') === accommodation_requirement;
    });
  }

  if (accommodation_payment_status) {
    records = records.filter((s) => {
      const latestAcc = getLatestRecord(s.accommodations);
      return latestAcc?.payment_status === accommodation_payment_status;
    });
  }

  const total = records.length;

  if (fetchAll) {
    return { records, total };
  }

  const start = (page - 1) * limit;
  const paged = records.slice(start, start + limit);
  return { records: paged, total };
}

export function getLatestRecord(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  return [...arr].sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))[0];
}

export async function createStudentWithModules(payload, actorId) {
  const supabase = getSupabase();

  const insertPayload = {
    ...payload,
    student_code: '', // trigger_generate_student_code populates STU-YYYY-XXXX
    created_by: actorId,
    updated_by: actorId
  };

  const { data: student, error } = await supabase
    .from('students')
    .insert(insertPayload)
    .select()
    .single();

  if (error) throw error;

  // Initialize normalized tracking records for the new student
  const [admRes, feeRes, visaRes, flightRes, accRes] = await Promise.all([
    supabase.from('admissions').insert({
      student_id: student.id,
      status: 'Application Pending',
      updated_by: actorId
    }),
    supabase.from('fee_payments').insert({
      student_id: student.id,
      payment_status: 'Pending',
      total_fee: 0,
      amount_paid: 0,
      updated_by: actorId
    }),
    supabase.from('visa_applications').insert({
      student_id: student.id,
      doc_status: 'Not Started',
      eligibility_status: 'Not Evaluated',
      updated_by: actorId
    }),
    supabase.from('flights').insert({
      student_id: student.id,
      flight_status: 'Not Booked',
      updated_by: actorId
    }),
    supabase.from('accommodations').insert({
      student_id: student.id,
      requirement_status: 'Hostel Required',
      payment_status: 'Paid Upon Arrival',
      updated_by: actorId
    })
  ]);

  const initErrors = [admRes.error, feeRes.error, visaRes.error, flightRes.error, accRes.error].filter(Boolean);
  if (initErrors.length > 0) {
    throw initErrors[0];
  }

  if (student.assigned_counselor_id) {
    await supabase.from('staff_assignments').insert({
      student_id: student.id,
      counselor_id: student.assigned_counselor_id,
      assigned_by: actorId,
      is_active: true,
      notes: 'Initial counselor assignment at student onboarding'
    });
  }

  return findStudentById(student.id);
}

export async function updateStudentRecord(id, payload, actorId) {
  const supabase = getSupabase();

  const { data: existing } = await supabase
    .from('students')
    .select('id, assigned_counselor_id')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  const { data, error } = await supabase
    .from('students')
    .update({
      ...payload,
      updated_by: actorId
    })
    .eq('id', id)
    .is('deleted_at', null)
    .select()
    .single();

  if (error) throw error;

  // Track counselor reassignment history
  if (
    payload.assigned_counselor_id !== undefined &&
    existing &&
    payload.assigned_counselor_id !== existing.assigned_counselor_id
  ) {
    await supabase
      .from('staff_assignments')
      .update({ is_active: false, unassigned_at: new Date().toISOString() })
      .eq('student_id', id)
      .eq('is_active', true);

    if (payload.assigned_counselor_id) {
      await supabase.from('staff_assignments').insert({
        student_id: id,
        counselor_id: payload.assigned_counselor_id,
        assigned_by: actorId,
        is_active: true,
        notes: 'Counselor reassigned'
      });
    }
  }

  return findStudentById(id);
}

export async function softDeleteStudent(id, actorId) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('students')
    .update({
      deleted_at: new Date().toISOString(),
      updated_by: actorId
    })
    .eq('id', id)
    .is('deleted_at', null)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getCounselorStudentIds(counselorId) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('students')
    .select('id')
    .eq('assigned_counselor_id', counselorId)
    .is('deleted_at', null);

  if (error) throw error;
  return (data || []).map((s) => s.id);
}

