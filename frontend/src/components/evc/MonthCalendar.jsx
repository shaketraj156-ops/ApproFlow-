import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { istDateString } from '../../utils/dates';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MAX_CHIPS = 3;

const CHIP = {
  CONFIRMED: 'bg-emerald-100 text-emerald-900 border-emerald-200 hover:bg-emerald-200',
  PROPOSED: 'bg-amber-100 text-amber-900 border-amber-200 hover:bg-amber-200',
  COMPLETED: 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200',
  CANCELLED: 'bg-red-50 text-red-700 border-red-200 line-through hover:bg-red-100',
};
const DOT = { CONFIRMED: 'bg-emerald-500', PROPOSED: 'bg-amber-500', COMPLETED: 'bg-slate-400', CANCELLED: 'bg-red-400' };

const monthTitle = (y, m) =>
  new Intl.DateTimeFormat('en-IN', { timeZone: 'UTC', month: 'long', year: 'numeric' }).format(new Date(Date.UTC(y, m, 1)));
const longDay = (iso) =>
  new Intl.DateTimeFormat('en-IN', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${iso}T00:00:00Z`));
const shortName = (name = '') => name.split(/\s+/).slice(0, 2).join(' ');

/**
 * A month of visits. Click a visit to open it, click "+" on a free day to schedule one there,
 * or "+n more" to see that whole day in the list.
 */
export function MonthCalendar({ visits, onSelectVisit, onPickDay, onShowDay }) {
  const today = istDateString(new Date());
  const [cursor, setCursor] = useState(() => {
    const [y, m] = today.split('-').map(Number);
    return { y, m: m - 1 };
  });

  const byDay = useMemo(() => {
    const map = new Map();
    visits.forEach((v) => map.set(v.scheduled_date, [...(map.get(v.scheduled_date) || []), v]));
    return map;
  }, [visits]);

  // Six weeks starting on the Monday on or before the 1st, so every month fits the same grid.
  const cells = useMemo(() => {
    const lead = (new Date(Date.UTC(cursor.y, cursor.m, 1)).getUTCDay() + 6) % 7;
    return Array.from({ length: 42 }, (_, i) => {
      const date = new Date(Date.UTC(cursor.y, cursor.m, 1 - lead + i));
      return { iso: date.toISOString().slice(0, 10), inMonth: date.getUTCMonth() === cursor.m, weekday: i % 7 };
    });
  }, [cursor]);

  const go = (delta) => setCursor(({ y, m }) => {
    const next = new Date(Date.UTC(y, m + delta, 1));
    return { y: next.getUTCFullYear(), m: next.getUTCMonth() };
  });
  const isThisMonth = today.startsWith(`${cursor.y}-${String(cursor.m + 1).padStart(2, '0')}`);
  const inMonthCount = cells.reduce((n, c) => n + (c.inMonth ? (byDay.get(c.iso)?.length || 0) : 0), 0);

  return (
    <section aria-label="Visit calendar" className="rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
        <div>
          <h2 className="text-base font-bold text-slate-900" aria-live="polite">{monthTitle(cursor.y, cursor.m)}</h2>
          <p className="text-xs text-slate-500">{inMonthCount} visit{inMonthCount === 1 ? '' : 's'} this month</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { const [y, m] = today.split('-').map(Number); setCursor({ y, m: m - 1 }); }}
            disabled={isThisMonth}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent"
          >
            Today
          </button>
          <div className="flex rounded-lg border border-slate-300 overflow-hidden">
            <button onClick={() => go(-1)} aria-label="Previous month" className="p-1.5 hover:bg-slate-50 text-slate-600">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => go(1)} aria-label="Next month" className="p-1.5 hover:bg-slate-50 text-slate-600 border-l border-slate-300">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="overflow-x-auto">
        <div role="grid" aria-label={monthTitle(cursor.y, cursor.m)} className="min-w-[44rem]">
          <div role="row" className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/70">
            {WEEKDAYS.map((d) => (
              <div key={d} role="columnheader" className="px-2 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-500 text-center">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {cells.map((cell) => {
              const dayVisits = byDay.get(cell.iso) || [];
              const isToday = cell.iso === today;
              const isPast = cell.iso < today;
              const isSunday = cell.weekday === 6;
              const canSchedule = !isPast && !isSunday && cell.inMonth;
              const hidden = dayVisits.length - MAX_CHIPS;
              return (
                <div
                  key={cell.iso}
                  role="gridcell"
                  aria-label={`${longDay(cell.iso)}: ${dayVisits.length} visit${dayVisits.length === 1 ? '' : 's'}${isToday ? ', today' : ''}`}
                  className={`group relative min-h-[6.5rem] p-1.5 border-b border-r border-slate-100 ${
                    cell.inMonth ? (isSunday ? 'bg-slate-50/80' : 'bg-white') : 'bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className={`inline-flex items-center justify-center w-6 h-6 text-xs font-semibold rounded-full tabular-nums ${
                      isToday ? 'bg-emerald-600 text-white' : cell.inMonth ? (isPast ? 'text-slate-400' : 'text-slate-700') : 'text-slate-300'
                    }`}>
                      {Number(cell.iso.slice(8))}
                    </span>
                    {canSchedule && (
                      <button
                        onClick={() => onPickDay(cell.iso)}
                        aria-label={`Schedule a visit on ${longDay(cell.iso)}`}
                        className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 rounded-md text-emerald-700 hover:bg-emerald-50 transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <ul className="mt-1 space-y-1">
                    {dayVisits.slice(0, MAX_CHIPS).map((v) => (
                      <li key={v.id}>
                        <button
                          onClick={() => onSelectVisit(v)}
                          title={`${v.institution_name} · ${v.status.toLowerCase()}`}
                          className={`w-full text-left flex items-center gap-1.5 px-1.5 py-1 rounded-md border text-[11px] font-semibold truncate transition ${CHIP[v.status] || CHIP.COMPLETED}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${DOT[v.status] || 'bg-slate-400'}`} aria-hidden="true" />
                          <span className="truncate">{shortName(v.institution_name)}</span>
                        </button>
                      </li>
                    ))}
                    {hidden > 0 && (
                      <li>
                        <button onClick={() => onShowDay(cell.iso)} className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 px-1">
                          +{hidden} more
                        </button>
                      </li>
                    )}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <footer className="flex flex-wrap items-center gap-x-5 gap-y-1 px-5 py-3 border-t border-slate-100 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true" /> Confirmed</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" aria-hidden="true" /> Awaiting confirmation</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-400" aria-hidden="true" /> Completed</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400" aria-hidden="true" /> Cancelled</span>
        <span className="ml-auto">Sundays are not available for visits.</span>
      </footer>
    </section>
  );
}
