import React, { useEffect, useState } from 'react';
import {
  CheckCircle2, Clock, CalendarPlus, CalendarClock, XCircle, Download, Building2, MapPin, Crown, Check, Flag
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { apiErrorMessage } from '../common/ErrorBanner';
import { useToast } from '../common/Toast';
import { evcService } from '../../services/evcService';
import { downloadVisitIcs } from '../../utils/ics';
import { daysUntil, istDateString } from '../../utils/dates';

const STEPS = [
  { key: 'PROPOSED', label: 'Proposed', icon: Clock },
  { key: 'CONFIRMED', label: 'Confirmed', icon: CheckCircle2 },
  { key: 'COMPLETED', label: 'Completed', icon: Flag },
];

const longDate = (iso) =>
  new Intl.DateTimeFormat('en-IN', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${iso}T00:00:00Z`));

function when(iso) {
  const n = daysUntil(iso);
  if (n === null) return '';
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  if (n === -1) return 'yesterday';
  return n > 0 ? `in ${n} days` : `${Math.abs(n)} days ago`;
}

const initials = (name = '') => name.replace(/^(Dr|Prof)\.?\s+/i, '').split(' ').map((w) => w[0]).slice(0, 2).join('');

/**
 * Everything about one visit, and what an officer can do with it: confirm, reschedule, cancel, mark it done,
 * or add it to a calendar. The server decides what is allowed; the buttons only offer what makes sense.
 */
export function VisitDetailModal({ visit, isOpen, onClose, onChanged }) {
  const toast = useToast();
  const [mode, setMode] = useState(null); // null | 'reschedule' | 'cancel'
  const [newDate, setNewDate] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setMode(null);
    setNewDate(visit?.scheduled_date || '');
    setReason('');
    setError(null);
  }, [isOpen, visit?.id, visit?.scheduled_date]);

  if (!visit) return null;

  const today = istDateString(new Date());
  const cancelled = visit.status === 'CANCELLED';
  const open = visit.status === 'PROPOSED' || visit.status === 'CONFIRMED';
  const stepIndex = STEPS.findIndex((s) => s.key === visit.status);
  const canComplete = visit.status === 'CONFIRMED' && visit.scheduled_date <= today;

  async function run(action, success) {
    setBusy(true);
    setError(null);
    try {
      const updated = await action();
      toast.success(success);
      setMode(null);
      onChanged(updated);
    } catch (err) {
      setError(apiErrorMessage(err, 'That did not work. Please try again.'));
    } finally {
      setBusy(false);
    }
  }

  function submitReschedule(e) {
    e.preventDefault();
    if (!newDate) return setError('Choose the new date.');
    if (newDate < today) return setError('The new date cannot be in the past.');
    if (new Date(`${newDate}T00:00:00Z`).getUTCDay() === 0) return setError('Visits cannot be scheduled on a Sunday.');
    if (newDate === visit.scheduled_date) return setError('That is already the visit date.');
    return run(() => evcService.rescheduleVisit(visit.id, newDate), `Visit moved to ${longDate(newDate)}. Confirm it again to lock in the committee.`);
  }

  function submitCancel(e) {
    e.preventDefault();
    if (reason.trim().length < 3) return setError('Give a short reason, at least a few words.');
    return run(() => evcService.cancelVisit(visit.id, reason.trim()), 'Visit cancelled.');
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Expert visit" maxWidth="max-w-2xl">
      <div className="space-y-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg">{visit.application_number}</span>
            {visit.region && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-md">
                <MapPin className="w-3 h-3" aria-hidden="true" /> {visit.region}
              </span>
            )}
          </div>
          <h3 className="mt-2 text-lg font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-slate-400 shrink-0" aria-hidden="true" /> {visit.institution_name}
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            {longDate(visit.scheduled_date)} <span className="text-slate-400">· {when(visit.scheduled_date)}</span>
          </p>
          {visit.remarks && <p className="mt-2 text-sm text-slate-500 whitespace-pre-line">{visit.remarks}</p>}
        </div>

        {cancelled ? (
          <div role="status" className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
            <XCircle className="w-4 h-4" aria-hidden="true" /> This visit was cancelled.
          </div>
        ) : (
          <ol className="flex items-center" aria-label="Visit progress">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const done = i < stepIndex || (i === stepIndex && visit.status === 'COMPLETED');
              const current = i === stepIndex && !done;
              return (
                <li key={s.key} className="flex-1 flex items-center" aria-current={current ? 'step' : undefined}>
                  <span className="flex flex-col items-center gap-1">
                    <span className={`w-9 h-9 rounded-full flex items-center justify-center transition ${
                      done ? 'bg-emerald-600 text-white' : current ? 'bg-white border-2 border-emerald-600 text-emerald-700 ring-4 ring-emerald-100' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {done ? <Check className="w-4 h-4" aria-hidden="true" /> : <Icon className="w-4 h-4" aria-hidden="true" />}
                    </span>
                    <span className={`text-[11px] font-semibold ${current ? 'text-emerald-800' : done ? 'text-slate-800' : 'text-slate-400'}`}>{s.label}</span>
                  </span>
                  {i < STEPS.length - 1 && <span className={`flex-1 h-0.5 mx-2 mb-5 rounded ${i < stepIndex ? 'bg-emerald-600' : 'bg-slate-200'}`} aria-hidden="true" />}
                </li>
              );
            })}
          </ol>
        )}

        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Committee of {visit.experts?.length || 0}</h4>
          <ul className="grid sm:grid-cols-2 gap-2.5">
            {visit.experts?.map((exp) => (
              <li key={exp.id} className={`flex items-center gap-3 p-3 rounded-xl border ${exp.is_lead ? 'bg-emerald-50/70 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                <span className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${exp.is_lead ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                  {initials(exp.name)}
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                    <span className="truncate">{exp.name}</span>
                    {exp.is_lead && <Crown className="w-3.5 h-3.5 text-emerald-700 shrink-0" aria-label="Lead" />}
                  </span>
                  <span className="block text-xs text-slate-500 truncate">{exp.affiliation || exp.email}</span>
                  <span className="block text-[11px] text-slate-400 truncate">{exp.specialization}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {error && <p role="alert" className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

        {mode === 'reschedule' && (
          <form onSubmit={submitReschedule} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3" noValidate>
            <label htmlFor="visit-new-date" className="block text-xs font-semibold text-slate-700">New date</label>
            <input id="visit-new-date" type="date" min={today} value={newDate} onChange={(e) => { setNewDate(e.target.value); setError(null); }}
              className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white" />
            <p className="text-[11px] text-slate-500">The visit goes back to "awaiting confirmation" and needs confirming again.</p>
            <div className="flex gap-2">
              <button type="submit" disabled={busy} className="px-4 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-lg">
                {busy ? 'Saving…' : 'Move visit'}
              </button>
              <button type="button" onClick={() => { setMode(null); setError(null); }} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-white rounded-lg">Back</button>
            </div>
          </form>
        )}

        {mode === 'cancel' && (
          <form onSubmit={submitCancel} className="rounded-xl border border-red-200 bg-red-50/60 p-4 space-y-3" noValidate>
            <label htmlFor="visit-cancel-reason" className="block text-xs font-semibold text-red-900">Why is it being cancelled?</label>
            <textarea id="visit-cancel-reason" rows={2} maxLength={1000} value={reason} onChange={(e) => { setReason(e.target.value); setError(null); }}
              className="w-full text-sm border border-red-200 rounded-lg px-3 py-2 bg-white" placeholder="e.g. Institution asked to postpone" />
            <div className="flex gap-2">
              <button type="submit" disabled={busy} className="px-4 py-2 text-sm font-semibold bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-lg">
                {busy ? 'Cancelling…' : 'Cancel this visit'}
              </button>
              <button type="button" onClick={() => { setMode(null); setError(null); }} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-white rounded-lg">Keep it</button>
            </div>
          </form>
        )}

        {mode === null && (
          <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-slate-100">
            {visit.status === 'PROPOSED' && (
              <button
                onClick={() => run(() => evcService.confirmVisit(visit.id), 'Visit confirmed. The committee is locked in.')}
                disabled={busy}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> Confirm visit
              </button>
            )}
            {visit.status === 'CONFIRMED' && (
              <button
                onClick={() => run(() => evcService.completeVisit(visit.id), 'Visit marked as completed.')}
                disabled={busy || !canComplete}
                title={canComplete ? undefined : 'A visit can only be completed on or after its date.'}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl shadow-sm"
              >
                <Flag className="w-4 h-4" aria-hidden="true" /> Mark completed
              </button>
            )}
            {open && (
              <>
                <button onClick={() => { setMode('reschedule'); setError(null); }} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-xl">
                  <CalendarClock className="w-4 h-4" aria-hidden="true" /> Reschedule
                </button>
                <button onClick={() => downloadVisitIcs(visit)} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-xl">
                  <Download className="w-4 h-4" aria-hidden="true" /> Add to calendar
                </button>
                <button onClick={() => { setMode('cancel'); setError(null); }} className="ml-auto inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 rounded-xl">
                  <XCircle className="w-4 h-4" aria-hidden="true" /> Cancel visit
                </button>
              </>
            )}
            {visit.status === 'CONFIRMED' && !canComplete && (
              <p className="basis-full text-[11px] text-slate-500 inline-flex items-center gap-1"><CalendarPlus className="w-3 h-3" aria-hidden="true" /> It can be marked completed from {longDate(visit.scheduled_date)}.</p>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
