import AsyncStorage from '@react-native-async-storage/async-storage';
import { dismissCallout, shouldShowCallout } from '@/platform/education/cue-store';

/**
 * EDU-4 (design.md §9.1, ADR-056) — `AsyncStorage` is mocked via its own
 * ships-with-the-package Jest mock (jest.config.js setupFiles), same as
 * `locale-store.test.ts`. This suite additionally covers the fail-open path
 * (BR-2.16/BR-2.18 equivalent) by forcing a rejection via `jest.spyOn`.
 */
describe('shouldShowCallout / dismissCallout (design.md §9.1)', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.restoreAllMocks();
  });

  it('shouldShowCallout returns true when the cue was never dismissed', async () => {
    expect(await shouldShowCallout('rulesAccordionIntro')).toBe(true);
  });

  it('dismissCallout persists the dismissal so a later shouldShowCallout returns false', async () => {
    await dismissCallout('rulesAccordionIntro');
    expect(await shouldShowCallout('rulesAccordionIntro')).toBe(false);
  });

  it('dismissals are keyed independently per cueId', async () => {
    await dismissCallout('rulesAccordionIntro');
    expect(await shouldShowCallout('calculatorIntro')).toBe(true);
  });

  it('fail-open: shouldShowCallout resolves true if AsyncStorage.getItem rejects', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('storage unavailable'));
    expect(await shouldShowCallout('rulesAccordionIntro')).toBe(true);
  });

  it('fail-open: dismissCallout does not throw if AsyncStorage.setItem rejects', async () => {
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('storage unavailable'));
    await expect(dismissCallout('rulesAccordionIntro')).resolves.toBeUndefined();
  });
});
