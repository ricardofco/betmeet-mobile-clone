import { en } from '@/platform/i18n/locales/en';
import { es } from '@/platform/i18n/locales/es';

/**
 * Change-2026-07-08 (i18n completion, item 1) — a regression guard for
 * exactly the class of bug that made this pass necessary in the first
 * place: a screen missing `useTranslation()` entirely is one failure mode,
 * but a screen calling `t('some.key')` for a key that only exists in one of
 * the two catalogs is a second, quieter one (i18next silently falls back to
 * the key path or the other language depending on config, rather than
 * throwing) — and with ~40 files swept in one pass, a single typo'd or
 * one-sided key addition would otherwise go unnoticed until a real device
 * happened to be set to the affected locale.
 *
 * Deliberately structural, not content-based: this only proves `en`/`es`
 * expose the identical set of leaf key paths (e.g. `settings.rows.signOut`),
 * not that either translation is *correct* — semantic accuracy (like item 2's
 * Rules Center investigation) is a human/translation-review concern, not
 * something a key-shape test can meaningfully assert.
 */
function collectLeafKeyPaths(node: unknown, prefix = ''): string[] {
  if (node === null || typeof node !== 'object') {
    return [prefix];
  }
  return Object.entries(node as Record<string, unknown>).flatMap(([key, value]) =>
    collectLeafKeyPaths(value, prefix ? `${prefix}.${key}` : key),
  );
}

describe('en/es locale catalogs (key-parity regression guard)', () => {
  it('expose exactly the same set of leaf key paths in both languages', () => {
    const enKeys = new Set(collectLeafKeyPaths(en));
    const esKeys = new Set(collectLeafKeyPaths(es));

    const onlyInEn = [...enKeys].filter(key => !esKeys.has(key)).sort();
    const onlyInEs = [...esKeys].filter(key => !enKeys.has(key)).sort();

    expect({ onlyInEn, onlyInEs }).toEqual({ onlyInEn: [], onlyInEs: [] });
  });
});
