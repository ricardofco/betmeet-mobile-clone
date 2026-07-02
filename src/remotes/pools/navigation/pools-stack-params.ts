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
};
