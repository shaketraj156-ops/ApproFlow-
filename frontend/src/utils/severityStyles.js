/**
 * Central color token system matching Valid8 AICTE Design Rules:
 * Green: On track (> 3 days left, valid, verified)
 * Orange: Due soon (0 to 3 days left, expiring)
 * Red: Overdue (past due, expired, critical)
 * Purple: Needs review (high predicted delay risk, awaiting verification)
 * Slate: Neutral (closed, on hold, informational)
 */

export function getSlaStyle(daysLeft) {
  if (daysLeft === null || daysLeft === undefined) {
    return {
      bg: 'bg-slate-100',
      text: 'text-slate-700',
      border: 'border-slate-200',
      indicator: 'bg-slate-400',
      label: 'Neutral'
    };
  }

  if (daysLeft < 0) {
    return {
      bg: 'bg-red-50',
      text: 'text-red-700',
      border: 'border-red-200',
      indicator: 'bg-red-500',
      label: 'Overdue'
    };
  }

  if (daysLeft <= 3) {
    return {
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200',
      indicator: 'bg-amber-500',
      label: 'Due Soon'
    };
  }

  return {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    indicator: 'bg-emerald-500',
    label: 'On Track'
  };
}

export function getAlertSeverityStyle(severity) {
  switch (severity?.toUpperCase()) {
    case 'CRITICAL':
      return { bg: 'bg-red-100 text-red-800 border-red-300', dot: 'bg-red-600' };
    case 'HIGH':
      return { bg: 'bg-orange-100 text-orange-800 border-orange-300', dot: 'bg-orange-600' };
    case 'MEDIUM':
      return { bg: 'bg-amber-100 text-amber-800 border-amber-300', dot: 'bg-amber-600' };
    case 'LOW':
    default:
      return { bg: 'bg-slate-100 text-slate-800 border-slate-300', dot: 'bg-slate-500' };
  }
}
