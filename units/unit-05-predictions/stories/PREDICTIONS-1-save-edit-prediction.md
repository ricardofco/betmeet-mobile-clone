# PREDICTIONS-1 — Save and edit a global prediction

**Unit:** `unit-05-predictions` · **Placement:** Host

## Story

As a user, I want to predict the exact score of a match and change my mind any time before kickoff, so that I can play with up-to-date information.

## Source rules

`domain-overview.md §4.2` (kickoff-lock state machine, exact rule set): not editable if no team assigned, no kickoff time, `now >= kickoffAt` (no grace period), or status is `CANCELLED`/`POSTPONED`/anything-other-than-`SCHEDULED`; otherwise editable, with **unlimited** edits before the cutoff. Score bounds: integers 0–20 per side.

## Acceptance criteria

- The score input accepts integers 0–20 for each side; out-of-range or non-integer input is rejected client-side with a specific message before any network call.
- A prediction can be saved and re-saved any number of times before kickoff — no artificial per-day/per-hour edit limit.
- The instant a match's kickoff time passes (checked against the server's clock on save, not just the client's), further save attempts are rejected with a message distinguishing "you have no prior prediction, this no longer counts" from "your last saved prediction stands, no further changes" depending on whether a prediction existed before the lock.
- A locked prediction's score is shown read-only, with a clear visual indicator of why it's locked (kickoff reached / match postponed / match cancelled / not yet schedulable).

## Out of scope

- Penalty-winner selector (PREDICTIONS-2).
- Pool overrides (PREDICTIONS-3).

## Dependencies

- `unit-02-profile` (onboarding gate).
- `unit-04-competition` (match/team/kickoff data).
- Backend save/eligibility contract.
