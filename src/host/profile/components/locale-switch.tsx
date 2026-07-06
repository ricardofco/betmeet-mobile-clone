import { useCallback } from 'react';
import { Text, XStack } from 'tamagui';
import { useLocaleStore } from '@/host/profile/locale-store';
import { useSetLocaleMutation } from '@/host/profile/hooks/use-profile-query';
import { i18n } from '@/platform/i18n/i18n';
import type { AppLocale } from '@/domain/profile/locale';

// Language endonyms are deliberately never translated (a language picker
// always shows each option in its own language, regardless of the active
// UI language) — not an i18n gap.
const LOCALE_OPTIONS: { value: AppLocale; label: string }[] = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
];

/**
 * PROFILE-3's inline locale switch (design.md §5.2, reused by both the
 * Settings row and `ChangeLocale` screen). Updates the local store
 * immediately (instant UI switch, no app restart needed — PROFILE-3 AC) and
 * syncs to the backend via `profile.setLocale` (`useSetLocaleMutation`).
 *
 * Bolt 9 (ADR-041/044 — unification confirmed): also calls
 * `i18n.changeLanguage(value)`, so this one explicit user action now drives
 * three things together: the persisted `Profile.locale` field (backend
 * sync), its local AsyncStorage-backed cache (`locale-store.ts`), and the
 * rendered app-chrome UI language (`i18next`). An explicit choice here
 * always wins over device detection — device detection only ever governs
 * the very first launch, before any explicit choice exists (ADR-041 point 4).
 */
export function LocaleSwitch() {
  const locale = useLocaleStore(state => state.locale);
  const setLocale = useLocaleStore(state => state.setLocale);
  const { mutate: syncLocale } = useSetLocaleMutation();

  const handleSelect = useCallback(
    (value: AppLocale) => {
      setLocale(value);
      syncLocale(value);
      i18n.changeLanguage(value);
    },
    [setLocale, syncLocale],
  );

  return (
    <XStack accessibilityRole="radiogroup" gap="$3">
      {LOCALE_OPTIONS.map(option => {
        const selected = option.value === locale;
        return (
          <XStack
            key={option.value}
            accessible
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            onPress={() => handleSelect(option.value)}
            paddingVertical="$2"
            paddingHorizontal="$4"
            borderRadius="$4"
            borderWidth={1}
            borderColor={selected ? '$primary' : '$borderColor'}
          >
            <Text fontWeight={selected ? '700' : '400'} color="$color">
              {option.label}
            </Text>
          </XStack>
        );
      })}
    </XStack>
  );
}
