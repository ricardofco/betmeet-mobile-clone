import { useTranslation } from 'react-i18next';
import { LocaleSwitch } from '@/host/profile/components/locale-switch';
import { Heading, Screen } from '@/shared/design/primitives';

/**
 * PROFILE-5 / PROFILE-3 — Settings' locale-change screen. Reuses
 * `LocaleSwitch` (design.md §5.2, ADR-041/044 — selecting a locale here now
 * also drives the rendered UI language, not just `Profile.locale`).
 */
export function ChangeLocaleScreen() {
  const { t } = useTranslation();
  return (
    <Screen>
      <Heading>{t('settings.rows.language')}</Heading>
      <LocaleSwitch />
    </Screen>
  );
}
