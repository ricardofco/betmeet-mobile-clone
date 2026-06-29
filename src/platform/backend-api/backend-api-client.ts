import { getSupabaseAdapter } from '@/platform/supabase/supabase-adapter';

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
 */
export interface BackendApiClient {
  request<TResponse, TBody = undefined>(spec: {
    capability: string;
    body?: TBody;
  }): Promise<TResponse>;
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
 * TODO(per-unit bolts): replace with the real base URL once the backend's
 * hosting location is decided (system-context.md §3). Bolt 0 only proves the
 * seam compiles end-to-end (auth-token attachment, capability dispatch,
 * error shape) — every later bolt adds its own capability names, not its own
 * transport.
 */
declare const process: { env: Record<string, string | undefined> };

class FetchBackendApiClient implements BackendApiClient {
  async request<TResponse, TBody = undefined>(spec: {
    capability: string;
    body?: TBody;
  }): Promise<TResponse> {
    const baseUrl = process.env.BACKEND_API_BASE_URL;
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
}

let cachedClient: BackendApiClient | null = null;

export function getBackendApiClient(): BackendApiClient {
  if (!cachedClient) {
    cachedClient = new FetchBackendApiClient();
  }
  return cachedClient;
}
