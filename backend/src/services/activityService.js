import { getSupabase } from '../config/supabase.js';

export async function logActivity({
  actorId = null,
  studentId = null,
  entityType,
  entityId = null,
  action,
  description,
  metadata = {},
  ipAddress = null
}) {
  try {
    const supabase = getSupabase();
    await supabase.from('activity_logs').insert({
      actor_id: actorId,
      student_id: studentId,
      entity_type: entityType,
      entity_id: entityId,
      action,
      description,
      metadata,
      ip_address: ipAddress
    });
  } catch (err) {
    // Audit log failure should never crash primary business flow, but log cleanly
    console.error('Activity log write failed:', err.message);
  }
}

export async function listActivityLogs({ page = 1, limit = 25, studentId, entityType, action, counselorStudentIds = null }) {
  const supabase = getSupabase();
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('activity_logs')
    .select(
      `
      id,
      entity_type,
      entity_id,
      action,
      description,
      metadata,
      ip_address,
      created_at,
      student_id,
      actor:profiles!activity_logs_actor_id_fkey(id, full_name, role, email),
      student:students!activity_logs_student_id_fkey(id, student_code, full_name)
    `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(from, to);

  if (studentId) query = query.eq('student_id', studentId);
  if (entityType) query = query.eq('entity_type', entityType);
  if (action) query = query.eq('action', action);
  if (Array.isArray(counselorStudentIds)) {
    if (counselorStudentIds.length === 0) {
      return { data: [], count: 0 };
    }
    query = query.in('student_id', counselorStudentIds);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: data || [], count: count || 0 };
}

