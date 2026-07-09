import { screen, userEvent } from '@testing-library/react-native';
import { renderWithQueryClient } from '@/host/profile/test-utils/render-with-query-client';
import { NicknameForm } from '@/host/profile/components/nickname-form';
import { profileApi } from '@/platform/backend-api/profile-api';

jest.mock('@/platform/backend-api/profile-api');

const mockedProfileApi = profileApi as jest.Mocked<typeof profileApi>;

describe('NicknameForm (PROFILE-1, ADR-011)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('rejects an invalid base client-side, before any network call (PROFILE-1 AC)', async () => {
    const onSubmitted = jest.fn();
    const user = userEvent.setup();
    await renderWithQueryClient(<NicknameForm mode="onboarding" onSubmitted={onSubmitted} />);

    await user.type(screen.getByLabelText('Nickname'), 'ab');

    expect(await screen.findByText('Nickname must be at least 3 characters.')).toBeOnTheScreen();
    expect(mockedProfileApi.checkNicknameAvailability).not.toHaveBeenCalled();
  });

  it('checks availability after a valid, debounced format check and shows "Available"', async () => {
    mockedProfileApi.checkNicknameAvailability.mockResolvedValue({ available: true });
    const user = userEvent.setup();
    await renderWithQueryClient(<NicknameForm mode="onboarding" onSubmitted={jest.fn()} />);

    await user.type(screen.getByLabelText('Nickname'), 'validbase');

    expect(await screen.findByText('Available')).toBeOnTheScreen();
    expect(mockedProfileApi.checkNicknameAvailability).toHaveBeenCalledWith('validbase');
  });

  it('shows "taken" when the backend reports unavailable', async () => {
    mockedProfileApi.checkNicknameAvailability.mockResolvedValue({ available: false });
    const user = userEvent.setup();
    await renderWithQueryClient(<NicknameForm mode="onboarding" onSubmitted={jest.fn()} />);

    await user.type(screen.getByLabelText('Nickname'), 'takenbase');

    expect(await screen.findByText('That nickname is unavailable. Try another.')).toBeOnTheScreen();
  });

  it('onboarding mode: submit calls assignNickname (not changeNickname), and ignores cooldown entirely', async () => {
    mockedProfileApi.checkNicknameAvailability.mockResolvedValue({ available: true });
    mockedProfileApi.assignNickname.mockResolvedValue({ ok: true, base: 'newuser', discriminator: '0042' });
    const onSubmitted = jest.fn();
    const user = userEvent.setup();
    await renderWithQueryClient(<NicknameForm mode="onboarding" onSubmitted={onSubmitted} />);

    await user.type(screen.getByLabelText('Nickname'), 'newuser');
    await screen.findByText('Available');
    await user.press(screen.getByText('Save nickname'));

    expect(mockedProfileApi.assignNickname).toHaveBeenCalledWith('newuser');
    expect(mockedProfileApi.changeNickname).not.toHaveBeenCalled();
    expect(onSubmitted).toHaveBeenCalledWith({ base: 'newuser', discriminator: '0042' });
  });

  it('settings mode, eligible (postOnboardingChangeCount: 0, the one free grace change): submit is enabled and calls changeNickname', async () => {
    mockedProfileApi.checkNicknameAvailability.mockResolvedValue({ available: true });
    mockedProfileApi.changeNickname.mockResolvedValue({ ok: true, base: 'changed', discriminator: '0099' });
    const onSubmitted = jest.fn();
    const user = userEvent.setup();
    await renderWithQueryClient(
      <NicknameForm
        mode="settings"
        cooldown={{ onboardingCompleted: true, postOnboardingChangeCount: 0, lastChangeAt: null, now: '' }}
        onSubmitted={onSubmitted}
      />,
    );

    expect(screen.queryByText(/You can change your nickname again/)).not.toBeOnTheScreen();

    await user.type(screen.getByLabelText('Nickname'), 'changed');
    await screen.findByText('Available');
    await user.press(screen.getByText('Save nickname'));

    expect(mockedProfileApi.changeNickname).toHaveBeenCalledWith('changed');
    expect(onSubmitted).toHaveBeenCalledWith({ base: 'changed', discriminator: '0099' });
  });

  it('ADR-011 regression: settings mode with postOnboardingChangeCount: 1 (the second post-onboarding change) is gated — input disabled, cooldown message shown', async () => {
    await renderWithQueryClient(
      <NicknameForm
        mode="settings"
        cooldown={{
          onboardingCompleted: true,
          postOnboardingChangeCount: 1,
          lastChangeAt: '2026-06-20T00:00:00.000Z',
          now: '',
        }}
        onSubmitted={jest.fn()}
      />,
    );

    expect(screen.getByText(/You can change your nickname again on/)).toBeOnTheScreen();
    expect(screen.getByLabelText('Nickname')).toBeDisabled();
  });

  it('shows a rate_limited submit response distinctly (server is the final authority even if client believed it was eligible)', async () => {
    mockedProfileApi.checkNicknameAvailability.mockResolvedValue({ available: true });
    mockedProfileApi.changeNickname.mockResolvedValue({ ok: false, error: 'rate_limited' });
    const user = userEvent.setup();
    await renderWithQueryClient(
      <NicknameForm
        mode="settings"
        cooldown={{ onboardingCompleted: true, postOnboardingChangeCount: 0, lastChangeAt: null, now: '' }}
        onSubmitted={jest.fn()}
      />,
    );

    await user.type(screen.getByLabelText('Nickname'), 'racecondition');
    await screen.findByText('Available');
    await user.press(screen.getByText('Save nickname'));

    expect(await screen.findByText(/You can change your nickname again soon/)).toBeOnTheScreen();
  });
});
