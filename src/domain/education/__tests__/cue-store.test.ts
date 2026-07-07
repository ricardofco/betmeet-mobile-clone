import { storageKey } from '@/domain/education/cue-store';

describe('storageKey (design.md §9.1, EDU-4)', () => {
  it('prefixes the cueId with cue:dismissed:', () => {
    expect(storageKey('rulesAccordionIntro')).toBe('cue:dismissed:rulesAccordionIntro');
  });

  it('is a pure function of cueId alone', () => {
    expect(storageKey('a')).not.toBe(storageKey('b'));
  });
});
