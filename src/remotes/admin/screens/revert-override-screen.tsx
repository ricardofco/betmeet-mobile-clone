import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { matchesWithActiveOverride } from '@/domain/admin';
import { useAdminMatchListQuery } from '@/remotes/admin/hooks/use-admin-match-list-query';
import { useRevertOverrideMutation } from '@/remotes/admin/hooks/use-revert-override-mutation';
import { AdminMatchList } from '@/remotes/admin/components/admin-match-list';
import { RevertConfirmForm } from '@/remotes/admin/components/revert-confirm-form';
import {
  BodyText,
  EmptyState,
  ErrorState,
  Heading,
  LoadingState,
  PrimaryButton,
  Screen,
} from '@/shared/design/primitives';

/**
 * ADMIN-5 (design.md §5.2, ADR-061) — a match picker (`admin.listMatches`,
 * filtered to `manualOverride: true`) followed by `RevertConfirmForm`'s
 * type-to-confirm gate once a match is selected. The single
 * highest-blast-radius, least-reversible mutation in this entire bolt
 * (model.md §6/§7) — no snapshot of the prior result is ever kept, and this
 * mobile backend has no sync to ever repopulate a real result afterward.
 */
export function RevertOverrideScreen() {
  const { t } = useTranslation();
  const { data, isLoading, error, refetch } = useAdminMatchListQuery();
  const revertOverride = useRevertOverrideMutation();
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  const overriddenMatches = useMemo(() => {
    if (!data?.ok) return [];
    return matchesWithActiveOverride(data.matches);
  }, [data]);

  const selectedMatch = useMemo(
    () => overriddenMatches.find(row => row.id === selectedMatchId) ?? null,
    [overriddenMatches, selectedMatchId],
  );

  const handleBack = useCallback(() => setSelectedMatchId(null), []);

  const handleConfirm = useCallback(() => {
    if (!selectedMatchId) return;
    revertOverride.mutate(selectedMatchId, {
      onSuccess: response => (response.ok ? setSelectedMatchId(null) : undefined),
    });
  }, [revertOverride, selectedMatchId]);

  if (isLoading) {
    return <LoadingState label={t('admin.revertOverride.loading')} />;
  }

  if (error || !data?.ok) {
    return <ErrorState label={t('admin.revertOverride.error')} onRetry={refetch} retryLabel={t('common.retry')} />;
  }

  if (selectedMatch) {
    const lastResult = revertOverride.data;
    return (
      <Screen padding="$0" gap="$0">
        <PrimaryButton margin="$4" onPress={handleBack}>
          {t('common.cancel')}
        </PrimaryButton>
        {lastResult && !lastResult.ok ? (
          <BodyText color="$danger" paddingHorizontal="$4">
            {t(`admin.revertOverride.errors.${lastResult.error}`)}
          </BodyText>
        ) : null}
        <RevertConfirmForm match={selectedMatch} onConfirm={handleConfirm} isSubmitting={revertOverride.isPending} />
      </Screen>
    );
  }

  return (
    <Screen padding="$0" gap="$0">
      <Heading padding="$4">{t('admin.revertOverride.title')}</Heading>
      {overriddenMatches.length === 0 ? (
        <EmptyState label={t('admin.revertOverride.empty')} />
      ) : (
        <AdminMatchList matches={overriddenMatches} selectedMatchId={null} onSelect={setSelectedMatchId} />
      )}
    </Screen>
  );
}
