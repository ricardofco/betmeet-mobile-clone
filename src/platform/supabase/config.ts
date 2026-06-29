/**
 * Supabase project configuration.
 *
 * Env-var injection (unit-01-auth/Bolt 1): `react-native-config` reads a
 * root `.env` file at native-build time and exposes its keys as a plain JS
 * object — no Rspack/Metro bundler config needed (it's a native module, not
 * a bundler-time `DefinePlugin` substitution), which keeps this working
 * identically whether the host is built via Re.Pack or (legacy) Metro.
 * `.env` itself is git-ignored; `.env.example` documents the required keys
 * for a fresh checkout. Until a real `.env` is present, `readSupabaseConfig`
 * returns `null` and `getSupabaseAdapter()` throws a clear error rather than
 * silently constructing a client pointed at an invalid endpoint.
 */
import Config from 'react-native-config';

export type SupabaseConfig = {
  url: string;
  anonKey: string;
};

export function readSupabaseConfig(): SupabaseConfig | null {
  const url = Config.SUPABASE_URL;
  const anonKey = Config.SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return null;
  }
  return { url, anonKey };
}
