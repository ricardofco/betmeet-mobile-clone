import { FLAG_CATALOG, getFlagCatalogEntry } from '@/shared/competition/flags/flag-catalog';

describe('flag-catalog (COMPETITION-3 — bundled flag lookup)', () => {
  it('returns a distinct tint for each of the three UK home-nations subdivision keys', () => {
    const eng = getFlagCatalogEntry('gb-eng');
    const sct = getFlagCatalogEntry('gb-sct');
    const wls = getFlagCatalogEntry('gb-wls');

    expect(eng.tint).not.toBe(sct.tint);
    expect(sct.tint).not.toBe(wls.tint);
    expect(eng.tint).not.toBe(wls.tint);
  });

  it('falls back to a default tint for an unregistered key, rather than throwing', () => {
    expect(() => getFlagCatalogEntry('unknown-key')).not.toThrow();
    expect(getFlagCatalogEntry('unknown-key').tint).toBeTruthy();
  });

  it('registers all three UK home-nations keys in the static catalog', () => {
    expect(Object.keys(FLAG_CATALOG)).toEqual(expect.arrayContaining(['gb-eng', 'gb-sct', 'gb-wls']));
  });
});
