import React from 'react';
import { Clock, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { formatDays } from '../../utils/formatDays';
import { getSlaStyle } from '../../utils/severityStyles';

export function SlaChip({ daysLeft }) {
  const style = getSlaStyle(daysLeft);
  const text = formatDays(daysLeft);

  const getIcon = () => {
    if (daysLeft === null || daysLeft === undefined) return <Clock className="w-3.5 h-3.5 text-slate-500" />;
    if (daysLeft < 0) return <AlertCircle className="w-3.5 h-3.5 text-red-600" />;
    if (daysLeft <= 3) return <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />;
    return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />;
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${style.bg} ${style.text} ${style.border}`}>
      {getIcon()}
      <span>{text}</span>
    </span>
  );
}
