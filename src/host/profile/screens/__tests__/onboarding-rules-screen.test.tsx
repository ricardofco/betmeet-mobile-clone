import { screen, userEvent } from '@testing-library/react-native';
import { OnboardingRulesScreen } from '@/host/profile/screens/onboarding-rules-screen';
import { useOnboardingWizardContext } from '@/host/profile/screens/onboarding-wizard-screen';
import { renderWithQueryClient } from '@/host/profile/test-utils/render-with-query-client';

jest.mock('@/host/profile/screens/onboarding-wizard-screen', () => ({
  useOnboardingWizardContext: jest.fn(),
}));

const mockedUseWizardContext = useOnboardingWizardContext as jest.Mock;

function makeWizard() {
  return {
    currentStep: 'rules' as const,
    stepStatus: {},
    markDone: jest.fn(),
    markSkipped: jest.fn(),
    advance: jest.fn().mockReturnValue('notifications'),
    goBack: jest.fn(),
  };
}

function makeNavigation() {
  return { navigate: jest.fn() } as any;
}

function renderScreen(navigation = makeNavigation()) {
  return renderWithQueryClient(<OnboardingRulesScreen navigation={navigation} route={{} as any} />).then(
    result => ({ ...result, navigation }),
  );
}

/**
 * EDU-3 (model.md §4, design.md §5) — real content replacing the placeholder.
 * The wizard context is mocked here (currentStep already `'rules'`) because
 * this is a regression check on `OnboardingRulesScreen`'s own
 * markDone/markSkipped + conditional-navigate logic (design.md §13 — "Bolt
 * 3's existing behavior, not new domain logic"), not a re-test of the real
 * `useOnboardingWizard` step-order state machine (already covered by
 * `use-onboarding-wizard.test.ts`) — driving a fresh `OnboardingWizardProvider`
 * from its actual initial step (`nickname`) through `avatar` for every test
 * here would couple this screen's test to that unrelated state machine.
 */
describe('OnboardingRulesScreen (EDU-3)', () => {
  let wizard: ReturnType<typeof makeWizard>;

  beforeEach(() => {
    wizard = makeWizard();
    mockedUseWizardContext.mockReturnValue(wizard);
  });

  it('renders the real title, description, and the static scoring summary', async () => {
    await renderScreen();

    expect(await screen.findByText('Learn how to play')).toBeOnTheScreen();
    expect(
      screen.getByText('This is how points are awarded. You can check the full rules whenever you want.'),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('onboarding-scoring-summary')).toBeOnTheScreen();
    expect(screen.getByText('You can open the full Rules Center anytime from Home.')).toBeOnTheScreen();
  });

  it('does not render a tappable link into the Rules Center (design.md §5.1 — informational only)', async () => {
    await renderScreen();
    await screen.findByText('Learn how to play');
    expect(screen.queryByRole('button', { name: /Rules Center/i })).not.toBeOnTheScreen();
  });

  it('Continue (Got it) marks the step done and advances to Notifications', async () => {
    const user = userEvent.setup();
    const { navigation } = await renderScreen();
    await screen.findByText('Learn how to play');

    await user.press(screen.getByRole('button', { name: 'Continue' }));

    expect(wizard.advance).toHaveBeenCalledWith('rules', 'done');
    expect(navigation.navigate).toHaveBeenCalledWith('OnboardingNotifications');
  });

  it('Skip for now marks the step skipped and still advances to Notifications (never blocks completion)', async () => {
    const user = userEvent.setup();
    const { navigation } = await renderScreen();
    await screen.findByText('Learn how to play');

    await user.press(screen.getByRole('button', { name: 'Skip for now' }));

    expect(wizard.advance).toHaveBeenCalledWith('rules', 'skipped');
    expect(navigation.navigate).toHaveBeenCalledWith('OnboardingNotifications');
  });
});
