import React from 'react';
import { Link } from 'react-router-dom';
import { useCountUp } from '../../hooks/useCountUp';

const VARIANTS = {
  default: { card: 'bg-white border-slate-200', chip: 'bg-slate-100 text-slate-600', accent: 'bg-slate-300' },
  warning: { card: 'bg-white border-amber-200', chip: 'bg-amber-100 text-amber-700', accent: 'bg-amber-400' },
  danger: { card: 'bg-white border-red-200', chip: 'bg-red-100 text-red-700', accent: 'bg-red-500' },
  success: { card: 'bg-white border-emerald-200', chip: 'bg-emerald-100 text-emerald-700', accent: 'bg-emerald-500' },
  brand: { card: 'bg-white border-indigo-200', chip: 'bg-indigo-100 text-indigo-700', accent: 'bg-indigo-500' },
};

function Body({ title, value, subtitle, icon: Icon, trend, loading, v }) {
  // Numbers count up when they first appear; text such as "12 d" is shown as it is.
  const shown = useCountUp(loading ? 0 : value);
  return (
    <>
      <span className={`absolute left-0 top-0 h-full w-1 ${v.accent}`} aria-hidden="true" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
          {loading ? (
            <div className="skeleton h-9 w-20 mt-2" aria-hidden="true" />
          ) : (
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-slate-900 tabular-nums">{shown ?? '—'}</span>
              {trend && <span className="text-xs font-semibold text-emerald-600">{trend}</span>}
            </div>
          )}
        </div>
        {Icon && (
          <div className={`shrink-0 p-2.5 rounded-xl ${v.chip}`}>
            <Icon className="w-5 h-5" aria-hidden="true" />
          </div>
        )}
      </div>
      {subtitle && <p className="mt-2 text-xs text-slate-500">{subtitle}</p>}
    </>
  );
}

/**
 * A headline number. Pass `to` to make the whole card a link, for example to the list behind the number.
 */
export function KpiCard({ title, value, subtitle, icon, trend, variant = 'default', loading = false, to }) {
  const v = VARIANTS[variant] || VARIANTS.default;
  const classes = `relative block overflow-hidden p-5 rounded-2xl border shadow-card transition hover:shadow-md hover:-translate-y-0.5 ${v.card}`;
  const body = <Body title={title} value={value} subtitle={subtitle} icon={icon} trend={trend} loading={loading} v={v} />;

  return to ? (
    <Link to={to} className={`${classes} group`} aria-label={`${title}: ${value ?? 'no data'}. Open the list.`}>
      {body}
      <span className="absolute bottom-3 right-4 text-[11px] font-semibold text-emerald-700 opacity-0 group-hover:opacity-100 transition" aria-hidden="true">
        View list →
      </span>
    </Link>
  ) : (
    <div className={classes}>{body}</div>
  );
}
