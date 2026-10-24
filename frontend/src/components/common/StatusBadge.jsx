import React from 'react';

export function StatusBadge({ status, label }) {
  const getBadgeStyle = () => {
    switch (status?.toUpperCase()) {
      case 'APPROVED':
      case 'VERIFIED':
      case 'VALID':
      case 'CONFIRMED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'OVERDUE':
      case 'EXPIRED':
      case 'REJECTED':
      case 'CANCELLED':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'EXPIRING':
      case 'PENDING':
      case 'PROPOSED':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'SCRUTINY':
      case 'RE_SCRUTINY':
      case 'EVC':
      case 'REGIONAL_COMMITTEE':
      case 'SAC_SHC':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getBadgeStyle()}`}>
      {label || status?.replace('_', ' ')}
    </span>
  );
}
