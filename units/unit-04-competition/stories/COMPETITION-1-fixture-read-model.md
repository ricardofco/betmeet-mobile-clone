# COMPETITION-1 — Fixture read model, grouped by day

**Unit:** `unit-04-competition` · **Placement:** Remote or shared

## Story

As a user, I want to browse the tournament's matches grouped by day, so that I can find and predict upcoming matches easily.

## Source rules

`domain-overview.md §4.1`, `§5.9`. The web app's day-partitioning rule: today's already-started matches stay visible (split by calendar day, not by kickoff time), and the most-recent past day's last kickoff slot lingers visible until 1 hour before the next kickoff before dropping behind a "past matches" toggle.

## Acceptance criteria

- The fixture screen groups matches into calendar-day buckets in the viewer's local timezone.
- A day that has already started (even if some of its matches haven't kicked off yet) stays in the "current/upcoming" view, not the "past" view, until the calendar day ends.
- Each match card shows both teams (name + flag + FIFA trigram), kickoff time (localized), and current status.
- Matches with unresolved knockout slots (no team assigned yet) show a placeholder (e.g. "Winner of Round of 16 Match 3") rather than blank teams.

## Dependencies

- Backend fixture read endpoint (`system-context.md §3`).
