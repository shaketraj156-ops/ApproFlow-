import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, MapPin, Clock, CalendarCheck, ChevronRight, Activity,
  Layers, Sparkles, Filter, Grid3x3
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LabelList
} from 'recharts';
import { reportsService } from '../../services/reportsService';
import { applicationsService } from '../../services/applicationsService';
import { KpiCard } from '../../components/common/KpiCard';
import { RoleHero } from '../../components/common/RoleHero';
import { healthSegments } from '../../utils/health';
import { Panel } from '../../components/common/Panel';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { BottleneckHeatmap, HeatmapLegend } from '../../components/charts/BottleneckHeatmap';
import { ErrorBanner, apiErrorMessage } from '../../components/common/ErrorBanner';

const RISK_THRESHOLD = Number(import.meta.env.VITE_RISK_TAG_THRESHOLD) || 0.7;
const tooltipStyle = { borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(15,23,42,0.12)', fontSize: 12 };


export function NationalDashboard() {
  const navigate = useNavigate();
  const [regionalSummary, setRegionalSummary] = useState([]);
  const [atRiskApps, setAtRiskApps] = useState([]);
  const [funnel, setFunnel] = useState([]);
  const [bottlenecks, setBottlenecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [reg, apps, fnl, btl] = await Promise.all([
        reportsService.getRegionalSummary(),
        applicationsService.getApplications({ page_size: 100 }),
        reportsService.getFunnel(),
        reportsService.getBottlenecks(),
      ]);
      setRegionalSummary(reg || []);
      setFunnel(fnl || []);
      setBottlenecks(btl || []);
      const items = apps?.items || [];
      setAtRiskApps(
        items
          .filter((a) => !a.decision && a.delay_risk_score >= RISK_THRESHOLD)
          .sort((a, b) => b.delay_risk_score - a.delay_risk_score)
      );
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not load national data.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Every national figure is a sum of the regional rows, so the cards and the table always agree.
  const totals = useMemo(() => {
    const sum = (key) => regionalSummary.reduce((acc, r) => acc + (r[key] || 0), 0);
    const withDays = regionalSummary.filter((r) => r.avg_days > 0);
    const pending = sum('pending_count');
    const overdue = sum('overdue_count');
    return {
      pending,
      overdue,
      breachRate: pending ? `${((overdue / pending) * 100).toFixed(1)}%` : '0%',
      evc: sum('evc_scheduled'),
      highRisk: sum('high_risk_count'),
      avgDays: withDays.length ? (withDays.reduce((a, r) => a + r.avg_days, 0) / withDays.length).toFixed(1) : null,
    };
  }, [regionalSummary]);

  const openList = (params) => navigate(`/officer/applications?${new URLSearchParams(params)}`);

  const regionColumns = [
    {
      header: 'Region',
      render: (r) => (
        <span className="inline-flex items-center gap-1.5 font-semibold text-slate-900">
          <MapPin className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
          {r.region}
        </span>
      ),
    },
    { header: 'Open applications', render: (r) => <span className="font-bold tabular-nums text-slate-900">{r.pending_count}</span> },
    {
      header: 'SLA overdue',
      render: (r) => (
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
          r.overdue_count > 0 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
        }`}>
          {r.overdue_count}
        </span>
      ),
    },
    { header: 'EVC visits', render: (r) => <span className="tabular-nums text-slate-700">{r.evc_scheduled}</span> },
    { header: 'Avg per stage', render: (r) => <span className="tabular-nums text-slate-700">{r.avg_days ? `${r.avg_days} d` : '—'}</span> },
    {
      header: 'May need attention',
      render: (r) => (
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-purple-50 text-purple-700 border-purple-200">
          {r.high_risk_count}
        </span>
      ),
    },
    {
      header: '',
      className: 'text-right',
      render: (r) => (
        <button
          onClick={(e) => { e.stopPropagation(); navigate(`/region/dashboard?region=${encodeURIComponent(r.region)}`); }}
          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-800"
        >
          Regional view <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      <RoleHero
        loading={loading}
        context="All regions"
        summary={
          loading
            ? 'Loading the national picture…'
            : totals.pending === 0
            ? 'There are no open applications right now.'
            : `${totals.overdue} of ${totals.pending} open applications are overdue nationwide, and ${totals.highRisk} may need a push.`
        }
        health={healthSegments({ open: totals.pending, overdue: totals.overdue })}
        actions={[
          { label: 'See overdue files', icon: AlertTriangle, to: '/officer/applications?filter=overdue', primary: true },
          { label: 'Bottlenecks', icon: Grid3x3, to: '/bottlenecks' },
        ]}
      />

      {error && <ErrorBanner message={error} onRetry={loadData} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard title="Open applications" value={totals.pending} subtitle="All regions" icon={Layers} loading={loading} />
        <KpiCard title="SLA overdue" value={totals.overdue} subtitle={`${totals.breachRate} of open files`} icon={AlertTriangle} variant="danger" loading={loading} />
        <KpiCard title="EVC visits" value={totals.evc} subtitle="Confirmed, upcoming" icon={CalendarCheck} variant="brand" loading={loading} />
        <KpiCard title="Avg per stage" value={totals.avgDays ? `${totals.avgDays} d` : '—'} subtitle="Mean of regional averages" icon={Clock} loading={loading} />
        <KpiCard title="May need attention" value={totals.highRisk} subtitle={`Delay hint ≥ ${Math.round(RISK_THRESHOLD * 100)}%`} icon={Sparkles} variant="warning" loading={loading} />
      </div>

      <Panel
        title="Pipeline funnel"
        subtitle="Applications at each stage. Click a bar to open that stage's list."
        icon={Filter}
      >
        {loading ? (
          <div className="skeleton h-72 w-full" />
        ) : funnel.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-10">No pipeline data yet.</p>
        ) : (
          <figure aria-label="Bar chart of applications at each stage">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnel} layout="vertical" margin={{ left: 8, right: 36, top: 4, bottom: 4 }}>
                  <CartesianGrid horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="stage_name" width={170} tick={{ fontSize: 12, fill: '#334155' }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={tooltipStyle} formatter={(value) => [value, 'Applications']} />
                  <Bar
                    dataKey="application_count"
                    radius={[0, 8, 8, 0]}
                    barSize={22}
                    cursor="pointer"
                    animationDuration={500}
                    onClick={(row) => row?.stage_code && row.stage_code !== 'DECIDED' && openList({ stage: row.stage_code })}
                  >
                    {funnel.map((row) => <Cell key={row.stage_code} fill={row.stage_code === 'DECIDED' ? '#475569' : '#059669'} />)}
                    <LabelList dataKey="application_count" position="right" style={{ fontSize: 12, fontWeight: 700, fill: '#0f172a' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <figcaption className="sr-only">{funnel.map((r) => `${r.stage_name}: ${r.application_count}`).join('. ')}</figcaption>
          </figure>
        )}
      </Panel>

      <Panel
        title="Bottleneck heatmap"
        subtitle="Open applications and how many are late, by stage and region. Darker means a higher share is late. Click a cell to open its list."
        icon={Grid3x3}
        actions={<HeatmapLegend />}
        flush
      >
        {loading ? (
          <div className="p-5"><div className="skeleton h-64 w-full" /></div>
        ) : bottlenecks.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-10">No bottleneck data yet.</p>
        ) : (
          <div className="p-3">
            <BottleneckHeatmap rows={bottlenecks} onCellClick={openList} />
          </div>
        )}
      </Panel>

      <Panel
        title="Regional comparison"
        subtitle="Pendency, deadline breaches and inspections by region"
        icon={MapPin}
        flush
      >
        <DataTable
          columns={regionColumns}
          data={regionalSummary.map((r) => ({ ...r, id: r.region }))}
          loading={loading}
          onRowClick={(r) => navigate(`/region/dashboard?region=${encodeURIComponent(r.region)}`)}
          emptyMessage="No regional data yet"
        />
      </Panel>

      <Panel
        title="Files that may need attention"
        subtitle={`Open applications whose delay hint is ${Math.round(RISK_THRESHOLD * 100)}% or higher. A prompt to look, not a judgement.`}
        icon={Sparkles}
      >
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => <div key={i} className="skeleton h-24" />)}
          </div>
        ) : atRiskApps.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">Nothing is flagged right now.</p>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {atRiskApps.map((app) => (
              <li key={app.id} className="p-4 rounded-2xl border border-purple-200 bg-purple-50/40">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{app.application_number}</p>
                    <p className="text-[11px] text-slate-500">{app.region}</p>
                  </div>
                  <span className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                    {Math.round(app.delay_risk_score * 100)}%
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-purple-200/60 flex items-center justify-between">
                  <StatusBadge status={app.current_stage_code} />
                  <button
                    onClick={() => navigate(`/officer/applications/${app.id}`)}
                    className="text-xs font-semibold text-purple-700 hover:text-purple-900 inline-flex items-center gap-1"
                  >
                    Open file <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
export default NationalDashboard;
