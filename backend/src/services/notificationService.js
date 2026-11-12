import { ROLES } from '../config/constants.js';
import { getSupabase } from '../config/supabase.js';

/**
 * Dispatches notifications to the student's assigned counselor and active admins/super_admins
 * (excluding the actor if desired, or including assigned counselor when assigned).
 */
export async function notifyStakeholders({
  studentId = null,
  assignedCounselorId = null,
  actorId = null,
  eventType,
  title,
  message,
  includeAssignedCounselorAlways = false
}) {
  try {
    const supabase = getSupabase();

    // Find all active Super Admins & Admins
    const { data: admins } = await supabase
      .from('profiles')
      .select('id')
      .in('role', [ROLES.SUPER_ADMIN, ROLES.ADMIN])
      .eq('is_active', true);

    const recipientSet = new Set((admins || []).map((a) => a.id));
    if (assignedCounselorId) {
      recipientSet.add(assignedCounselorId);
    }

    if (actorId && !includeAssignedCounselorAlways) {
      recipientSet.delete(actorId);
    } else if (actorId && includeAssignedCounselorAlways && actorId !== assignedCounselorId) {
      recipientSet.delete(actorId);
    }

    if (recipientSet.size === 0) return;

    const rows = Array.from(recipientSet).map((recipientId) => ({
      recipient_id: recipientId,
      student_id: studentId,
      event_type: eventType,
      title,
      message
    }));

    await supabase.from('notifications').insert(rows);
  } catch (err) {
    console.error('Notification dispatch failed:', err.message);
  }
}

export async function listNotifications(userId, { unreadOnly = false, limit = 30 } = {}) {
  const supabase = getSupabase();
  let query = supabase
    .from('notifications')
    .select(
      `
      id,
      student_id,
      event_type,
      title,
      message,
      is_read,
      read_at,
      created_at,
      student:students!notifications_student_id_fkey(id, student_code, full_name)
    `
    )
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (unreadOnly) {
    query = query.eq('is_read', false);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function markNotificationRead(userId, notificationId) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('recipient_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function markAllNotificationsRead(userId) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('recipient_id', userId)
    .eq('is_read', false);

  if (error) throw error;
  return true;
}

