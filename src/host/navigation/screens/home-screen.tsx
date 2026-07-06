import { lazy, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { XStack, YStack } from 'tamagui';
import { RemoteBoundary } from '@/host/remote-boundary';
import { Card, Heading, MutedText, PrimaryButton, Screen } from '@/shared/design/primitives';

// Loaded lazily so the host bundle never pays for the remote's code until
// the user actually requests it (ADR-002) — unchanged from Bolts 0-8.
const EducationRemoteApp = lazy(() => import('education/App'));

/**
 * Bolt 9 (ADR-042): the 3-button hub role (Predictions/Pools/Settings
 * buttons) is removed — redundant with the new tab bar/drawer. Becomes a
 * minimal, Tamagui-styled real landing screen. The Bolt-0 "load `education`
 * remote" demo affordance is kept (relocated, not deleted) — still the only
 * exercised path proving `RemoteBoundary`'s fallback UI (Bolt 0's still-open
 * Layer 2 item).
 */
export function HomeScreen() {
  const { t } = useTranslation();
  const [showRemote, setShowRemote] = useState(false);

  const handleLoadRemote = useCallback(() => {
    setShowRemote(true);
  }, []);

  const handleRetryRemote = useCallback(() => {
    setShowRemote(false);
  }, []);

  return (
    <Screen>
      <Heading>{t('home.title')}</Heading>
      <Card>
        <MutedText>{t('home.subtitle')}</MutedText>
        <XStack justifyContent="flex-start">
          <PrimaryButton onPress={handleLoadRemote}>{t('home.loadEducationRemote')}</PrimaryButton>
        </XStack>
      </Card>
      {showRemote ? (
        <YStack minHeight={80}>
          <RemoteBoundary onRetry={handleRetryRemote}>
            <EducationRemoteApp />
          </RemoteBoundary>
        </YStack>
      ) : null}
    </Screen>
  );
}
