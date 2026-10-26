import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarCheck, CalendarDays, List, Users, CheckCircle2, Clock, PlusCircle, MapPin, Building2,
  Search, UserCheck, ShieldAlert, ChevronRight, Crown
} from 'lucide-react';
import { evcService } from '../../services/evcService';
import { RoleHero } from '../../components/common/RoleHero';
import { KpiCard } from '../../components/common/KpiCard';
import { EmptyState } from '../../components/common/EmptyState';
import { Skeleton } from '../../components/common/Skeleton';
import { ErrorBanner, apiErrorMessage } from '../../components/common/ErrorBanner';
import { useToast } from '../../components/common/Toast';
import { VisitStrip, dayKey } from '../../components/evc/VisitStrip';
import { MonthCalendar } from '../../components/evc/MonthCalendar';
import { VisitDetailModal } from '../../components/evc/VisitDetailModal';
import { ScheduleWizard } from '../../components/evc/ScheduleWizard';
import { formatDate } from '../../utils/formatDate';
import { daysUntil, istDateString } from '../../utils/dates';

const STATUS_FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'PROPOSED', label: 'Awaiting confirmation' },
  { key: 'CONFIRMED', label: 'Confirmed' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

const BLOCK = {
  CONFIRMED: 'from-emerald-500 to-emerald-700',
  PROPOSED: 'from-amber-400 to-orange-500',
  COMPLETED: 'from-slate-500 to-slate-700',
  CANCELLED: 'from-red-300 to-red-500',
};
const BADGE = {
  CONFIRMED: { tone: 'bg-emerald-100 text-emerald-800', label: 'Confirmed', icon: CheckCircle2 },
  PROPOSED: { tone: 'bg-amber-100 text-amber-800', label: 'Awaiting confirmation', icon: Clock },
  COMPLETED: { tone: 'bg-slate-100 text-slate-700', label: 'Completed', icon: CheckCircle2 },
  CANCELLED: { tone: 'bg-red-100 text-red-700', label: 'Cancelled', icon: ShieldAlert },
};

const part = (iso, opts) => new Intl.DateTimeFormat('en-IN', { timeZone: 'UTC', ...opts }).format(new Date(`${iso}T00:00:00Z`));
const initials = (name = '') => name.replace(/^(Dr|Prof)\.?\s+/i, '').split(' ').map((w) => w[0]).slice(0, 2).join('');
const AVATAR_TONES = ['from-emerald-400 to-teal-600', 'from-sky-400 to-blue-600', 'from-violet-400 to-indigo-600', 'from-amber-400 to-orange-600', 'from-rose-400 to-pink-600'];
const toneFor = (id = '') => AVATAR_TONES[[...id].reduce((n, c) => n + c.charCodeAt(0), 0) % AVATAR_TONES.length];

function relative(iso) {
  const n = daysUntil(iso);
  if (n === null) return '';
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n === -1) return 'Yesterday';
  return n > 0 ? `In ${n} days` : `${Math.abs(n)} days ago`;
}

export function Evc() {
  const toast = useToast();
  const [visits, setVisits] = useState([]);
  const [experts, setExperts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [tab, setTab] = useState('visits'); // visits | experts
  const [view, setView] = useState('calendar'); // calendar | list
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dayFilter, setDayFilter] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [wizard, setWizard] = useState({ open: false, date: null });

  const [region, setRegion] = useState('ALL');
  const [query, setQuery] = useState('');
  const [freeOnly, setFreeOnly] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [v, e] = await Promise.all([evcService.getVisits(), evcService.getExperts()]);
      setVisits(v || []);
      setExperts(e || []);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not load the EVC schedule.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const today = istDateString(new Date());
  const counts = useMemo(() => ({
    ALL: visits.length,
    ...Object.fromEntries(STATUS_FILTERS.slice(1).map((f) => [f.key, visits.filter((v) => v.status === f.key).length])),
  }), [visits]);

  const byStatus = useMemo(
    () => visits.filter((v) => statusFilter === 'ALL' || v.status === statusFilter),
    [visits, statusFilter]
  );
  const listed = useMemo(
    () => byStatus
      .filter((v) => !dayFilter || dayKey(new Date(v.scheduled_date)) === dayFilter)
      .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date)),
    [byStatus, dayFilter]
  );
  const next = useMemo(
    () => visits.filter((v) => ['PROPOSED', 'CONFIRMED'].includes(v.status) && v.scheduled_date >= today)
      .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))[0],
    [visits, today]
  );
  const selected = visits.find((v) => v.id === selectedId) || null;

  // The roster, with each expert's upcoming bookings worked out from the visits
  const bookings = useMemo(() => {
    const map = new Map();
    visits.filter((v) => ['PROPOSED', 'CONFIRMED'].includes(v.status)).forEach((v) =>
      v.experts.forEach((x) => map.set(x.id, [...(map.get(x.id) || []), v.scheduled_date].sort())));
    return map;
  }, [visits]);
  const regions = useMemo(() => ['ALL', ...new Set(experts.map((e) => e.region))], [experts]);
  const roster = useMemo(() => {
    const q = query.trim().toLowerCase();
    return experts
      .filter((e) => region === 'ALL' || e.region === region)
      .filter((e) => !freeOnly || (e.is_available && e.load_count < e.max_load))
      .filter((e) => !q || [e.name, e.affiliation, e.specialization, e.email].some((t) => (t || '').toLowerCase().includes(q)))
      .sort((a, b) => a.load_count / a.max_load - b.load_count / b.max_load);
  }, [experts, region, query, freeOnly]);

  function openWizard(date = null) {
    setWizard({ open: true, date });
  }

  async function quickConfirm(visit) {
    try {
      await evcService.confirmVisit(visit.id);
      toast.success('Visit confirmed. The committee is locked in.');
      await load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not confirm the visit.'));
    }
  }

  const summary = loading
    ? 'Loading the visit calendar…'
    : visits.length === 0
    ? 'No expert visits are scheduled yet. Nominate a committee to get started.'
    : `${counts.CONFIRMED} visit${counts.CONFIRMED === 1 ? ' is' : 's are'} confirmed and ${counts.PROPOSED} awaiting confirmation.${next ? ` Next up: ${next.institution_name} on ${formatDate(next.scheduled_date, false)}.` : ''}`;

  return (
    <div className="space-y-6">
      <RoleHero
        loading={loading}
        context="EVC scheduler"
        summary={summary}
        ring={{
          title: 'Visit pipeline',
          centerValue: visits.length,
          centerLabel: 'visits',
          segments: [
            { label: 'Confirmed', color: '#34d399', value: counts.CONFIRMED },
            { label: 'Awaiting', color: '#fbbf24', value: counts.PROPOSED },
            { label: 'Completed', color: '#94a3b8', value: counts.COMPLETED },
          ],
        }}
        actions={[
          { label: 'Nominate & schedule a visit', icon: PlusCircle, primary: true, onClick: () => openWizard() },
        ]}
      />

      {error && <ErrorBanner message={error} onRetry={load} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Scheduled visits" value={visits.length} subtitle="All upcoming and past" icon={CalendarCheck} variant="brand" loading={loading} />
        <KpiCard title="Confirmed" value={counts.CONFIRMED} subtitle="Committee locked in" icon={CheckCircle2} variant="success" loading={loading} />
        <KpiCard title="Awaiting confirmation" value={counts.PROPOSED} subtitle="Proposed, not yet sealed" icon={Clock} variant="warning" loading={loading} />
        <KpiCard title="Empanelled experts" value={experts.length} subtitle={`${experts.filter((e) => e.is_available).length} available now`} icon={Users} loading={loading} />
      </div>

      <div role="tablist" aria-label="EVC sections" className="inline-flex flex-wrap gap-1 p-1 rounded-2xl bg-white border border-slate-200 shadow-card">
        {[
          { key: 'visits', label: 'Visits', count: visits.length },
          { key: 'experts', label: 'Experts roster', count: experts.length },
        ].map((t) => (
          <button
            key={t.key} role="tab" id={`evc-tab-${t.key}`} aria-selected={tab === t.key} aria-controls={`evc-panel-${t.key}`}
            onClick={() => setTab(t.key)}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold transition rounded-xl ${
              tab === t.key ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/25' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {t.label}
            <span className={`px-1.5 min-w-5 text-center rounded-full text-[11px] font-bold ${tab === t.key ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700'}`}>{t.count}</span>
          </button>
        ))}
      </div>

      {tab === 'visits' && (
        <div role="tabpanel" id="evc-panel-visits" aria-labelledby="evc-tab-visits" className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-xl border border-slate-300 bg-white p-0.5" role="group" aria-label="View">
              {[
                { key: 'calendar', label: 'Calendar', icon: CalendarDays },
                { key: 'list', label: 'List', icon: List },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key} onClick={() => setView(key)} aria-pressed={view === key}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[0.65rem] text-sm font-semibold transition ${view === key ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  <Icon className="w-4 h-4" aria-hidden="true" /> {label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter visits by status">
              {STATUS_FILTERS.filter((f) => f.key === 'ALL' || counts[f.key] > 0).map((f) => (
                <button
                  key={f.key} onClick={() => setStatusFilter(f.key)} aria-pressed={statusFilter === f.key}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                    statusFilter === f.key ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
                  }`}
                >
                  {f.label}
                  <span className={`tabular-nums px-1.5 rounded-full text-[10px] ${statusFilter === f.key ? 'bg-white/20' : 'bg-slate-100'}`}>{counts[f.key]}</span>
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="space-y-4" role="status" aria-label="Loading visits">
              <Skeleton className="h-96 w-full" />
            </div>
          ) : view === 'calendar' ? (
            <MonthCalendar
              visits={byStatus}
              onSelectVisit={(v) => setSelectedId(v.id)}
              onPickDay={(iso) => openWizard(iso)}
              onShowDay={(iso) => { setDayFilter(iso); setView('list'); }}
            />
          ) : (
            <>
              {visits.length > 0 && <VisitStrip visits={byStatus} selected={dayFilter} onSelect={setDayFilter} />}

              {dayFilter && (
                <button onClick={() => setDayFilter(null)} className="px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Showing {formatDate(dayFilter, false)} · clear
                </button>
              )}

              {visits.length === 0 ? (
                <EmptyState
                  icon={CalendarDays} title="No visits scheduled yet" text="Nominate a committee and the engine will find a date when everyone is free."
                  action={<button onClick={() => openWizard()} className="px-4 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">Nominate & schedule a visit</button>}
                />
              ) : listed.length === 0 ? (
                <EmptyState icon={Search} title="No visits match these filters" text="Try another status or clear the day filter." />
              ) : (
                <ul className="space-y-4">
                  {listed.map((visit) => {
                    const badge = BADGE[visit.status] || BADGE.COMPLETED;
                    const BadgeIcon = badge.icon;
                    return (
                      <li key={visit.id}>
                        <article className="bg-white rounded-2xl border border-slate-200 shadow-card hover:shadow-md hover:-translate-y-0.5 transition overflow-hidden flex flex-col sm:flex-row">
                          <div className={`bg-gradient-to-br ${BLOCK[visit.status] || BLOCK.COMPLETED} text-white sm:w-32 shrink-0 p-4 flex sm:flex-col items-center justify-center gap-3 sm:gap-0 text-center`}>
                            <span className="text-[11px] font-bold uppercase tracking-widest text-white/80">{part(visit.scheduled_date, { month: 'short' })}</span>
                            <span className="text-4xl font-extrabold leading-none tabular-nums">{part(visit.scheduled_date, { day: 'numeric' })}</span>
                            <span className="text-xs font-semibold text-white/90 sm:mt-1">{part(visit.scheduled_date, { weekday: 'long' })}</span>
                            <span className="text-[11px] text-white/75">{relative(visit.scheduled_date)}</span>
                          </div>

                          <div className="flex-1 p-5 min-w-0">
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                              <div className="space-y-2 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-bold px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg">{visit.application_number}</span>
                                  {visit.region && (
                                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-md">
                                      <MapPin className="w-3 h-3" aria-hidden="true" /> {visit.region}
                                    </span>
                                  )}
                                  <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-md ${badge.tone}`}>
                                    <BadgeIcon className="w-3 h-3" aria-hidden="true" /> {badge.label}
                                  </span>
                                </div>
                                <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                                  <Building2 className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                                  <span className="truncate">{visit.institution_name}</span>
                                </h3>
                                {visit.remarks && <p className="text-xs text-slate-500 line-clamp-2 whitespace-pre-line">{visit.remarks}</p>}
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {visit.status === 'PROPOSED' && (
                                  <button onClick={() => quickConfirm(visit)} className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-sm transition">
                                    <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> Confirm
                                  </button>
                                )}
                                <button onClick={() => setSelectedId(visit.id)} aria-label={`Details for ${visit.institution_name}`} className="inline-flex items-center gap-1 px-3.5 py-2 text-sm font-semibold text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-xl transition">
                                  Details <ChevronRight className="w-4 h-4" aria-hidden="true" />
                                </button>
                              </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-3">
                              <div className="flex -space-x-2" aria-hidden="true">
                                {visit.experts.map((exp) => (
                                  <span key={exp.id} className={`w-9 h-9 rounded-full border-2 border-white flex items-center justify-center text-[11px] font-bold text-white bg-gradient-to-br ${exp.is_lead ? 'from-emerald-500 to-emerald-700' : toneFor(exp.id)}`}>
                                    {initials(exp.name)}
                                  </span>
                                ))}
                              </div>
                              <p className="text-xs text-slate-600 min-w-0 truncate">
                                <span className="font-semibold text-slate-800">Committee of {visit.experts.length}</span>
                                {visit.experts.find((x) => x.is_lead) && <> · lead <span className="font-semibold">{visit.experts.find((x) => x.is_lead).name}</span></>}
                              </p>
                            </div>
                          </div>
                        </article>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
        </div>
      )}

      {tab === 'experts' && (
        <div role="tabpanel" id="evc-panel-experts" aria-labelledby="evc-tab-experts" className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[12rem] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
              <input
                type="search" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search experts"
                placeholder="Search name, university or field"
                className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-xl placeholder:text-slate-400"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by region">
              {regions.map((r) => (
                <button key={r} onClick={() => setRegion(r)} aria-pressed={region === r}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${region === r ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'}`}>
                  {r === 'ALL' ? 'All regions' : r}
                </button>
              ))}
            </div>
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input type="checkbox" checked={freeOnly} onChange={(e) => setFreeOnly(e.target.checked)} className="rounded text-emerald-600" />
              Free to nominate only
            </label>
          </div>

          {loading ? (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-44" />)}</div>
          ) : roster.length === 0 ? (
            <EmptyState icon={Users} title="No experts match" text="Try another region or clear the search." />
          ) : (
            <ul className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {roster.map((e) => {
                const full = e.load_count >= e.max_load;
                const pct = Math.min(100, Math.round((e.load_count / e.max_load) * 100));
                const upcoming = bookings.get(e.id) || [];
                return (
                  <li key={e.id} className="bg-white rounded-2xl border border-slate-200 shadow-card hover:shadow-md hover:-translate-y-0.5 transition p-5">
                    <div className="flex items-start gap-3">
                      <span className={`w-12 h-12 shrink-0 rounded-full bg-gradient-to-br ${toneFor(e.id)} text-white flex items-center justify-center text-sm font-bold shadow-sm`}>{initials(e.name)}</span>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-bold text-slate-900 truncate">{e.name}</h3>
                        <p className="text-xs text-slate-500 truncate">{e.affiliation || e.email}</p>
                      </div>
                      {e.is_available ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0"><UserCheck className="w-3 h-3" aria-hidden="true" /> Available</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 shrink-0"><ShieldAlert className="w-3 h-3" aria-hidden="true" /> Unavailable</span>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">{e.specialization}</span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700"><MapPin className="w-3 h-3" aria-hidden="true" />{e.region}</span>
                    </div>

                    <div className="mt-4">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 mb-1">
                        <span>Visit load this cycle</span>
                        <span className="tabular-nums">{e.load_count}/{e.max_load}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={e.max_load} aria-valuenow={e.load_count} aria-label={`${e.name} visit load`}>
                        <div className={`h-full rounded-full transition-all duration-500 ${full ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
                      </div>
                      {full && <p className="mt-1 text-[11px] font-semibold text-red-700">At the limit, cannot be nominated.</p>}
                    </div>

                    <p className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center gap-1.5">
                      <CalendarDays className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                      {upcoming.length === 0 ? 'No upcoming visits' : `${upcoming.length} upcoming visit${upcoming.length === 1 ? '' : 's'} · next ${formatDate(upcoming[0], false)}`}
                      {upcoming.length > 0 && <Crown className="hidden" aria-hidden="true" />}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      <VisitDetailModal
        visit={selected}
        isOpen={!!selected}
        onClose={() => setSelectedId(null)}
        onChanged={async () => { await load(); }}
      />

      <ScheduleWizard
        isOpen={wizard.open}
        initialDate={wizard.date}
        onClose={() => setWizard({ open: false, date: null })}
        onScheduled={async () => { setWizard({ open: false, date: null }); await load(); }}
      />
    </div>
  );
}
export default Evc;
