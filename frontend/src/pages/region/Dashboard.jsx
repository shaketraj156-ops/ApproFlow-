import React, { useCallback, useEffect, useState } from 'react';
import {
  Users, AlertTriangle, CalendarCheck, Clock, Sparkles, ChevronRight,
  UserCheck, Layers, ListChecks
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { reportsService } from '../../services/reportsService';
import { applicationsService } from '../../services/applicationsService';
import { useAuth } from '../../context/AuthContext';
import { KpiCard } from '../../components/common/KpiCard';
import { RoleHero } from '../../components/common/RoleHero';
import { healthSegments } from '../../utils/health';
import { Panel } from '../../components/common/Panel';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { SlaChip } from '../../components/common/SlaChip';
import { Modal } from '../../components/common/Modal';
import { ErrorBanner, apiErrorMessage } from '../../components/common/ErrorBanner';

const REGIONS = [
  { code: 'NORTH', label: 'Northern region' },
  { code: 'WEST', label: 'Western region' },
  { code: 'SOUTH', label: 'Southern region' },
  { code: 'EAST', label: 'Eastern region' },
  { code: 'CENTRAL', label: 'Central region' },
];

const RISK_THRESHOLD = Number(import.meta.env.VITE_RISK_TAG_THRESHOLD) || 0.7;

function RiskPill({ score }) {
  if (score === null || score === undefined) return <span className="text-xs text-slate-400">—</span>;
  const high = score >= RISK_THRESHOLD;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
      high ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-slate-50 text-slate-600 border-slate-200'
    }`}>
      {high && <Sparkles className="w-3 h-3" aria-hidden="true" />}
      {Math.round(score * 100)}%
    </span>
  );
}

export function RegionalDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Regional officers are limited to their own region; national heads and admins can switch.
  const lockedRegion = user?.role === 'aicte_officer' && user?.officer_level !== 'NATIONAL_HEAD' ? user?.region : null;
  const requested = searchParams.get('region');
  const selectedRegion = lockedRegion
    || (REGIONS.some((r) => r.code === requested) ? requested : user?.region && user.region !== 'ALL' ? user.region : 'NORTH');

  const [regionStats, setRegionStats] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [applications, setApplications] = useState([]);
  const [funnel, setFunnel] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [reassigning, setReassigning] = useState(null); // the application being reassigned
  const [targetOfficer, setTargetOfficer] = useState('');
  const [reassignError, setReassignError] = useState(null);
  const [reassignBusy, setReassignBusy] = useState(false);

  const loadData = useCallback(async (isCancelled = () => false) => {
    setLoading(true);
    setError(null);
    try {
      const [stats, offs, apps, fnl] = await Promise.all([
        reportsService.getRegionalSummary(),
        reportsService.getOfficerWorkload(),
        applicationsService.getApplications({ region: selectedRegion, page_size: 100 }),
        reportsService.getFunnel(),
      ]);
      if (isCancelled()) return; // the region changed while this request was in flight
      setRegionStats(stats || []);
      setOfficers(offs || []);
      setApplications(apps?.items || []);
      setFunnel(fnl || []);
    } catch (err) {
      if (!isCancelled()) setError(apiErrorMessage(err, 'Could not load regional data.'));
    } finally {
      if (!isCancelled()) setLoading(false);
    }
  }, [selectedRegion]);

  useEffect(() => {
    let cancelled = false;
    loadData(() => cancelled);
    return () => { cancelled = true; };
  }, [loadData]);

  const stat = regionStats.find((r) => r.region === selectedRegion);
  const regionalOfficers = officers.filter((o) => o.region === selectedRegion);
  const funnelMax = Math.max(1, ...funnel.map((s) => s.application_count));

  function openReassign(app) {
    setReassigning(app);
    setTargetOfficer('');
    setReassignError(null);
  }

  async function submitReassign() {
    if (!targetOfficer) {
      setReassignError('Choose an officer to assign this application to.');
      return;
    }
    setReassignBusy(true);
    setReassignError(null);
    try {
      await applicationsService.assignOfficer(reassigning.id, targetOfficer);
      setReassigning(null);
      await loadData();
    } catch (err) {
      setReassignError(apiErrorMessage(err, 'Could not reassign this application.'));
    } finally {
      setReassignBusy(false);
    }
  }

  const officerColumns = [
    {
      header: 'Officer',
      render: (o) => (
        <div>
          <div className="font-semibold text-slate-900">{o.name}</div>
          <div className="text-[11px] text-slate-400">{o.email}</div>
        </div>
      ),
    },
    {
      header: 'Level',
      render: (o) => (
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
          {o.level?.replace(/_/g, ' ') || '—'}
        </span>
      ),
    },
    { header: 'Open files', render: (o) => <span className="font-bold text-slate-900 tabular-nums">{o.active_queue}</span> },
    {
      header: 'Overdue',
      render: (o) => (
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
          o.overdue_count > 0 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
        }`}>
          {o.overdue_count}
        </span>
      ),
    },
    {
      header: 'Avg per stage',
      render: (o) => <span className="text-slate-700 tabular-nums">{o.avg_completion_days ? `${o.avg_completion_days} d` : '—'}</span>,
    },
  ];

  const applicationColumns = [
    {
      header: 'Application',
      render: (a) => (
        <div>
          <div className="font-semibold text-slate-900">{a.application_number}</div>
          {a.institution_name && <div className="text-[11px] text-slate-500">{a.institution_name}</div>}
        </div>
      ),
    },
    { header: 'Stage', render: (a) => <StatusBadge status={a.current_stage_code} /> },
    {
      header: 'Priority',
      render: (a) => <span className="font-bold text-slate-900 tabular-nums">{Number(a.priority_score).toFixed(1)}</span>,
    },
    { header: 'SLA', render: (a) => <SlaChip daysLeft={a.days_left} /> },
    { header: 'Delay hint', render: (a) => <RiskPill score={a.delay_risk_score} /> },
    {
      header: '',
      className: 'text-right',
      render: (a) => (
        <div className="flex items-center justify-end gap-3">
          {!a.decision && (
            <button
              onClick={(e) => { e.stopPropagation(); openReassign(a); }}
              className="text-xs font-semibold text-slate-600 hover:text-emerald-700"
            >
              Reassign
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/officer/applications/${a.id}`); }}
            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-800"
          >
            Inspect <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      <RoleHero
        loading={loading}
        context={REGIONS.find((r) => r.code === selectedRegion)?.label}
        summary={
          loading
            ? 'Loading the regional picture…'
            : !stat || stat.pending_count === 0
            ? 'There are no open applications in this region.'
            : `${stat.overdue_count} of ${stat.pending_count} open applications are overdue in this region, and ${stat.evc_scheduled} expert visit${stat.evc_scheduled === 1 ? ' is' : 's are'} confirmed.`
        }
        health={healthSegments({ open: stat?.pending_count, overdue: stat?.overdue_count })}
        actions={[
          { label: 'Open the region\'s queue', icon: ListChecks, to: `/officer/applications?region=${selectedRegion}`, primary: true },
          { label: 'EVC scheduler', icon: CalendarCheck, to: '/officer/evc' },
        ]}
      >
        <div className="flex items-center gap-2">
          <label htmlFor="region-select" className="text-xs font-semibold text-white/70">Region</label>
          <select
            id="region-select"
            value={selectedRegion}
            disabled={!!lockedRegion}
            onChange={(e) => setSearchParams({ region: e.target.value })}
            className="text-sm font-medium bg-white/10 border border-white/25 text-white rounded-xl px-3 py-2 disabled:opacity-60 [&>option]:text-slate-900"
          >
            {REGIONS.map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}
          </select>
        </div>
      </RoleHero>

      {error && <ErrorBanner message={error} onRetry={() => loadData()} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard title="Open applications" value={stat?.pending_count ?? 0} subtitle="In the pipeline" icon={Layers} loading={loading} />
        <KpiCard title="SLA overdue" value={stat?.overdue_count ?? 0} subtitle="Need intervention" icon={AlertTriangle} variant="danger" loading={loading} />
        <KpiCard title="EVC visits" value={stat?.evc_scheduled ?? 0} subtitle="Confirmed, upcoming" icon={CalendarCheck} variant="brand" loading={loading} />
        <KpiCard title="Avg per stage" value={stat?.avg_days ? `${stat.avg_days} d` : '—'} subtitle="Completed stages" icon={Clock} loading={loading} />
        <KpiCard title="May need attention" value={stat?.high_risk_count ?? 0} subtitle={`Delay hint ≥ ${Math.round(RISK_THRESHOLD * 100)}%`} icon={Sparkles} variant="warning" loading={loading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Panel
          className="lg:col-span-2"
          title="Officer workload"
          subtitle="Open files, overdue files and average time per completed stage"
          icon={Users}
          flush
        >
          <DataTable
            columns={officerColumns}
            data={regionalOfficers}
            loading={loading}
            emptyMessage="No officers are assigned to this region"
          />
        </Panel>

        <Panel title="Pipeline by stage" subtitle="Applications at each stage" icon={ListChecks}>
          {loading ? (
            <div className="space-y-3">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-6 w-full" />)}</div>
          ) : funnel.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">No pipeline data yet</p>
          ) : (
            <ul className="space-y-3">
              {funnel.map((s) => (
                <li key={s.stage_code}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-slate-700">{s.stage_name}</span>
                    <span className="font-bold text-slate-900 tabular-nums">{s.application_count}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden" role="presentation">
                    <div
                      className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${(s.application_count / funnelMax) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel
        title={`Application queue — ${REGIONS.find((r) => r.code === selectedRegion)?.label || selectedRegion}`}
        subtitle="Ranked by priority score"
        icon={ListChecks}
        flush
      >
        <DataTable
          columns={applicationColumns}
          data={applications}
          loading={loading}
          onRowClick={(a) => navigate(`/officer/applications/${a.id}`)}
          emptyMessage="No active applications in this region"
        />
      </Panel>

      <Modal isOpen={!!reassigning} onClose={() => setReassigning(null)} title="Reassign application">
        <div className="space-y-4">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <p className="text-[10px] font-bold uppercase text-slate-400">Application</p>
            <p className="font-semibold text-slate-900 text-sm mt-0.5">{reassigning?.application_number}</p>
          </div>

          <div>
            <label htmlFor="target-officer" className="block text-xs font-semibold text-slate-700 mb-1">New owner</label>
            <select
              id="target-officer"
              value={targetOfficer}
              onChange={(e) => setTargetOfficer(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-lg p-2.5"
            >
              <option value="">Select an officer…</option>
              {regionalOfficers.map((o) => (
                <option key={o.id} value={o.id}>{o.name} — {o.active_queue} open files</option>
              ))}
            </select>
          </div>

          {reassignError && (
            <p role="alert" className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{reassignError}</p>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setReassigning(null)}
              className="px-4 py-2 border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={reassignBusy}
              onClick={submitReassign}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg"
            >
              <UserCheck className="w-4 h-4" aria-hidden="true" />
              {reassignBusy ? 'Reassigning…' : 'Reassign'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
export default RegionalDashboard;
