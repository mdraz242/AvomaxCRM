import { getSupabase } from '../config/supabase.js';

export async function getAllSettings() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('system_settings')
    .select('*')
    .order('setting_key', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function upsertSetting(key, value, updatedBy) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('system_settings')
    .upsert(
      {
        setting_key: key,
        setting_value: value,
        updated_by: updatedBy
      },
      { onConflict: 'setting_key' }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

