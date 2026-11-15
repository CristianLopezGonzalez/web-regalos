/**
 * `npm run start:demo` swaps config.ts for this file (angular.json → configurations.demo):
 * no anon key, so the app runs on DemoApi with sample data that lives in the browser.
 * Lets anyone preview a change without touching the real Supabase project.
 */
export const SUPABASE_CONFIG = {
  url: '',
  anonKey: '',
};

export const useSupabase = () => !!SUPABASE_CONFIG.url && !!SUPABASE_CONFIG.anonKey;
