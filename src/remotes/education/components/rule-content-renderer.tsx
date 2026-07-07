import { Fragment } from 'react';
import { YStack } from 'tamagui';
import type { RuleContentBlock } from '@/domain/education/rule-content';
import { BodyText, Card, MutedText } from '@/shared/design/primitives';

type RuleContentRendererProps = {
  sections: RuleContentBlock[];
};

/**
 * EDU-1's rendering pipeline (design.md §2.2, ADR-055) — maps each typed
 * `RuleContentBlock` to a themed Tamagui primitive. Zero branching beyond a
 * `switch` on `block.type`; no markdown parsing, no new dependency.
 */
export function RuleContentRenderer({ sections }: RuleContentRendererProps) {
  return (
    <YStack gap="$2">
      {sections.map((block, index) => (
        <Fragment key={index}>{renderBlock(block)}</Fragment>
      ))}
    </YStack>
  );
}

function renderBlock(block: RuleContentBlock) {
  switch (block.type) {
    case 'paragraph':
      return <BodyText>{block.text}</BodyText>;
    case 'list':
      return (
        <YStack gap="$1" paddingLeft="$3">
          {block.items.map((item, itemIndex) => (
            <BodyText key={itemIndex}>{`• ${item}`}</BodyText>
          ))}
        </YStack>
      );
    case 'example':
      return (
        <Card backgroundColor="$background">
          <BodyText fontWeight="700">{block.label}</BodyText>
          <MutedText>{block.text}</MutedText>
        </Card>
      );
    default:
      return null;
  }
}
