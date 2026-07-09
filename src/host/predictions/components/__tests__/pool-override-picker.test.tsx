import { screen, userEvent } from '@testing-library/react-native';
import { renderWithQueryClient } from '@/host/profile/test-utils/render-with-query-client';
import { PoolOverridePicker } from '@/host/predictions/components/pool-override-picker';
import type { PoolPickerEntry } from '@/domain/pools';

const POOLS: PoolPickerEntry[] = [
  { id: 'p1', name: 'Office League' },
  { id: 'p2', name: 'Family League' },
];

describe('PoolOverridePicker (PREDICTIONS-3, design.md §4/§9)', () => {
  it('renders nothing when the viewer belongs to no pools', async () => {
    const { toJSON } = await renderWithQueryClient(<PoolOverridePicker pools={[]} selectedPoolId={null} onSelect={jest.fn()} />);
    expect(toJSON()).toBeNull();
  });

  it('renders a Global chip plus one chip per pool', async () => {
    await renderWithQueryClient(<PoolOverridePicker pools={POOLS} selectedPoolId={null} onSelect={jest.fn()} />);
    expect(screen.getByText('Global')).toBeOnTheScreen();
    expect(screen.getByText('Office League')).toBeOnTheScreen();
    expect(screen.getByText('Family League')).toBeOnTheScreen();
  });

  it('calls onSelect(null) when the Global chip is pressed', async () => {
    const onSelect = jest.fn();
    const user = userEvent.setup();
    await renderWithQueryClient(<PoolOverridePicker pools={POOLS} selectedPoolId="p1" onSelect={onSelect} />);

    await user.press(screen.getByText('Global'));
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it('calls onSelect(poolId) when a pool chip is pressed', async () => {
    const onSelect = jest.fn();
    const user = userEvent.setup();
    await renderWithQueryClient(<PoolOverridePicker pools={POOLS} selectedPoolId={null} onSelect={onSelect} />);

    await user.press(screen.getByText('Family League'));
    expect(onSelect).toHaveBeenCalledWith('p2');
  });
});
