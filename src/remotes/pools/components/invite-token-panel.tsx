import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { canInvite, type PoolForInvitePermission } from '@/domain/pools';

type InviteTokenPanelProps = {
  pool: PoolForInvitePermission;
  inviteToken: string | null;
  viewerIsOwner: boolean;
  /**
   * Injected rather than imported directly: `Clipboard` was removed from
   * react-native core (moved to `@react-native-clipboard/clipboard`, not
   * yet an installed dependency in this repo — a genuine, small,
   * out-of-scope-for-this-bolt native-module addition, flagged in
   * implement-and-test.md's Known Issues rather than added silently
   * mid-bolt). Defaults to a no-op "mark as copied" so the UI still gives
   * the user visible confirmation and the invite-token text itself is
   * always visible/selectable without needing the native module at all.
   */
  onCopy?: (token: string) => void;
};

/**
 * Shows/copies the pool's invite token, gated by `canInvite` (model.md §5)
 * — advisory UI gating only, every current member can already see this
 * pool's `inviteToken` field in the API response (design.md §3); this
 * component only decides whether to *render* the affordance.
 */
export function InviteTokenPanel({ pool, inviteToken, viewerIsOwner, onCopy }: InviteTokenPanelProps) {
  const [copied, setCopied] = useState(false);

  if (!canInvite(pool, viewerIsOwner) || !inviteToken) return null;

  const handleCopy = () => {
    onCopy?.(inviteToken);
    setCopied(true);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Invite code</Text>
      <View style={styles.tokenRow}>
        <Text style={styles.token} selectable>
          {inviteToken}
        </Text>
        <Pressable accessibilityRole="button" onPress={handleCopy} style={styles.copyButton}>
          <Text style={styles.copyButtonText}>{copied ? 'Copied!' : 'Copy'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ddd',
    borderRadius: 8,
    marginVertical: 8,
  },
  label: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  tokenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  token: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 2,
  },
  copyButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#eee',
    borderRadius: 6,
  },
  copyButtonText: {
    fontWeight: '600',
  },
});
