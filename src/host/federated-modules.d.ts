/**
 * Type declarations for federated (Module Federation) remote imports.
 * The Module Federation plugin config has `dts: false` (ADR-002) — remotes
 * don't generate type definitions automatically, so each remote import this
 * host uses gets a minimal manual declaration here. Add one line per remote
 * exposed module as later bolts wire up real remotes (pools, competition,
 * scoring-rankings, notifications-preferences, admin).
 */
declare module 'education/App' {
  import type { ComponentType } from 'react';
  const EducationRemoteApp: ComponentType;
  export default EducationRemoteApp;
}
