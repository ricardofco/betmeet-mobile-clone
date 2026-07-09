import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

/**
 * Isolated "LIVE" pill (design.md §2.1 — "isolated so only it re-renders on
 * a live-data refetch"). Kept as its own memoized component so a live-signal
 * refetch (COMPETITION-2) re-renders only the rows whose `isLive` flag
 * actually changed, not the whole match card subtree.
 */
function LiveIndicatorComponent() {
  const { t } = useTranslation();
  return (
    <View style={styles.pill} accessibilityLabel={t('matchStatus.live')}>
      <Text style={styles.text}>{t('common.livePill')}</Text>
    </View>
  );
}

export const LiveIndicator = memo(LiveIndicatorComponent);

const styles = StyleSheet.create({
  pill: {
    backgroundColor: '#DC2626',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});
