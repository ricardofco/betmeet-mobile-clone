import { useTranslation } from 'react-i18next';
import { useSweepStatusQuery } from '@/remotes/admin/hooks/use-sweep-status-query';
import { useTriggerSweepMutation } from '@/remotes/admin/hooks/use-trigger-sweep-mutation';
import {
  BodyText,
  Card,
  ErrorState,
  Heading,
  LoadingState,
  MutedText,
  PrimaryButton,
  Screen,
} from '@/shared/design/primitives';

/**
 * ADMIN-2/3 merged screen (design.md §1.2/§5.2, ADR-058) — a thin,
 * honestly-labeled wrapper around the SAME `sweepFinishedUnscoredMatches()`
 * every read endpoint already calls silently (ADR-050). Deliberately blunt
 * copy per the checkpoint's instruction: this is NOT a sync — the
 * description line states plainly what this does and does not do.
 */
export function SweepStatusScreen() {
  const { t } = useTranslation();
  const { data, isLoading, error, refetch } = useSweepStatusQuery();
  const triggerSweep = useTriggerSweepMutation();

  if (isLoading) {
    return <LoadingState label={t('admin.sweep.loading')} />;
  }

  if (error || !data?.ok) {
    return <ErrorState label={t('admin.sweep.error')} onRetry={refetch} retryLabel={t('common.retry')} />;
  }

  return (
    <Screen>
      <Heading>{t('admin.sweep.title')}</Heading>
      <MutedText>{t('admin.sweep.description')}</MutedText>

      <Card gap="$2">
        <BodyText fontWeight="600">{t('admin.sweep.lastRunLabel')}</BodyText>
        <BodyText>{data.lastRunAt ? new Date(data.lastRunAt).toLocaleString() : t('admin.sweep.neverRun')}</BodyText>

        <BodyText fontWeight="600">{t('admin.sweep.matchesScoredLabel')}</BodyText>
        <BodyText>{data.lastSweptCount ?? '—'}</BodyText>
      </Card>

      <PrimaryButton onPress={() => triggerSweep.mutate()} disabled={triggerSweep.isPending}>
        {t('admin.sweep.triggerButton')}
      </PrimaryButton>
    </Screen>
  );
}
