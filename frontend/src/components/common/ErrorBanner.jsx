import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/** Inline "this section failed to load" notice with a retry button. */
export function ErrorBanner({ message = 'Something went wrong while loading this data.', onRetry }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
      <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
      <p className="flex-1 text-sm text-red-800">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 hover:text-red-900 px-2.5 py-1 rounded-lg hover:bg-red-100 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" /> Retry
        </button>
      )}
    </div>
  );
}

/** Short message pulled out of an API error envelope, or a fallback. */
export function apiErrorMessage(err, fallback = 'Request failed. Please try again.') {
  return err?.response?.data?.error?.message || fallback;
}
