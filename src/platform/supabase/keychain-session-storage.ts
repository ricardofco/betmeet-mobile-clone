import * as Keychain from 'react-native-keychain';

/**
 * `react-native-keychain`-backed implementation of Supabase JS's
 * `SupportedStorage` interface (`getItem`/`setItem`/`removeItem`), used as
 * the Supabase client's `auth.storage` option (requirements.md §7.5 —
 * secure session/token storage; AUTH-8 builds the full session-restore
 * behavior on top of this in unit-01-auth's bolt).
 *
 * Each storage key gets its own Keychain "service" entry so multiple
 * Supabase storage keys (e.g. the auth token entry) don't collide in a
 * single generic-password slot.
 */
const SERVICE_PREFIX = 'betmeet.supabase.';

export const keychainSessionStorage = {
  async getItem(key: string): Promise<string | null> {
    const result = await Keychain.getGenericPassword({ service: SERVICE_PREFIX + key });
    console.log('result', result)
    if (!result) return null;
    return result.password;
  },

  async setItem(key: string, value: string): Promise<void> {
    await Keychain.setGenericPassword(key, value, { service: SERVICE_PREFIX + key });
  },

  async removeItem(key: string): Promise<void> {
    await Keychain.resetGenericPassword({ service: SERVICE_PREFIX + key });
  },
};
