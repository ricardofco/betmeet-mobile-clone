import { randomUUID } from 'node:crypto';
import type { AvatarSource } from '../generated/prisma/client';

export type AvatarSourceKind = 'google' | 'default' | 'custom';

export function dbSourceToKind(source: AvatarSource): AvatarSourceKind {
  switch (source) {
    case 'GOOGLE_PHOTO':
      return 'google';
    case 'DEFAULT_SET':
      return 'default';
    case 'CUSTOM_UPLOAD':
      return 'custom';
  }
}

export function kindToDbSource(kind: Exclude<AvatarSourceKind, 'custom'>): AvatarSource {
  return kind === 'google' ? 'GOOGLE_PHOTO' : 'DEFAULT_SET';
}

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/**
 * The upload path itself doubles as the opaque `confirmToken` mobile's
 * contract expects (profile-api.ts's requestAvatarUploadUrl/confirmAvatarUpload) —
 * namespaced under the caller's own userId, so confirmAvatarUpload can verify
 * ownership without a separate token store. Not a port of any betmeet-clone
 * mechanism (that app used a plain storagePath argument, no confirm step) —
 * this is Phase 1's own minimal design to satisfy an already-fixed mobile-side
 * contract (design.md was written in Bolt 3 before this backend existed).
 */
export function buildAvatarUploadPath(userId: string, mimeType: string): string {
  const ext = EXT_BY_MIME[mimeType] ?? 'bin';
  return `avatars/${userId}/${randomUUID()}.${ext}`;
}

export function isOwnedUploadPath(userId: string, confirmToken: string): boolean {
  return confirmToken.startsWith(`avatars/${userId}/`);
}
