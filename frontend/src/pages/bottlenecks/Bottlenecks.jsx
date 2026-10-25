import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, Grid3x3, AlertTriangle, Layers, ChevronRight, Trophy } from 'lucide-react';
import { reportsService } from '../../services/reportsService';
import { RoleHero } from '../../components/common/RoleHero';
import { KpiCard } from '../../components/common/KpiCard';
import { Panel } from '../../components/common/Panel';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorBanner, apiErrorMessage } from '../../components/common/ErrorBanner';
import { BottleneckHeatmap, HeatmapLegend } from '../../components/charts/BottleneckHeatmap';
import { healthSegments } from '../../utils/health';

export function Bottlenecks() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows((await reportsService.getBottlenecks()) || []);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not load the bottleneck report.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const totals = useMemo(() => {
    const pending = rows.reduce((a, r) => a + r.pending_count, 0);
    const late = rows.reduce((a, r) => a + r.breach_count, 0);
    return { pending, late, cells: rows.filter((r) => r.pending_count > 0).length };
  }, [rows]);

  // The worst places to be: most late applications first, then the longest average wait.
  const hotSpots = useMemo(
    () => rows
      .filter((r) => r.breach_count > 0)
      .sort((a, b) => b.breach_count - a.breach_count || b.avg_days_in_stage - a.avg_days_in_stage)
      .slice(0, 3),
    [rows]
  );

  const openList = ({ stage, region }) => navigate(`/officer/applications?${new URLSearchParams({ stage, region })}`);

  const summary = loading
    ? 'Loading the bottleneck picture…'
    : totals.late === 0
    ? 'Nothing is late in any stage or region right now.'
    : `${totals.late} of ${totals.pending} open applications are late. The biggest pile-up is ${hotSpots[0].stage_name.toLowerCase()} in the ${hotSpots[0].region.toLowerCase()} region.`;

  return (
    <div className="space-y-6 animate-fadeIn">
      <RoleHero
        loading={loading}
        context="Stage × region"
        summary={summary}
        health={healthSegments({ open: totals.pending, overdue: totals.late })}
        actions={[{ label: 'See overdue files', icon: Flame, to: '/officer/applications?filter=overdue', primary: true }]}
      />

      {error && <ErrorBanner message={error} onRetry={load} />}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard title="Open applications" value={totals.pending} subtitle="Across every stage and region" icon={Layers} loading={loading} />
        <KpiCard title="Late" value={totals.late} subtitle="Past their stage deadline" icon={AlertTriangle} variant="danger" loading={loading} />
        <KpiCard title="Busy cells" value={totals.cells} subtitle="Stage and region pairs with open files" icon={Grid3x3} variant="brand" loading={loading} />
      </div>

      {!loading && hotSpots.length > 0 && (
        <Panel title="Hot spots" subtitle="Where the most applications are late. Click one to open its list." icon={Trophy}>
          <ol className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {hotSpots.map((h, i) => (
              <li key={`${h.stage_code}-${h.region}`}>
                <button
                  onClick={() => openList({ stage: h.stage_code, region: h.region })}
                  className="group w-full text-left rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 to-white p-4 hover:shadow-md hover:-translate-y-0.5 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="w-7 h-7 rounded-full bg-red-600 text-white text-xs font-extrabold flex items-center justify-center" aria-label={`Rank ${i + 1}`}>{i + 1}</span>
                    <span className="text-[11px] font-bold text-red-800 bg-red-100 px-2 py-0.5 rounded-full">{h.breach_rate_pct}% late</span>
                  </div>
                  <p className="mt-3 text-sm font-bold text-slate-900">{h.stage_name}</p>
                  <p className="text-xs text-slate-500">{h.region} region · {h.pending_count} open · {h.avg_days_in_stage} days on average</p>
                  <p className="mt-2 text-xs font-semibold text-red-800 inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                    {h.breach_count} late <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </p>
                </button>
              </li>
            ))}
          </ol>
        </Panel>
      )}

      <Panel
        title="Bottleneck heatmap"
        subtitle="Open applications and how many are late, by stage and region. Click a cell to open its list."
        icon={Grid3x3}
        actions={<HeatmapLegend />}
      >
        {loading ? (
          <div className="skeleton h-64 w-full" />
        ) : rows.length === 0 ? (
          <EmptyState title="No bottleneck data yet" text="The heatmap appears once there are open applications." />
        ) : (
          <BottleneckHeatmap rows={rows} onCellClick={openList} />
        )}
      </Panel>
    </div>
  );
}
