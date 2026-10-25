import React from 'react';
import { OctagonAlert, AlertTriangle, AlertCircle, Info } from 'lucide-react';

const LEVELS = {
  CRITICAL: { icon: OctagonAlert, label: 'Critical', tone: 'bg-red-50 text-red-700 border-red-200' },
  HIGH: { icon: AlertTriangle, label: 'High', tone: 'bg-orange-50 text-orange-800 border-orange-200' },
  MEDIUM: { icon: AlertCircle, label: 'Medium', tone: 'bg-amber-50 text-amber-800 border-amber-200' },
  LOW: { icon: Info, label: 'Low', tone: 'bg-slate-100 text-slate-700 border-slate-200' },
};

/** Alert severity with an icon and a word, so it is readable without colour. */
export function SeverityBadge({ severity }) {
  const level = LEVELS[severity?.toUpperCase()] || LEVELS.LOW;
  const Icon = level.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-bold uppercase tracking-wide ${level.tone}`}>
      <Icon className="w-3.5 h-3.5" aria-hidden="true" />
      {level.label}
    </span>
  );
}
