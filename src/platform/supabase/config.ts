/**
 * Supabase project configuration.
 *
 * TODO(unit-01-auth bolt): wire real env-var injection (e.g. `react-native-config`
 * or a build-time `.env` loader) before any bolt that performs a real sign-in.
 * Bolt 0's job is to prove the SupabaseAdapter seam compiles and is the single
 * door into the Supabase SDK (requirements.md §7.2) — not to ship working auth.
 * Until real values are wired, `createSupabaseAdapter()` throws a clear error
 * rather than silently hitting an invalid endpoint.
 */
export type SupabaseConfig = {
  url: string;
  anonKey: string;
};

declare const process: { env: Record<string, string | undefined> };

export function readSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return null;
  }
  return { url, anonKey };
}
