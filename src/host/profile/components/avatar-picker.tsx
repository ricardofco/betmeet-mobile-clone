import { memo, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { validateAvatarUpload } from '@/domain/profile/validate-avatar-upload';
import { LOCAL_FALLBACK_AVATARS, type DefaultAvatarOption } from '@/domain/profile/default-avatar-set';
import type { AvatarState } from '@/domain/profile/avatar-source';
import { profileApi } from '@/platform/backend-api/profile-api';

type AvatarPickerProps = {
  /** `'onboarding'` and `'settings'` behave identically here — kept for API symmetry with `NicknameForm` (design.md §5). */
  mode: 'onboarding' | 'settings';
  /** Only offered when the session's identity includes a Google-linked photo (model.md §4). */
  googlePhotoUrl?: string;
  onSelected: (avatar: AvatarState) => void;
};

/**
 * PROFILE-2's avatar source picker. ADR-014: the default-set grid is a plain
 * `View`-based grid, not FlashList — the set is small and bounded (~6-12
 * options), so virtualization adds dependency/configuration cost without a
 * measurable performance benefit at this scale.
 */
export function AvatarPicker({ mode: _mode, googlePhotoUrl, onSelected }: AvatarPickerProps) {
  const { t } = useTranslation();
  const [defaultOptions, setDefaultOptions] = useState<DefaultAvatarOption[]>([]);
  const [loadingDefaults, setLoadingDefaults] = useState(true);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingDefaults(true);
    profileApi
      .getDefaultAvatarSet()
      .then(({ options }) => {
        if (!cancelled) setDefaultOptions(options);
      })
      .catch(() => {
        // Local-fallback rule (model.md §2.5, PROFILE-2 AC): never render empty.
        if (!cancelled) setDefaultOptions(LOCAL_FALLBACK_AVATARS);
      })
      .finally(() => {
        if (!cancelled) setLoadingDefaults(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSelectDefault = useCallback(
    async (option: DefaultAvatarOption) => {
      const result = await profileApi.setAvatarSource('default', option.id);
      onSelected({ source: result.source, url: result.avatarUrl });
    },
    [onSelected],
  );

  const handleSelectGoogle = useCallback(async () => {
    const result = await profileApi.setAvatarSource('google');
    onSelected({ source: result.source, url: result.avatarUrl });
  }, [onSelected]);

  const handlePickCustom = useCallback(async () => {
    setUploadError(null);
    const picked = await launchImageLibrary({ mediaType: 'photo' });
    if (picked.didCancel || !picked.assets || picked.assets.length === 0) return;

    const asset = picked.assets[0];
    const validation = validateAvatarUpload({
      sizeBytes: asset.fileSize ?? 0,
      mimeType: asset.type ?? '',
    });
    if (!validation.valid) {
      setUploadError(
        validation.reason === 'too-large'
          ? t('profile.avatarPicker.tooLarge')
          : t('profile.avatarPicker.unsupportedType'),
      );
      return;
    }

    setUploading(true);
    try {
      const { uploadUrl, confirmToken } = await profileApi.requestAvatarUploadUrl(
        asset.type ?? '',
        asset.fileSize ?? 0,
      );
      // React Native's `fetch` accepts `{ uri }` as a body shape for
      // uploading a local file by URI — not part of the standard `BodyInit`
      // DOM type (this project has no `lib: dom` types loaded), hence the
      // narrow, deliberate cast rather than a broader `any`.
      await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': asset.type ?? 'application/octet-stream' },
        body: { uri: asset.uri } as unknown as Parameters<typeof fetch>[1] extends { body?: infer B } ? B : never,
      });
      const { avatarUrl } = await profileApi.confirmAvatarUpload(confirmToken);
      onSelected({ source: 'custom', url: avatarUrl });
    } catch {
      setUploadError(t('profile.avatarPicker.uploadFailed'));
    } finally {
      setUploading(false);
    }
  }, [onSelected, t]);

  return (
    <View style={styles.container}>
      {googlePhotoUrl ? (
        <Pressable accessibilityRole="button" onPress={handleSelectGoogle} style={styles.googleRow}>
          <Image source={{ uri: googlePhotoUrl }} style={styles.googleThumb} />
          <Text>{t('profile.avatarPicker.useGooglePhoto')}</Text>
        </Pressable>
      ) : null}

      <Pressable accessibilityRole="button" onPress={handlePickCustom} disabled={uploading} style={styles.uploadRow}>
        {uploading ? <ActivityIndicator /> : <Text>{t('profile.avatarPicker.uploadCustomPhoto')}</Text>}
      </Pressable>
      {uploadError ? <Text style={styles.error}>{uploadError}</Text> : null}

      {loadingDefaults ? (
        <ActivityIndicator />
      ) : (
        <View style={styles.grid}>
          {defaultOptions.map(option => (
            <AvatarOption key={option.id} option={option} onPress={handleSelectDefault} />
          ))}
        </View>
      )}
    </View>
  );
}

type AvatarOptionProps = {
  option: DefaultAvatarOption;
  onPress: (option: DefaultAvatarOption) => void;
};

/** Memoized per `vercel-react-native-skills`' `list-performance-item-memo` — still applies regardless of container virtualization (ADR-014). */
const AvatarOption = memo(function AvatarOptionInner({ option, onPress }: AvatarOptionProps) {
  const handlePress = useCallback(() => onPress(option), [onPress, option]);
  return (
    <Pressable accessibilityRole="button" onPress={handlePress} style={styles.gridItem}>
      <Image source={{ uri: option.url }} style={styles.gridThumb} />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  googleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  googleThumb: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  uploadRow: {
    paddingVertical: 8,
  },
  error: {
    color: '#b00020',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridItem: {
    width: 56,
    height: 56,
  },
  gridThumb: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
});
