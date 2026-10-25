import React from 'react';
import { Flame, ArrowUp, Minus } from 'lucide-react';

/** Priority score (0-100) as a labelled pill. The score is computed by the server; this only displays it. */
export function PriorityPill({ score }) {
  if (score === null || score === undefined || Number.isNaN(Number(score))) {
    return <span className="text-xs text-slate-400">—</span>;
  }
  const value = Number(score);
  const level = value >= 70
    ? { label: 'High', icon: Flame, tone: 'bg-red-50 text-red-700 border-red-200' }
    : value >= 40
    ? { label: 'Medium', icon: ArrowUp, tone: 'bg-amber-50 text-amber-800 border-amber-200' }
    : { label: 'Low', icon: Minus, tone: 'bg-slate-100 text-slate-700 border-slate-200' };
  const Icon = level.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${level.tone}`}
      title={`Priority score ${value.toFixed(1)} out of 100`}
    >
      <Icon className="w-3.5 h-3.5" aria-hidden="true" />
      {level.label}
      <span className="tabular-nums font-bold">{value.toFixed(0)}</span>
    </span>
  );
}
