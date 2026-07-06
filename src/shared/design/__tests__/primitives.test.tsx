import { screen } from '@testing-library/react-native';
import { PrimaryButton } from '@/shared/design/primitives';
import { renderWithQueryClient } from '@/host/profile/test-utils/render-with-query-client';

/**
 * Post-Implement fix (2026-07-06, Layer 2 finding #2 — clipped button
 * text). Root cause: `tamagui.config.ts`'s `size`/`space` token scales used
 * to share identical (small) values; `@tamagui/get-button-sized` resolves
 * `Button`'s `height` from the `size` category, so a `true: 16` value
 * produced a 16px-tall button clipping any real line of text. `size` is now
 * its own, larger scale (`true: 44`) — this test locks in a real, generous
 * height rather than re-deriving the exact bug from scratch if the token
 * scale is ever touched again.
 */
describe('PrimaryButton (design token regression)', () => {
  it('resolves a comfortable height (not the old 16px-tall clipping bug)', async () => {
    await renderWithQueryClient(<PrimaryButton>A reasonably long button label</PrimaryButton>);

    const button = screen.getByRole('button');
    const flattenedStyle = Array.isArray(button.props.style)
      ? Object.assign({}, ...button.props.style)
      : button.props.style;

    expect(flattenedStyle.height).toBeGreaterThanOrEqual(40);
  });
});
