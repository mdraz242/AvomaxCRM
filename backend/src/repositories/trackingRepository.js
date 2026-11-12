import { getSupabase } from '../config/supabase.js';

const STUDENT_SUMMARY_SELECT = 'id, student_code, full_name, email, destination_country, university_name, course_name, intake, assigned_counselor_id, deleted_at, counselor:profiles!students_assigned_counselor_id_fkey(id, full_name)';

export async function listModuleRecords(table, { statusField, statusValue, counselorScopeId, search, extraSelect = '' } = {}) {
  const supabase = getSupabase();
  const selectStr = `
    *,
    updated_by_profile:profiles!${table}_updated_by_fkey(id, full_name),
    student:students!${table}_student_id_fkey(${STUDENT_SUMMARY_SELECT})
    ${extraSelect}
  `;

  let query = supabase.from(table).select(selectStr).order('updated_at', { ascending: false });
  if (statusField && statusValue) {
    query = query.eq(statusField, statusValue);
  }

  const { data, error } = await query;
  if (error) throw error;

  let rows = (data || []).filter((r) => r.student && !r.student.deleted_at);

  if (counselorScopeId) {
    rows = rows.filter((r) => r.student.assigned_counselor_id === counselorScopeId);
  }

  if (search) {
    const q = search.toLowerCase().trim();
    rows = rows.filter(
      (r) =>
        r.student.full_name?.toLowerCase().includes(q) ||
        r.student.student_code?.toLowerCase().includes(q) ||
        r.student.university_name?.toLowerCase().includes(q) ||
        r.student.destination_country?.toLowerCase().includes(q)
    );
  }

  return rows;
}

export async function findModuleRecordById(table, id) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(table)
    .select(`*, student:students!${table}_student_id_fkey(${STUDENT_SUMMARY_SELECT})`)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

export async function updateModuleRecordById(table, id, payload) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(table)
    .update(payload)
    .eq('id', id)
    .select(`*, student:students!${table}_student_id_fkey(${STUDENT_SUMMARY_SELECT})`)
    .single();

  if (error) throw error;
  return data;
}

export async function insertModuleRecord(table, payload) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(table)
    .insert(payload)
    .select(`*, student:students!${table}_student_id_fkey(${STUDENT_SUMMARY_SELECT})`)
    .single();

  if (error) throw error;
  return data;
}

export async function listVisaDocumentsByApplication(visaApplicationId) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('visa_documents')
    .select(`
      *,
      document:student_documents!visa_documents_document_id_fkey(id, title, file_name, category, verification_status, version_number, created_at),
      uploader:profiles!visa_documents_uploaded_by_fkey(id, full_name)
    `)
    .eq('visa_application_id', visaApplicationId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createVisaDocumentEntry(payload) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('visa_documents')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateVisaDocumentEntry(id, payload) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('visa_documents')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteVisaDocumentEntry(id) {
  const supabase = getSupabase();
  const { error } = await supabase.from('visa_documents').delete().eq('id', id);
  if (error) throw error;
  return true;
}

