import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BellRing, ListChecks, Layers, PauseCircle, CheckCircle2 } from 'lucide-react';
import { applicationsService } from '../../services/applicationsService';
import { workflowService } from '../../services/workflowService';
import { alertsService } from '../../services/alertsService';
import { SlaChip } from '../../components/common/SlaChip';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PriorityPill } from '../../components/common/PriorityPill';
import { DelayRiskTag } from '../../components/common/DelayRiskTag';
import { SeverityBadge } from '../../components/common/SeverityBadge';
import { Panel } from '../../components/common/Panel';
import { EmptyState } from '../../components/common/EmptyState';
import { Skeleton, SkeletonCard } from '../../components/common/Skeleton';
import { ErrorBanner, apiErrorMessage } from '../../components/common/ErrorBanner';
import { useToast } from '../../components/common/Toast';
import { StageTimeline } from '../../components/applications/StageTimeline';
import { MoveStageModal } from '../../components/applications/MoveStageModal';
import { allowedNextStages } from '../../utils/moveStage';
import { formatDate } from '../../utils/formatDate';

const TABS = [
  { key: 'progress', label: 'Progress', icon: Layers },
  { key: 'alerts', label: 'Alerts', icon: BellRing },
];

export function ApplicationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [app, setApp] = useState(null);
  const [stages, setStages] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('progress');
  const [moveOpen, setMoveOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [appData, stageData, alertData] = await Promise.all([
        applicationsService.getApplicationById(id),
        workflowService.getStages(),
        // All statuses, so the Alerts tab shows the full history for this application.
        Promise.all(['OPEN', 'ACKNOWLEDGED', 'RESOLVED'].map((status) => alertsService.getAlerts({ status, entity_id: id }))),
      ]);
      setApp(appData);
      setStages([...stageData].sort((a, b) => a.sequence_order - b.sequence_order));
      setAlerts(alertData.flat().sort((a, b) => b.created_at.localeCompare(a.created_at)));
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not load this application.'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const back = (
    <button
      onClick={() => navigate(-1)}
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 transition"
    >
      <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back
    </button>
  );

  if (loading) {
    return (
      <div className="space-y-6" role="status" aria-label="Loading application">
        {back}
        <SkeletonCard lines={2} />
        <Skeleton className="h-28 w-full" />
        <SkeletonCard lines={4} />
      </div>
    );
  }

  if (error || !app) {
    return (
      <div className="space-y-6">
        {back}
        <ErrorBanner message={error || 'Application not found.'} onRetry={load} />
      </div>
    );
  }

  const decided = !!app.decision;
  const canMove = !decided && !app.is_on_hold && allowedNextStages(stages, app.current_stage_code).length > 0;
  const currentStage = stages.find((s) => s.code === app.current_stage_code);
  const openAlerts = alerts.filter((a) => a.status !== 'RESOLVED').length;

  function handleMoved(updated, target) {
    setApp(updated);
    setMoveOpen(false);
    toast.success(`${updated.application_number} moved to ${target?.name || updated.current_stage_code}.`);
    load(); // the move changes this application's alerts
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {back}
        <div className="flex items-center gap-3">
          <SlaChip daysLeft={app.days_left} onHold={app.is_on_hold} />
          {canMove && (
            <button
              onClick={() => setMoveOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow-sm transition"
            >
              Move to next stage <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {app.is_on_hold && (
        <div role="status" className="flex items-start gap-3 rounded-2xl border border-slate-300 bg-slate-100 px-4 py-3">
          <PauseCircle className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-sm text-slate-800"><span className="font-semibold">On hold:</span> {app.hold_reason || 'No reason recorded.'} Resume it before moving stages.</p>
        </div>
      )}
      {decided && (
        <div role="status" className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-sm text-emerald-900"><span className="font-semibold">Decision recorded:</span> {app.decision.replace(/_/g, ' ').toLowerCase()}. No further moves are possible.</p>
        </div>
      )}

      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-emerald-950 to-emerald-700 text-white p-6 sm:p-7 rounded-3xl shadow-lg ring-1 ring-white/10">
        <div className="absolute -top-20 -right-16 w-72 h-72 rounded-full" style={{ background: 'radial-gradient(closest-side, rgba(255,255,255,0.14), transparent)' }} aria-hidden="true" />
        <div className="relative flex flex-col md:flex-row md:items-start justify-between gap-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{app.application_number}</h1>
              <StatusBadge status={app.current_stage_code} />
              <DelayRiskTag score={app.delay_risk_score} />
            </div>
            <p className="text-sm text-white/70 mt-1.5">
              {app.institution_name && <><strong className="text-white">{app.institution_name}</strong> · </>}
              {app.region} region · {app.application_type?.replace(/_/g, ' ').toLowerCase()}
            </p>
          </div>
          <dl className="flex items-center gap-4 sm:gap-6 shrink-0">
            <div className="rounded-2xl bg-white/10 border border-white/15 px-4 py-2.5">
              <dt className="text-[11px] font-medium text-white/60">Priority</dt>
              <dd className="mt-1"><PriorityPill score={app.priority_score} /></dd>
            </div>
            <div className="rounded-2xl bg-white/10 border border-white/15 px-4 py-2.5">
              <dt className="text-[11px] font-medium text-white/60">Deficiencies</dt>
              <dd className="mt-0.5 text-xl font-bold text-white tabular-nums">{app.deficiency_count}</dd>
            </div>
            <div className="rounded-2xl bg-white/10 border border-white/15 px-4 py-2.5">
              <dt className="text-[11px] font-medium text-white/60">Intake</dt>
              <dd className="mt-0.5 text-xl font-bold text-white tabular-nums">{app.intake_requested}</dd>
            </div>
          </dl>
        </div>

        <div className="relative mt-7 pt-6 border-t border-white/10 rounded-2xl bg-white p-5 -mx-1">
          <StageTimeline stages={stages} currentCode={app.current_stage_code} decided={decided} onHold={app.is_on_hold} />
        </div>
      </section>

      <div role="tablist" aria-label="Application sections" className="inline-flex flex-wrap gap-1 p-1 rounded-2xl bg-white border border-slate-200 shadow-card">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            role="tab"
            id={`tab-${key}`}
            aria-selected={tab === key}
            aria-controls={`panel-${key}`}
            onClick={() => setTab(key)}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold transition rounded-xl ${
              tab === key ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/25' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Icon className="w-4 h-4" aria-hidden="true" /> {label}
            {key === 'alerts' && alerts.length > 0 && (
              <span className="px-1.5 min-w-5 text-center rounded-full bg-slate-200 text-slate-700 text-[11px] font-bold">{openAlerts || alerts.length}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'progress' && (
        <div role="tabpanel" id="panel-progress" aria-labelledby="tab-progress">
          <Panel title="Where this application is" icon={ListChecks} subtitle="Stage rules come from the workflow configuration">
            {currentStage ? (
              <dl className="grid sm:grid-cols-3 gap-5 text-sm">
                <div><dt className="text-xs text-slate-400">Current stage</dt><dd className="mt-0.5 font-semibold text-slate-900">{currentStage.name}</dd></div>
                <div><dt className="text-xs text-slate-400">Stage deadline</dt><dd className="mt-0.5 font-semibold text-slate-900">{currentStage.sla_days} days</dd></div>
                <div><dt className="text-xs text-slate-400">Owner role</dt><dd className="mt-0.5 font-semibold text-slate-900">{currentStage.owner_role?.replace(/_/g, ' ').toLowerCase()}</dd></div>
                <div className="sm:col-span-3">
                  <dt className="text-xs text-slate-400">Can move to</dt>
                  <dd className="mt-1 flex flex-wrap gap-2">
                    {allowedNextStages(stages, app.current_stage_code).map((s) => (
                      <span key={s.code} className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">{s.name}</span>
                    ))}
                    {allowedNextStages(stages, app.current_stage_code).length === 0 && <span className="text-slate-500">End of the workflow</span>}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-slate-500">This stage is not in the current workflow configuration.</p>
            )}
          </Panel>
        </div>
      )}

      {tab === 'alerts' && (
        <div role="tabpanel" id="panel-alerts" aria-labelledby="tab-alerts">
          {alerts.length === 0 ? (
            <EmptyState icon={BellRing} title="No alerts for this application" text="Reminders and escalations appear here when a deadline gets close or passes." />
          ) : (
            <ul className="space-y-3">
              {alerts.map((alt) => (
                <li key={alt.id} className="p-4 rounded-2xl border border-slate-200 bg-white shadow-card">
                  <div className="flex flex-wrap items-center gap-2">
                    <SeverityBadge severity={alt.severity} />
                    <StatusBadge status={alt.status} />
                    <span className="text-xs text-slate-400">{formatDate(alt.created_at, true)}</span>
                  </div>
                  <p className="mt-2 text-sm font-bold text-slate-900">{alt.title}</p>
                  <p className="text-sm text-slate-600 mt-0.5">{alt.message}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <MoveStageModal isOpen={moveOpen} onClose={() => setMoveOpen(false)} application={app} stages={stages} onMoved={handleMoved} />
    </div>
  );
}
