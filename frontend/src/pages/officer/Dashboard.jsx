import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  FileText, Clock, AlertTriangle, BellRing, ArrowUpRight, Flame, ShieldAlert,
  Search, X, RefreshCw, Check
} from 'lucide-react';
import { KpiCard } from '../../components/common/KpiCard';
import { RoleHero } from '../../components/common/RoleHero';
import { useAuth } from '../../context/AuthContext';
import { healthSegments } from '../../utils/health';
import { Panel } from '../../components/common/Panel';
import { DataTable } from '../../components/common/DataTable';
import { SlaChip } from '../../components/common/SlaChip';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PriorityPill } from '../../components/common/PriorityPill';
import { DelayRiskTag } from '../../components/common/DelayRiskTag';
import { SeverityBadge } from '../../components/common/SeverityBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { Skeleton } from '../../components/common/Skeleton';
import { ErrorBanner, apiErrorMessage } from '../../components/common/ErrorBanner';
import { useToast } from '../../components/common/Toast';
import { applicationsService } from '../../services/applicationsService';
import { alertsService } from '../../services/alertsService';
import { reportsService } from '../../services/reportsService';
import { workflowService } from '../../services/workflowService';
import { formatDate } from '../../utils/formatDate';

// The quick filters. They only read the server's days_left; no deadline maths happens in the browser.
// An application on hold has its deadline clock paused, so it is never listed as overdue or due.
const FILTERS = {
  all: { label: 'All open', test: (a) => !a.decision },
  overdue: { label: 'Overdue', test: (a) => !a.decision && !a.is_on_hold && a.days_left !== null && a.days_left < 0 },
  due: { label: 'Due this week', test: (a) => !a.decision && !a.is_on_hold && a.days_left !== null && a.days_left >= 0 && a.days_left <= 7 },
};

const istTime = (date) =>
  new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }).format(date);

export function OfficerDashboard() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Everything the user can filter by lives in the URL, so a filtered view can be bookmarked and the back button works.
  const filterKey = FILTERS[searchParams.get('filter')] ? searchParams.get('filter') : 'all';
  const stage = searchParams.get('stage') || '';
  const region = searchParams.get('region') || '';
  const query = searchParams.get('q') || '';

  function setParam(key, value) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    setSearchParams(next, { replace: key === 'q' }); // typing in the search box should not fill the history
  }

  const [kpis, setKpis] = useState(null);
  const [alertSummary, setAlertSummary] = useState(null);
  const [applications, setApplications] = useState([]);
  const [stages, setStages] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [ackBusy, setAckBusy] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [kpiData, summary, appData, alertData, stageData] = await Promise.all([
        reportsService.getKpis(),
        alertsService.getSummary(),
        applicationsService.getApplications({ sort: '-priority_score', page_size: 100 }),
        alertsService.getAlerts({ status: 'OPEN' }),
        workflowService.getStages(),
      ]);
      setKpis(kpiData);
      setAlertSummary(summary);
      setApplications(appData.items || []);
      setAlerts(alertData || []);
      setStages([...stageData].sort((a, b) => a.sequence_order - b.sequence_order));
      setUpdatedAt(new Date());
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not load your queue.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const stageName = (code) => stages.find((s) => s.code === code)?.name || code;

  // Applications matching the stage, region and search box. The quick-filter chips count within this set.
  const matching = useMemo(() => {
    const q = query.trim().toLowerCase();
    return applications.filter((a) =>
      (!stage || a.current_stage_code === stage) &&
      (!region || a.region === region) &&
      (!q || a.application_number.toLowerCase().includes(q) || (a.institution_name || '').toLowerCase().includes(q))
    );
  }, [applications, stage, region, query]);

  const counts = useMemo(
    () => Object.fromEntries(Object.entries(FILTERS).map(([key, f]) => [key, matching.filter(f.test).length])),
    [matching]
  );
  const visible = useMemo(() => matching.filter(FILTERS[filterKey].test), [matching, filterKey]);
  const anyFilter = filterKey !== 'all' || stage || region || query;

  function clearFilters() {
    setSearchParams({}, { replace: true });
  }

  async function acknowledge(alert) {
    setAckBusy(alert.id);
    try {
      await alertsService.acknowledgeAlert(alert.id);
      setAlerts((current) => current.filter((a) => a.id !== alert.id));
      setAlertSummary(await alertsService.getSummary());
      toast.success('Alert acknowledged.');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not acknowledge the alert.'));
    } finally {
      setAckBusy(null);
    }
  }

  const needAction = (kpis?.overdue_count ?? 0) + (kpis?.due_this_week ?? 0);
  const description = loading && !kpis
    ? 'Loading your queue…'
    : needAction > 0
    ? `${needAction} application${needAction === 1 ? ' needs' : 's need'} action today or this week, ${kpis.overdue_count} already overdue.`
    : 'Nothing is overdue or due this week. Your queue is on track.';

  const columns = [
    {
      header: 'Application',
      sortValue: (row) => row.application_number,
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-900 flex items-center gap-2">
            {row.application_number}
            <DelayRiskTag score={row.delay_risk_score} />
          </div>
          <div className="text-xs text-slate-500">{row.institution_name || 'Technical Institute'} · {row.region}</div>
        </div>
      ),
    },
    { header: 'Stage', sortValue: (row) => stages.findIndex((s) => s.code === row.current_stage_code), render: (row) => <StatusBadge status={row.current_stage_code} /> },
    { header: 'SLA (IST)', sortValue: (row) => (row.is_on_hold ? null : row.days_left), render: (row) => <SlaChip daysLeft={row.days_left} onHold={row.is_on_hold} /> },
    { header: 'Priority', sortValue: (row) => Number(row.priority_score), render: (row) => <PriorityPill score={row.priority_score} /> },
    {
      header: '',
      className: 'text-right',
      render: (row) => (
        <button
          onClick={(e) => { e.stopPropagation(); navigate(`/officer/applications/${row.id}`); }}
          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900"
          aria-label={`Review ${row.application_number}`}
        >
          Review <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      <RoleHero
        loading={loading && !kpis}
        context={user?.region && user.region !== 'ALL' ? `${user.region.charAt(0)}${user.region.slice(1).toLowerCase()} region${updatedAt ? ` · updated ${istTime(updatedAt)}` : ''}` : updatedAt ? `Updated ${istTime(updatedAt)}` : undefined}
        summary={description}
        health={healthSegments({ open: kpis?.pending_actions, overdue: kpis?.overdue_count, dueSoon: kpis?.due_this_week })}
        actions={[
          { label: 'Review overdue', icon: AlertTriangle, to: '/officer/applications?filter=overdue', primary: true },
          { label: 'Alerts center', icon: BellRing, to: '/officer/alerts' },
          { label: loading ? 'Refreshing…' : 'Refresh', icon: RefreshCw, onClick: load, disabled: loading },
        ]}
      />

      {error && <ErrorBanner message={error} onRetry={load} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="My open" value={kpis?.pending_actions} icon={FileText} loading={loading && !kpis}
          subtitle="Applications in progress" to="/officer/applications"
        />
        <KpiCard
          title="Overdue" value={kpis?.overdue_count} icon={AlertTriangle} variant="danger" loading={loading && !kpis}
          subtitle="Past their stage deadline" to="/officer/applications?filter=overdue"
        />
        <KpiCard
          title="Due this week" value={kpis?.due_this_week} icon={Clock} variant="warning" loading={loading && !kpis}
          subtitle="Within the next 7 days" to="/officer/applications?filter=due"
        />
        <KpiCard
          title="Open alerts" value={alertSummary?.open_count} icon={BellRing} variant="brand" loading={loading && !alertSummary}
          subtitle={alertSummary?.critical_count ? `${alertSummary.critical_count} critical` : 'None critical'} to="/officer/alerts"
        />
      </div>

      <div className="grid grid-cols-1 2xl:grid-cols-3 gap-6">
        <div className="2xl:col-span-2 space-y-4 min-w-0">
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
            <Flame className="w-5 h-5 text-red-600" aria-hidden="true" /> Needs action first
          </h2>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[12rem] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(e) => setParam('q', e.target.value)}
                placeholder="Search number or institution"
                aria-label="Search the queue"
                className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-slate-300 rounded-xl placeholder:text-slate-400"
              />
              {query && (
                <button onClick={() => setParam('q', '')} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-slate-400 hover:text-slate-700">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <label className="sr-only" htmlFor="stage-filter">Filter by stage</label>
            <select
              id="stage-filter"
              value={stage}
              onChange={(e) => setParam('stage', e.target.value)}
              className="text-sm bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-700"
            >
              <option value="">All stages</option>
              {stages.filter((s) => !s.is_terminal).map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
            </select>

            <div className="flex items-center gap-1.5" role="group" aria-label="Quick filter">
              {Object.entries(FILTERS).map(([key, f]) => (
                <button
                  key={key}
                  onClick={() => setParam('filter', key === 'all' ? '' : key)}
                  aria-pressed={filterKey === key}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                    filterKey === key
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
                  }`}
                >
                  {f.label}
                  <span className={`tabular-nums px-1.5 rounded-full text-[10px] ${filterKey === key ? 'bg-white/20' : 'bg-slate-100'}`}>{counts[key]}</span>
                </button>
              ))}
            </div>
          </div>

          {(stage || region) && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-500">Filtered by</span>
              {stage && (
                <button onClick={() => setParam('stage', '')} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                  {stageName(stage)} <X className="w-3 h-3" aria-label="Remove stage filter" />
                </button>
              )}
              {region && (
                <button onClick={() => setParam('region', '')} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                  {region} <X className="w-3 h-3" aria-label="Remove region filter" />
                </button>
              )}
            </div>
          )}

          {!loading && !error && visible.length === 0 ? (
            <EmptyState
              icon={Search}
              title={anyFilter ? 'No applications match these filters' : 'No applications in your queue'}
              text={anyFilter ? 'Try a different search, stage or quick filter.' : 'New applications will appear here once they are assigned to you.'}
              action={anyFilter && (
                <button onClick={clearFilters} className="text-sm font-semibold text-emerald-700 hover:text-emerald-900">Clear all filters</button>
              )}
            />
          ) : (
            <>
              <DataTable
                columns={columns}
                data={visible}
                loading={loading && applications.length === 0}
                defaultSort={{ index: 3, dir: 'desc' }}
                onRowClick={(row) => navigate(`/officer/applications/${row.id}`)}
                emptyMessage="No applications in your queue"
              />
              {!loading && (
                <p className="text-xs text-slate-500" aria-live="polite">
                  Showing {visible.length} of {applications.filter((a) => !a.decision).length} open applications
                  {anyFilter && <> · <button onClick={clearFilters} className="font-semibold text-emerald-700 hover:text-emerald-900">clear filters</button></>}
                </p>
              )}
            </>
          )}
        </div>

        <Panel
          title="Latest alerts"
          subtitle="Open alerts, newest first"
          icon={ShieldAlert}
          actions={<Link to="/officer/alerts" className="text-xs font-semibold text-emerald-700 hover:text-emerald-900">View all</Link>}
        >
          {loading && alerts.length === 0 ? (
            <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : alerts.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">No open alerts. You are all caught up.</p>
          ) : (
            <ul className="space-y-3">
              {alerts.slice(0, 5).map((alt) => (
                <li key={alt.id} className="rounded-xl border border-slate-200 p-3 hover:border-slate-300 transition">
                  <div className="flex items-center justify-between gap-2">
                    <SeverityBadge severity={alt.severity} />
                    <span className="text-[11px] text-slate-400">{formatDate(alt.created_at, true)}</span>
                  </div>
                  <p className="mt-2 text-xs font-bold text-slate-900">{alt.title}</p>
                  <p className="mt-0.5 text-xs text-slate-600 leading-relaxed">{alt.message}</p>
                  <div className="mt-2.5 flex items-center justify-between">
                    {alt.entity_type === 'APPLICATION' ? (
                      <Link to={`/officer/applications/${alt.entity_id}`} className="text-xs font-semibold text-emerald-700 hover:text-emerald-900">Open application</Link>
                    ) : <span />}
                    <button
                      onClick={() => acknowledge(alt)}
                      disabled={ackBusy === alt.id}
                      aria-label={`Acknowledge alert: ${alt.title}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 border border-slate-300 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-800 disabled:opacity-60 rounded-lg transition"
                    >
                      <Check className="w-3.5 h-3.5" aria-hidden="true" /> Acknowledge
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
