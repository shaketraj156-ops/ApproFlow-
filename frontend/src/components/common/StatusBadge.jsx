import React from 'react';

const GREEN = { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' };
const RED = { badge: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' };
const AMBER = { badge: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' };
const INDIGO = { badge: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500' };
const SLATE = { badge: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400' };

const STYLES = {
  APPROVED: GREEN, VERIFIED: GREEN, VALID: GREEN, CONFIRMED: GREEN, COMPLETED: GREEN, DECIDED: GREEN,
  OVERDUE: RED, EXPIRED: RED, REJECTED: RED, CANCELLED: RED,
  EXPIRING: AMBER, PENDING: AMBER, PROPOSED: AMBER, ON_HOLD: AMBER,
  SCRUTINY: INDIGO, RE_SCRUTINY: INDIGO, EVC: INDIGO, REGIONAL_COMMITTEE: INDIGO, SAC_SHC: INDIGO,
};

export function StatusBadge({ status, label }) {
  const style = STYLES[status?.toUpperCase()] || SLATE;
  // Replace every underscore, not just the first one (REGIONAL_COMMITTEE, etc.)
  const text = label || status?.replace(/_/g, ' ');

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${style.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} aria-hidden="true" />
      {text}
    </span>
  );
}
