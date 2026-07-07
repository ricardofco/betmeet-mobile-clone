import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { XStack, YStack } from 'tamagui';
import { useDismissibleCue } from '@/remotes/education/hooks/use-dismissible-cue';
import { BodyText, Card } from '@/shared/design/primitives';

type DismissibleCalloutProps = {
  cueId: string;
  children: ReactNode;
};

/**
 * EDU-4's non-intrusive educational callout (design.md §6/§9) — shown by
 * default, dismissed per-device via `useDismissibleCue`. Renders nothing once
 * dismissed. The dismiss affordance is a plain `✕` glyph (§10/§12 — no icon
 * library added for this remote).
 */
export function DismissibleCallout({ cueId, children }: DismissibleCalloutProps) {
  const { t } = useTranslation();
  const { visible, dismiss } = useDismissibleCue(cueId);

  if (!visible) {
    return null;
  }

  return (
    <Card testID={`dismissible-callout-${cueId}`} flexDirection="row" alignItems="flex-start" gap="$3">
      <YStack flex={1}>{children}</YStack>
      <XStack
        accessible
        accessibilityRole="button"
        accessibilityLabel={t('education.cues.dismiss')}
        testID={`dismissible-callout-${cueId}-close`}
        onPress={dismiss}
      >
        <BodyText>✕</BodyText>
      </XStack>
    </Card>
  );
}
