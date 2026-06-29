# PROFILE-1 — Nickname assignment, availability, and change cooldown

**Unit:** `unit-02-profile` · **Placement:** Host

## Story

As a user, I want a unique nickname (`base#discriminator`) that I can occasionally change, so that I have a recognizable identity across leagues and rankings.

## Source rules

`domain-overview.md §5.2`: base 3–20 chars, `^[a-zA-Z0-9_-]+$` only; discriminator is a random 4-digit suffix; a base is "available" while fewer than 9999 of its 10000 discriminators are taken; **cooldown is 30 days, but the initial onboarding assignment AND one free post-onboarding change are both exempt — only the third+ change is rate-limited**; no cooldown at all while onboarding is incomplete.

## Acceptance criteria

- During onboarding, the user can type a base name and see live availability feedback; on submit, a discriminator is assigned automatically (the user does not pick their own number).
- After onboarding, changing the nickname is allowed once freely; a second post-onboarding change is allowed; a third attempt within 30 days of the second is rejected with a clear "try again in N days" message; after 30 days it's allowed again.
- Nickname uniqueness (`base#discriminator` combination) is enforced server-side regardless of what the client believes is available.
- Input outside the allowed character set or length is rejected client-side before any network call, with a precise validation message.

## Out of scope

- Avatar (PROFILE-2).

## Dependencies

- Backend nickname-assignment/cooldown contract (`system-context.md §3`).
