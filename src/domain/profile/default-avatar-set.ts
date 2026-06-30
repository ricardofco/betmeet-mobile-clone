/**
 * PROFILE-2's default-avatar-set value object and local-fallback rule
 * (model.md §2.5). If the backend-seeded set fails to load, the picker
 * substitutes this small bundled local set rather than rendering empty
 * (mirrors the web app's local-fallback behavior, PROFILE-2 AC).
 */
export type DefaultAvatarOption = { id: string; url: string };

export type DefaultAvatarSetResult =
  | { source: 'remote'; options: DefaultAvatarOption[] }
  | { source: 'local-fallback'; options: DefaultAvatarOption[] };

/**
 * Fixed, bundled constant — asset paths resolved at the platform/UI layer
 * (design.md §6's `AvatarPicker` component), not here. Deliberately small
 * (ADR-014: this set is never virtualized).
 */
export const LOCAL_FALLBACK_AVATARS: DefaultAvatarOption[] = [
  { id: 'local-1', url: 'asset:avatar-fallback-1' },
  { id: 'local-2', url: 'asset:avatar-fallback-2' },
  { id: 'local-3', url: 'asset:avatar-fallback-3' },
  { id: 'local-4', url: 'asset:avatar-fallback-4' },
  { id: 'local-5', url: 'asset:avatar-fallback-5' },
  { id: 'local-6', url: 'asset:avatar-fallback-6' },
];
