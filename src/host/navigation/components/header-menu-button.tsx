import { DrawerActions } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Button } from 'tamagui';

/**
 * ADR-042 — the hamburger affordance rendered as `headerLeft` on every
 * tab-root screen (`Home`/`Predictions`/`Pools`). Dispatches
 * `DrawerActions.openDrawer()` — React Navigation bubbles an unhandled
 * navigation action up through parent navigators automatically, so this
 * works from a screen nested two levels below the `Drawer.Navigator` (its
 * own `Stack` → the `Tab.Navigator` → the `Drawer.Navigator`) without
 * manually chaining `getParent().getParent()`.
 *
 * A plain text glyph, not a new icon-font/vector-icon dependency — see
 * ADR-042's consequences (consistent with this project's standing
 * discipline against adding a new native/asset dependency mid-bolt without
 * being asked).
 */
export function HeaderMenuButton() {
  const navigation = useNavigation();
  const { t } = useTranslation();

  return (
    <Button
      unstyled
      accessibilityRole="button"
      accessibilityLabel={t('navigation.openMenu')}
      onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
      paddingHorizontal="$3"
      paddingVertical="$2"
      fontSize="$5"
      color="$color"
    >
      ☰
    </Button>
  );
}

/**
 * Post-Implement fix (2026-07-06, Layer 2 finding #5): a stable, shared
 * `headerLeft` reference (`react/no-unstable-nested-components`) — moved
 * here from being duplicated inline in `main-tab-navigator.tsx` so
 * `root-drawer-navigator.tsx` can reuse the exact same reference for the
 * `Settings` drawer's own root screen (`AccountSettings`), which was
 * missing its hamburger button entirely (every tab-root screen had one via
 * `main-tab-navigator.tsx`, but the analogous drawer-root screen didn't) —
 * once a user navigated into Settings, there was no way back to the drawer
 * short of a hardware/gesture back action.
 */
export function renderHeaderMenuButton() {
  return <HeaderMenuButton />;
}
