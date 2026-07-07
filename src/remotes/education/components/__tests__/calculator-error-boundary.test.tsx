import { screen } from '@testing-library/react-native';
import { CalculatorErrorBoundary } from '@/remotes/education/components/calculator-error-boundary';
import { renderWithProviders } from '@/remotes/education/test-utils/render-with-providers';

function Bomb(): never {
  throw new Error('calculator exploded');
}

// Suppress React's noisy error-boundary console.error during this
// deliberately-throwing test (same discipline the codebase uses for its
// other thrown-error test paths).
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});
afterAll(() => {
  console.error = originalConsoleError;
});

describe('CalculatorErrorBoundary (EDU-2, "Design Pattern 3")', () => {
  it('renders its children when there is no error', async () => {
    await renderWithProviders(
      <CalculatorErrorBoundary>
        <></>
      </CalculatorErrorBoundary>,
    );
    expect(screen.queryByTestId('calculator-fallback')).not.toBeOnTheScreen();
  });

  it('degrades to the static ScoringTable when the calculator throws', async () => {
    await renderWithProviders(
      <CalculatorErrorBoundary>
        <Bomb />
      </CalculatorErrorBoundary>,
    );

    expect(screen.getByTestId('calculator-fallback')).toBeOnTheScreen();
    expect(screen.getByTestId('scoring-table')).toBeOnTheScreen();
    expect(screen.getByText('Scoring table')).toBeOnTheScreen();
  });
});
