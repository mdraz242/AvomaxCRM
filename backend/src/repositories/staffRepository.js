import { getSupabase } from '../config/supabase.js';

const SAFE_PROFILE_FIELDS = 'id, full_name, email, role, phone, department, avatar_url, is_active, last_login_at, created_at, updated_at';

export async function findProfileByEmail(email) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .ilike('email', email.trim())
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

export async function findProfileById(id) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('profiles')
    .select(SAFE_PROFILE_FIELDS)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

export async function findProfileWithHashById(id) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

export async function listStaffProfiles({ role, is_active, search } = {}) {
  const supabase = getSupabase();
  let query = supabase
    .from('profiles')
    .select(SAFE_PROFILE_FIELDS)
    .order('created_at', { ascending: false });

  if (role) query = query.eq('role', role);
  if (typeof is_active === 'boolean') query = query.eq('is_active', is_active);
  if (search) {
    const clean = search.replace(/[%_,()]/g, ' ').trim();
    if (clean) {
      query = query.or(`full_name.ilike.%${clean}%,email.ilike.%${clean}%,department.ilike.%${clean}%`);
    }
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function createStaffProfile(payload) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('profiles')
    .insert(payload)
    .select(SAFE_PROFILE_FIELDS)
    .single();

  if (error) throw error;
  return data;
}

export async function updateStaffProfile(id, payload) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', id)
    .select(SAFE_PROFILE_FIELDS)
    .single();

  if (error) throw error;
  return data;
}

