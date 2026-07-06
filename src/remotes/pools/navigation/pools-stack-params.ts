/**
 * The `pools` remote's OWN internal param list (design.md §3/§4, ADR-034)
 * — private to this bundle. The host has zero compile-time knowledge of
 * these route names or param shapes; it only knows "mount `pools/App`, no
 * params."
 */
export type PoolsStackParamList = {
  MyPools: undefined;
  DiscoverPools: undefined;
  CreatePool: undefined;
  JoinByToken: undefined;
  PoolDetail: { poolId: string };
  PoolSettings: { poolId: string };
  /** Bolt 8 (POOLS-6, design.md §7) — the member-prediction grid. */
  PoolPredictions: { poolId: string };
  /** Bolt 10 (RANKINGS-2, ADR-048, design.md §7.2) — the pool leaderboard. */
  PoolLeaderboard: { poolId: string };
};
