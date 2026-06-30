import { getBackendApiClient } from '@/platform/backend-api/backend-api-client';
import type { AvatarSourceKind, AvatarState } from '@/domain/profile/avatar-source';
import type { DefaultAvatarOption } from '@/domain/profile/default-avatar-set';
import type { AppLocale } from '@/domain/profile/locale';
import type { NicknameCooldownInput } from '@/domain/profile/nickname-change-eligibility';

/**
 * Typed wrappers around `BackendApiClient.request()` for the
 * `profile.*` capability group (design.md §3.1, system-context.md §3
 * "Profile"). Mirrors `unconfirmed-email-panel.tsx`'s existing pattern of
 * calling a dedicated, typed function rather than spreading raw capability
 * strings across feature components. `capability` names are stable strings,
 * not paths — the concrete transport stays an implementation detail behind
 * `BackendApiClient` (ADR-003 precedent).
 *
 * Every capability here is dispatched through the one shared
 * `getBackendApiClient()` singleton — no new client/transport is introduced
 * by this bolt.
 */

export type NicknameAssignmentResponse =
  | { ok: true; base: string; discriminator: string }
  | { ok: false; error: 'taken' };

export type NicknameChangeResponse =
  | { ok: true; base: string; discriminator: string }
  | { ok: false; error: 'taken' | 'rate_limited'; cooldownEndsAt?: string };

export type ProfileSnapshot = {
  nickname: string | null;
  avatar: AvatarState;
  locale: AppLocale;
  cooldown: NicknameCooldownInput;
};

export type OnboardingCompletionResponse = { ok: true } | { ok: false; error: string };

export const profileApi = {
  async checkNicknameAvailability(base: string): Promise<{ available: boolean }> {
    return getBackendApiClient().request<{ available: boolean }, { base: string }>({
      capability: 'profile.checkNicknameAvailability',
      body: { base },
    });
  },

  /** First assignment, made during onboarding — never cooldown-gated (model.md §2.2). */
  async assignNickname(base: string): Promise<NicknameAssignmentResponse> {
    return getBackendApiClient().request<NicknameAssignmentResponse, { base: string }>({
      capability: 'profile.assignNickname',
      body: { base },
    });
  },

  /** Post-onboarding change — backend re-enforces the cooldown regardless of client state (ADR-011). */
  async changeNickname(base: string): Promise<NicknameChangeResponse> {
    return getBackendApiClient().request<NicknameChangeResponse, { base: string }>({
      capability: 'profile.changeNickname',
      body: { base },
    });
  },

  /** Advisory read used to render an accurate countdown without forcing a change attempt (model.md §2.2). */
  async getNicknameCooldownState(): Promise<NicknameCooldownInput> {
    return getBackendApiClient().request<NicknameCooldownInput>({
      capability: 'profile.getNicknameCooldownState',
    });
  },

  async getDefaultAvatarSet(): Promise<{ options: DefaultAvatarOption[] }> {
    return getBackendApiClient().request<{ options: DefaultAvatarOption[] }>({
      capability: 'profile.getDefaultAvatarSet',
    });
  },

  async requestAvatarUploadUrl(
    mimeType: string,
    sizeBytes: number,
  ): Promise<{ uploadUrl: string; confirmToken: string }> {
    return getBackendApiClient().request<
      { uploadUrl: string; confirmToken: string },
      { mimeType: string; sizeBytes: number }
    >({
      capability: 'profile.requestAvatarUploadUrl',
      body: { mimeType, sizeBytes },
    });
  },

  async confirmAvatarUpload(confirmToken: string): Promise<{ avatarUrl: string }> {
    return getBackendApiClient().request<{ avatarUrl: string }, { confirmToken: string }>({
      capability: 'profile.confirmAvatarUpload',
      body: { confirmToken },
    });
  },

  async setAvatarSource(
    source: Exclude<AvatarSourceKind, 'custom'>,
    optionId?: string,
  ): Promise<{ avatarUrl: string; source: AvatarSourceKind }> {
    return getBackendApiClient().request<
      { avatarUrl: string; source: AvatarSourceKind },
      { source: Exclude<AvatarSourceKind, 'custom'>; optionId?: string }
    >({
      capability: 'profile.setAvatarSource',
      body: { source, optionId },
    });
  },

  async setLocale(locale: AppLocale): Promise<{ locale: AppLocale }> {
    return getBackendApiClient().request<{ locale: AppLocale }, { locale: AppLocale }>({
      capability: 'profile.setLocale',
      body: { locale },
    });
  },

  async completeOnboarding(notificationsOptIn: boolean): Promise<OnboardingCompletionResponse> {
    return getBackendApiClient().request<OnboardingCompletionResponse, { notificationsOptIn: boolean }>({
      capability: 'profile.completeOnboarding',
      body: { notificationsOptIn },
    });
  },

  async getProfile(): Promise<ProfileSnapshot> {
    return getBackendApiClient().request<ProfileSnapshot>({
      capability: 'profile.getProfile',
    });
  },
};
