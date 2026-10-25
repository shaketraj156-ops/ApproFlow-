import React from 'react';

/**
 * Shown while a page's code is loading. It sketches the usual page (banner, four cards, a table)
 * so the screen does not jump when the real page arrives.
 */
export function PageLoader() {
  return (
    <div role="status" aria-live="polite" aria-label="Loading page" className="space-y-6">
      <div className="skeleton h-56 w-full rounded-3xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}
      </div>
      <div className="skeleton h-72 w-full rounded-2xl" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
