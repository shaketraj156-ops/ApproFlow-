import React from 'react';

/** A grey block with a moving highlight, used while data loads. Hidden from screen readers. */
export function Skeleton({ className = 'h-4 w-full' }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

/** A card-shaped group of skeleton lines, announced once as "Loading". */
export function SkeletonCard({ lines = 3, label = 'Loading' }) {
  return (
    <div role="status" aria-label={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card space-y-3">
      <Skeleton className="h-4 w-1/3" />
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={`h-3 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  );
}
