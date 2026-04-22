import { createClient } from '@supabase/supabase-js';

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Singleton — reuse same instance across HMR reloads
const GLOBAL_KEY = '__cat2026_supabase__';

if (!globalThis[GLOBAL_KEY]) {
  globalThis[GLOBAL_KEY] = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession:    true,
      autoRefreshToken:  true,
      detectSessionInUrl: true,
      storageKey: 'cat2026-auth-token',
      // Bypass navigator.locks entirely — eliminates ALL "lock stolen" errors.
      // Safe for single-tab SPAs; sessions still persist in localStorage.
      lock: (_name, _acquireTimeout, fn) => fn(),
    },
  });
}

export const supabase = globalThis[GLOBAL_KEY];
