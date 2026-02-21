import React from 'react';
import { BetaliLogo } from './ui/BetaliLogo';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log to console in dev; swap for Sentry/etc. in production
    console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack);
  }

  handleReload = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-neutral-100 flex items-center justify-center p-4">
          <div className="w-full max-w-md text-center flex flex-col items-center gap-6">
            <BetaliLogo variant="icon" size="xl" />

            <div>
              <h1 className="text-2xl font-bold text-neutral-900 mb-2">
                Something went wrong
              </h1>
              <p className="text-neutral-500 text-sm">
                An unexpected error occurred. We've logged it and will look into it.
              </p>
            </div>

            {import.meta.env.DEV && this.state.error && (
              <pre className="w-full text-left text-xs bg-neutral-900 text-red-400 rounded-xl p-4 overflow-auto max-h-48 shadow-inner">
                {this.state.error.message}
                {'\n'}
                {this.state.error.stack}
              </pre>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
              >
                Try again
              </button>
              <button
                onClick={this.handleReload}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
