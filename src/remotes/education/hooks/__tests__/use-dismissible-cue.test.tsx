import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useDismissibleCue } from '@/remotes/education/hooks/use-dismissible-cue';

describe('useDismissibleCue (EDU-4, design.md §9.1)', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('defaults to visible: true before the async read resolves (fail-open loading gap)', async () => {
    const { result } = await renderHook(() => useDismissibleCue('cue-x'));
    expect(result.current.visible).toBe(true);
    await waitFor(() => expect(result.current.visible).toBe(true));
  });

  it('resolves to hidden if the cue was already dismissed', async () => {
    await AsyncStorage.setItem('cue:dismissed:cue-x', '1');
    const { result } = await renderHook(() => useDismissibleCue('cue-x'));

    await waitFor(() => expect(result.current.visible).toBe(false));
  });

  it('dismiss() hides the cue immediately (optimistic) and persists it', async () => {
    const { result } = await renderHook(() => useDismissibleCue('cue-x'));
    await waitFor(() => expect(result.current.visible).toBe(true));

    await act(() => {
      result.current.dismiss();
    });

    expect(result.current.visible).toBe(false);
    await waitFor(async () => expect(await AsyncStorage.getItem('cue:dismissed:cue-x')).toBe('1'));
  });
});
