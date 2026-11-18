import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'An unexpected error occurred.',
    };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Atelier Loupe ErrorBoundary caught:', error, info);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen flex items-center justify-center bg-[#12161D] text-[#F2EFE9] p-6">
          <div className="max-w-md w-full bg-[#1A202A] border border-white/10 rounded-xl p-6 space-y-4">
            <h1 className="font-display text-2xl font-semibold">Unable to load view</h1>
            <p className="text-sm text-[#A9B2C0] leading-relaxed">
              Something interrupted the session. Reloading restores your workspace and saved progress.
            </p>
            <p className="text-xs font-mono-tabular text-[#E09F3E] bg-black/30 p-3 rounded-lg break-words">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-[#E09F3E] text-[#12161D] hover:bg-[#eab157] transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
