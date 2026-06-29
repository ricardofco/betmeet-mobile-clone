import Config from 'react-native-config';
import { getSupabaseAdapter } from '@/platform/supabase/supabase-adapter';
import type { ResendConfirmationResponse } from '@/domain/auth/resend-cooldown';

/**
 * The seam for every business-rule-bearing operation (system-context.md §3 —
 * nickname assignment, pool capacity/invites, prediction validation, scoring,
 * notification dispatch, admin overrides). Feature modules call
 * `backendApiClient.request({ capability, body })` — never `fetch(...)`
 * directly, never a hardcoded URL. `capability` is a stable name (e.g.
 * `"predictions.save"`), not a path: the concrete transport is an
 * implementation detail behind this client, swappable without touching any
 * feature module once the backend's physical hosting location is decided
 * (requirements.md §7.1 — out of this repo's authority).
 *
 * `resendConfirmation` (AUTH-1, ADR-003): the 60s-per-email resend cooldown
 * is enforced server-side via the `auth.resendConfirmation` capability, not
 * by the Supabase adapter — cooldown enforcement is explicitly "beyond
 * Supabase Auth itself" per system-context.md §3, and the Supabase adapter
 * stays strictly Supabase-only per system-context.md §2.
 */
export interface BackendApiClient {
  request<TResponse, TBody = undefined>(spec: {
    capability: string;
    body?: TBody;
  }): Promise<TResponse>;

  resendConfirmation(email: string): Promise<ResendConfirmationResponse>;
}

export class BackendApiError extends Error {
  constructor(
    message: string,
    public readonly capability: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'BackendApiError';
  }
}

/**
 * `BACKEND_API_BASE_URL` is read via `react-native-config` (same mechanism
 * as `SUPABASE_URL`/`SUPABASE_ANON_KEY`, see platform/supabase/config.ts) —
 * replace the `.env` value once the backend's hosting location is decided
 * (system-context.md §3). This client only proves the seam compiles
 * end-to-end (auth-token attachment, capability dispatch, error shape) —
 * every later bolt adds its own capability names, not its own transport.
 */
class FetchBackendApiClient implements BackendApiClient {
  async request<TResponse, TBody = undefined>(spec: {
    capability: string;
    body?: TBody;
  }): Promise<TResponse> {
    const baseUrl = Config.BACKEND_API_BASE_URL;
    if (!baseUrl) {
      throw new BackendApiError(
        'Missing BACKEND_API_BASE_URL — wire real backend configuration before calling this capability for real.',
        spec.capability,
      );
    }

    const session = await getSupabaseAdapter().getSession();

    const response = await fetch(`${baseUrl}/${spec.capability}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {}),
      },
      body: spec.body !== undefined ? JSON.stringify(spec.body) : undefined,
    });

    if (!response.ok) {
      throw new BackendApiError(
        `Backend API call failed (${response.status})`,
        spec.capability,
        response.status,
      );
    }

    return (await response.json()) as TResponse;
  }

  async resendConfirmation(email: string): Promise<ResendConfirmationResponse> {
    return this.request<ResendConfirmationResponse, { email: string }>({
      capability: 'auth.resendConfirmation',
      body: { email },
    });
  }
}

let cachedClient: BackendApiClient | null = null;

export function getBackendApiClient(): BackendApiClient {
  if (!cachedClient) {
    cachedClient = new FetchBackendApiClient();
  }
  return cachedClient;
}
