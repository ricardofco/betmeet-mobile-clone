import { createDrawerNavigator } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { renderHeaderMenuButton } from '@/host/navigation/components/header-menu-button';
import { MainTabNavigator } from '@/host/navigation/main-tab-navigator';
import { AccountSettingsScreen } from '@/host/settings/screens/account-settings-screen';
import { ChangePasswordScreen } from '@/host/settings/screens/change-password-screen';
import { ChangeEmailScreen } from '@/host/settings/screens/change-email-screen';
import { TotpEnrollmentScreen } from '@/host/settings/screens/totp-enrollment-screen';
import { ChangeNicknameScreen } from '@/host/profile/screens/change-nickname-screen';
import { ChangeAvatarScreen } from '@/host/profile/screens/change-avatar-screen';
import { ChangeLocaleScreen } from '@/host/profile/screens/change-locale-screen';
import { DeleteAccountScreen } from '@/host/settings/screens/delete-account-screen';
import type { RootDrawerParamList, SettingsStackParamList } from '@/host/auth/navigation/auth-stack-params';

/**
 * Bolt 9 (ADR-042) — the outermost tree `AuthGatedNavigator.renderAppTree`
 * mounts on `proceed`/home-redirect guard outcomes. Replaces the old flat
 * `AppStack` (Bolts 0-8). `AuthGatedNavigator`'s own contract (ADR-001) is
 * unaffected — it still renders exactly one branch per guard outcome; only
 * what that branch constructs internally changed.
 *
 * `Settings` moves out of the tab row into this drawer (NFR-10.2) — it was
 * never a peer "module" the way Home/Predictions/Pools are. Its own 8-row
 * `SettingsStackNavigator` is unchanged internally; only its mounting point
 * moved from an `AppStack` push to a `Drawer.Screen`.
 */
const Drawer = createDrawerNavigator<RootDrawerParamList>();
const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();

function SettingsStackNavigator() {
  const { t } = useTranslation();
  return (
    <SettingsStack.Navigator>
      <SettingsStack.Screen
        name="AccountSettings"
        component={AccountSettingsScreen}
        // Post-Implement fix (2026-07-06, Layer 2 finding #5): this is the
        // drawer-mounted stack's *root* screen, analogous to each tab's own
        // root screen in `main-tab-navigator.tsx` — it needs the same
        // hamburger `headerLeft` to get back to the drawer. It was missing
        // entirely, leaving no way to reopen the drawer once inside
        // Settings (nested rows like Change Password correctly get a
        // native back button from the stack; only this root screen lacked
        // any way back to the drawer).
        options={{ title: t('settings.title'), headerLeft: renderHeaderMenuButton }}
      />
      <SettingsStack.Screen
        name="ChangeNickname"
        component={ChangeNicknameScreen}
        options={{ title: t('settings.rows.nickname') }}
      />
      <SettingsStack.Screen
        name="ChangeAvatar"
        component={ChangeAvatarScreen}
        options={{ title: t('settings.rows.avatar') }}
      />
      <SettingsStack.Screen
        name="ChangeLocale"
        component={ChangeLocaleScreen}
        options={{ title: t('settings.rows.language') }}
      />
      <SettingsStack.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={{ title: t('settings.rows.changePassword') }}
      />
      <SettingsStack.Screen
        name="ChangeEmail"
        component={ChangeEmailScreen}
        options={{ title: t('settings.rows.changeEmail') }}
      />
      <SettingsStack.Screen
        name="TotpEnrollment"
        component={TotpEnrollmentScreen}
        options={{ title: t('settings.headers.twoFactor') }}
      />
      <SettingsStack.Screen
        name="DeleteAccount"
        component={DeleteAccountScreen}
        options={{ title: t('settings.rows.deleteAccount') }}
      />
    </SettingsStack.Navigator>
  );
}

export function RootDrawerNavigator() {
  const { t } = useTranslation();

  return (
    <Drawer.Navigator screenOptions={{ headerShown: false }}>
      <Drawer.Screen
        name="MainTabs"
        component={MainTabNavigator}
        options={{ title: t('navigation.tabs.home') }}
      />
      <Drawer.Screen
        name="Settings"
        component={SettingsStackNavigator}
        options={{ title: t('navigation.drawer.settings') }}
      />
    </Drawer.Navigator>
  );
}
