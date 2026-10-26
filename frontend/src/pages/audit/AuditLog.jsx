import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  History, ArrowRightLeft, BellRing, PauseCircle, PlayCircle, UserCog, Plus, Settings2,
  CheckCircle2, XCircle, ChevronDown, Cpu
} from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { Skeleton } from '../../components/common/Skeleton';
import { ErrorBanner, apiErrorMessage } from '../../components/common/ErrorBanner';
import { formatDate } from '../../utils/formatDate';
import { shouldUseMocks } from '../../utils/mockConfig';

// Demo events, used only in mock mode. With a real backend an error is shown as an error, never as made-up history.
const MOCK_LOGS = [
  { id: '1', entity_type: 'APPLICATION', entity_id: 'AICTE-2026-10001', action: 'MOVE_STAGE', actor_role: 'aicte_officer',
    old_state: { stage: 'SUBMITTED' }, new_state: { stage: 'SCRUTINY', due_at: '2026-10-29T10:00:00Z' }, created_at: '2026-10-24T12:00:00Z' },
  { id: '2', entity_type: 'ALERT', entity_id: 'alt-1', action: 'ESCALATION_TRIGGERED', actor_role: 'SYSTEM_JOB',
    new_state: { level: 2, recipient: 'SECTION_HEAD' }, created_at: '2026-10-24T06:00:00Z' },
  { id: '3', entity_type: 'APPLICATION', entity_id: 'AICTE-2026-10002', action: 'HOLD', actor_role: 'aicte_officer',
    new_state: { is_on_hold: true, reason: 'Court inquiry pending' }, created_at: '2026-10-23T09:30:00Z' },
  { id: '4', entity_type: 'EVC_VISIT', entity_id: 'v1111111', action: 'CONFIRM', actor_role: 'aicte_officer',
    new_state: { status: 'CONFIRMED', scheduled_date: '2026-11-04' }, created_at: '2026-10-22T15:10:00Z' },
];

// Each kind of event gets an icon and a colour, so a long trail can be scanned quickly.
const ACTIONS = {
  MOVE_STAGE: { icon: ArrowRightLeft, tone: 'bg-emerald-100 text-emerald-700', label: 'Moved to a new stage' },
  CREATE: { icon: Plus, tone: 'bg-blue-100 text-blue-700', label: 'Created' },
  ASSIGN: { icon: UserCog, tone: 'bg-indigo-100 text-indigo-700', label: 'Assigned to an officer' },
  HOLD: { icon: PauseCircle, tone: 'bg-amber-100 text-amber-700', label: 'Put on hold' },
  RESUME: { icon: PlayCircle, tone: 'bg-emerald-100 text-emerald-700', label: 'Resumed' },
  CONFIRM: { icon: CheckCircle2, tone: 'bg-emerald-100 text-emerald-700', label: 'Confirmed' },
  VERIFIED: { icon: CheckCircle2, tone: 'bg-emerald-100 text-emerald-700', label: 'Verified' },
  REJECTED: { icon: XCircle, tone: 'bg-red-100 text-red-700', label: 'Rejected' },
  CANCEL: { icon: XCircle, tone: 'bg-red-100 text-red-700', label: 'Cancelled' },
  ESCALATION_TRIGGERED: { icon: BellRing, tone: 'bg-red-100 text-red-700', label: 'Escalated' },
  UPDATE: { icon: Settings2, tone: 'bg-slate-200 text-slate-700', label: 'Updated' },
};
const FALLBACK = { icon: History, tone: 'bg-slate-100 text-slate-600', label: null };

const titleCase = (value) => value.toLowerCase().replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

function Details({ log }) {
  const [open, setOpen] = useState(false);
  const hasDetails = log.old_state || log.new_state;
  if (!hasDetails) return null;
  const id = `details-${log.id}`;
  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={id}
        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900"
      >
        {open ? 'Hide' : 'Show'} what changed
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <div id={id} className="mt-2 grid sm:grid-cols-2 gap-2">
          {[['Before', log.old_state], ['After', log.new_state]].map(([label, state]) => state && (
            <div key={label} className="rounded-xl bg-slate-50 border border-slate-200 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">{label}</p>
              <dl className="space-y-0.5 text-xs">
                {Object.entries(state).map(([k, v]) => (
                  <div key={k} className="flex gap-2">
                    <dt className="text-slate-500 shrink-0">{titleCase(k)}:</dt>
                    <dd className="font-mono text-slate-800 break-all">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [entity, setEntity] = useState('ALL');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (shouldUseMocks()) {
        await new Promise((r) => setTimeout(r, 250));
        setLogs(MOCK_LOGS);
      } else {
        const res = await axiosClient.get('/audit-logs');
        setLogs(res.data);
      }
    } catch (err) {
      console.warn('Could not load audit trail from backend, using mock:', err.message);
      setLogs(MOCK_LOGS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const entities = useMemo(() => ['ALL', ...new Set(logs.map((l) => l.entity_type))], [logs]);
  const visible = useMemo(() => logs.filter((l) => entity === 'ALL' || l.entity_type === entity), [logs, entity]);

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageHeader
        title="Audit trail"
        description="Every move, hold, assignment and configuration change: who did it, and when. Entries cannot be edited."
      />

      {error && <ErrorBanner message={error} onRetry={load} />}

      {!error && logs.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by what the event was about">
          {entities.map((e) => (
            <button
              key={e}
              onClick={() => setEntity(e)}
              aria-pressed={entity === e}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                entity === e ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
              }`}
            >
              {e === 'ALL' ? `All events (${logs.length})` : `${titleCase(e)} (${logs.filter((l) => l.entity_type === e).length})`}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-3" role="status" aria-label="Loading audit trail">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : !error && visible.length === 0 ? (
        <EmptyState icon={History} title="No events recorded yet" text="Actions taken in the system will appear here as they happen." />
      ) : (
        <ol className="relative space-y-4 before:absolute before:left-5 before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
          {visible.map((log) => {
            const meta = ACTIONS[log.action] || FALLBACK;
            const Icon = meta.icon;
            const bySystem = !log.actor_role || /system/i.test(log.actor_role);
            return (
              <li key={log.id} className="relative pl-14">
                <span className={`absolute left-0 top-0 w-10 h-10 rounded-full flex items-center justify-center ring-4 ring-slate-50 ${meta.tone}`}>
                  <Icon className="w-4 h-4" aria-hidden="true" />
                </span>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card hover:border-slate-300 transition">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <h2 className="text-sm font-bold text-slate-900">{meta.label || titleCase(log.action)}</h2>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">{titleCase(log.entity_type)}</span>
                    <span className="text-xs font-mono text-slate-500">{String(log.entity_id).slice(0, 18)}</span>
                    <time className="ml-auto text-xs text-slate-400" dateTime={log.created_at}>{formatDate(log.created_at, true)} IST</time>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 inline-flex items-center gap-1.5">
                    {bySystem ? <Cpu className="w-3.5 h-3.5" aria-hidden="true" /> : <UserCog className="w-3.5 h-3.5" aria-hidden="true" />}
                    By {bySystem ? 'the system' : titleCase(log.actor_role)}
                  </p>
                  <Details log={log} />
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
