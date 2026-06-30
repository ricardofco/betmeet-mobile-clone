import { MAX_AVATAR_BYTES, validateAvatarUpload } from '@/domain/profile/validate-avatar-upload';

describe('validateAvatarUpload (model.md §2.4, PROFILE-2 AC)', () => {
  it('accepts a jpeg under 5MB', () => {
    expect(validateAvatarUpload({ sizeBytes: 1024, mimeType: 'image/jpeg' })).toEqual({ valid: true });
  });

  it('accepts a png at exactly the 5MB boundary', () => {
    expect(validateAvatarUpload({ sizeBytes: MAX_AVATAR_BYTES, mimeType: 'image/png' })).toEqual({ valid: true });
  });

  it('accepts webp', () => {
    expect(validateAvatarUpload({ sizeBytes: 1024, mimeType: 'image/webp' })).toEqual({ valid: true });
  });

  it('rejects a file over 5MB', () => {
    expect(validateAvatarUpload({ sizeBytes: MAX_AVATAR_BYTES + 1, mimeType: 'image/jpeg' })).toEqual({
      valid: false,
      reason: 'too-large',
    });
  });

  it('rejects an unsupported mime type (gif)', () => {
    expect(validateAvatarUpload({ sizeBytes: 1024, mimeType: 'image/gif' })).toEqual({
      valid: false,
      reason: 'unsupported-type',
    });
  });

  it('rejects an unsupported mime type even when the file is small (size is not the only gate)', () => {
    expect(validateAvatarUpload({ sizeBytes: 1, mimeType: 'application/pdf' })).toEqual({
      valid: false,
      reason: 'unsupported-type',
    });
  });

  it('size check takes precedence when both size and type are invalid', () => {
    expect(validateAvatarUpload({ sizeBytes: MAX_AVATAR_BYTES + 1, mimeType: 'application/pdf' })).toEqual({
      valid: false,
      reason: 'too-large',
    });
  });
});
