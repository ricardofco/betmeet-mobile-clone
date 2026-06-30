import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { SettingsStackParamList } from '@/host/auth/navigation/auth-stack-params';

type Props = NativeStackScreenProps<SettingsStackParamList, 'AccountSettings'>;

/**
 * AUTH-5 / AUTH-3 — entry point for authenticated account-management flows:
 * - Change password (AUTH-5)
 * - Change email (AUTH-5)
 * - Enable two-factor authentication / TOTP enrollment (AUTH-3)
 *
 * Screen class: `protected` — only reachable after full authentication
 * (aal1 + confirmed email, with no pending MFA challenge).
 */
export function AccountSettingsScreen({ navigation }: Props) {
  const handleChangePassword = useCallback(() => {
    navigation.navigate('ChangePassword');
  }, [navigation]);

  const handleChangeEmail = useCallback(() => {
    navigation.navigate('ChangeEmail');
  }, [navigation]);

  const handleTotpEnrollment = useCallback(() => {
    navigation.navigate('TotpEnrollment');
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Account settings</Text>

      <TouchableOpacity accessibilityRole="button" onPress={handleChangePassword} style={styles.row}>
        <Text style={styles.rowLabel}>Change password</Text>
        <Text style={styles.rowChevron}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity accessibilityRole="button" onPress={handleChangeEmail} style={styles.row}>
        <Text style={styles.rowLabel}>Change email</Text>
        <Text style={styles.rowChevron}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity accessibilityRole="button" onPress={handleTotpEnrollment} style={styles.row}>
        <Text style={styles.rowLabel}>Enable two-factor authentication</Text>
        <Text style={styles.rowChevron}>›</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 0,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  rowLabel: {
    fontSize: 16,
  },
  rowChevron: {
    fontSize: 20,
    color: '#999',
  },
});
