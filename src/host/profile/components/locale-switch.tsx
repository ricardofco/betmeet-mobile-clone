import { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocaleStore } from '@/host/profile/locale-store';
import { useSetLocaleMutation } from '@/host/profile/hooks/use-profile-query';
import type { AppLocale } from '@/domain/profile/locale';

const LOCALE_OPTIONS: { value: AppLocale; label: string }[] = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
];

/**
 * PROFILE-3's inline locale switch (design.md §5.2, reused by both the
 * Settings row and `ChangeLocale` screen). Updates the local store
 * immediately (instant UI switch, no app restart needed — PROFILE-3 AC) and
 * syncs to the backend via `profile.setLocale` (`useSetLocaleMutation`) so
 * the choice is consistent across devices. Explicit user choice always
 * wins — this component never reads a device-locale API (ADR-012).
 */
export function LocaleSwitch() {
  const locale = useLocaleStore(state => state.locale);
  const setLocale = useLocaleStore(state => state.setLocale);
  const { mutate: syncLocale } = useSetLocaleMutation();

  const handleSelect = useCallback(
    (value: AppLocale) => {
      setLocale(value);
      syncLocale(value);
    },
    [setLocale, syncLocale],
  );

  return (
    <View accessibilityRole="radiogroup" style={styles.row}>
      {LOCALE_OPTIONS.map(option => {
        const selected = option.value === locale;
        return (
          <Text
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            key={option.value}
            onPress={() => handleSelect(option.value)}
            style={[styles.option, selected ? styles.optionSelected : null]}
          >
            {option.label}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  option: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  optionSelected: {
    borderColor: '#2e7d32',
    fontWeight: '700',
  },
});
