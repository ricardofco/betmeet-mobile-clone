import type { ReactElement } from 'react';
import { Children } from 'react';
import { render } from '@testing-library/react-native';
import { I18nextProvider } from 'react-i18next';
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

  // Change-2026-07-08 (item 4, header dedup): `MyPools` is this navigator's
  // only screen whose `options` include `headerShown: false` — every other
  // screen (`DiscoverPools`/`CreatePool`/etc.) keeps its own header, exactly
  // as it did before this fix. Asserted directly against the `<Screen>`
  // elements' own `options` props, not the rendered `toJSON()` tree: under
  // native-stack, only the initially-focused screen (`MyPools`) ever mounts
  // as native output, so a `toJSON()`-based assertion could not distinguish
  // "header shown" from "header hidden" for the sibling screens at all (and,
  // per the two tests above, `react-native-screens`' own header chrome isn't
  // queryable as a rendered node in the first place). `PoolsRemoteEntry()` is
  // invoked directly, inline inside another component's render (so its
  // `useTranslation()` call still has a valid hook dispatcher/context) to
  // capture the real `<PoolsStack.Navigator>` element tree it builds —
  // reading the `options` object every `<Screen>` element is actually
  // configured with, before React Navigation ever processes it.
  it('suppresses only the MyPools screen header (headerShown: false), leaving every sibling screen unaffected', async () => {
    type ScreenElement = ReactElement<{ name: string; options: Record<string, unknown> }>;
    type NavigatorElement = ReactElement<{ children: ScreenElement[] }>;

    let captured: NavigatorElement | undefined;
    function Capture() {
      captured = PoolsRemoteEntry() as NavigatorElement;
      return null;
    }

    // RNTL v14's `render` is async — must be awaited so `Capture`'s render
    // (and therefore the `captured` assignment) has actually happened
    // before it's read below.
    await render(
      <I18nextProvider i18n={i18n}>
        <Capture />
      </I18nextProvider>,
    );

    const screenElements = Children.toArray((captured as NavigatorElement).props.children) as ScreenElement[];
    const screensByName = new Map(
      screenElements.map(screenElement => [screenElement.props.name, screenElement.props.options]),
    );

    expect(screensByName.get('MyPools')).toMatchObject({ headerShown: false });
    expect(screensByName.get('DiscoverPools')).not.toMatchObject({ headerShown: false });
    expect(screensByName.get('CreatePool')).not.toMatchObject({ headerShown: false });
    expect(screensByName.get('JoinByToken')).not.toMatchObject({ headerShown: false });
    expect(screensByName.get('PoolDetail')).not.toMatchObject({ headerShown: false });
    expect(screensByName.get('PoolSettings')).not.toMatchObject({ headerShown: false });
    expect(screensByName.get('PoolPredictions')).not.toMatchObject({ headerShown: false });
    expect(screensByName.get('PoolLeaderboard')).not.toMatchObject({ headerShown: false });
  });
});
