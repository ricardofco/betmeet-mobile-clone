import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { validateNicknameBase, interpretAvailabilityResponse } from '@/domain/profile/validate-nickname-base';
import { evaluateNicknameChangeEligibility } from '@/domain/profile/nickname-change-eligibility';
import type { NicknameCooldownInput } from '@/domain/profile/nickname-change-eligibility';
import { profileApi } from '@/platform/backend-api/profile-api';

const AVAILABILITY_DEBOUNCE_MS = 400;

type NicknameFormProps = {
  /**
   * `'onboarding'`: first assignment, never cooldown-gated (model.md §2.2
   * row 1 — the eligibility check doesn't even apply yet).
   * `'settings'`: post-onboarding change, gated by
   * `evaluateNicknameChangeEligibility` fed by `cooldown` (ADR-011).
   */
  mode: 'onboarding' | 'settings';
  /** Required when `mode === 'settings'` — the last successful profile fetch's cooldown payload (model.md §2.2). */
  cooldown?: NicknameCooldownInput;
  onSubmitted: (result: { base: string; discriminator: string }) => void;
};

/**
 * PROFILE-1's nickname form, reused by both the onboarding wizard's
 * `nickname` step and Settings' `ChangeNickname` screen (design.md §5 —
 * "compose, don't duplicate"). Format validation runs instantly client-side
 * (model.md §2.1); availability is a debounced backend round-trip;
 * uniqueness is always re-checked server-side on submit regardless of what
 * the client believes (PROFILE-1 AC).
 */
export function NicknameForm({ mode, cooldown, onSubmitted }: NicknameFormProps) {
  const [base, setBase] = useState('');
  const [checking, setChecking] = useState(false);
  const [availability, setAvailability] = useState<ReturnType<typeof validateNicknameBase> | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const eligibility =
    mode === 'settings' && cooldown
      ? evaluateNicknameChangeEligibility({ ...cooldown, now: new Date().toISOString() })
      : { allowed: true as const };

  const handleChangeText = useCallback((text: string) => {
    setBase(text);
    setSubmitError(null);
    const formatResult = validateNicknameBase(text);
    setAvailability(formatResult);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (formatResult.status !== 'available') {
      setChecking(false);
      return;
    }

    setChecking(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const raw = await profileApi.checkNicknameAvailability(text);
        setAvailability(interpretAvailabilityResponse(raw));
      } finally {
        setChecking(false);
      }
    }, AVAILABILITY_DEBOUNCE_MS);
  }, []);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const response =
        mode === 'onboarding' ? await profileApi.assignNickname(base) : await profileApi.changeNickname(base);

      if (response.ok) {
        onSubmitted({ base: response.base, discriminator: response.discriminator });
        return;
      }
      if (response.error === 'taken') {
        setAvailability({ status: 'taken' });
        return;
      }
      setSubmitError('You can change your nickname again soon — try again later.');
    } finally {
      setSubmitting(false);
    }
  }, [base, mode, onSubmitted]);

  const canSubmit =
    availability?.status === 'available' && !checking && !submitting && eligibility.allowed;

  return (
    <View style={styles.container}>
      {mode === 'settings' && !eligibility.allowed ? (
        <Text style={styles.cooldown}>
          You can change your nickname again on {formatCooldownDate(eligibility.cooldownEndsAt)}.
        </Text>
      ) : null}

      <TextInput
        accessibilityLabel="Nickname"
        autoCapitalize="none"
        autoCorrect={false}
        editable={eligibility.allowed}
        onChangeText={handleChangeText}
        placeholder="Choose a nickname"
        style={styles.input}
        value={base}
      />

      {checking ? <ActivityIndicator /> : null}

      {availability?.status === 'invalid' ? (
        <Text style={styles.error}>{formatInvalidReason(availability.reason)}</Text>
      ) : null}
      {availability?.status === 'taken' ? (
        <Text style={styles.error}>That nickname is unavailable. Try another.</Text>
      ) : null}
      {availability?.status === 'available' && !checking ? (
        <Text style={styles.success}>Available</Text>
      ) : null}
      {submitError ? <Text style={styles.error}>{submitError}</Text> : null}

      <Button title="Save nickname" onPress={handleSubmit} disabled={!canSubmit} />
    </View>
  );
}

function formatInvalidReason(reason: 'too-short' | 'too-long' | 'invalid-characters'): string {
  switch (reason) {
    case 'too-short':
      return 'Nickname must be at least 3 characters.';
    case 'too-long':
      return 'Nickname must be at most 20 characters.';
    case 'invalid-characters':
      return 'Only letters, numbers, underscores, and hyphens are allowed.';
  }
}

function formatCooldownDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString();
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  error: {
    color: '#b00020',
  },
  success: {
    color: '#2e7d32',
  },
  cooldown: {
    color: '#555',
  },
});
