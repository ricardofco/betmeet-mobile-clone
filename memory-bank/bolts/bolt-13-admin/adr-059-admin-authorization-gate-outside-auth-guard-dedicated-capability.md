# ADR-059 — ADMIN-1's mobile-side gate stays outside `auth-guard.ts`/`ScreenClass`; a dedicated `admin.checkAccess` capability, checked twice, independently

## Status
Accepted (2026-07-06).

## Context

BR-7.1/BR-7.13 (`model.md §2`): *"Solo usuarios con verificationStatus ===
'ADMIN' acceden a /admin/* y a las acciones admin. Doble defensa: gating en
proxy.ts (redirección de no-admins) Y requireAdmin() server-side en cada
acción/consulta."* betmeet-clone's `verificationStatus` is a plain DB column,
re-queried fresh on every call (`getAdminUserId()`), **never a JWT claim** —
confirmed both against betmeet-clone's real Access Token Hook migrations
(which inject only `email_verified`/`onboarding_completed`/
`account_deleted`) and against this backend's own `auth.ts` middleware
(`req.auth` carries only `userId`/`emailVerified`/`onboardingCompleted`/
`accountDeleted`, no `verificationStatus` field anywhere).

This repo's `ScreenClass`/`evaluateGuard()` model (`src/domain/auth/
auth-guard.ts`) has no "admin" concept today — confirmed a real, existing gap,
not an oversight to silently work around (`model.md §2`). `evaluateGuard()`
is a **pure function** over the Zustand `AuthClaims`-shaped session store —
no async DB call happens inside it today, and this six-rule gate has been
treated as stable and verified-by-decision-table since Bolt 1.

`design.md §2.1` weighed extending `ScreenClass`/`evaluateGuard()` with a new
tag + a new claims-adjacent signal against gating purely inside the Admin
surface itself, and chose the latter: smuggling a DB-derived, non-JWT fact
into a pure function built for JWT-claim-shaped state would be a structural
change to a core gate, disproportionate for hiding one Settings row.

## Decision

**`auth-guard.ts`/`screen-registry.ts` are untouched.** `Admin`'s route is
tagged `['protected']` — the same tag as every other authenticated screen
(`Home`/`Predictions`/`Pools`/`Rankings`/`Education`); nothing admin-specific
is encoded in `ScreenClass`.

Instead, two independent, client-side enforcement points (`design.md §2.2`),
both against the same new, dedicated backend capability:

```
GET-shaped: admin.checkAccess → { isAdmin: boolean }
```

1. **Settings-row visibility** (`account-settings-screen.tsx`) — a new row,
   rendered only when `useAdminAccessQuery()` resolves `isAdmin: true`; while
   loading, the row is simply not rendered. **Advisory-only** — real product
   polish, not a security boundary.
2. **`AdminHomeScreen`'s own mount-time re-check** (inside the `admin`
   remote) — calls the **same** capability again, independently, its own
   query instance, not reusing whatever cached result the host's Settings
   screen already had. Renders an access-denied `ErrorState` if `false`, the
   real dashboard only if `true`.

`admin.checkAccess` is a **dedicated capability**, not an addition to
`profile.getProfile`'s response (`design.md §3.1`), for three reasons: (1)
contract hygiene — `profile.getProfile` is a hot, stable contract for
`nickname`/`avatar`/`locale`/`cooldown`; growing it with a security-relevant
field for the ~100% of users for whom it's always `false` entangles unrelated
concerns; (2) caching correctness — `profile.getProfile` is reasonably
long-cache-lived; a security-relevant boolean piggybacked on it would inherit
that caching policy, risking a stale `isAdmin` read exactly where freshness
matters most, whereas `admin.checkAccess` gets its own explicit
`staleTime: 0`; (3) matches the ubiquitous language — ADMIN-1 is its own named
domain concept, deserving its own `admin.*` capability group the same way
`rankings.*`/`pools.*` each own theirs.

**The authoritative gate remains entirely server-side, unchanged by any of
this**: every one of `admin.*`'s handlers (`getScoringSweepStatus`,
`triggerScoringSweep`, `listMatches`, `forceMatchResult`,
`revertMatchOverride`) independently calls a fresh
`requireAdmin(userId): Promise<boolean>` (`backend/src/services/admin/
require-admin.ts` — a fresh `prisma.profile.findUnique` every call, never
cached across requests, mirroring betmeet-clone's own `getAdminUserId()`
exactly). Neither client-side check is ever trusted as the real boundary —
this is the exact same "advisory client, authoritative server" discipline
ADR-023 (kickoff-lock) and ADR-038 (anti-bias masking) already established in
this repo, applied here to an authorization gate instead of a business-state
or privacy rule.

## Consequences

- **Permanent instruction** (same class as ADR-038's): any future bolt that
  adds a new `admin.*` capability, or any handler that touches admin-gated
  data, must independently re-verify `verificationStatus === 'ADMIN'` via a
  fresh DB read on every call — no caching the result across requests, no
  trusting a client-supplied flag, no relying solely on a UI-level gate. A
  failure of this server-side check (bypassed or misconfigured) would expose
  every `admin.*` capability's full mutation blast radius to any
  authenticated user (`model.md §7`'s risk register) — this is why the
  server-side re-check is non-negotiable, not merely one of several
  equivalent options.
- `ScreenClass`'s six-rule decision table (`auth-guard.ts`, stable since Bolt
  1) gains zero new tags and zero new branches from this bolt — a
  deliberately narrow footprint on a core, previously-untouched gate.
- If a future bolt needs to hide multiple admin-only screens (not just one
  Settings row + one remote-entry re-check), the two-call-site pattern
  established here (one advisory UI-visibility call, one authoritative-adjacent
  mount-time re-check) should be reused rather than inventing a new shape —
  and if the number of admin-gated screens grows significantly, extending
  `ScreenClass` with a real `admin` tag (backed by a claims-adjacent signal)
  should be re-examined rather than assumed permanently unnecessary, same
  discipline this ADR itself just applied to the Inception-era gate.
