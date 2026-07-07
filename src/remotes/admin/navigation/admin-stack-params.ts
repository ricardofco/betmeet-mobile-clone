/**
 * Bolt 13 (ADR-057) — the `admin` remote's own internal screen graph, the
 * host has zero compile-time knowledge of these route names (same shape as
 * `pools-stack-params.ts`, ADR-032).
 */
export type AdminStackParamList = {
  AdminHome: undefined;
  SweepStatus: undefined;
  ForceResult: undefined;
  RevertOverride: undefined;
};
