import { Component, Suspense, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
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
 *
 * Change-2026-07-08 (follow-up): the fallback copy is translated, but this
 * is a class component (error boundaries can't be hooks), so `RemoteBoundary`
 * below resolves the strings via `useTranslation()` and passes them down as
 * props rather than calling the hook here.
 */
class RemoteErrorBoundary extends Component<
  { children: ReactNode; onRetry?: () => void; errorText: string; retryText: string },
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
          <Text style={styles.fallbackText}>{this.props.errorText}</Text>
          <Text accessibilityRole="button" onPress={this.handleRetry} style={styles.retryText}>
            {this.props.retryText}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export function RemoteBoundary({ children, loadingFallback, onRetry }: RemoteBoundaryProps) {
  const { t } = useTranslation();
  return (
    <RemoteErrorBoundary
      onRetry={onRetry}
      errorText={t('common.remoteBoundaryError')}
      retryText={t('common.remoteBoundaryRetry')}
    >
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
