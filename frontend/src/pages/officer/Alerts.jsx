import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BellOff, BellRing, CheckCheck, Check, ArrowUpRight } from 'lucide-react';
import { alertsService } from '../../services/alertsService';
import { PageHeader } from '../../components/common/PageHeader';
import { SeverityBadge } from '../../components/common/SeverityBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { SkeletonCard } from '../../components/common/Skeleton';
import { ErrorBanner, apiErrorMessage } from '../../components/common/ErrorBanner';
import { useToast } from '../../components/common/Toast';
import { formatDate } from '../../utils/formatDate';

const TABS = [
  { key: 'OPEN', label: 'Open' },
  { key: 'ACKNOWLEDGED', label: 'Acknowledged' },
  { key: 'RESOLVED', label: 'Resolved' },
];

const EMPTY_TEXT = {
  OPEN: ['No open alerts', 'Every application and compliance deadline is currently within its limits.'],
  ACKNOWLEDGED: ['Nothing acknowledged', 'Alerts you acknowledge are kept here until the cause is resolved.'],
  RESOLVED: ['Nothing resolved yet', 'Alerts close themselves once the cause is gone, and appear here.'],
};

export function Alerts() {
  const toast = useToast();
  const [tab, setTab] = useState('OPEN');
  const [alerts, setAlerts] = useState([]);
  const [counts, setCounts] = useState({ OPEN: null, ACKNOWLEDGED: null, RESOLVED: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [ackAllBusy, setAckAllBusy] = useState(false);

  const load = useCallback(async (status) => {
    setLoading(true);
    setError(null);
    try {
      const [list, ...lists] = await Promise.all([
        alertsService.getAlerts({ status }),
        ...TABS.map((t) => alertsService.getAlerts({ status: t.key })),
      ]);
      setAlerts(list);
      setCounts(Object.fromEntries(TABS.map((t, i) => [t.key, lists[i].length])));
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not load alerts.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(tab); }, [tab, load]);

  async function act(alert, action) {
    setBusyId(alert.id);
    try {
      if (action === 'ack') {
        await alertsService.acknowledgeAlert(alert.id);
        toast.success('Alert acknowledged. It moved to the Acknowledged tab.');
      } else {
        await alertsService.resolveAlert(alert.id);
        toast.success('Alert marked as resolved.');
      }
      await load(tab);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not update the alert.'));
    } finally {
      setBusyId(null);
    }
  }

  async function acknowledgeAll() {
    const targets = alerts;
    setAckAllBusy(true);
    let done = 0;
    try {
      for (const alert of targets) {
        await alertsService.acknowledgeAlert(alert.id);
        done += 1;
      }
      toast.success(`${done} alert${done === 1 ? '' : 's'} acknowledged.`);
    } catch (err) {
      toast.error(`${apiErrorMessage(err, 'Could not acknowledge every alert.')} ${done} of ${targets.length} were acknowledged.`);
    } finally {
      setAckAllBusy(false);
      await load(tab);
    }
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageHeader
        icon={BellRing}
        title="Alerts center"
        description="Deadline reminders, SLA breaches and widening escalations"
        actions={tab === 'OPEN' && alerts.length > 1 && (
          <button
            onClick={acknowledgeAll}
            disabled={ackAllBusy}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-60 rounded-xl transition"
          >
            <CheckCheck className="w-4 h-4" aria-hidden="true" /> {ackAllBusy ? 'Acknowledging…' : `Acknowledge all (${alerts.length})`}
          </button>
        )}
      />

      <div role="tablist" aria-label="Alert status" className="inline-flex flex-wrap gap-1 p-1 rounded-2xl bg-white border border-slate-200 shadow-card">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            role="tab"
            id={`alerts-tab-${key}`}
            aria-selected={tab === key}
            aria-controls="alerts-panel"
            onClick={() => setTab(key)}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold transition rounded-xl ${
              tab === key ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/25' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {label}
            {counts[key] !== null && (
              <span className={`px-1.5 min-w-5 text-center rounded-full text-[11px] font-bold ${tab === key ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700'}`}>
                {counts[key]}
              </span>
            )}
          </button>
        ))}
      </div>

      <div id="alerts-panel" role="tabpanel" aria-labelledby={`alerts-tab-${tab}`} className="space-y-3">
        {error && <ErrorBanner message={error} onRetry={() => load(tab)} />}

        {loading && !error && [0, 1, 2].map((i) => <SkeletonCard key={i} lines={2} label="Loading alerts" />)}

        {!loading && !error && alerts.length === 0 && (
          <EmptyState icon={tab === 'OPEN' ? CheckCheck : BellOff} title={EMPTY_TEXT[tab][0]} text={EMPTY_TEXT[tab][1]} />
        )}

        {!loading && !error && alerts.map((alt) => (
          <article key={alt.id} className={`p-5 rounded-2xl border border-slate-200 border-l-4 ${['CRITICAL', 'HIGH'].includes(alt.severity?.toUpperCase()) ? 'border-l-red-500 bg-gradient-to-r from-red-50/60 to-white' : alt.severity?.toUpperCase() === 'MEDIUM' ? 'border-l-amber-400 bg-gradient-to-r from-amber-50/60 to-white' : 'border-l-emerald-400 bg-gradient-to-r from-emerald-50/50 to-white'} shadow-card card-lift flex flex-col md:flex-row md:items-center justify-between gap-4`}>
            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <SeverityBadge severity={alt.severity} />
                <span className="text-xs font-medium text-slate-500">{alt.rule_code?.replace(/_/g, ' ').toLowerCase()}</span>
                <span className="text-xs text-slate-400">{formatDate(alt.created_at, true)}</span>
              </div>
              <h2 className="text-sm font-bold text-slate-900">{alt.title}</h2>
              <p className="text-sm text-slate-600 leading-relaxed">{alt.message}</p>
              {alt.entity_type === 'APPLICATION' && (
                <Link to={`/officer/applications/${alt.entity_id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900">
                  Open application <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                </Link>
              )}
            </div>

            {tab !== 'RESOLVED' && (
              <div className="flex gap-2 shrink-0">
                {tab === 'OPEN' && (
                  <button
                    onClick={() => act(alt, 'ack')}
                    disabled={busyId === alt.id}
                    aria-label={`Acknowledge alert: ${alt.title}`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl transition"
                  >
                    <Check className="w-4 h-4" aria-hidden="true" /> Acknowledge
                  </button>
                )}
                <button
                  onClick={() => act(alt, 'resolve')}
                  disabled={busyId === alt.id}
                  aria-label={`Mark resolved: ${alt.title}`}
                  className="px-3.5 py-2 text-sm font-semibold border border-slate-300 hover:bg-slate-50 disabled:opacity-60 text-slate-700 rounded-xl transition"
                >
                  Resolve
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
