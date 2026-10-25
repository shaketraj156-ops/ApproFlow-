import React from 'react';
import { Sparkles } from 'lucide-react';

export const RISK_THRESHOLD = Number(import.meta.env.VITE_RISK_TAG_THRESHOLD) || 0.7;

/**
 * "May need attention" tag for applications with a high predicted delay.
 * It is a hint for the officer, never a judgement, so the wording stays neutral.
 */
export function DelayRiskTag({ score, threshold = RISK_THRESHOLD }) {
  if (score === null || score === undefined || score < threshold) return null;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-purple-200 bg-purple-50 text-purple-800 text-[11px] font-semibold whitespace-nowrap"
      title={`Predicted delay probability ${Math.round(score * 100)}%`}
    >
      <Sparkles className="w-3 h-3" aria-hidden="true" />
      May need attention
    </span>
  );
}
