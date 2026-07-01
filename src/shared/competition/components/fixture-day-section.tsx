import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

type FixtureDaySectionHeaderProps = {
  calendarDate: string;
};

function formatSectionDate(calendarDate: string): string {
  if (calendarDate === 'unscheduled') return 'Date to be confirmed';
  const [year, month, day] = calendarDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

/**
 * The sticky section header `fixture-list.tsx`'s FlashList renders above
 * each `FixtureDayGroup`'s matches — the visible "day bucket" boundary
 * COMPETITION-1 requires. Memoized: section headers don't change once
 * mounted, only the FlashList's sticky-header recycling re-renders them.
 */
function FixtureDaySectionHeaderComponent({ calendarDate }: FixtureDaySectionHeaderProps) {
  return (
    <View style={styles.header}>
      <Text style={styles.headerText}>{formatSectionDate(calendarDate)}</Text>
    </View>
  );
}

export const FixtureDaySectionHeader = memo(FixtureDaySectionHeaderComponent);

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
  },
  headerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
});
