import AsyncStorage from '@react-native-async-storage/async-storage';
import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { DismissibleCallout } from '@/remotes/education/components/dismissible-callout';
import { renderWithProviders } from '@/remotes/education/test-utils/render-with-providers';

describe('DismissibleCallout (EDU-4, design.md §6/§9)', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('is shown by default', async () => {
    await renderWithProviders(
      <DismissibleCallout cueId="test-cue">
        <Text>Some educational tip</Text>
      </DismissibleCallout>,
    );

    expect(await screen.findByTestId('dismissible-callout-test-cue')).toBeOnTheScreen();
    expect(screen.getByText('Some educational tip')).toBeOnTheScreen();
  });

  it('dismisses (and stops rendering) after tapping the close affordance', async () => {
    const user = userEvent.setup();
    await renderWithProviders(
      <DismissibleCallout cueId="test-cue">
        <Text>Some educational tip</Text>
      </DismissibleCallout>,
    );

    await screen.findByTestId('dismissible-callout-test-cue');
    await user.press(screen.getByTestId('dismissible-callout-test-cue-close'));

    expect(screen.queryByTestId('dismissible-callout-test-cue')).not.toBeOnTheScreen();
  });

  it('persists the dismissal so a later mount of the same cueId stays hidden', async () => {
    const user = userEvent.setup();
    const { unmount } = await renderWithProviders(
      <DismissibleCallout cueId="test-cue">
        <Text>Some educational tip</Text>
      </DismissibleCallout>,
    );
    await screen.findByTestId('dismissible-callout-test-cue');
    await user.press(screen.getByTestId('dismissible-callout-test-cue-close'));
    await unmount();

    const { unmount: unmountSecond } = await renderWithProviders(
      <DismissibleCallout cueId="test-cue">
        <Text>Some educational tip</Text>
      </DismissibleCallout>,
    );

    // Fail-open default (visible=true) briefly, then the persisted
    // dismissal resolves and hides it again — assert the settled state via
    // `waitFor` (properly `act()`-wrapped) rather than a raw `setTimeout`,
    // which left a dangling, un-awaited update that bled into the next test
    // (an "overlapping act() calls" warning, then a spurious failure in the
    // following test).
    await waitFor(() => expect(screen.queryByTestId('dismissible-callout-test-cue')).not.toBeOnTheScreen());
    await unmountSecond();
  });

  it('a different cueId is unaffected by another cue being dismissed', async () => {
    const user = userEvent.setup();
    const { unmount } = await renderWithProviders(
      <DismissibleCallout cueId="cue-a">
        <Text>Cue A</Text>
      </DismissibleCallout>,
    );
    await screen.findByTestId('dismissible-callout-cue-a');
    await user.press(screen.getByTestId('dismissible-callout-cue-a-close'));
    // Unmount before mounting the next tree — leaving both mounted
    // simultaneously means both `useTranslation()` subscribers react to the
    // second render's `i18n.changeLanguage('en')` call, one of them outside
    // that render's own `act()` scope ("overlapping act() calls").
    await unmount();

    await renderWithProviders(
      <DismissibleCallout cueId="cue-b">
        <Text>Cue B</Text>
      </DismissibleCallout>,
    );
    expect(await screen.findByTestId('dismissible-callout-cue-b')).toBeOnTheScreen();
  });
});
