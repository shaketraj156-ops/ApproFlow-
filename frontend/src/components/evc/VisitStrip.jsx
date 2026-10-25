import React, { useMemo } from 'react';

const IST = 'Asia/Kolkata';
const dayKey = (date) => new Intl.DateTimeFormat('en-CA', { timeZone: IST, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
const weekday = (date) => new Intl.DateTimeFormat('en-IN', { timeZone: IST, weekday: 'short' }).format(date);
const dayNumber = (date) => new Intl.DateTimeFormat('en-IN', { timeZone: IST, day: 'numeric' }).format(date);
const monthShort = (date) => new Intl.DateTimeFormat('en-IN', { timeZone: IST, month: 'short' }).format(date);

export { dayKey };

const DOT = {
  CONFIRMED: 'bg-emerald-500',
  PROPOSED: 'bg-amber-500',
  COMPLETED: 'bg-slate-400',
};

/**
 * The next two weeks as a row of days, with a dot for every visit. Click a day to show only that day's visits.
 */
export function VisitStrip({ visits, selected, onSelect, days = 14 }) {
  const byDay = useMemo(() => {
    const map = new Map();
    visits.forEach((v) => {
      const key = dayKey(new Date(v.scheduled_date));
      map.set(key, [...(map.get(key) || []), v]);
    });
    return map;
  }, [visits]);

  const list = useMemo(() => {
    const start = Date.now();
    return Array.from({ length: days }, (_, i) => new Date(start + i * 86400000));
  }, [days]);

  const todayKey = dayKey(new Date());
  const shown = list.reduce((n, d) => n + (byDay.get(dayKey(d))?.length || 0), 0);
  const later = visits.length - shown;

  return (
    <section aria-label="Visits over the next two weeks" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-slate-900">Next 14 days</h2>
        <p className="text-xs text-slate-500">
          {shown} visit{shown === 1 ? '' : 's'} in this window{later > 0 ? ` · ${later} later or earlier` : ''}
        </p>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {list.map((date) => {
          const key = dayKey(date);
          const dayVisits = byDay.get(key) || [];
          const isSelected = selected === key;
          const isToday = key === todayKey;
          const busy = dayVisits.length > 0;
          return (
            <button
              key={key}
              onClick={() => onSelect(isSelected ? null : key)}
              disabled={!busy}
              aria-pressed={isSelected}
              aria-label={`${weekday(date)} ${dayNumber(date)} ${monthShort(date)}: ${busy ? `${dayVisits.length} visit${dayVisits.length === 1 ? '' : 's'}` : 'no visits'}${isToday ? ', today' : ''}`}
              className={`shrink-0 w-[3.9rem] rounded-xl border px-2 py-2.5 text-center transition ${
                isSelected
                  ? 'bg-emerald-600 border-emerald-600 text-white shadow-md -translate-y-0.5'
                  : busy
                  ? 'bg-emerald-50 border-emerald-200 text-slate-900 hover:-translate-y-0.5 hover:shadow-sm cursor-pointer'
                  : 'bg-slate-50 border-slate-200 text-slate-400 cursor-default'
              } ${isToday && !isSelected ? 'ring-2 ring-emerald-400 ring-offset-1' : ''}`}
            >
              <span className={`block text-[10px] font-bold uppercase tracking-wide ${isSelected ? 'text-emerald-100' : ''}`}>{weekday(date)}</span>
              <span className="block text-lg font-extrabold leading-tight tabular-nums">{dayNumber(date)}</span>
              <span className={`block text-[10px] ${isSelected ? 'text-emerald-100' : 'text-slate-500'}`}>{monthShort(date)}</span>
              <span className="mt-1 flex justify-center gap-0.5 h-1.5" aria-hidden="true">
                {dayVisits.slice(0, 3).map((v) => (
                  <span key={v.id} className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : DOT[v.status] || 'bg-slate-400'}`} />
                ))}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-slate-500 flex flex-wrap gap-x-4 gap-y-1" aria-hidden="true">
        <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Confirmed</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> Awaiting confirmation</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-400" /> Completed</span>
      </p>
    </section>
  );
}
