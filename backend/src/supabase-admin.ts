import { createClient } from '@supabase/supabase-js';
import { env } from './env';

/**
 * Service-role client — bypasses RLS, used only for: Storage signed-upload
 * URLs (avatar upload) and Auth's public `resend` endpoint. Never exposed to
 * mobile. Mirrors betmeet-clone's src/lib/supabase/admin.ts isolation (one
 * file reads the service-role key).
 */
export const supabaseAdmin = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
