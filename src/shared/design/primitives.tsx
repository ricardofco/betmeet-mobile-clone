import { Button, Spinner, styled, Text, View, XStack, YStack } from 'tamagui';

/**
 * NFR-10.5 / design-standards.md — themed Tamagui primitives composed from
 * `tamagui.config.ts`'s tokens, never a literal hex/px value in a consuming
 * screen. Kept intentionally small (a handful of primitives, not a full
 * component library) — this bolt's scope is the navigation shell plus a
 * bounded set of Bolt 5-8 screens (`implement-and-test.md §5/§6`), not every
 * screen in the app.
 *
 * `vercel-react-native-skills`: these are plain view/text wrappers, not used
 * inside any FlashList row renderer — list rows keep plain `StyleSheet`
 * (`implement-and-test.md §5`'s documented perf rationale).
 */
export const Screen = styled(YStack, {
  name: 'Screen',
  flex: 1,
  backgroundColor: '$background',
  padding: '$4',
  gap: '$4',
});

export const Card = styled(YStack, {
  name: 'Card',
  backgroundColor: '$card',
  borderRadius: '$3',
  borderWidth: 1,
  borderColor: '$borderColor',
  padding: '$4',
  gap: '$2',
});

export const Row = styled(XStack, {
  name: 'Row',
  alignItems: 'center',
  gap: '$3',
});

export const Heading = styled(Text, {
  name: 'Heading',
  fontFamily: '$heading',
  fontSize: '$6',
  fontWeight: '700',
  color: '$color',
});

export const BodyText = styled(Text, {
  name: 'BodyText',
  fontFamily: '$body',
  fontSize: '$3',
  color: '$color',
});

export const MutedText = styled(Text, {
  name: 'MutedText',
  fontFamily: '$body',
  fontSize: '$2',
  color: '$colorMuted',
});

// Post-Implement fix (2026-07-06, Layer 2 finding #2 — clipped button
// text). Root cause was in `tamagui.config.ts`'s token scales (see that
// file's comment) — `Button`'s own default `size="$true"` now resolves a
// comfortable 44px height. `size`/`fontSize` are still set explicitly here,
// not left purely to inheritance, so this stays correct even if a future
// token-scale change shifts `$true` again.
export const PrimaryButton = styled(Button, {
  name: 'PrimaryButton',
  size: '$true',
  backgroundColor: '$primary',
  color: '$primaryContrast',
  borderRadius: '$3',
  fontSize: '$3',
  fontWeight: '600',
});

export const LoadingState = ({ label }: { label: string }) => (
  <YStack flex={1} alignItems="center" justifyContent="center" gap="$3">
    <Spinner size="large" color="$primary" />
    <MutedText>{label}</MutedText>
  </YStack>
);

export const ErrorState = ({ label, onRetry, retryLabel }: { label: string; onRetry?: () => void; retryLabel?: string }) => (
  <YStack flex={1} alignItems="center" justifyContent="center" gap="$3" padding="$4">
    <BodyText textAlign="center">{label}</BodyText>
    {onRetry ? (
      <PrimaryButton onPress={onRetry}>{retryLabel}</PrimaryButton>
    ) : null}
  </YStack>
);

export const EmptyState = ({ label }: { label: string }) => (
  <View flex={1} alignItems="center" justifyContent="center" padding="$4">
    <MutedText>{label}</MutedText>
  </View>
);
