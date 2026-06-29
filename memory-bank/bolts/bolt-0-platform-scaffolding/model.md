# Bolt 0 — Platform Scaffolding — Model Stage

> **Stage 1 of 5 (Model).** DDD domain modeling, framework-free, no UI. Checkpoint: pause for approval before Design.

## Why Bolt 0 has a thin "domain"

Bolt 0 is infrastructure (per `bolt-plan.md`): Module Federation scaffold, the Supabase encapsulation adapter, the Backend-API client skeleton, secure-storage wiring, and the ADRs resolving `requirements.md §8`'s deferred choices. It has no business entities of its own (no `Prediction`, no `Pool`) — its "ubiquitous language" is the **architecture's own seams**: the vocabulary every later bolt will use to talk about a session, and the two boundary contracts (`requirements.md §7.2` NFR) that no feature module is allowed to bypass.

Getting this vocabulary right now matters: `unit-01-auth`'s AUTH-7 (navigation guard) and AUTH-8 (secure session) are literally the next bolt and consume these types directly.

## Domain concepts introduced by this bolt

### `AuthClaims` (value object)

The exact claim shape `domain-overview.md §6` requires the navigation guard (Bolt 1, AUTH-7) to read — modeled here, not there, because the Supabase adapter is what decodes/exposes it.

```ts
type AuthClaims = {
  sub: string | null;           // user id, or null if unauthenticated
  emailVerified: boolean | null;     // null = claim absent → caller must fail OPEN
  onboardingCompleted: boolean | null; // null = claim absent → caller must fail OPEN
  accountDeleted: boolean | null;    // null = claim absent → caller must fail OPEN
  aal: { current: 'aal1' | 'aal2'; next: 'aal1' | 'aal2' } | null; // MFA assurance level
};
```

**Ubiquitous-language rule, binding for every consumer:** a `null` value on `emailVerified` / `onboardingCompleted` / `accountDeleted` means "claim absent" and must be treated as fail-open, never coerced to `false`. This is the exact semantic `domain-overview.md §6` calls "fails open on absence, strict on explicit value" — encoding it as a real tri-state (`true | false | null`) in the type itself, rather than a plain `boolean`, is what makes that rule impossible to accidentally violate in a later bolt (a careless `!claims.emailVerified` would silently break the fail-open guarantee; a tri-state forces the caller to handle `null` explicitly).

### `AuthSession` (value object)

```ts
type AuthSession = {
  claims: AuthClaims;
  accessToken: string | null;
  refreshToken: string | null;
};
```

### `SupabaseAdapter` (the contract, `system-context.md §2`)

The **single seam** every Supabase interaction in the app must go through. Modeled here as an interface only — no implementation yet (that's Implement). Scoped to what Bolt 0 must establish; auth/storage/realtime *method bodies* with real business behavior belong to the bolts that need them (Bolt 1 for auth methods, Bolt 2 for profile/storage, etc.) — Bolt 0's job is to fix the **shape** of the seam so nothing downstream invents a second one.

```ts
interface SupabaseAdapter {
  // Auth
  getSession(): Promise<AuthSession | null>;
  onSessionChange(listener: (session: AuthSession | null) => void): () => void; // returns unsubscribe
  // (signIn/signUp/signOut/MFA/OAuth method signatures are added when unit-01-auth's
  // bolts implement them — Bolt 0 only fixes that they will live on this one interface)

  // Storage
  // (signed-upload-url / public-url methods added when unit-02-profile needs them)

  // Realtime
  // (broadcast-subscribe method added when unit-04-competition needs it)
}
```

**Ubiquitous-language rule:** "talking to Supabase" and "calling `SupabaseAdapter`" are the same sentence everywhere else in this codebase. A code reviewer's question for any PR touching auth/storage/realtime is "does this go through the adapter?" — not "is this allowed here?".

### `BackendApiClient` (the contract, `system-context.md §3`)

The seam for business-rule-bearing operations per `requirements.md §7.1` (Option A). Modeled as a generic, typed request capability — not yet bound to real endpoints, since the backend's contract/hosting is still pending on the web/backend side.

```ts
interface BackendApiClient {
  request<TResponse, TBody = undefined>(spec: {
    capability: string;     // a stable name, e.g. "predictions.save" — not a URL; the
                             // concrete transport (REST path, RPC method) is an
                             // implementation detail behind this client, swappable
                             // without touching any feature module
    body?: TBody;
  }): Promise<TResponse>;
}
```

**Ubiquitous-language rule:** feature modules call `backendApiClient.request({ capability: '...' })`, never `fetch(...)` directly and never importing a concrete URL/path. This is what makes "we don't know yet where the backend physically lives" (`requirements.md §5`) a non-blocking fact rather than a stalling one — the capability names are stable even while the transport underneath is still being decided by the backend/web side.

## Explicitly not modeled in this bolt

- Any business entity (`Prediction`, `Pool`, `Profile`, etc.) — those belong to the units that own them, starting in Bolt 1/3.
- Concrete `SupabaseAdapter` auth method signatures beyond session read/observe — Bolt 1 (AUTH-1/7/8) adds them.
- Concrete `BackendApiClient` capability names beyond the shape of `request()` — each unit's bolt adds its own capability names when it needs them.
- State-management or navigation domain modeling — those libraries aren't chosen until the Design/ADR stages below.

## Checkpoint

Pausing here for approval before Design (component/data-flow design, host-vs-remote placement details beyond what `system-context.md` already fixed, and where these types/interfaces physically live in the repo's folder structure).
