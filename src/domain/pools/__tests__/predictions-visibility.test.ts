import { isMemberPredictionVisible } from '@/domain/pools/predictions-visibility';

const NOW = '2026-07-02T12:00:00.000Z';
const PAST_KICKOFF = '2026-07-02T10:00:00.000Z';
const FUTURE_KICKOFF = '2026-07-02T14:00:00.000Z';

describe('isMemberPredictionVisible (model.md §5, ADR-038)', () => {
  it('is always visible for the viewer\'s own row, regardless of kickoff', () => {
    expect(
      isMemberPredictionVisible({ kickoffAt: FUTURE_KICKOFF }, NOW, 'viewer', 'viewer'),
    ).toBe(true);
    expect(isMemberPredictionVisible({ kickoffAt: null }, NOW, 'viewer', 'viewer')).toBe(true);
  });

  it('is hidden for another member\'s row before kickoff', () => {
    expect(
      isMemberPredictionVisible({ kickoffAt: FUTURE_KICKOFF }, NOW, 'other', 'viewer'),
    ).toBe(false);
  });

  it('is visible for another member\'s row once kickoff has passed', () => {
    expect(
      isMemberPredictionVisible({ kickoffAt: PAST_KICKOFF }, NOW, 'other', 'viewer'),
    ).toBe(true);
  });

  it('is visible for another member\'s row exactly at kickoff (inclusive boundary)', () => {
    expect(isMemberPredictionVisible({ kickoffAt: NOW }, NOW, 'other', 'viewer')).toBe(true);
  });

  it('is hidden for another member\'s row when kickoffAt is null (never "started")', () => {
    expect(isMemberPredictionVisible({ kickoffAt: null }, NOW, 'other', 'viewer')).toBe(false);
  });
});
