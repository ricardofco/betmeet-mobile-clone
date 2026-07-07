import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { matchesEligibleForForceResult } from '@/domain/admin';
import { useAdminMatchListQuery } from '@/remotes/admin/hooks/use-admin-match-list-query';
import { useForceResultMutation } from '@/remotes/admin/hooks/use-force-result-mutation';
import { AdminMatchList } from '@/remotes/admin/components/admin-match-list';
import { ForceResultForm, type ForceResultFormValues } from '@/remotes/admin/components/force-result-form';
import {
  BodyText,
  EmptyState,
  ErrorState,
  Heading,
  LoadingState,
  MutedText,
  PrimaryButton,
  Screen,
} from '@/shared/design/primitives';

/**
 * ADMIN-4 (design.md §5.2) — a match picker (`admin.listMatches`, filtered
 * to `bothTeamsResolved` via `@/domain/admin`'s pure filter) followed by
 * `ForceResultForm` once a match is selected. `force-result-screen.tsx`
 * itself carries ADR-062's reframed description line — this app has no
 * automatic results feed, so forcing a result here is currently the only
 * way a match becomes finished with scores.
 */
export function ForceResultScreen() {
  const { t } = useTranslation();
  const { data, isLoading, error, refetch } = useAdminMatchListQuery();
  const forceResult = useForceResultMutation();
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  const eligibleMatches = useMemo(() => {
    if (!data?.ok) return [];
    return matchesEligibleForForceResult(data.matches);
  }, [data]);

  const selectedMatch = useMemo(
    () => eligibleMatches.find(row => row.id === selectedMatchId) ?? null,
    [eligibleMatches, selectedMatchId],
  );

  const handleBack = useCallback(() => setSelectedMatchId(null), []);

  const handleSubmit = useCallback(
    (values: ForceResultFormValues) => {
      if (!selectedMatchId) return;
      forceResult.mutate(
        { matchId: selectedMatchId, ...values },
        { onSuccess: response => (response.ok ? setSelectedMatchId(null) : undefined) },
      );
    },
    [forceResult, selectedMatchId],
  );

  if (isLoading) {
    return <LoadingState label={t('admin.forceResult.loading')} />;
  }

  if (error || !data?.ok) {
    return <ErrorState label={t('admin.forceResult.error')} onRetry={refetch} retryLabel={t('common.retry')} />;
  }

  if (selectedMatch) {
    const lastResult = forceResult.data;
    return (
      <Screen padding="$0" gap="$0">
        <PrimaryButton margin="$4" onPress={handleBack}>
          {t('common.cancel')}
        </PrimaryButton>
        <MutedText paddingHorizontal="$4">{t('admin.forceResult.description')}</MutedText>
        {lastResult && !lastResult.ok ? (
          <BodyText color="$danger" paddingHorizontal="$4">
            {t(`admin.forceResult.errors.${lastResult.error}`)}
          </BodyText>
        ) : null}
        <ForceResultForm match={selectedMatch} onSubmit={handleSubmit} isSubmitting={forceResult.isPending} />
      </Screen>
    );
  }

  return (
    <Screen padding="$0" gap="$0">
      <Heading padding="$4">{t('admin.forceResult.title')}</Heading>
      <MutedText paddingHorizontal="$4" paddingBottom="$2">
        {t('admin.forceResult.description')}
      </MutedText>
      {eligibleMatches.length === 0 ? (
        <EmptyState label={t('admin.forceResult.empty')} />
      ) : (
        <AdminMatchList matches={eligibleMatches} selectedMatchId={null} onSelect={setSelectedMatchId} />
      )}
    </Screen>
  );
}
