import {
  describeTeamSlot,
  isKnockoutPlaceholder,
  isResolvedTeam,
  type TeamSlot,
} from '@/domain/competition/fifa-team-display';

describe('fifa-team-display (model.md §4, COMPETITION-3)', () => {
  const resolvedTeam: TeamSlot = { id: 't1', fifaCode: 'ENG', name: 'England', flagKey: 'gb-eng' };
  const placeholder: TeamSlot = { kind: 'placeholder', label: 'Winner of Round of 16 Match 3' };

  it('isResolvedTeam / isKnockoutPlaceholder distinguish all three TeamSlot states', () => {
    expect(isResolvedTeam(resolvedTeam)).toBe(true);
    expect(isKnockoutPlaceholder(resolvedTeam)).toBe(false);

    expect(isResolvedTeam(placeholder)).toBe(false);
    expect(isKnockoutPlaceholder(placeholder)).toBe(true);

    expect(isResolvedTeam(null)).toBe(false);
    expect(isKnockoutPlaceholder(null)).toBe(false);
  });

  it('describeTeamSlot renders a resolved team name', () => {
    expect(describeTeamSlot(resolvedTeam)).toBe('England');
  });

  it('describeTeamSlot renders a knockout placeholder label, not blank (COMPETITION-1 AC)', () => {
    expect(describeTeamSlot(placeholder)).toBe('Winner of Round of 16 Match 3');
  });

  it('describeTeamSlot renders a TBD fallback for a bare null slot (data-defect case, not the normal placeholder path)', () => {
    expect(describeTeamSlot(null)).toBe('TBD');
  });

  it('UK home-nations keep fifaCode and flagKey as independent, non-derived identifiers (COMPETITION-3 AC)', () => {
    const ukNations: TeamSlot[] = [
      { id: 't2', fifaCode: 'ENG', name: 'England', flagKey: 'gb-eng' },
      { id: 't3', fifaCode: 'SCO', name: 'Scotland', flagKey: 'gb-sct' },
      { id: 't4', fifaCode: 'WAL', name: 'Wales', flagKey: 'gb-wls' },
    ];

    for (const team of ukNations) {
      if (isResolvedTeam(team)) {
        // The flag key must NOT be derivable by lowercasing fifaCode — this
        // is exactly the bug this domain rule exists to prevent.
        expect(team.flagKey).not.toBe(team.fifaCode.toLowerCase());
        expect(team.flagKey.startsWith('gb-')).toBe(true);
      }
    }
  });
});
