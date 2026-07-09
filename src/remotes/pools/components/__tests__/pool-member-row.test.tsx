import { screen, userEvent } from '@testing-library/react-native';
import { renderWithQueryClient } from '@/remotes/pools/test-utils/render-with-query-client';
import { PoolMemberRow } from '@/remotes/pools/components/pool-member-row';
import type { PoolMember } from '@/domain/pools';

function makeMember(overrides: Partial<PoolMember> = {}): PoolMember {
  return {
    userId: 'member-1',
    nickname: 'jugador#0042',
    isOwner: false,
    joinedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('PoolMemberRow (POOLS-2 kick affordance)', () => {
  it('renders the member nickname', async () => {
    await renderWithQueryClient(<PoolMemberRow member={makeMember()} canKick={false} onKick={jest.fn()} />);
    expect(screen.getByText('jugador#0042')).toBeOnTheScreen();
  });

  it('renders a fallback label when nickname is null', async () => {
    await renderWithQueryClient(<PoolMemberRow member={makeMember({ nickname: null })} canKick={false} onKick={jest.fn()} />);
    expect(screen.getByText('Unnamed member')).toBeOnTheScreen();
  });

  it('shows an Owner badge for the owner row', async () => {
    await renderWithQueryClient(<PoolMemberRow member={makeMember({ isOwner: true })} canKick={false} onKick={jest.fn()} />);
    expect(screen.getByText('Owner')).toBeOnTheScreen();
  });

  it('does not show an Owner badge for a non-owner row', async () => {
    await renderWithQueryClient(<PoolMemberRow member={makeMember()} canKick={false} onKick={jest.fn()} />);
    expect(screen.queryByText('Owner')).not.toBeOnTheScreen();
  });

  it('shows the kick button only when canKick is true', async () => {
    await renderWithQueryClient(<PoolMemberRow member={makeMember()} canKick={true} onKick={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Kick' })).toBeOnTheScreen();
  });

  it('hides the kick button when canKick is false (e.g. the owner\'s own row, model.md §6)', async () => {
    await renderWithQueryClient(<PoolMemberRow member={makeMember({ isOwner: true })} canKick={false} onKick={jest.fn()} />);
    expect(screen.queryByRole('button', { name: 'Kick' })).not.toBeOnTheScreen();
  });

  it('calls onKick with the member userId when the kick button is pressed', async () => {
    const onKick = jest.fn();
    const user = userEvent.setup();
    await renderWithQueryClient(<PoolMemberRow member={makeMember()} canKick={true} onKick={onKick} />);

    await user.press(screen.getByRole('button', { name: 'Kick' }));
    expect(onKick).toHaveBeenCalledWith('member-1');
  });
});
