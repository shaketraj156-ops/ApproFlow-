import React from 'react';

export function PageLoader() {
  return (
    <div role="status" aria-live="polite" className="flex items-center justify-center py-24">
      <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-emerald-600 animate-spin" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
