import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Building2, Clock, AlertTriangle, UploadCloud, Check, FileText, CheckCircle2,
  PauseCircle, Hourglass
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { applicationsService } from '../../services/applicationsService';
import { undertakingsService } from '../../services/undertakingsService';
import { documentsService } from '../../services/documentsService';
import { formatDate } from '../../utils/formatDate';
import { daysUntil } from '../../utils/dates';
import { Modal } from '../../components/common/Modal';
import { Panel } from '../../components/common/Panel';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ErrorBanner, apiErrorMessage } from '../../components/common/ErrorBanner';

// The process stages, as shown to an applicant. Names here are placeholders for the configured workflow.
const STAGES = [
  { code: 'SUBMITTED', name: 'Submitted' },
  { code: 'SCRUTINY', name: 'Document scrutiny' },
  { code: 'RE_SCRUTINY', name: 'Re-scrutiny' },
  { code: 'EVC', name: 'Expert visit' },
  { code: 'REGIONAL_COMMITTEE', name: 'Regional committee' },
  { code: 'SAC_SHC', name: 'Hearing (SAC/SHC)' },
  { code: 'DECIDED', name: 'Decision' },
];

const EXPIRING_STATUSES = ['EXPIRING', 'EXPIRING_SOON', 'EXPIRED'];

/** A storage path must be relative: no web links, no leading slash, no "..". Mirrors the API check. */
function validateStoragePath(value) {
  const path = value.trim();
  if (!path) return 'Enter the storage path of the uploaded file.';
  if (path.startsWith('/') || path.includes('://') || path.replace(/\\/g, '/').split('/').includes('..')) {
    return 'Use a relative storage path such as "affidavits/lease-2026.pdf", not a link.';
  }
  return null;
}

function dueLabel(days) {
  if (days === null) return { text: 'No due date', tone: 'bg-slate-100 text-slate-600 border-slate-200' };
  if (days < 0) return { text: `${Math.abs(days)}d overdue`, tone: 'bg-red-50 text-red-700 border-red-200' };
  if (days === 0) return { text: 'Due today', tone: 'bg-amber-50 text-amber-800 border-amber-200' };
  return { text: `${days}d left`, tone: days <= 7 ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200' };
}

export function InstitutionDashboard() {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [undertakings, setUndertakings] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeUndertaking, setActiveUndertaking] = useState(null);
  const [evidencePath, setEvidencePath] = useState('');
  const [remarks, setRemarks] = useState('');
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [apps, u, d] = await Promise.all([
        applicationsService.getApplications({ page_size: 50 }),
        undertakingsService.getUndertakings(),
        documentsService.getDocuments(),
      ]);
      const items = apps?.items || [];
      setApplications(items);
      setSelectedId((current) => (items.some((a) => a.id === current) ? current : items[0]?.id ?? null));
      setUndertakings(u || []);
      setDocuments(d || []);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not load your application.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const application = applications.find((a) => a.id === selectedId) || null;
  const stageIndex = STAGES.findIndex((s) => s.code === application?.current_stage_code);

  const myUndertakings = useMemo(
    () => undertakings.filter((u) => !application || !u.application_id || u.application_id === application.id),
    [undertakings, application]
  );
  const actionable = myUndertakings.filter((u) => u.status === 'PENDING' || u.status === 'OVERDUE');
  const waiting = myUndertakings.filter((u) => u.status === 'SUBMITTED');

  const expiringDocs = documents
    .filter((d) => EXPIRING_STATUSES.includes(d.status))
    .map((d) => ({ ...d, daysLeft: daysUntil(d.valid_until) }));

  function openEvidence(u) {
    setActiveUndertaking(u);
    setEvidencePath('');
    setRemarks('');
    setFormError(null);
  }

  async function handleEvidenceSubmit(e) {
    e.preventDefault();
    const problem = validateStoragePath(evidencePath);
    if (problem) {
      setFormError(problem);
      return;
    }
    setIsSubmitting(true);
    setFormError(null);
    try {
      await undertakingsService.submitEvidence(activeUndertaking.id, { document_path: evidencePath.trim(), remarks: remarks.trim() || undefined });
      setActiveUndertaking(null);
      await loadData();
    } catch (err) {
      setFormError(apiErrorMessage(err, 'Could not submit the evidence. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6" role="status" aria-label="Loading your application">
        <div className="skeleton h-32 w-full" />
        <div className="skeleton h-40 w-full" />
        <div className="grid lg:grid-cols-2 gap-6"><div className="skeleton h-56" /><div className="skeleton h-56" /></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-900 text-white rounded-2xl p-6 sm:p-8 shadow-md">
        <div className="absolute -top-20 -right-16 w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl" aria-hidden="true" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs uppercase tracking-widest mb-2">
              <Building2 className="w-4 h-4" aria-hidden="true" /> Applicant portal
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">
              {application?.institution_name || user?.full_name || 'Your institution'}
            </h1>
            {application && (
              <p className="text-slate-300 text-sm mt-1.5">
                Application <span className="font-semibold text-white">{application.application_number}</span>
                {application.application_type && <> · {application.application_type.replace(/_/g, ' ').toLowerCase()}</>}
                {application.created_at && <> · filed {formatDate(application.created_at, false)}</>}
              </p>
            )}
          </div>
          {application && (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {applications.length > 1 && (
                <>
                  <label htmlFor="application-select" className="sr-only">Choose application</label>
                  <select
                    id="application-select"
                    value={selectedId || ''}
                    onChange={(e) => setSelectedId(e.target.value)}
                    className="text-sm bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2"
                  >
                    {applications.map((a) => (
                      <option key={a.id} value={a.id} className="text-slate-900">{a.application_number}</option>
                    ))}
                  </select>
                </>
              )}
              {application.decision ? (
                <span className="px-3.5 py-1.5 bg-white/10 border border-white/20 font-semibold text-xs rounded-xl">
                  Decision recorded: {application.decision.replace(/_/g, ' ')}
                </span>
              ) : application.is_on_hold ? (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500/20 text-amber-200 border border-amber-400/30 font-semibold text-xs rounded-xl">
                  <PauseCircle className="w-3.5 h-3.5" aria-hidden="true" /> On hold
                </span>
              ) : (
                <span className="px-3.5 py-1.5 bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 font-semibold text-xs rounded-xl">
                  Under process
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={loadData} />}

      {!application && !error && (
        <Panel>
          <div className="text-center py-10">
            <FileText className="w-8 h-8 text-slate-300 mx-auto" aria-hidden="true" />
            <h2 className="mt-3 text-base font-semibold text-slate-900">No application filed yet</h2>
            <p className="text-sm text-slate-500 mt-1">Once your application is registered, its progress will appear here.</p>
          </div>
        </Panel>
      )}

      {application?.is_on_hold && application.hold_reason && (
        <div role="status" className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <PauseCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-sm text-amber-900"><span className="font-semibold">On hold:</span> {application.hold_reason}</p>
        </div>
      )}

      {application && (
        <Panel
          title="Where your application stands"
          subtitle={stageIndex >= 0 ? `Current stage: ${STAGES[stageIndex].name}` : undefined}
        >
          <ol className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
            {STAGES.map((stage, idx) => {
              const isPast = stageIndex >= 0 && (idx < stageIndex || (application.decision && idx === stageIndex));
              const isCurrent = idx === stageIndex && !application.decision;
              return (
                <li key={stage.code} className="flex flex-col items-center text-center" aria-current={isCurrent ? 'step' : undefined}>
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition ${
                      isPast
                        ? 'bg-emerald-600 text-white'
                        : isCurrent
                        ? 'bg-emerald-100 border-2 border-emerald-600 text-emerald-800 ring-4 ring-emerald-50'
                        : 'bg-white border border-slate-200 text-slate-400'
                    }`}
                  >
                    {isPast ? <Check className="w-4 h-4" aria-hidden="true" /> : idx + 1}
                  </div>
                  <span className={`text-[11px] font-semibold mt-2.5 ${isCurrent ? 'text-emerald-700' : isPast ? 'text-slate-800' : 'text-slate-400'}`}>
                    {stage.name}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5">
                    {isPast ? 'Completed' : isCurrent ? 'In review' : 'Upcoming'}
                  </span>
                </li>
              );
            })}
          </ol>
        </Panel>
      )}

      {application && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Panel
            title={`Commitments to fulfil (${actionable.length})`}
            subtitle="Evidence AICTE is waiting for from you"
            icon={Clock}
          >
            {actionable.length === 0 && waiting.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">Nothing is due from you right now.</p>
            ) : (
              <ul className="space-y-3">
                {actionable.map((u) => {
                  const due = dueLabel(daysUntil(u.due_date));
                  return (
                    <li key={u.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-semibold text-slate-900">{u.title}</span>
                        <span className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${due.tone}`}>{due.text}</span>
                      </div>
                      {u.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{u.description}</p>}
                      {u.remarks && u.status === 'PENDING' && u.verified_at && (
                        <p className="mt-2 text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5">
                          Returned by officer: {u.remarks}
                        </p>
                      )}
                      <div className="mt-3 flex items-center justify-between pt-3 border-t border-slate-200/70">
                        <span className="text-xs text-slate-500">Due {formatDate(u.due_date, false)}</span>
                        <button
                          onClick={() => openEvidence(u)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition"
                        >
                          <UploadCloud className="w-3.5 h-3.5" aria-hidden="true" /> Submit evidence
                        </button>
                      </div>
                    </li>
                  );
                })}
                {waiting.map((u) => (
                  <li key={u.id} className="p-4 rounded-xl border border-slate-200 bg-white">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-900">{u.title}</span>
                      <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-indigo-50 text-indigo-700 border-indigo-200">
                        <Hourglass className="w-3 h-3" aria-hidden="true" /> Awaiting verification
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Submitted {formatDate(u.submitted_at, false)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel
            title={`Documents needing attention (${expiringDocs.length})`}
            subtitle="Certificates that are expiring or have expired"
            icon={AlertTriangle}
          >
            {expiringDocs.length === 0 ? (
              <div className="flex flex-col items-center text-center py-6">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" aria-hidden="true" />
                <p className="text-sm text-slate-500 mt-2">All your documents are valid.</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {expiringDocs.map((doc) => {
                  const expired = doc.status === 'EXPIRED' || (doc.daysLeft !== null && doc.daysLeft < 0);
                  return (
                    <li key={doc.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-sm font-semibold text-slate-900 block truncate">{doc.title}</span>
                          <span className="text-[10px] uppercase font-bold text-slate-400">{doc.document_type?.replace(/_/g, ' ')}</span>
                        </div>
                        <StatusBadge
                          status={expired ? 'EXPIRED' : 'EXPIRING'}
                          label={expired ? 'Expired' : doc.daysLeft !== null ? `Expires in ${doc.daysLeft}d` : 'Expiring'}
                        />
                      </div>
                      <div className="mt-3 flex items-center justify-between pt-3 border-t border-slate-200/70 text-xs">
                        <span className="text-slate-500">Valid until {formatDate(doc.valid_until, false)}</span>
                        <span className="font-semibold text-emerald-700">Renewal required</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>
      )}

      <Modal isOpen={!!activeUndertaking} onClose={() => setActiveUndertaking(null)} title="Submit evidence">
        <form onSubmit={handleEvidenceSubmit} className="space-y-4" noValidate>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Commitment</p>
            <p className="font-semibold text-slate-900 text-sm mt-0.5">{activeUndertaking?.title}</p>
          </div>

          <div>
            <label htmlFor="evidence-path" className="block text-xs font-semibold text-slate-700 mb-1">
              Storage path of the uploaded file <span className="text-red-600">*</span>
            </label>
            <input
              id="evidence-path"
              type="text"
              value={evidencePath}
              onChange={(e) => setEvidencePath(e.target.value)}
              placeholder="affidavits/lease-2026.pdf"
              aria-invalid={!!formError}
              aria-describedby="evidence-hint"
              className="w-full text-sm border border-slate-200 rounded-lg p-2.5"
            />
            <p id="evidence-hint" className="text-[11px] text-slate-400 mt-1">Upload the file to your documents storage first, then enter its path here.</p>
          </div>

          <div>
            <label htmlFor="evidence-remarks" className="block text-xs font-semibold text-slate-700 mb-1">Remarks (optional)</label>
            <textarea
              id="evidence-remarks"
              rows={3}
              maxLength={2000}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Notarised affidavit and payment receipts attached."
              className="w-full text-sm border border-slate-200 rounded-lg p-2.5"
            />
          </div>

          {formError && (
            <p role="alert" className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</p>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setActiveUndertaking(null)}
              className="px-4 py-2 border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg"
            >
              {isSubmitting ? 'Submitting…' : 'Submit to AICTE'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
export default InstitutionDashboard;
