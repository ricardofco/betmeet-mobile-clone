import { memo } from 'react';
import Svg, { Rect } from 'react-native-svg';
import { getFlagCatalogEntry } from '@/shared/competition/flags/flag-catalog';
import type { FlagAssetKey } from '@/domain/competition';

type FlagBadgeProps = {
  flagKey: FlagAssetKey;
  size?: number;
};

/**
 * Renders a team's flag from the bundled catalog (COMPETITION-3 AC #3 —
 * bundled, never a remote-fetched image). `react-native-svg` primitives are
 * used directly (no new native dependency — already linked via
 * `react-native-qrcode-svg`, Bolt 2/ADR-007). Memoized per
 * `vercel-react-native-skills`' list-item memoization rule, since this
 * component is rendered once per row inside `fixture-list.tsx`'s FlashList.
 */
function FlagBadgeComponent({ flagKey, size = 24 }: FlagBadgeProps) {
  const entry = getFlagCatalogEntry(flagKey);
  const height = Math.round(size * 0.75);

  return (
    <Svg
      width={size}
      height={height}
      viewBox={`0 0 ${size} ${height}`}
      accessibilityLabel={`Flag: ${flagKey}`}
      accessible
    >
      <Rect x={0} y={0} width={size} height={height} rx={2} fill={entry.tint} />
    </Svg>
  );
}

export const FlagBadge = memo(FlagBadgeComponent);
