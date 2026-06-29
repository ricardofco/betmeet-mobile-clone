import { Component, Suspense, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

type RemoteBoundaryProps = {
  children: ReactNode;
  /** Shown while the remote chunk downloads. */
  loadingFallback?: ReactNode;
  /** Shown if the remote chunk fails to download or throws while mounting. */
  onRetry?: () => void;
};

type ErrorBoundaryState = { hasError: boolean };

/**
 * The reusable wrapper every remote-mounting call site uses
 * (system-architecture.md: "always design a graceful fallback when a remote
 * fails to download"; ADR-002). A failed remote download or a thrown error
 * while mounting renders a retry affordance instead of crashing the host.
 */
class RemoteErrorBoundary extends Component<
  { children: ReactNode; onRetry?: () => void },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  handleRetry = () => {
    this.setState({ hasError: false });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.fallback}>
          <Text style={styles.fallbackText}>This section couldn't load.</Text>
          <Text accessibilityRole="button" onPress={this.handleRetry} style={styles.retryText}>
            Tap to retry
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export function RemoteBoundary({ children, loadingFallback, onRetry }: RemoteBoundaryProps) {
  return (
    <RemoteErrorBoundary onRetry={onRetry}>
      <Suspense fallback={loadingFallback ?? <ActivityIndicator />}>{children}</Suspense>
    </RemoteErrorBoundary>
  );
}

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  fallbackText: {
    marginBottom: 8,
  },
  retryText: {
    fontWeight: '600',
  },
});
