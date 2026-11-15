/**
 * Public client configuration. Both values are designed to be public: the anon key only grants
 * what Row Level Security allows. NEVER put the service_role key or the database password here.
 * With an empty anonKey the app runs in demo mode (DemoApi).
 */
export const SUPABASE_CONFIG = {
  url: 'https://udiqnkdieiqfnxzlgjsc.supabase.co',
  // anon (public) key: role=anon in its payload. Safe in the browser; RLS decides what it can do.
  anonKey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkaXFua2RpZWlxZm54emxnanNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ2ODQ2NzgsImV4cCI6MjExMDI2MDY3OH0.IQu2Ql4T-FmY7oUzsENW0MV6iCqORDwhai_KRjsBX5U',
};

export const useSupabase = () => !!SUPABASE_CONFIG.url && !!SUPABASE_CONFIG.anonKey;
