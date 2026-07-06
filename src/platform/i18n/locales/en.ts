/**
 * English string catalog (ADR-044). Namespaced by feature area, flat within
 * each namespace — granularity kept simple per ADR-044 §5 ("an Implement-
 * stage detail, not an architectural one").
 *
 * Coverage in this bolt: the navigation shell (tabs/drawer/hamburger), Home,
 * the Settings list, the Predictions screen's own chrome (loading/empty/
 * error states — not its FlashList row components, see
 * `implement-and-test.md §5` for the documented reason), and `pools`'
 * `MyPoolsScreen`/`PoolDetailScreen` chrome. Every other Bolt 5-8 screen
 * still renders hardcoded strings — tracked as an explicit follow-up, not
 * silently dropped (`implement-and-test.md §6`).
 */
export const en = {
  common: {
    retry: 'Retry',
    loading: 'Loading…',
    cancel: 'Cancel',
    save: 'Save',
    error: 'Something went wrong',
  },
  navigation: {
    tabs: {
      home: 'Home',
      predictions: 'Predictions',
      pools: 'Pools',
      rankings: 'Rankings',
    },
    openMenu: 'Open menu',
    drawer: {
      settings: 'Settings',
    },
  },
  home: {
    title: 'Liga Mundial',
    subtitle: 'Host bundle is running. Tap below to load the federated `education` remote.',
    loadEducationRemote: 'Load education remote',
  },
  settings: {
    title: 'Account settings',
    sections: {
      profile: 'Profile',
      security: 'Security',
      account: 'Account',
    },
    rows: {
      nickname: 'Nickname',
      avatar: 'Avatar',
      language: 'Language',
      changePassword: 'Change password',
      changeEmail: 'Change email',
      // Distinct on purpose from `headers.twoFactor` below — the row label
      // (a call-to-action) and the pushed screen's header title (a noun
      // phrase) were already two different strings before this bolt.
      twoFactor: 'Enable two-factor authentication',
      deleteAccount: 'Delete account',
    },
    headers: {
      twoFactor: 'Two-factor authentication',
    },
  },
  predictions: {
    title: 'Predictions',
    loading: 'Loading fixtures…',
    empty: 'No matches to predict yet.',
    // Preserves the exact pre-Bolt-9 string (straight apostrophe) so the
    // existing `predictions-screen.test.tsx` regex match keeps passing.
    error: "Couldn't load fixtures. Pull to retry.",
  },
  pools: {
    myPools: {
      title: 'My pools',
      // Preserves the exact pre-Bolt-9 strings so
      // `my-pools-screen.test.tsx`'s existing assertions keep passing.
      empty: "You haven't joined any pools yet.",
      loading: 'Loading your pools…',
      error: "Couldn't load your pools.",
      create: 'Create a pool',
      discover: 'Discover public pools',
      joinByToken: 'Join by code',
    },
    detail: {
      loading: 'Loading pool…',
      error: 'Could not load this pool.',
      // Preserves the exact pre-Bolt-9 string so
      // `pool-detail-screen.test.tsx`'s existing assertion keeps passing.
      notFound: 'Pool not found.',
      members: 'Members',
      settings: 'Pool settings',
      predictionsButton: 'Predictions',
      leave: 'Leave pool',
      archive: 'Archive',
      unarchive: 'Unarchive',
      typePublic: 'Public',
      typePrivate: 'Private',
      memberCount: '{{count}}/{{capacity}} members',
      // Post-Implement fix (2026-07-06, Layer 2 finding #3) — also used by
      // `pool-list-item.tsx` (a second, separately-missed hardcoded-English
      // spot in this same in-scope remote).
      archivedBadge: 'Archived',
      // Bolt 10 (RANKINGS-2, design.md §7.2) — next to the existing
      // `predictionsButton`.
      leaderboard: 'Leaderboard',
    },
    // Post-Implement fix (2026-07-06, Layer 2 finding #3) — the pools
    // remote's own navigator (`PoolsRemoteEntry.tsx`) registered every
    // screen's header `title` as a literal string, a real miss during
    // Implement (this remote's own screens were explicitly in-scope per
    // `implement-and-test.md §6`). Kept in a distinct `screens` namespace
    // (not reusing `myPools`/`detail`'s own keys, even where the text
    // coincides) — a navigator header title and an in-screen label are
    // different semantic usages, same discipline as `settings.rows.twoFactor`
    // vs. `settings.headers.twoFactor` above.
    screens: {
      myPools: 'My pools',
      discoverPools: 'Discover pools',
      createPool: 'Create pool',
      joinByToken: 'Join by code',
      poolDetail: 'Pool',
      poolSettings: 'Pool settings',
      poolPredictions: 'Predictions',
      // Bolt 10 (RANKINGS-2, design.md §7.2) — this remote's own navigator
      // header title, same convention as its sibling `pool*` keys above.
      poolLeaderboard: 'Leaderboard',
    },
    // Bolt 10 (RANKINGS-2) — `pool-leaderboard-screen.tsx`'s own chrome
    // strings, distinct from `screens.poolLeaderboard` (the navigator header
    // title) for the same reason `settings.rows.twoFactor` differs from
    // `settings.headers.twoFactor`.
    leaderboardScreen: {
      loading: 'Loading leaderboard…',
      error: 'Could not load this leaderboard.',
      notMember: 'You must be a member of this pool to see its leaderboard.',
      empty: 'No members yet.',
    },
  },
  // Bolt 10 (RANKINGS-1/3, design.md §7.1) — the host's new `Rankings` tab.
  rankings: {
    title: 'Rankings',
    loading: 'Loading rankings…',
    error: "Couldn't load the rankings.",
    empty: 'No ranked players yet.',
    live: 'LIVE',
    anonymousPlayer: 'Player',
  },
} as const;
