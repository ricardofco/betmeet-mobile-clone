import { shouldOfferDualSave } from '@/domain/predictions/pool-override';

describe('shouldOfferDualSave (model.md §6)', () => {
  it('offers dual-save when neither a global nor an override exists yet', () => {
    expect(shouldOfferDualSave({ hasGlobal: false, hasOverride: false })).toBe(true);
  });

  it('does not offer dual-save when a global prediction already exists', () => {
    expect(shouldOfferDualSave({ hasGlobal: true, hasOverride: false })).toBe(false);
  });

  it('does not offer dual-save when an override already exists', () => {
    expect(shouldOfferDualSave({ hasGlobal: false, hasOverride: true })).toBe(false);
  });

  it('does not offer dual-save when both already exist', () => {
    expect(shouldOfferDualSave({ hasGlobal: true, hasOverride: true })).toBe(false);
  });
});
