# PROFILE-5 — Profile/account settings screen

**Unit:** `unit-02-profile` · **Placement:** Host

## Story

As a user, I want a settings area where I can review and change my nickname, avatar, locale, and account details (linking to auth's password/email/MFA/deletion flows), so that I have one place to manage my identity and account.

## Source rules

`domain-overview.md §5.2`; this is primarily a composition story tying together PROFILE-1/2/3 and linking out to `unit-01-auth`'s AUTH-5/AUTH-6 flows.

## Acceptance criteria

- Settings shows current nickname, avatar, and locale, each editable inline (reusing PROFILE-1/2/3's flows, not duplicating their logic).
- Settings links to account-level actions owned by `unit-01-auth`: change password, change email, manage MFA, delete account — this screen does not reimplement those flows, it navigates into them.
- Settings reflects the post-onboarding nickname-change-cooldown state accurately (e.g. disables the "change nickname" action with a countdown if currently cooled down, per PROFILE-1).

## Dependencies

- PROFILE-1, PROFILE-2, PROFILE-3.
- `unit-01-auth` AUTH-5, AUTH-6 (linked, not owned).
