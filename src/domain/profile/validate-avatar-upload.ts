/**
 * PROFILE-2's custom-avatar-upload client-side validation (model.md §2.4).
 * Rejects before any signed-URL request is made — mirrors
 * `validateSignUpInput`'s existing courtesy-check pattern (Bolt 1). The
 * backend's signed-URL issuance is expected to re-validate (out of this
 * bolt's authority).
 */
export type AvatarUploadValidation =
  | { valid: true }
  | { valid: false; reason: 'too-large' | 'unsupported-type' };

export const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5MB
export const ALLOWED_AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export function validateAvatarUpload(file: { sizeBytes: number; mimeType: string }): AvatarUploadValidation {
  if (file.sizeBytes > MAX_AVATAR_BYTES) {
    return { valid: false, reason: 'too-large' };
  }
  if (!(ALLOWED_AVATAR_MIME_TYPES as readonly string[]).includes(file.mimeType)) {
    return { valid: false, reason: 'unsupported-type' };
  }
  return { valid: true };
}
