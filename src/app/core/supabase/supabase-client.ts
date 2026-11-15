import { InjectionToken } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from '../config/supabase-config';

/**
 * The Supabase client, as a promise: the SDK is loaded on demand so it never delays the first
 * paint (hero). A token so tests can hand SupabaseApi a fake client.
 */
export const SUPABASE_CLIENT = new InjectionToken<Promise<SupabaseClient>>('SUPABASE_CLIENT', {
  providedIn: 'root',
  factory: () =>
    import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: 'pkce',
        },
      }),
    ),
});
