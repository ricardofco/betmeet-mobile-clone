# SCORING-2 — Single shared source of truth across host and remotes

**Unit:** `unit-03-scoring` · **Placement:** Shared library

## Story

As the app's architecture, I need the scoring algorithm to exist in exactly one place that both the host bundle and every Module-Federation remote import, so that no remote can ever drift from the host's point math (mirroring the invariant the web app enforces between its real scoring engine and its educational calculator).

## Source rules

`domain-overview.md §5.5` ("this algorithm is implemented as pure, dependency-free TypeScript... both the authoritative scoring engine and the educational calculator import the same constants/function so they can never drift apart. Preserve this property in the mobile port"); requirements.md §7.4 (packaging mechanism deferred to Construction/ADR, but the single-source-of-truth requirement is fixed at Inception).

## Acceptance criteria

- There exists exactly one implementation of the algorithm in the repo; `unit-05-predictions`, `unit-07-scoring-rankings`, `unit-09-education`, and `unit-10-admin` all import it rather than each having their own copy.
- A code-level check (lint rule, import-boundary check, or simply an ADR-recorded review gate — mechanism is Construction's call) exists to catch a future accidental duplicate implementation.
- The exact packaging mechanism (Module Federation shared singleton vs. an internal workspace package) is recorded as a Construction ADR, not assumed here.

## Dependencies

- SCORING-1.
- Construction's eventual Module Federation scaffolding (`/repack-init`) determines the concrete mechanism.
