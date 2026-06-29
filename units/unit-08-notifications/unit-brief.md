# Unit Brief — `unit-08-notifications`

> **Intent:** `liga-mundial-mobile-migration` · **Federation placement:** **Split** (requirements.md §7.4) — permission request + device-token registration in the **host** bundle; the preferences screen in a **remote**.

## Purpose

Native push notifications (FCM/APNs direct, no third-party provider — requirements.md §7.5) replacing the web app's Web Push, preserving its outbox/preference/dedup business logic conceptually: five independent opt-in preferences (all default off), event-driven delivery, and graceful handling of stale/invalid device tokens.

## Source rules

`domain-overview.md §4.5` (notification event lifecycle), `§5.8` (notification business rules, including the known over-broad-recipient quirk to treat as a flagged decision, not a silent inheritance); `migration-analysis.md` (Web Push → native push is a full replacement of the delivery channel, not a port; the outbox/preference/dedup logic is reusable).

## In scope

- Requesting push permission and registering the resulting device token (FCM token on Android, APNs token on iOS) with the backend — this is the host-bundle piece, since it must run reliably and early, independent of any remote's load state.
- The preferences screen: five independent toggles (match started, match finished, pool invite, global rank improved, goal scored), all defaulting off, editable individually.
- Receiving and handling an incoming push notification: foreground in-app banner, background/terminated tap-to-open routing to the relevant screen (e.g. a match detail or league screen) via deep link.
- Re-registering/refreshing the device token when the OS rotates it, and handling delivery failures gracefully (a token the push provider reports as invalid should stop being used, mirroring the web app's auto-deactivation on a 404/410-equivalent provider response).

## Out of scope

- The server-side dispatcher/outbox itself (entirely backend) — this unit only registers tokens and renders/handles received notifications.
- Deciding the over-broad-recipient question (`domain-overview.md §5.8`) — that's a backend/product decision; mobile's job is to render correctly whatever the backend decides to send, not to second-guess recipient logic client-side.

## Dependencies

- **Depends on:** `unit-01-auth` (must be authenticated to register a token meaningfully tied to a user), `unit-02-profile` (the onboarding wizard's notifications step invokes this unit's permission-request flow and, distinctively, opts into all 5 preferences at once on success — a deliberate UX shortcut, not a bug, to preserve from the source app).
- **Depended on by:** none structurally — this unit is a leaf consumer of events from `unit-06-pools` (invite), `unit-07-scoring-rankings` (rank improved), `unit-04-competition`/server-side sync (match started/finished/goal scored), all of which are backend-side triggers, not client-side calls from those units.

## Native modules

- FCM (Android) / APNs (iOS) — direct integration (likely via Expo Notifications or a direct SDK, Construction's call per requirements.md §8).

## Backend contract needed

Preferences CRUD + device-token registration, per `system-context.md §3` "Notifications" — note the data-model deviation from the web app (device token replaces `endpoint`/`p256dh`/`auth`).

## Unit-level acceptance criteria

- A user who has never granted push permission sees no notifications and is not nagged repeatedly by a blocked permission prompt — the request happens once at a sensible moment (onboarding) with a graceful "ask again from settings" path if declined.
- Each of the 5 preference toggles independently controls whether that specific notification type is received, verified by toggling one off and confirming only that type stops arriving (not a backend-testable acceptance criterion on its own, but the mobile-side preference UI must correctly reflect and submit per-type state, not an all-or-nothing bundle, except where the onboarding shortcut explicitly applies).
- Tapping a received notification opens the app directly to the relevant content (not just the app's home screen).

## Risks

- Push-provider choice (Expo Notifications vs. direct FCM/APNs SDKs) affects whether this unit can be partially built/tested without a full native build — flag this dependency early in the bolt plan.

## Stories

See `stories/`: NOTIF-1 through NOTIF-4.
