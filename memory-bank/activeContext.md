# Active Context

> **Agent note:** This is your short-term memory. Read it at the start of every session and update it immediately after making an important decision, changing focus, or encountering a blocker.

## Current Focus
- AI-DLC Inception for intent `liga-mundial-mobile-migration` (full migration of `betmeet-clone`'s product behavior to this app) has produced its full artifact set: `requirements.md`, `system-context.md`, 10 unit briefs (`units/unit-01-auth/` … `units/unit-10-admin/`) with 47 stories total, and a 13-bolt (Bolt 0–12) bolt plan. **Awaiting Checkpoint 3** (combined artifacts review) from the user before Checkpoint 4 (handoff to Construction). No implementation has started — this is specs only, per explicit user instruction.
- App is still the RN CLI starter screen (`App.tsx` renders `NewAppScreen`) — Bolt 0 (platform scaffolding) is the first bolt that will touch real app code.

## Recent Technical Decisions
- Confirmed Re.Pack (Rspack) is the active bundler (`rspack.config.mjs`); Metro config is legacy and not used for builds.
- **Inception-level decisions locked in** (binding for Construction, see `memory-bank/intents/liga-mundial-mobile-migration/requirements.md §7` for full detail): backend architecture = Option A (mobile consumes the web app's business logic via an API contract; direct-to-Supabase only for kickoff-lock/RLS-reads/native Auth flows); a single internal Supabase-access adapter is mandatory (no scattered SDK calls); **no code dependency on `betmeet-clone`** — `scoring` is reimplemented from scratch inside this repo; Module Federation placement decided per feature (auth/profile/**predictions**/notifications-permission-logic → host; pools/competition/scoring-rankings/notifications-preferences/education/admin → remote; `scoring` → shared library, not a routed chunk); TOTP-only MFA at launch (passkeys deferred); **FCM + APNs direct, no third-party push provider**; `react-native-keychain`, `react-native-image-picker`, `react-native-svg`, `betmeet://` + Universal/App Links confirmed as required native modules; iOS+Android only, no offline support.
- Still genuinely open, deferred to Construction ADRs (do not decide ad hoc mid-bolt): state management library, navigation library, the exact `scoring` packaging mechanism (Module Federation shared singleton vs. internal workspace package), concrete performance budget numbers, push-SDK choice (Expo Notifications vs. direct FCM/APNs SDKs — flagged as needed *before* Bolt 10 opens).
- No Module Federation, navigation, state library, or FlashList chosen/installed yet — all open decisions for Bolt 0.

## Known Issues / Blockers
- Both `yarn.lock` and `package-lock.json` are present and untracked — pick one package manager and remove the other before installing new dependencies.
- `metro.config.js` still exists alongside the active Re.Pack config; candidate for removal via `/repack-init`.
- iOS bundle identifier is still the RN CLI placeholder (`org.reactjs.native.example...`) — needs updating before any release build.
- `ios/BetmeetMobile.xcworkspace/`, `ios/Podfile.lock`, and `Gemfile.lock` are untracked — verify these are intended to be committed (CocoaPods lockfiles usually should be).
- **New, from this Inception round:** FCM/APNs project setup (certificates/keys) is real infrastructure work that should be lined up before Bolt 10 (Notifications) opens — it's not resolvable mid-bolt. AUTH-6 (account deletion) is deliberately sequenced into Bolt 8, not Bolt 2, because it needs `unit-06-pools`'s ownership-transfer capability first — don't pull it forward without also pulling its dependency forward.

## Immediate Next Step
- Present the full Inception artifact set to the user for **Checkpoint 3** (combined review of `system-context.md`, all 10 unit briefs/stories, and the bolt plan). On approval, Checkpoint 4 asks whether to hand off to `aidlc-construction` to start Bolt 0.
