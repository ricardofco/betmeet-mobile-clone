import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native';
import { getFullRules } from '@/domain/education/rule-content';
import type { AppLocale } from '@/domain/profile/locale';
import { CalculatorErrorBoundary } from '@/remotes/education/components/calculator-error-boundary';
import { DismissibleCallout } from '@/remotes/education/components/dismissible-callout';
import { RulesAccordion } from '@/remotes/education/components/rules-accordion';
import { ScoreBreakdownDemo } from '@/remotes/education/components/score-breakdown-demo';
import { ScoringCalculator } from '@/remotes/education/components/scoring-calculator';
import { Heading, MutedText, Screen } from '@/shared/design/primitives';

/**
 * The `education` remote's single exposed module (`./App`, ADR-052 — MF
 * placement reconfirmed). Bolt 0's demo shell is replaced entirely with the
 * real EDU-1/EDU-2/EDU-4 content: header, `RulesAccordion` (EDU-1), the
 * worked-examples strip, and `ScoringCalculator` (EDU-2) guarded by its own
 * error boundary — all in one scrollable screen, no internal navigator
 * (design.md §1.2 point 5 — this remote's content is exactly what
 * betmeet-clone renders on one page).
 *
 * EDU-3 (the onboarding step) and its own `OnboardingScoringSummary` twin
 * live in the host (`src/host/profile/`) — not here (ADR-054/design.md §5).
 */
export default function EducationRemoteEntry() {
  const { t, i18n } = useTranslation();
  const locale: AppLocale = i18n.language?.startsWith('en') ? 'en' : 'es';
  const documents = useMemo(() => getFullRules(locale), [locale]);

  return (
    <ScrollView>
      <Screen>
        <Heading>{t('rules.centerTitle')}</Heading>
        <MutedText>{t('rules.centerSubtitle')}</MutedText>

        <DismissibleCallout cueId="education.rulesAccordionIntro">
          <MutedText>{t('education.cues.rulesAccordionIntro')}</MutedText>
        </DismissibleCallout>

        <RulesAccordion documents={documents} />

        <ScoreBreakdownDemo />

        <DismissibleCallout cueId="education.calculatorIntro">
          <MutedText>{t('education.cues.calculatorIntro')}</MutedText>
        </DismissibleCallout>

        <CalculatorErrorBoundary>
          <ScoringCalculator />
        </CalculatorErrorBoundary>
      </Screen>
    </ScrollView>
  );
}
