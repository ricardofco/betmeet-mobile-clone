import { getFullRules } from '@/domain/education/rule-content';

describe('getFullRules (model.md §2, ADR-055)', () => {
  it('returns 5 documents for es', () => {
    expect(getFullRules('es')).toHaveLength(5);
  });

  it('returns 5 documents for en', () => {
    expect(getFullRules('en')).toHaveLength(5);
  });

  it('sorts documents by order ascending', () => {
    const orders = getFullRules('en').map(doc => doc.order);
    expect(orders).toEqual([1, 2, 3, 4, 5]);
  });

  it('every document has the expected 5 slugs, one each', () => {
    const slugs = getFullRules('es')
      .map(doc => doc.slug)
      .sort();
    expect(slugs).toEqual(['match-locks', 'penalties', 'pools', 'scoring', 'ties']);
  });

  it('every section is a well-formed RuleContentBlock (paragraph/list/example)', () => {
    for (const doc of getFullRules('en')) {
      expect(doc.sections.length).toBeGreaterThan(0);
      for (const block of doc.sections) {
        expect(['paragraph', 'list', 'example']).toContain(block.type);
        if (block.type === 'paragraph') {
          expect(typeof block.text).toBe('string');
        }
        if (block.type === 'list') {
          expect(Array.isArray(block.items)).toBe(true);
          expect(block.items.length).toBeGreaterThan(0);
        }
        if (block.type === 'example') {
          expect(typeof block.label).toBe('string');
          expect(typeof block.text).toBe('string');
        }
      }
    }
  });

  it('the scoring document carries exactly one worked-example callout (scoring.mdx origin)', () => {
    const scoring = getFullRules('en').find(doc => doc.slug === 'scoring');
    const examples = scoring?.sections.filter(block => block.type === 'example') ?? [];
    expect(examples).toHaveLength(1);
  });

  it('es and en content differ (real translation, not a copy-paste)', () => {
    const enScoring = getFullRules('en').find(doc => doc.slug === 'scoring');
    const esScoring = getFullRules('es').find(doc => doc.slug === 'scoring');
    expect(enScoring?.sections[0]).not.toEqual(esScoring?.sections[0]);
  });
});
