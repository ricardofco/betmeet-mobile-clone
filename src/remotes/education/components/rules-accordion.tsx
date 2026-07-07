import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { XStack, YStack } from 'tamagui';
import type { RuleDocument } from '@/domain/education/rule-content';
import { RuleContentRenderer } from '@/remotes/education/components/rule-content-renderer';
import { BodyText, Card } from '@/shared/design/primitives';

type RulesAccordionProps = {
  documents: RuleDocument[];
};

/**
 * EDU-1's collapsible Rules Center sections (design.md §3). Hand-rolled
 * expand/collapse local state (`useState<Set<slug>>` of open sections) — no
 * accordion library added (5 bounded items, same "plain, not a new
 * dependency" call as ADR-014's avatar-grid). Chevron is a plain Unicode
 * glyph (`▾`/`▸`), not an icon component (§10/§12 — no `react-native-svg`/
 * `lucide-react-native` question opened for this remote).
 */
export function RulesAccordion({ documents }: RulesAccordionProps) {
  const { t } = useTranslation();
  const [openSlugs, setOpenSlugs] = useState<Set<string>>(new Set());

  const toggle = useCallback((slug: string) => {
    setOpenSlugs(prev => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  }, []);

  return (
    <YStack gap="$2" testID="rules-accordion">
      {documents.map(doc => {
        const isOpen = openSlugs.has(doc.slug);
        const title = t(`rules.documents.${doc.slug}.title`);
        return (
          <Card key={doc.slug} testID={`rules-section-${doc.slug}`}>
            <XStack
              accessible
              accessibilityRole="button"
              accessibilityLabel={title}
              accessibilityState={{ expanded: isOpen }}
              testID={`rules-section-${doc.slug}-toggle`}
              onPress={() => toggle(doc.slug)}
              alignItems="center"
              justifyContent="space-between"
            >
              <BodyText fontWeight="700">{title}</BodyText>
              <BodyText>{isOpen ? '▾' : '▸'}</BodyText>
            </XStack>
            {isOpen ? <RuleContentRenderer sections={doc.sections} /> : null}
          </Card>
        );
      })}
    </YStack>
  );
}
