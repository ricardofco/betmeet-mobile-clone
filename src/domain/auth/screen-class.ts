/**
 * The screen-category vocabulary AUTH-7's guard routes against, instead of
 * hardcoding individual route names into domain logic (model.md §1).
 *
 * ADR-004 refines this from a single-pick union (model.md's original shape)
 * to a **tag array**: a screen can belong to more than one class
 * simultaneously (e.g. sign-in is both `public` — reachable while
 * unauthenticated, rule 2 — and `auth-only` — bounced to home once confirmed,
 * rule 4). `model.md` is left as originally written; this file is the as-built
 * shape.
 */
export type ScreenClassTag = 'public' | 'auth-only' | 'verify-email' | 'onboarding' | 'protected';

export type ScreenClass = ScreenClassTag[];

export function hasScreenClass(screenClass: ScreenClass, tag: ScreenClassTag): boolean {
  return screenClass.includes(tag);
}
