import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

let supabaseInstance = null;

/**
 * Returns the singleton Supabase admin client using the service role key.
 * Never expose this client or key to frontend code.
 */
export function getSupabase() {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
    throw new Error('Supabase URL and Service Role Key must be configured in environment variables.');
  }

  supabaseInstance = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  return supabaseInstance;
}

/**
 * Allows injecting a mock Supabase client during unit/integration tests.
 */
export function setSupabaseClientForTesting(mockClient) {
  supabaseInstance = mockClient;
}

