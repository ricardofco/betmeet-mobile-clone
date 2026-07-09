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
    // Change-2026-07-08 (i18n completion) — `SignInScreen`'s OR divider.
    or: 'or',
    // Change-2026-07-08 (follow-up) — `RemoteBoundary`'s error-boundary
    // fallback (`src/host/remote-boundary.tsx`) is a class component (can't
    // use `useTranslation()` directly), missed by the earlier sweep since it
    // isn't one of the audited "screens" — it's Bolt 0 scaffolding reused by
    // every remote (`education`/`pools`/`admin`) mount site.
    remoteBoundaryError: "This section couldn't load.",
    remoteBoundaryRetry: 'Tap to retry',
    // Change-2026-07-08 (follow-up) — `LiveIndicator`'s pill badge
    // (`src/shared/competition/components/live-indicator.tsx`), another
    // component missed by the earlier sweep (no screen, a small shared
    // presentational piece).
    livePill: 'LIVE',
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
    openRulesCenter: 'Open Rules Center',
    // Change-2026-07-08 (item 4, Home redesign) — replaces the removed
    // `subtitle` key (Bolt-0's leftover "Host bundle is running." debug
    // copy, never real product copy). This is the feature row's description
    // line under `openRulesCenter`'s title.
    rulesCenterDescription: 'Scoring rules, penalties, and a scoring calculator.',
  },
  // Change-2026-07-08 (i18n completion) — every host `auth` screen's own
  // copy, previously hardcoded English never routed through `t()`.
  auth: {
    signIn: {
      title: 'Sign in',
      emailPlaceholder: 'Email',
      passwordPlaceholder: 'Password',
      invalidCredentials: 'Incorrect email or password.',
      submit: 'Sign in',
      oauthError: 'Could not open Google sign-in. Please try again.',
      openingGoogle: 'Opening Google…',
      signInWithGoogle: 'Sign in with Google',
      needAccount: 'Need an account? Sign up',
      forgotPassword: 'Forgot password?',
    },
    signUp: {
      title: 'Create account',
      emailPlaceholder: 'Email',
      passwordPlaceholder: 'Password (min. 8 characters)',
      genericError: 'Something went wrong. Try again.',
      submit: 'Sign up',
      haveAccount: 'Already have an account? Sign in',
    },
    forgotPassword: {
      checkInboxTitle: 'Check your inbox',
      sentBody: 'We sent a password-reset link to {{email}}. Tap the link in the email to set a new password.',
      title: 'Reset your password',
      body: 'Enter your email address and we will send you a link to reset your password.',
      emailPlaceholder: 'Email',
      invalidEmail: 'Enter a valid email address.',
      error: 'Something went wrong. Please try again.',
      submit: 'Send reset link',
    },
    // `ResetPasswordScreen` — the AUTH-7 rule-table placeholder route, real
    // flow is `forgotPassword`/`setNewPassword` above (Bolt 2).
    resetPasswordPlaceholder: {
      comingSoon: 'Password reset is coming soon.',
    },
    setNewPassword: {
      updatedTitle: 'Password updated',
      updatedBody: 'Your password has been updated. Signing you in...',
      title: 'Set new password',
      body: 'Enter your new password. It must be at least 8 characters.',
      passwordPlaceholder: 'New password',
      error: 'Something went wrong. Please try again or request a new reset link.',
      submit: 'Update password',
    },
    verifyEmail: {
      postSignup: 'Check your email to finish signing up',
      unconfirmedSession: 'Please verify your email to continue',
    },
    unconfirmedEmailPanel: {
      resendIn: 'Resend in {{seconds}}s',
      resendConfirmation: 'Resend confirmation',
      sent: 'Confirmation email sent.',
      throttled: 'Please wait before requesting another email.',
    },
    mfaChallenge: {
      title: 'Two-factor authentication',
      body: 'Enter the 6-digit code from your authenticator app to continue.',
      codePlaceholder: '000000',
      invalidCode: 'Incorrect code. Please check your authenticator app and try again.',
      expired: 'Code expired. Please enter the current code from your authenticator app.',
      error: 'Something went wrong. Please try again.',
      verify: 'Verify',
    },
    // `AuthGatedNavigator`'s own native-stack header `title`s — distinct
    // from the in-screen headings above for the same reason
    // `settings.rows.twoFactor` differs from `settings.headers.twoFactor`.
    screens: {
      signIn: 'Sign in',
      signUp: 'Create account',
      forgotPassword: 'Forgot password',
      setNewPassword: 'Set new password',
      verifyEmail: 'Verify email',
    },
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
      // Change-2026-07-08 (Omitted Requirement #3) — the first real
      // deliberate sign-out affordance for an already-authenticated user;
      // shares this exact key with `MfaChallengeScreen`'s own escape-hatch
      // sign-out link so both stay worded identically.
      signOut: 'Sign out',
    },
    headers: {
      twoFactor: 'Two-factor authentication',
    },
    // Change-2026-07-08 (Omitted Requirement #3) — a lightweight
    // `Alert.alert` confirm (see change record for why a full confirm
    // screen like Delete Account's isn't warranted here).
    signOutConfirm: {
      title: 'Sign out?',
      message: 'Are you sure you want to sign out?',
    },
    changeEmail: {
      checkNewEmailTitle: 'Check your new email',
      confirmationSentBody: 'We sent a confirmation link to {{email}}. Tap the link to confirm your new email address.',
      title: 'Change email',
      body: 'Enter your new email address. We will send a confirmation link to that address.',
      placeholder: 'New email address',
      genericError: 'Unable to change email. Please try again.',
      submit: 'Send confirmation',
    },
    changePassword: {
      changedTitle: 'Password changed',
      changedBody: 'Your password has been updated successfully.',
      title: 'Change password',
      currentPlaceholder: 'Current password',
      newPlaceholder: 'New password (min 8 characters)',
      genericError: 'Unable to change password. Check your current password and try again.',
      submit: 'Save new password',
    },
    deleteAccount: {
      title: 'Delete account',
      body: 'This is permanent and cannot be undone. Your predictions and pool history are removed and your nickname is released.',
      transferSectionLabel: 'Transfer your pools',
      poolsToDeleteBody: 'These pools have no other members and will be deleted: {{names}}.',
      confirmSectionLabel: 'Confirm',
      confirmInstruction: 'Type "{{phrase}}" to confirm.',
      missingAssignmentError: 'Choose a new owner for every pool listed below.',
      genericError: "Couldn't delete your account. Please try again.",
      submit: 'Delete my account',
    },
    totpEnrollment: {
      enabledTitle: 'Two-factor authentication enabled',
      enabledBody: 'Your authenticator app is now linked. You will be asked for a code each time you sign in.',
      failedTitle: 'Enrollment failed',
      tryAgain: 'Try again',
      verifyingBody: 'Verifying...',
      scanTitle: 'Scan this QR code',
      scanBody: 'Open your authenticator app (e.g. Google Authenticator or Authy) and scan the QR code below.',
      manualEntryLabel: "Can't scan? Enter this code manually:",
      codePlaceholder: 'Enter 6-digit code',
      invalidCode: 'Incorrect code. Check your authenticator app and try again.',
      expired: 'Code expired. Enter the current code from your authenticator app.',
      error: 'Something went wrong. Please try again.',
      verifyAndEnable: 'Verify and enable',
      idleTitle: 'Enable two-factor authentication',
      idleBody: 'Protect your account with an authenticator app. You will need to enter a 6-digit code each time you sign in.',
      getStarted: 'Get started',
      startError: 'Unable to start enrollment. Please try again.',
    },
  },
  // Change-2026-07-08 (i18n completion) — `AvatarPicker`/`NicknameForm`
  // (shared by onboarding + Settings) and the onboarding wizard's own
  // per-step screens.
  profile: {
    avatarPicker: {
      useGooglePhoto: 'Use Google photo',
      uploadCustomPhoto: 'Upload a custom photo',
      tooLarge: 'Image must be 5MB or smaller.',
      unsupportedType: 'Only JPEG, PNG, or WebP images are supported.',
      uploadFailed: 'Upload failed. Please try again.',
    },
    nicknameForm: {
      cooldownMessage: 'You can change your nickname again on {{date}}.',
      placeholder: 'Choose a nickname',
      tooShort: 'Nickname must be at least 3 characters.',
      tooLong: 'Nickname must be at most 20 characters.',
      invalidCharacters: 'Only letters, numbers, underscores, and hyphens are allowed.',
      taken: 'That nickname is unavailable. Try another.',
      available: 'Available',
      cooldownError: 'You can change your nickname again soon — try again later.',
      submit: 'Save nickname',
    },
    onboarding: {
      avatarTitle: 'Pick an avatar',
      nicknameTitle: 'Choose a nickname',
      nicknameBody: 'This is how other players will see you across leagues and rankings.',
      notificationsTitle: 'Stay in the loop',
      notificationsBody: 'Notification preferences are coming soon. You can manage them anytime from Settings.',
      enableNotifications: 'Enable notifications',
      secondFactorTitle: 'Secure your account',
      secondFactorBody:
        'Add two-factor authentication so only you can sign in, even if your password is ever compromised.',
      enableNow: 'Enable now',
      completionError: 'Something went wrong finishing setup. Please try again.',
      // `OnboardingStack`'s own native-stack header `title`s.
      screens: {
        nickname: 'Nickname',
        avatar: 'Avatar',
        rules: 'Rules',
        notifications: 'Notifications',
        secondFactor: 'Security',
      },
    },
  },
  // Change-2026-07-08 (follow-up) — `describeMatchStatus`'s `MatchStatus`
  // keys (`src/domain/competition/match-status.ts`), previously hardcoded
  // English returned directly from that domain function. It now returns a
  // `labelKey` suffix instead; components call `t()` themselves.
  matchStatus: {
    scheduled: 'Scheduled',
    locked: 'Locked',
    live: 'Live',
    finished: 'Finished',
    postponed: 'Postponed',
    cancelled: 'Cancelled',
  },
  predictions: {
    title: 'Predictions',
    loading: 'Loading fixtures…',
    empty: 'No matches to predict yet.',
    // Preserves the exact pre-Bolt-9 string (straight apostrophe) so the
    // existing `predictions-screen.test.tsx` regex match keeps passing.
    error: "Couldn't load fixtures. Pull to retry.",
    // Change-2026-07-08 (i18n completion) — `PredictionMatchCard` and its
    // sibling components (kept plain `StyleSheet`, not Tamagui, per the
    // existing FlashList-row-perf exception — i18n still applies).
    penaltyWinnerPrompt: 'Penalty shootout winner',
    poolPickerGlobal: 'Global',
    matchCard: {
      tbd: 'TBD',
      homeLabel: 'Home',
      awayLabel: 'Away',
      updatePrediction: 'Update prediction',
      savePrediction: 'Save prediction',
      updateOverride: 'Update override',
      saveOverride: 'Save override',
      alsoSaveGlobal: 'Also save as my global prediction',
      useGlobalPrediction: 'Use global prediction',
      resetting: 'Resetting…',
      scored: 'Scored',
      pending: 'Pending',
      penaltyAbbrev: 'pen.',
    },
    // Change-2026-07-08 (follow-up) — `describeLockReason`'s
    // `PredictionLockReason` keys (`src/domain/predictions/prediction-
    // eligibility.ts`), previously hardcoded English returned directly from
    // that domain function. It now returns one of these key suffixes
    // instead; components call `t()` themselves (domain stays framework-free).
    lockReason: {
      matchNotEditable: 'Not available yet',
      kickoffReached: 'Locked — kickoff has passed',
      cancelled: 'Match cancelled',
      postponed: 'Match postponed',
      matchStatusLocked: 'Locked',
    },
    scoreBreakdown: {
      exact: 'Exact score',
      result: 'Correct result',
      partial: 'Partially correct',
      miss: 'Missed',
      points: '{{count}} pts',
      resultLabel: 'Result',
      homeGoalsLabel: 'Home goals',
      awayGoalsLabel: 'Away goals',
      penaltyBonusLabel: 'Penalty-winner bonus',
    },
    fixtureList: {
      showPast: 'Show past matches',
      hidePast: 'Hide past matches',
    },
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
    // Change-2026-07-08 (i18n completion) — every remaining `pools` remote
    // screen/component's own copy, previously hardcoded English.
    settingsScreen: {
      poolNameLabel: 'Pool name',
      saveName: 'Save name',
      publicPoolLabel: 'Public pool',
      membersCanInviteLabel: 'Members can invite',
      nameLengthError: 'Name must be 3-60 characters.',
      nameTakenError: 'A public pool with this name already exists.',
      renameGenericError: "Couldn't rename this pool.",
      visibilityNameTakenError:
        'A public pool with this name already exists — rename before switching to public.',
      deleteThisPool: 'Delete this pool',
      deleteHint: 'This cannot be undone. To hand off ownership instead, use "Transfer ownership" above.',
      deletePool: 'Delete pool',
    },
    createPool: {
      poolNameLabel: 'Pool name',
      poolNamePlaceholder: 'My league',
      capacityLabel: 'Capacity ({{min}}-{{max}})',
      publicPoolLabel: 'Public pool',
      membersCanInviteLabel: 'Members can invite',
      nameTakenError: 'A public pool with this name already exists.',
      genericError: 'Please check the pool details.',
      submit: 'Create pool',
    },
    discoverPools: {
      loadError: "Couldn't load public pools.",
      empty: 'No public pools yet.',
      joinFullError: 'This pool is full.',
      joinGenericError: "Couldn't join this pool.",
    },
    joinByToken: {
      label: 'Invite code',
      placeholder: 'ABC23XYZ',
      fullError: 'This pool is full.',
      notFoundError: 'Invalid invite code.',
      genericError: "Couldn't join this pool.",
      submit: 'Join pool',
    },
    poolPredictions: {
      loadError: "Couldn't load this pool's predictions.",
    },
    inviteTokenPanel: {
      label: 'Invite code',
      copy: 'Copy',
      copied: 'Copied!',
    },
    directedInviteForm: {
      label: 'Invite someone',
      hint: 'Nickname (name#1234) or email',
      placeholder: 'name#1234 or email',
      submit: 'Invite',
      sent: 'Invite sent.',
      savedNoAccount: "Invite saved — we'll notify them if they sign up.",
      genericError: "Couldn't send the invite.",
      errors: {
        VALIDATION_FAILED: 'Enter a nickname (name#1234) or an email address.',
        NOT_FOUND: 'Pool not found.',
        NOT_MEMBER: 'You must be a member of this pool to invite.',
        PERMISSION_DENIED: "This pool's owner hasn't enabled member invites.",
        SELF_INVITE: "You can't invite yourself.",
        UNRESOLVABLE: "We couldn't find a user with that nickname. Try name#1234 or an email.",
      },
    },
    transferOwnershipPanel: {
      label: 'Transfer ownership',
      hint: 'Choose a member to become the new owner. You will stop being a member.',
      invalidTargetError: 'Choose a current member to transfer to.',
      genericError: "Couldn't transfer ownership. Please try again.",
      submit: 'Transfer ownership',
    },
    memberRow: {
      unnamedMember: 'Unnamed member',
      owner: 'Owner',
      kick: 'Kick',
    },
    scoreStepper: {
      decrease: 'Decrease {{label}}',
      increase: 'Increase {{label}}',
    },
    gridCell: {
      unnamedMember: 'Unnamed member',
      hiddenUntilKickoff: 'Hidden until kickoff',
      noPrediction: 'No prediction',
      edit: 'Edit',
      predict: 'Predict',
      useGlobal: 'Use global',
      resetting: 'Resetting…',
      override: 'Override',
      points: '{{count}} pts',
      cancel: 'Cancel',
      save: 'Save',
      home: 'Home',
      away: 'Away',
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
