# NOTIF-2 — Notification preferences screen

**Unit:** `unit-08-notifications` · **Placement:** Remote

## Story

As a user, I want to control which kinds of notifications I receive, so that I only get what's useful to me.

## Source rules

`domain-overview.md §5.8`: five independent preferences — match started, match finished, pool invite, global rank improved, goal scored — all **default off**.

## Acceptance criteria

- Each of the 5 notification types has its own independent toggle, defaulting to off for a user who hasn't been through the onboarding "opt into everything" shortcut (NOTIF-1).
- Toggling any preference persists immediately (no separate "save" step) and is reflected correctly on next app launch.
- If push permission was never granted at the OS level, this screen makes that clear and offers a path to grant it (re-invoking NOTIF-1's request), rather than letting the user toggle preferences that can never actually deliver anything.

## Dependencies

- NOTIF-1 (permission state).
- Backend preferences contract.
