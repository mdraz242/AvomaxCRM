import { getSupabase } from '../config/supabase.js';

export async function listDocuments({ studentId, category, verificationStatus, includeHistory = false, counselorScopeId = null } = {}) {
  const supabase = getSupabase();
  let query = supabase
    .from('student_documents')
    .select(`
      *,
      uploader:profiles!student_documents_uploaded_by_fkey(id, full_name, role),
      verifier:profiles!student_documents_verified_by_fkey(id, full_name),
      student:students!student_documents_student_id_fkey(id, student_code, full_name, assigned_counselor_id, deleted_at)
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (studentId) query = query.eq('student_id', studentId);
  if (category) query = query.eq('category', category);
  if (verificationStatus) query = query.eq('verification_status', verificationStatus);
  if (!includeHistory) query = query.eq('is_latest', true);

  const { data, error } = await query;
  if (error) throw error;

  let rows = (data || []).filter((d) => d.student && !d.student.deleted_at);
  if (counselorScopeId) {
    rows = rows.filter((d) => d.student.assigned_counselor_id === counselorScopeId);
  }
  return rows;
}

export async function findDocumentById(id) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('student_documents')
    .select(`
      *,
      uploader:profiles!student_documents_uploaded_by_fkey(id, full_name, role),
      verifier:profiles!student_documents_verified_by_fkey(id, full_name),
      student:students!student_documents_student_id_fkey(id, student_code, full_name, assigned_counselor_id, deleted_at)
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

export async function findDocumentVersions(documentGroupId) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('student_documents')
    .select(`
      *,
      uploader:profiles!student_documents_uploaded_by_fkey(id, full_name, role),
      verifier:profiles!student_documents_verified_by_fkey(id, full_name)
    `)
    .eq('document_group_id', documentGroupId)
    .is('deleted_at', null)
    .order('version_number', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getNextDocumentVersion(studentId, documentGroupId) {
  if (!documentGroupId) return { versionNumber: 1, groupId: null };

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('student_documents')
    .select('version_number')
    .eq('student_id', studentId)
    .eq('document_group_id', documentGroupId)
    .is('deleted_at', null)
    .order('version_number', { ascending: false })
    .limit(1);

  if (error) throw error;
  const maxVersion = data?.[0]?.version_number || 0;
  return { versionNumber: maxVersion + 1, groupId: documentGroupId };
}

export async function markPreviousVersionsNotLatest(documentGroupId) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('student_documents')
    .update({ is_latest: false })
    .eq('document_group_id', documentGroupId)
    .eq('is_latest', true);

  if (error) throw error;
}

export async function insertDocumentMetadata(payload) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('student_documents')
    .insert(payload)
    .select(`
      *,
      uploader:profiles!student_documents_uploaded_by_fkey(id, full_name, role)
    `)
    .single();

  if (error) throw error;
  return data;
}

export async function updateDocumentRecord(id, payload) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('student_documents')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function softDeleteDocumentRecord(id) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('student_documents')
    .update({ deleted_at: new Date().toISOString(), is_latest: false })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

