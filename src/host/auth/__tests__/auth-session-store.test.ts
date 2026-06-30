import { UNAUTHENTICATED_CLAIMS, type AuthSession } from '@/domain/auth/auth-claims';
import type { ScreenClass } from '@/domain/auth/screen-class';
import { useAuthSessionStore } from '@/host/auth/auth-session-store';

/**
 * AUTH-8's no-raw-tokens boundary (model.md §3, ADR-002) — even though this
 * Zustand store is globally readable, its state shape must never include a
 * token field. Asserted here structurally (the resulting state object has
 * no `accessToken`/`refreshToken` key at all), not just "we didn't display
 * it anywhere."
 */
describe('useAuthSessionStore', () => {
  beforeEach(() => {
    useAuthSessionStore.setState({
      status: 'loading',
      claims: UNAUTHENTICATED_CLAIMS,
      pendingDestination: null,
      mfaFactorId: null,
    });
  });

  it('starts in the loading state with unauthenticated claims', () => {
    const state = useAuthSessionStore.getState();
    expect(state.status).toBe('loading');
    expect(state.claims).toEqual(UNAUTHENTICATED_CLAIMS);
  });

  it('transitions loading -> ready on the first setSession call, even when the session is null', () => {
    useAuthSessionStore.getState().setSession(null);
    const state = useAuthSessionStore.getState();
    expect(state.status).toBe('ready');
    expect(state.claims).toEqual(UNAUTHENTICATED_CLAIMS);
  });

  it('transitions loading -> ready and derives claims from a real session', () => {
    const session: AuthSession = {
      claims: { ...UNAUTHENTICATED_CLAIMS, sub: 'user-123', emailVerified: true },
      accessToken: 'real-access-token',
      refreshToken: 'real-refresh-token',
    };

    useAuthSessionStore.getState().setSession(session);

    const state = useAuthSessionStore.getState();
    expect(state.status).toBe('ready');
    expect(state.claims).toEqual(session.claims);
  });

  it('never exposes accessToken/refreshToken on the resulting store state (AUTH-8 structural boundary)', () => {
    const session: AuthSession = {
      claims: { ...UNAUTHENTICATED_CLAIMS, sub: 'user-123' },
      accessToken: 'super-secret-access-token',
      refreshToken: 'super-secret-refresh-token',
    };

    useAuthSessionStore.getState().setSession(session);

    const state = useAuthSessionStore.getState();
    expect(state).not.toHaveProperty('accessToken');
    expect(state).not.toHaveProperty('refreshToken');
    expect(JSON.stringify(state)).not.toContain('super-secret-access-token');
    expect(JSON.stringify(state)).not.toContain('super-secret-refresh-token');
  });

  it('setPendingDestination records and clears the intended-destination memory', () => {
    const destination = { screenClass: ['protected'] as ScreenClass, route: 'Pools' };

    useAuthSessionStore.getState().setPendingDestination(destination);
    expect(useAuthSessionStore.getState().pendingDestination).toEqual(destination);

    useAuthSessionStore.getState().setPendingDestination(null);
    expect(useAuthSessionStore.getState().pendingDestination).toBeNull();
  });
});
