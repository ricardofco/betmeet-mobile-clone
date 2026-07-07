import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TextInput } from 'react-native';
import { YStack } from 'tamagui';
import type { AdminMatchRow } from '@/domain/admin';
import { BodyText, Card, MutedText, PrimaryButton } from '@/shared/design/primitives';

type RevertConfirmFormProps = {
  match: AdminMatchRow;
  onConfirm: () => void;
  isSubmitting: boolean;
};

function expectedConfirmationText(match: AdminMatchRow): string {
  return `${match.fifaHome ?? '???'}-${match.fifaAway ?? '???'}`.toUpperCase();
}

/**
 * ADMIN-5's revert-override confirmation (design.md §7, ADR-061, CONFIRMED
 * sufficient by explicit human sign-off). Shows the match's current forced
 * result, who/when overrode it (ADMIN-5 has NO `reason` field of its own —
 * unlike ADMIN-4, `revert-override.ts` never had one, fidelity to
 * betmeet-clone's own shape), an explicit "cannot be undone" warning, and a
 * type-to-confirm `TextInput` (the two teams' FIFA codes, shown directly
 * above the input, no memorization needed) gating the Confirm button.
 *
 * @invariant This is PURELY a client-side UX friction device (ADR-061) —
 * the confirmation text is never sent to the backend.
 * `admin.revertMatchOverride`'s body stays exactly `{ matchId }`; the real,
 * only authorization boundary is `requireAdmin()`, server-side, unaffected
 * by this component either way.
 */
export function RevertConfirmForm({ match, onConfirm, isSubmitting }: RevertConfirmFormProps) {
  const { t } = useTranslation();
  const [confirmationText, setConfirmationText] = useState('');

  const expected = useMemo(() => expectedConfirmationText(match), [match]);
  const canSubmit = confirmationText.trim().toUpperCase() === expected;

  const handleConfirm = useCallback(() => {
    if (!canSubmit) return;
    onConfirm();
  }, [canSubmit, onConfirm]);

  return (
    <Card gap="$4">
      <BodyText fontWeight="600">
        {match.fifaHome ?? '???'} vs {match.fifaAway ?? '???'}
      </BodyText>

      <YStack gap="$1">
        <MutedText fontSize="$1">{t('admin.revertOverride.currentResult')}</MutedText>
        <BodyText>
          {match.homeScore ?? '—'} - {match.awayScore ?? '—'}
          {match.homePenaltyScore !== null && match.awayPenaltyScore !== null
            ? ` (${match.homePenaltyScore}-${match.awayPenaltyScore} pens)`
            : ''}
        </BodyText>
      </YStack>

      <YStack gap="$1">
        <MutedText fontSize="$1">{t('admin.revertOverride.overriddenBy')}</MutedText>
        <BodyText>
          {match.overriddenByNickname ?? '—'}
          {match.overriddenAt ? ` · ${new Date(match.overriddenAt).toLocaleString()}` : ''}
        </BodyText>
      </YStack>

      {match.manualOverrideReason ? (
        <YStack gap="$1">
          <MutedText fontSize="$1">{t('admin.revertOverride.reason')}</MutedText>
          <BodyText>{match.manualOverrideReason}</BodyText>
        </YStack>
      ) : null}

      <BodyText color="$danger">{t('admin.revertOverride.warning')}</BodyText>

      <YStack gap="$1">
        <MutedText>{t('admin.revertOverride.confirmLabel', { codes: expected })}</MutedText>
        <TextInput
          value={confirmationText}
          onChangeText={setConfirmationText}
          placeholder={t('admin.revertOverride.confirmPlaceholder')}
          autoCapitalize="characters"
          accessibilityLabel={t('admin.revertOverride.confirmLabel', { codes: expected })}
          style={confirmInputStyle}
        />
      </YStack>

      <PrimaryButton backgroundColor="$danger" onPress={handleConfirm} disabled={!canSubmit || isSubmitting}>
        {t('admin.revertOverride.submitButton')}
      </PrimaryButton>
    </Card>
  );
}

const confirmInputStyle = {
  height: 44,
  borderWidth: 1,
  borderColor: '#D1D5DB',
  borderRadius: 6,
  paddingHorizontal: 10,
  fontSize: 14,
  fontWeight: '600' as const,
};
