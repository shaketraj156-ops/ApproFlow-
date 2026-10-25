import React from 'react';
import { AlertTriangle } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('UI error:', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div role="alert" className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mb-4">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Something went wrong on this page</h2>
        <p className="text-sm text-slate-500 mt-1 max-w-md">
          The rest of the app is still working. Try again, or go back to your dashboard.
        </p>
        <div className="mt-5 flex gap-3">
          <button
            onClick={() => this.setState({ error: null })}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition"
          >
            Try again
          </button>
          <a href="/" className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs rounded-xl transition">
            Go to dashboard
          </a>
        </div>
      </div>
    );
  }
}
