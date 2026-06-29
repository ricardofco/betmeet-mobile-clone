/**
 * Runtime resolver for federated chunks (ADR-002). Imported once, first
 * thing, in the host's `index.js` — before the app registers/renders — so
 * Re.Pack's ScriptManager knows where to fetch each remote container and its
 * chunks from at runtime.
 *
 * Adapted from this plugin's `/repack-init` template
 * (`templates/repack/ScriptManager.setup.js`). When a later bolt adds a real
 * remote (pools, competition, scoring-rankings, notifications-preferences,
 * admin — system-context.md §4), add one entry to `REMOTES` below; don't
 * duplicate this resolver per remote.
 */
import { ScriptManager } from '@callstack/repack/client';
import { Platform } from 'react-native';

const REMOTES: Record<string, string> = {
  // education: dev server on 8082 in development; swap for a CDN URL in prod.
  education: __DEV__ ? 'http://localhost:8082' : 'https://cdn.example.com/education',
};

ScriptManager.shared.addResolver(async (scriptId: string, caller?: string) => {
  const platform = Platform.OS;

  for (const [name, base] of Object.entries(REMOTES)) {
    if (scriptId.startsWith(name) || caller === name) {
      return {
        url: `${base}/${platform}/${scriptId}`,
        cache: !__DEV__,
      };
    }
  }
  // Fall through: let Re.Pack handle host-local chunks.
  return undefined;
});
