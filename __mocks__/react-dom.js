/**
 * Jest manual mock for `react-dom` (ADR-045). `tamagui`'s Popper/floating
 * (Popover/Tooltip/Select internals) `require('react-dom')` even in their
 * `.native.js` build — dead code on native/under Jest, since this repo uses
 * none of those components (same reasoning as the `rspack.config.mjs`/
 * `rspack.config.pools-remote.mjs` `IgnorePlugin` entries, which cover the
 * Rspack-bundling side of this same gap; this mock covers the Jest side).
 * An empty module is enough — the code path that would call anything on it
 * is never reached in this repo's own components.
 */
module.exports = {};
