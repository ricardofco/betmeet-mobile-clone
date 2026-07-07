import { Component, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { YStack } from 'tamagui';
import { ScoringTable } from '@/remotes/education/components/scoring-table';
import { BodyText, MutedText } from '@/shared/design/primitives';

type InnerProps = {
  children: ReactNode;
  fallbackTitle: string;
  fallbackNote: string;
};

type State = { hasError: boolean };

/**
 * EDU-2's per-feature error boundary (design.md §4, "Design Pattern 3" in
 * betmeet-clone). If the interactive calculator throws, it degrades to the
 * static `ScoringTable` rather than crashing the whole Rules Center screen.
 * RN's `class`-based `componentDidCatch`/`getDerivedStateFromError` are
 * identical APIs to React DOM's — a faithful, straightforward port
 * (model.md §3).
 */
class CalculatorErrorBoundaryInner extends Component<InnerProps, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <YStack gap="$2" testID="calculator-fallback">
          <BodyText fontWeight="700">{this.props.fallbackTitle}</BodyText>
          <MutedText>{this.props.fallbackNote}</MutedText>
          <ScoringTable />
        </YStack>
      );
    }
    return this.props.children;
  }
}

export function CalculatorErrorBoundary({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <CalculatorErrorBoundaryInner
      fallbackTitle={t('calculator.fallbackTitle')}
      fallbackNote={t('calculator.fallbackNote')}
    >
      {children}
    </CalculatorErrorBoundaryInner>
  );
}
