# NOTIF-3 — Receiving and handling a push notification

**Unit:** `unit-08-notifications` · **Placement:** Host (delivery handling must work regardless of which remotes are currently loaded)

## Story

As a user, I want a notification I receive to take me to the relevant content when I tap it, so that notifications are actually useful, not just noise.

## Source rules

`domain-overview.md §5.8` (event types and their semantics: goal-scored fires on a live total-goal-count increase with score-based dedupe; rank-improved fires only on a strict global-rank improvement, never for a brand-new user's first appearance; pool-invite fires once per directed invite); `migration-analysis.md` (the web app's anchor-based `/matches#match-{id}` deep link must become a proper route/deep-link param on mobile).

## Acceptance criteria

- A notification received while the app is foregrounded shows an in-app banner/toast; while backgrounded or terminated, it shows as a native OS notification.
- Tapping any notification opens the app directly to the relevant screen (the specific match for match/goal events, the relevant league for an invite, the rankings screen for a rank-improvement) — never just the generic app home.
- The notification payload stays minimal (title/body/a target identifier), consistent with the source app's "private details load after the user opens the authenticated route" principle — no sensitive prediction/score detail is put in the notification payload itself.

## Dependencies

- NOTIF-1 (must have a registered token to receive anything).
- Deep-linking infrastructure (`unit-01-auth`'s `betmeet://` scheme + Universal/App Links).
