import { NavigationContainer } from '@react-navigation/native';
import PoolsRemoteEntry from '@/remotes/pools/PoolsRemoteEntry';
import { renderWithQueryClient } from '@/remotes/pools/test-utils/render-with-query-client';
import { poolsApi } from '@/platform/backend-api/pools-api';
import { i18n } from '@/platform/i18n/i18n';

jest.mock('@/platform/backend-api/pools-api');
const mockedPoolsApi = poolsApi as jest.Mocked<typeof poolsApi>;

/**
 * Post-Implement fix (2026-07-06, Layer 2 finding #3): every screen's
 * header `title` in this navigator was a literal English string, a real
 * miss during Bolt 9's Implement stage — this remote's own screens were
 * explicitly in-scope (`implement-and-test.md §6`). Only the initially-
 * focused screen (`MyPools`) actually mounts (native-stack default), so
 * this test only exercises that one screen's header title, the same
 * `useTranslation()` wiring every other screen's `title` option now shares.
 *
 * `@react-navigation/native-stack` renders its header as a *native* config
 * (`RNSScreenStackHeaderConfig`'s `title` prop under Jest, backed by
 * `react-native-screens`) — not a queryable RN `<Text>` node, unlike a
 * screen's own in-body heading — so this asserts against the rendered
 * `toJSON()` tree directly, same technique as the tab-bar-icon regression
 * test in `main-tab-navigator.test.tsx`.
 */
describe('PoolsRemoteEntry (Layer 2 finding #3, fixed)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedPoolsApi.getMine.mockReturnValue(new Promise(() => {}));
  });

  it('renders the MyPools screen header title in English when the active language is en', async () => {
    // `renderWithQueryClient` itself forces `i18n.language = 'en'` for
    // determinism (see that helper's own comment) — nothing extra needed.
    const view = await renderWithQueryClient(
      <NavigationContainer>
        <PoolsRemoteEntry />
      </NavigationContainer>,
    );

    expect(JSON.stringify(view.toJSON())).toContain('"title":"My pools"');
  });

  it('renders the MyPools screen header title in Spanish when the active language is es', async () => {
    const view = await renderWithQueryClient(
      <NavigationContainer>
        <PoolsRemoteEntry />
      </NavigationContainer>,
    );
    // Switch language *after* mounting — `renderWithQueryClient` would
    // otherwise force it back to 'en' during setup.
    await i18n.changeLanguage('es');

    expect(JSON.stringify(view.toJSON())).toContain('"title":"Mis ligas"');
  });
});
