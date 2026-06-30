# Bolt 3 — Profile & Onboarding — Model Stage

> **Stage 1 of 5 (Model).** DDD domain modeling, framework-free, no UI. Checkpoint: pause for approval before Design.

## Scope recap

This bolt covers five stories: **PROFILE-1** (nickname assignment/cooldown), **PROFILE-2** (avatar selection/upload), **PROFILE-3** (locale preference), **PROFILE-4** (onboarding wizard shell), **PROFILE-5** (settings screen composition). Placement: **host bundle** (system-context.md §4 — onboarding-completion gating is load-bearing).

This bolt does **not** touch `AuthGatedNavigator`'s guard logic itself (ADR-001/ADR-008 stay closed) — it only ever writes the `onboarding_completed` claim via the backend, which the existing guard (rule 5) already reads. It does not re-implement TOTP enrollment (AUTH-3, Bolt 2) — the wizard's final step navigates into the existing `TotpEnrollmentScreen`.

> **Correction note (post-checkpoint, before Design):** §2.2's nickname-cooldown decision table below originally modeled **two** free post-onboarding nickname changes. This was wrong — confirmed against `betmeet-clone`'s actual `setNickname` server action (the real, running source of truth), which gates on `nicknameChangeCount >= 2` (i.e. the 3rd+ nickname-setting event overall = the **2nd+ post-onboarding** change). The rule is exactly **one** free post-onboarding grace change, then a 30-day cooldown. The root cause was ambiguous AC wording in `PROFILE-1-nickname.md`, since corrected; `unit-brief.md`'s "Source rules" line ("one free post-onboarding change") was correct all along. §2.2 below has been corrected to match. Full reconciliation recorded as ADR-011 in the ADR stage.

---

## 1. Ubiquitous Language Extensions

| Term | Precise meaning |
|---|---|
| **Nickname** | A user's public identity, `base#NNNN`. `base`: 3–20 chars, `^[a-zA-Z0-9_-]+$`. `NNNN`: a random, zero-padded 4-digit discriminator assigned by the backend (never user-chosen). |
| **Discriminator** | The 4-digit suffix disambiguating two users with the same `base`. Server-assigned; client never proposes a value. |
| **Base availability** | A `base` is "available" while fewer than 9999 of its 10000 possible discriminators are taken. This is a server-computed fact (`nickname.checkAvailability` capability) — the client never derives it locally. |
| **Nickname change** | Any backend-accepted mutation of a profile's `base`/discriminator pair after the *initial* onboarding assignment. Tracked by the backend's own counter/cooldown state — the client holds no independent count. |
| **Onboarding-exempt change** | The very first nickname assignment, made *during* onboarding (`onboarding_completed` still `false`). Unlimited — the user can retype and recheck availability as many times as they want before submitting. |
| **Free grace change** | The **first** nickname change made *after* `onboarding_completed` is `true`. Exempt from the 30-day cooldown. |
| **Cooldown window** | 30 days from `lastChangeAt`, the timestamp of the most recent **permitted** change (the grace change itself, or a prior post-cooldown change — not just a rate-limited attempt). Applies starting with the **second** post-onboarding change (i.e. the third nickname-setting event overall, counting the onboarding assignment). |
| **Nickname Cooldown State** | The client-visible projection of the backend's cooldown bookkeeping: whether a change is currently allowed, and if not, how many days remain. Always re-derived from a fresh backend read before allowing a change attempt — never cached indefinitely (model §2.1). |
| **Avatar source** | One of three origins for a profile's avatar: `google` (synced from the OAuth identity's photo), `default` (a seeded set, server- or bundle-provided), `custom` (user-uploaded file). Exactly one is active at a time; it is server-authoritative state, not derived client-side from "is this user signed in via Google." |
| **Avatar precedence rule** | A `custom` avatar is **sticky**: once active, a Google sign-in (fresh OAuth identity sync) must never silently switch the active source back to `google`. Only an explicit user action (picking a different source) changes `avatarSource`. |
| **Signed upload URL** | A short-lived, backend-issued URL (Supabase Storage signed-URL pattern, system-context.md §2) the client `PUT`s the raw image bytes to directly — never a multipart POST to a custom backend endpoint. |
| **Locale** | `es` (default) or `en`. Explicit user choice always wins over device locale; persisted both locally (instant restart-survival) and server-side (`Profile.locale`, cross-device sync). |
| **Onboarding Wizard** | The linear, back-navigable sequence of steps a newly-signed-up user must traverse once: `nickname → avatar → rules → notifications → second-factor`. Required steps: `nickname`, `avatar`. Skippable, non-blocking steps: `rules`, `notifications`. The final step (`second-factor`) is also non-blocking (model §3 below — concrete decision recorded as ADR-010). |
| **Onboarding Step** | A single named stage in the wizard with a completion state (`pending | done | skipped`) tracked only in **ephemeral client state** for the duration of the wizard session — never persisted as "step N seen" server-side (domain-overview.md §4.4: "no seen-rules state is persisted"). The only durable, server-written fact at the end is the single `onboarding_completed` boolean. |
| **Intended destination honoring** | Per PROFILE-4's AC and AUTH-7's existing `pendingDestination` mechanism (ADR-002, Bolt 1): once onboarding completes, the user lands on whatever screen they were originally headed to, not unconditionally on Home. This bolt does not invent a new mechanism — it relies on the existing Zustand `pendingDestination` field already being populated by the guard's rule-5 redirect. |

---

## 2. New Domain Concepts

### 2.1 `NicknameAvailability` (value object)

```ts
type NicknameAvailability =
  | { status: 'available' }
  | { status: 'taken' }
  | { status: 'invalid'; reason: 'too-short' | 'too-long' | 'invalid-characters' };
```

Pure client-side validator (format only, never decides "taken" — that's always a backend round-trip):

```ts
function validateNicknameBase(base: string): NicknameAvailability
```

Domain rules:
- 3–20 characters.
- Matches `^[a-zA-Z0-9_-]+$` exactly — any other character (including spaces, emoji, accented letters) is `invalid-characters`.
- This function never returns `'taken'` — that status is only produced by interpreting a backend response (see `interpretAvailabilityResponse` below). Keeping the two concerns (format vs. uniqueness) in separate functions means the format check runs instantly, client-side, before any network call (PROFILE-1 AC: "rejected client-side before any network call").

```ts
function interpretAvailabilityResponse(raw: { available: boolean }): NicknameAvailability
```

### 2.2 `NicknameChangeEligibility` (the highest-risk logic in this bolt)

```ts
type NicknameChangeEligibility =
  | { allowed: true }
  | { allowed: false; cooldownEndsAt: string };  // ISO date string
```

Pure function, given the backend-reported cooldown bookkeeping (never computed from a client-side change counter — the client doesn't keep its own count across sessions):

```ts
type NicknameCooldownInput = {
  onboardingCompleted: boolean;
  /** Number of nickname changes made strictly after onboarding completed. 0 = no post-onboarding change yet. Server-counted. */
  postOnboardingChangeCount: number;
  /** ISO timestamp of the most recent post-onboarding change, or null if none yet. */
  lastChangeAt: string | null;
  /** The "now" the eligibility is evaluated against — injected, not `Date.now()` internally, so this stays a pure function (testability). */
  now: string;
};

function evaluateNicknameChangeEligibility(input: NicknameCooldownInput): NicknameChangeEligibility
```

Domain rules (domain-overview.md §5.2, PROFILE-1 AC as corrected, restated precisely as a decision table):

| `onboardingCompleted` | `postOnboardingChangeCount` | Outcome |
|---|---|---|
| `false` | (any) | `allowed: true` — unlimited while onboarding incomplete; this path is actually only reachable in practice via the wizard's nickname step, not this eligibility check (the wizard doesn't gate on cooldown at all — see §3) |
| `true` | `0` | `allowed: true` — the one free grace change (the first nickname-setting event after onboarding completed) |
| `true` | `>= 1` | Rate-limited: `allowed: true` only if `now >= lastChangeAt + 30 days`, else `allowed: false` with `cooldownEndsAt = lastChangeAt + 30 days` |

**Restated precisely** (correcting an earlier modeling error — see ADR-011 for the full reconciliation): there is **exactly one** free post-onboarding nickname change, not two. The **onboarding assignment** is change #0 (free, never counted — `onboardingCompleted` is still `false` at that point, so the gate condition doesn't even apply). The **first post-onboarding edit** is change #1 — the single "grace" change, exempt from cooldown. The **second post-onboarding edit** (change #2) is the first one ever rate-limited: it is rejected if attempted within 30 days of `lastChangeAt` (the timestamp of the most recent *permitted* change — the grace change, or a prior post-cooldown change). So `postOnboardingChangeCount` counts *completed* post-onboarding changes so far; `allowed: true` unconditionally only while `postOnboardingChangeCount === 0`; cooldown-gated from `postOnboardingChangeCount >= 1` onward, measured from `lastChangeAt`.

This mirrors the real app's (`betmeet-clone`) `setNickname` server action exactly: it gates on `existing.onboardingCompleted && existing.nicknameChangeCount >= 2 && existing.nicknameUpdatedAt`, where `nicknameChangeCount` counts *all* nickname-setting events including the initial onboarding assignment (so `nicknameChangeCount >= 2` means "this would be the 3rd+ nickname-setting event overall" = "the 2nd+ post-onboarding change"). Translated to this bolt's zero-based `postOnboardingChangeCount` (which excludes the onboarding assignment from the count), that same gate is `postOnboardingChangeCount >= 1`. `lastChangeAt` corresponds to the source's `nicknameUpdatedAt`, stamped on every permitted write (initial assignment, grace change, and post-cooldown changes alike).

- `cooldownEndsAt` is always returned as an ISO string so the UI can compute "N days remaining" itself (locale-aware formatting is a UI concern, not domain).
- Server is the final authority (PROFILE-1 AC: "enforced server-side regardless of what the client believes") — this function exists so the **Settings screen** (PROFILE-5) can show an accurate countdown/disabled-state without an extra round trip on every render, fed by the same payload the last successful profile fetch returned. It is advisory, exactly like the existing prediction-lock countdown pattern referenced in system-context.md §3.

### 2.3 `AvatarSource` (value object)

```ts
type AvatarSourceKind = 'google' | 'default' | 'custom';

type AvatarState = {
  source: AvatarSourceKind;
  url: string;
};
```

### 2.4 `AvatarUploadValidation` (pure validator, PROFILE-2 AC)

```ts
type AvatarUploadValidation =
  | { valid: true }
  | { valid: false; reason: 'too-large' | 'unsupported-type' };

const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

function validateAvatarUpload(file: { sizeBytes: number; mimeType: string }): AvatarUploadValidation
```

Domain rule: rejects client-side, before any signed-URL request is made, if `sizeBytes > MAX_AVATAR_BYTES` or `mimeType` isn't in the allowed set. This is a pure courtesy check mirroring `validateSignUpInput`'s existing pattern (Bolt 1) — the backend's signed-URL issuance is expected to re-validate (out of this bolt's authority; backend contract concern).

### 2.5 `DefaultAvatarSet` (value object + local-fallback rule, PROFILE-2 AC)

```ts
type DefaultAvatarOption = { id: string; url: string };

type DefaultAvatarSetResult =
  | { source: 'remote'; options: DefaultAvatarOption[] }
  | { source: 'local-fallback'; options: DefaultAvatarOption[] };
```

Domain rule: if the backend-provided seeded set fails to load, the picker substitutes a small bundled local set (mirrors the web app's local-fallback behavior, PROFILE-2 AC) rather than rendering empty. The local fallback set is a fixed, bundled constant (asset paths resolved at the platform/UI layer, not modeled further here).

### 2.6 `LocaleChoice` (value object, PROFILE-3)

```ts
type AppLocale = 'es' | 'en';

const DEFAULT_LOCALE: AppLocale = 'es';

function isSupportedLocale(value: string): value is AppLocale {
  return value === 'es' || value === 'en';
}
```

Domain rule: a first-time user's locale always initializes to `'es'`, **regardless of device language** — an explicit, recorded UX call for this Construction stage (PROFILE-3 AC requires this be a recorded decision, not silently inferred). See ADR-012.

### 2.7 `OnboardingStepId` and `OnboardingWizardState` (aggregate, PROFILE-4)

```ts
type OnboardingStepId = 'nickname' | 'avatar' | 'rules' | 'notifications' | 'second-factor';

const ONBOARDING_STEP_ORDER: OnboardingStepId[] = [
  'nickname',
  'avatar',
  'rules',
  'notifications',
  'second-factor',
];

type OnboardingStepStatus = 'pending' | 'done' | 'skipped';

type OnboardingWizardState = {
  currentStep: OnboardingStepId;
  stepStatus: Record<OnboardingStepId, OnboardingStepStatus>;
};
```

Pure transition functions:

```ts
function canAdvanceFrom(step: OnboardingStepId, status: OnboardingStepStatus): boolean
function nextStep(current: OnboardingStepId): OnboardingStepId | null  // null = wizard complete
function previousStep(current: OnboardingStepId): OnboardingStepId | null  // null = already at first step
function isStepRequired(step: OnboardingStepId): boolean  // true only for 'nickname' | 'avatar'
function isStepSkippable(step: OnboardingStepId): boolean  // true only for 'rules' | 'notifications' | 'second-factor'
```

Domain rules (domain-overview.md §4.4, PROFILE-4 AC):
- Fixed linear order, exactly `ONBOARDING_STEP_ORDER`.
- Stepping back is always allowed to any previously-visited step.
- Stepping forward past `nickname` or `avatar` requires `stepStatus[step] === 'done'` for that step specifically (`isStepRequired` true) — these can never be `'skipped'`.
- Stepping forward past `rules`, `notifications`, or `second-factor` is allowed whether that step's status is `'done'` or `'skipped'` (`isStepRequired` false for these).
- No step status is ever persisted beyond the wizard's in-memory session — closing/backgrounding the app mid-wizard and returning re-enters at `nickname` (no resume-at-step state; this is consistent with "no seen-rules state is persisted" generalized to the whole wizard, and avoids a half-built persistence contract this bolt doesn't need).
- Completing the final step (`second-factor`, whether done or skipped) is the sole trigger that calls the backend's onboarding-completion capability.

### 2.8 `OnboardingCompletionResult` (outcome)

```ts
type OnboardingCompletionResult =
  | { type: 'completed' }
  | { type: 'error' };
```

Domain rule: marking onboarding complete is a single backend call (`profile.completeOnboarding` capability, system-context.md §3) that returns success/failure only — the actual claim propagation back into `AuthClaims.onboardingCompleted` happens through the existing `onSessionChange` → Zustand store pipeline (ADR-002, Bolt 1), exactly like every other claim-affecting mutation in this app (e.g. Bolt 2's MFA verification). This bolt does **not** write to the Zustand store directly for this claim — same boundary rule as the rest of the app.

---

## 3. The "passkey step replacement" decision (flagged in unit-brief, resolved here)

`domain-overview.md §4.4` (source-of-truth for the *web app*) lists the wizard's final step as `passkey`. `requirements.md §7.5` is binding for *this* migration and states: **TOTP-only MFA at launch; native passkeys are explicitly deferred, not silently dropped.** There is therefore no passkey enrollment capability to invoke in this step at all — the unit-brief's bracketed note ("[MFA setup nudge]") is the only requirements-consistent substitution.

**Decision** (recorded in full as ADR-010): the wizard's final step, `second-factor`, is a **TOTP-enrollment nudge** — a screen that explains MFA, offers "Enable now" (navigating into the existing Bolt 2 `TotpEnrollmentScreen`, reused not rebuilt) and "Skip for now" (same non-blocking semantics as `rules`/`notifications` — domain-overview.md §4.4 doesn't carve out an exception for the last step, and PROFILE-4's AC only names `rules`/`notifications` as skippable but also says "the user can go back one step at a time but cannot skip ahead past an incomplete *required* step (nickname and avatar are required)" — implying every other step, including the last, is not required). This makes `second-factor` skippable by the same `isStepSkippable` rule as the other two optional steps (§2.7).

This keeps the wizard shell fully generic over its step list — `second-factor` is modeled identically to `rules`/`notifications` (skippable, status-tracked, no special-cased "this is the last step" branch beyond it being last in `ONBOARDING_STEP_ORDER`).

---

## 4. Domain state progressions

### PROFILE-1 — Nickname (onboarding assignment)

```
user types base name (wizard nickname step)
  │ validateNicknameBase(base) — client-side format check
  ▼
format valid → debounced backend availability check → interpretAvailabilityResponse
  │ status: available → user submits
  ▼
backend assigns discriminator, returns { base, discriminator } → nickname step → 'done'
```

### PROFILE-1 — Nickname (post-onboarding change, Settings)

```
Settings screen loads → fetch current NicknameCooldownInput from backend
  │ evaluateNicknameChangeEligibility(input, now: Date.now())
  ▼
allowed: true  → "Change nickname" enabled → same validate/check/submit flow as above
allowed: false → "Change nickname" disabled, shows "try again in N days" (cooldownEndsAt - now)
```

### PROFILE-2 — Avatar selection

```
wizard avatar step (or Settings "change avatar")
  │ user picks a source:
  ├─ 'default' → fetch DefaultAvatarSetResult (remote, falls back to local) → user taps one → submit
  ├─ 'google'  → only offered if the session's identity includes a Google-linked photo →  submit
  └─ 'custom'  → react-native-image-picker → validateAvatarUpload(file)
       │ valid
       ▼
     request signed upload URL (backend) → PUT bytes to signed URL → confirm with backend → avatarSource: 'custom'
  ▼
avatar step → 'done'
```

### PROFILE-2 — Avatar precedence on Google re-sign-in (background rule, not a screen)

```
user signs in via Google (any time after onboarding)
  │ backend re-syncs Google identity
  ▼
backend checks current avatarSource:
  'custom' → no change (sticky)
  'google' → refresh url from latest Google photo
  'default' → no change (only 'google'-sourced avatars auto-refresh)
```
This transition is entirely backend-owned (system-context.md §3: "avatar-source state transitions" is a listed backend capability) — the mobile client has no logic here beyond displaying whatever `AvatarState` the next profile fetch returns. Documented for completeness; not a function this bolt implements.

### PROFILE-3 — Locale

```
first profile load, no locale set yet → DEFAULT_LOCALE ('es') used, both locally and as the value synced to the backend on first write
user changes locale (Settings) → isSupportedLocale check → persist locally (instant) → sync to backend (Profile.locale)
app relaunch → read local persisted value first (instant, no flash-to-default) → reconciled against backend value on next profile fetch if they ever diverge (explicit user choice on either side always wins over a stale read — last-write-wins is sufficient here, no conflict UI needed)
```

### PROFILE-4 — Onboarding wizard

```
guard redirects to OnboardingTree (existing, Bolt 1) → real wizard now renders (was a placeholder)
  ▼
nickname (required) → avatar (required) → rules (skippable) → notifications (skippable) → second-factor (skippable)
  │ at each step: 'done' or 'skipped' recorded in-memory only
  ▼
after second-factor step resolves (done or skipped) → call profile.completeOnboarding capability
  ▼
OnboardingCompletionResult:
  completed → onSessionChange fires updated claims (onboardingCompleted: true) → AuthGatedNavigator re-evaluates
              → guard rule 5 no longer matches → falls through to rule 6 → renderAppTree()
              → pendingDestination (already set by the guard's earlier redirect, ADR-002) is honored by whatever
                screen reads it first in the app tree (existing mechanism, not new in this bolt)
  error      → stay on second-factor step, show retry
```

### PROFILE-5 — Settings screen composition

```
AccountSettingsScreen (existing, Bolt 2) gains a "Profile" section above the existing auth-linked rows:
  - Nickname row: current value + cooldown-aware "Change" action (disabled + countdown if not eligible)
  - Avatar row: current avatar thumbnail + "Change" action
  - Locale row: current locale + inline switch
  - (unchanged) Change password / Change email / Enable two-factor / [Delete account — AUTH-6, not yet built]
This screen composes PROFILE-1/2/3's flows (reused screens/components), never reimplements their logic — same
composition-only rule the unit-brief states explicitly.
```

---

## 5. Explicitly not modeled in this bolt

- The actual TOTP enrollment mechanics — fully owned by Bolt 2's existing `TotpEnrollmentScreen`/`SupabaseAdapter` methods; this bolt only adds a navigation entry point from the wizard.
- The `rules` step's content — owned by `unit-09-education` (future remote); this bolt models only the step's skip/done transition, not its body.
- The `notifications` step's actual push-permission/subscription logic — owned by `unit-08-notifications` (future); this bolt models only the step's skip/done transition and the "opts into all 5 notification types if completed, not skipped" rule as a fact to be passed to that future capability, not implemented here.
- Backend nickname-assignment/cooldown-bookkeeping algorithm itself (collision retry, etc.) — server-side, out of this repo's authority (system-context.md §3).
- Account deletion (AUTH-6) — still Bolt 8, unrelated to this bolt beyond being linked from the same Settings screen in a future bolt.
- Native passkey implementation — still deferred per ADR-009 (Bolt 2); this bolt's `second-factor` step explicitly does not attempt it (§3 above).

---

## Checkpoint

Pausing here for approval before Design (screen tree additions, navigation params for the real wizard, native-module linking plan for `react-native-image-picker`, Supabase Storage signed-URL call shape, and `BackendApiClient` capability names for profile/nickname/avatar/locale/onboarding-completion).
