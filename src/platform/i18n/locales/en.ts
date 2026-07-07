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
    // Bolt 12 (EDU-3, design.md §5) — ported 1:1 from betmeet-clone's
    // `common.continue`/`common.skipForNow` (`rules-step.tsx`'s own
    // Continue/Skip buttons), reused here so `OnboardingRulesScreen`'s
    // buttons aren't hardcoded English while the rest of its body is
    // bilingual.
    continue: 'Continue',
    skipForNow: 'Skip for now',
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
    // Bolt 12 (ADR-053): the Bolt-0 "load the federated `education` remote"
    // demo framing is replaced — the button now pushes a real Rules Center
    // screen, not a demo toggle.
    subtitle: 'Host bundle is running.',
    openRulesCenter: 'Open Rules Center',
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
      // Bolt 13 (ADMIN-1, design.md §10) — genuinely invisible to the ~100%
      // of users who aren't the seeded ADMIN account (see
      // account-settings-screen.tsx's `useAdminAccessQuery()` gate).
      admin: 'Admin',
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
  // Bolt 12 (EDU-1, design.md §3/§8) — the `education` remote's Rules Center.
  // `documents.<slug>.title` feeds `RulesAccordion`'s per-section headers;
  // the section bodies themselves are typed data, not i18n strings
  // (`src/domain/education/rule-content.ts`, ADR-055).
  rules: {
    centerTitle: 'Rules Center',
    centerSubtitle: 'Everything you need to know to play.',
    demoTitle: 'Examples',
    documents: {
      scoring: { title: 'Scoring' },
      penalties: { title: 'Penalty predictions' },
      'match-locks': { title: 'Prediction locks' },
      ties: { title: 'Ranking ties' },
      pools: { title: 'Leagues and members' },
    },
  },
  // Bolt 12 (EDU-2, design.md §4) — ported 1:1 from betmeet-clone's
  // `calculator.*` dictionary (`scoring-calculator.tsx`/
  // `calculator-error-boundary.tsx`). `penaltyWinner`/`penaltyScore`/
  // `penaltyScoreHint` are dropped — the mobile calculator never asks for a
  // separate winner field (always derived, model.md §3), so those keys have
  // no consumer here.
  calculator: {
    title: 'Points calculator',
    description: 'Enter a prediction and a result to see how many points you would earn.',
    prediction: 'Your prediction',
    actual: 'Actual result',
    home: 'Home',
    away: 'Away',
    knockout: 'Knockout stage (allows penalties)',
    penaltyShootout: 'Penalty shootout',
    penaltyBonusHint:
      'The bonus (+1) is earned for guessing who wins the shootout, not the exact shootout score.',
    penaltyTie: 'The penalty shootout cannot end tied. Adjust the score.',
    penaltyDerivedWinner: 'Wins on penalties:',
    total: 'Points earned',
    fallbackTitle: 'Scoring table',
    fallbackNote: 'The calculator is not available right now, but these are the rules.',
  },
  // Bolt 12 (EDU-2, design.md §3/§4) — `ScoreBreakdownExplainer`'s (education's
  // own twin, ADR-054) copy, ported 1:1 from betmeet-clone's `breakdown.*`.
  breakdown: {
    exact: 'You got the exact score.',
    result: 'You got the result (+2 points).',
    partial: "You got at least one team's goals.",
    miss: 'You missed both the score and the result.',
    penaltyApplied: 'You also guessed the penalty winner (+1).',
    base: 'Base points',
    penalty: 'Penalty bonus',
    total: 'Total',
    resultPoints: 'Result',
    homeGoalPoints: 'Home goals',
    awayGoalPoints: 'Away goals',
  },
  // Bolt 12 (EDU-2/EDU-3) — the static rule→points list shared (by
  // convention, not by import — ADR-054) between `ScoringTable` (education
  // remote) and `OnboardingScoringSummary` (host).
  scoring: {
    exact: 'Exact score',
    exactPoints: '5 points',
    result: 'Correct result (+2 points)',
    resultPoints: '2 points',
    partial: 'Matched team goals (+1 point each)',
    partialPoints: '1 point per team',
    miss: 'You miss everything',
    missPoints: '0 points',
    penaltyBonus: 'Bonus for guessing the penalty winner',
    penaltyBonusPoints: '+1 point',
  },
  // Bolt 12 (EDU-4, design.md §9.3) — two illustrative cue placements, plus
  // the dismiss affordance's accessibility label (a plain `✕` glyph, §10 —
  // no icon library added).
  education: {
    cues: {
      rulesAccordionIntro: 'Tap a section to expand it and read the full rule.',
      calculatorIntro: 'Try it yourself: change the scores below and see the points update live.',
      dismiss: 'Dismiss',
    },
  },
  // Bolt 12 (EDU-3, design.md §5) — `OnboardingRulesScreen`'s new body.
  // `rulesStepTitle`/`rulesStepDescription` mirror betmeet-clone's own
  // `onboarding.*` keys; `rulesStepReviewLater` replaces `rulesStepLink`'s
  // web wording (design.md §5.1 — an informational line, not a tappable
  // cross-tree link, per ADR-001's guard mechanics).
  onboarding: {
    rulesStepTitle: 'Learn how to play',
    rulesStepDescription:
      'This is how points are awarded. You can check the full rules whenever you want.',
    rulesStepReviewLater: 'You can open the full Rules Center anytime from Home.',
  },
  // Bolt 13 (ADMIN-1..5, design.md §8, ADR-058/062) — the `admin` remote's
  // own copy. Deliberately blunt/honest per the checkpoint's explicit
  // instruction (ADR-058's "Rescoring sweep", not "Sync"; ADR-062's
  // "currently the only way a match becomes finished with scores").
  admin: {
    screens: {
      adminHome: 'Admin',
      sweepStatus: 'Rescoring sweep',
      forceResult: 'Force match result',
      revertOverride: 'Revert override',
    },
    home: {
      title: 'Admin',
      loading: 'Checking access…',
      accessDenied: "You don't have access to this section.",
      sweepButton: 'Rescoring sweep',
      forceResultButton: 'Force match result',
      revertOverrideButton: 'Revert override',
    },
    sweep: {
      title: 'Rescoring sweep',
      description:
        "Checks for finished matches that haven't been scored yet and scores them. This app has no connection to any external results feed — this does not fetch new match data.",
      lastRunLabel: 'Last run',
      neverRun: 'Never run',
      matchesScoredLabel: 'Matches scored in that run',
      triggerButton: 'Re-check for unscored finished matches',
      loading: 'Loading sweep status…',
      error: 'Could not load the sweep status.',
    },
    forceResult: {
      title: 'Force match result',
      description:
        'This app has no automatic results feed. Forcing a result here is currently the only way a match becomes finished with scores.',
      selectMatch: 'Select a match',
      homeScore: 'Home score',
      awayScore: 'Away score',
      penaltyShootout: 'Penalty shootout',
      homePenaltyScore: 'Home penalty score',
      awayPenaltyScore: 'Away penalty score',
      penaltyWinner: 'Wins on penalties',
      reasonLabel: 'Reason (required)',
      reasonPlaceholder: 'Explain why this result is being forced…',
      submitButton: 'Force result',
      loading: 'Loading matches…',
      error: 'Could not load matches.',
      empty: 'No matches with both teams resolved yet.',
      success: 'Result forced and predictions rescored.',
      errors: {
        FORBIDDEN: "You don't have access to this action.",
        NOT_FOUND: 'Match not found.',
        TEAMS_NOT_RESOLVED: 'Both teams must be resolved before forcing a result.',
        VALIDATION_FAILED: 'Check the entered scores and reason.',
        PENALTY_WINNER_MISMATCH: 'The penalty winner does not match the entered shootout score.',
      },
    },
    revertOverride: {
      title: 'Revert override',
      selectMatch: 'Select a match',
      currentResult: 'Current forced result',
      overriddenBy: 'Overridden by',
      reason: 'Reason',
      warning:
        'This cannot be undone. No results feed will repopulate this match — reverting deletes every prediction score for it.',
      confirmLabel: "Type this match's FIFA codes to confirm: {{codes}}",
      confirmPlaceholder: 'ARG-FRA',
      submitButton: 'Revert override',
      loading: 'Loading matches…',
      error: 'Could not load matches.',
      empty: 'No matches with an active override.',
      success: 'Override reverted.',
      errors: {
        FORBIDDEN: "You don't have access to this action.",
        NOT_FOUND: 'Match not found.',
        NOT_OVERRIDDEN: 'This match has no active override.',
      },
    },
    matchList: {
      knockout: 'Knockout',
      unresolved: 'Teams not resolved yet',
    },
  },
} as const;
