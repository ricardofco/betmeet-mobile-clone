# POOLS-6 — League predictions grid with anti-bias masking

**Unit:** `unit-06-pools` · **Placement:** Remote

## Story

As a league member, I want to see all members' predictions for matches that have already kicked off (but not before), so that I can compare without anyone gaining an unfair preview advantage.

## Source rules

`domain-overview.md §5.3` (anti-bias masking — `FR-REFINE-53.1` in the source): another member's prediction for a not-yet-kicked-off match is hidden; the viewer always sees their own immediately, before kickoff, in every case.

## Acceptance criteria

- For a match that hasn't kicked off, the grid shows the viewer's own prediction but a masked/hidden placeholder for every other member's prediction on that match.
- The instant a match's kickoff time passes, all members' predictions for that match become visible to the whole league.
- This masking is enforced by what the backend sends, not just hidden by the UI (see unit brief risk note) — a story-level acceptance check should include inspecting the raw API response for a not-yet-kicked-off match and confirming masked predictions are not present in the payload at all.

## Dependencies

- `unit-04-competition` (kickoff time/status).
- Backend predictions-grid read contract (must perform the masking server-side).
