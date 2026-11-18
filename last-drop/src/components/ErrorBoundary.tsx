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
    return { hasError: true, message: error.message || 'Unexpected application error.' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-[#091530] text-white flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#0d1e42] border-2 border-[#254992] rounded-2xl p-6 text-center space-y-4">
            <h1 className="text-xl font-bold">Something went wrong</h1>
            <p className="text-xs text-[#93c5fd] break-words">{this.state.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg bg-[#2563eb] hover:bg-[#3b82f6] text-xs font-bold text-white cursor-pointer"
            >
              Reload Game
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
