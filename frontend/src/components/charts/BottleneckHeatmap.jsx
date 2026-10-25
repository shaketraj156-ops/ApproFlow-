import React, { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';

export const HEATMAP_REGIONS = ['NORTH', 'SOUTH', 'EAST', 'WEST'];

// Shading by the share of open applications that are late. Every cell also says it in words.
function tone(cell) {
  if (!cell || cell.pending_count === 0) return 'bg-slate-50 text-slate-400';
  if (cell.breach_count === 0) return 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100';
  if (cell.breach_rate_pct < 34) return 'bg-amber-100 text-amber-900 hover:bg-amber-200';
  if (cell.breach_rate_pct < 67) return 'bg-orange-200 text-orange-950 hover:bg-orange-300';
  return 'bg-red-200 text-red-950 hover:bg-red-300';
}

/** Stage by region grid. Each cell is a button that calls `onCellClick({ stage, region })`. */
export function BottleneckHeatmap({ rows, regions = HEATMAP_REGIONS, onCellClick }) {
  const stages = useMemo(() => {
    const seen = new Map();
    rows.forEach((r) => seen.set(r.stage_code, r.stage_name));
    return [...seen.entries()].map(([code, name]) => ({ code, name }));
  }, [rows]);
  const cellFor = (stage, region) => rows.find((r) => r.stage_code === stage && r.region === region);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-separate border-spacing-1.5 min-w-[34rem]">
        <caption className="sr-only">Open and late applications by stage and region</caption>
        <thead>
          <tr>
            <th scope="col" className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 px-3 py-2">Stage</th>
            {regions.map((r) => (
              <th key={r} scope="col" className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 px-3 py-2">{r}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {stages.map((s) => (
            <tr key={s.code}>
              <th scope="row" className="text-left text-xs font-semibold text-slate-800 px-3 py-2 whitespace-nowrap">{s.name}</th>
              {regions.map((region) => {
                const cell = cellFor(s.code, region);
                const late = cell?.breach_count || 0;
                return (
                  <td key={region} className="p-0">
                    {cell?.pending_count ? (
                      <button
                        onClick={() => onCellClick?.({ stage: s.code, region })}
                        title={`${cell.pending_count} open, ${late} late, ${cell.avg_days_in_stage} days on average`}
                        aria-label={`${s.name}, ${region}: ${cell.pending_count} open, ${late} late. Open the list.`}
                        className={`w-full rounded-xl px-3 py-2.5 text-center transition hover:-translate-y-0.5 hover:shadow-sm ${tone(cell)}`}
                      >
                        <span className="block font-bold tabular-nums">{cell.pending_count} <span className="text-[11px] font-medium">open</span></span>
                        <span className="text-[11px] font-semibold inline-flex items-center gap-1">
                          {late > 0 && <AlertTriangle className="w-3 h-3" aria-hidden="true" />}
                          {late > 0 ? `${late} late` : 'none late'}
                        </span>
                      </button>
                    ) : (
                      <div className="rounded-xl px-3 py-2.5 text-center bg-slate-50 text-slate-400" aria-label="No open applications">–</div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Small key that explains the shading. */
export function HeatmapLegend() {
  const items = [
    ['bg-emerald-100', 'None late'],
    ['bg-amber-200', 'Some late'],
    ['bg-orange-300', 'Many late'],
    ['bg-red-300', 'Mostly late'],
  ];
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600" aria-label="Heatmap key">
      {items.map(([color, label]) => (
        <li key={label} className="inline-flex items-center gap-1.5">
          <span className={`w-3 h-3 rounded ${color}`} aria-hidden="true" /> {label}
        </li>
      ))}
    </ul>
  );
}
