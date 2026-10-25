import React, { useEffect, useState } from 'react';

const DEADLINE_SEGMENTS = [
  { key: 'onTrack', label: 'On track', color: '#34d399' },
  { key: 'dueSoon', label: 'Due soon', color: '#fbbf24' },
  { key: 'overdue', label: 'Overdue', color: '#f87171' },
];

/**
 * A donut with a legend that says the same in words. It is drawn for a dark background (the role banner).
 *
 * Two ways to use it:
 *  - `health={{ total, onTrack, dueSoon, overdue, percentOnTrack }}` for deadline health, or
 *  - `segments=[{ label, color, value }]` with `centerValue` and `centerLabel` for anything else.
 */
export function HealthRing({ health, segments, centerValue, centerLabel, size = 132, stroke = 14, loading = false }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const [grown, setGrown] = useState(false);

  // Start empty and grow to full on the next frame, so the ring animates in.
  useEffect(() => {
    const id = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const parts = segments
    ? segments
    : DEADLINE_SEGMENTS.map((s) => ({ label: s.label, color: s.color, value: health?.[s.key] || 0 }));
  const total = segments ? parts.reduce((sum, p) => sum + p.value, 0) : health?.total || 0;
  const big = segments ? centerValue : `${health?.percentOnTrack ?? 0}%`;
  const small = segments ? centerLabel : 'on track';

  let offset = 0;
  const arcs = parts.map((p) => {
    const length = total ? (p.value / total) * circumference : 0;
    const arc = { ...p, length, offset };
    offset += length;
    return arc;
  });

  const summary = loading
    ? 'Loading'
    : segments
    ? `${big} ${small}. ${arcs.map((a) => `${a.label}: ${a.value}`).join(', ')}.`
    : `${health.percentOnTrack}% on track. ${arcs.map((a) => `${a.label}: ${a.value}`).join(', ')}.`;

  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={summary}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth={stroke} />
          {!loading && total > 0 && arcs.map((a) => a.length > 0 && (
            <circle
              key={a.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={a.color}
              strokeWidth={stroke}
              strokeLinecap="butt"
              strokeDasharray={`${grown ? Math.max(a.length - 2, 0) : 0} ${circumference}`}
              strokeDashoffset={-a.offset}
              style={{ transition: 'stroke-dasharray 0.9s ease-out' }}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
          {loading ? (
            <div className="skeleton h-7 w-12" aria-hidden="true" />
          ) : (
            <>
              <span className="text-3xl font-extrabold tabular-nums leading-none">{big}</span>
              {small && <span className="text-[10px] font-semibold uppercase tracking-wider text-white/70 mt-1">{small}</span>}
            </>
          )}
        </div>
      </div>

      <ul className="space-y-1.5 text-sm" aria-hidden="true">
        {arcs.map((a) => (
          <li key={a.label} className="flex items-center gap-2 text-white/85">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: a.color }} />
            <span className="min-w-[4.5rem] text-xs">{a.label}</span>
            <span className="font-bold tabular-nums text-white">{loading ? '–' : a.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
