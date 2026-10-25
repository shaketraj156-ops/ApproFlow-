import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Search, AlertTriangle, CheckCircle2, Users, Sparkles, CalendarDays } from 'lucide-react';
import { Modal } from '../common/Modal';
import { StatusBadge } from '../common/StatusBadge';
import { apiErrorMessage } from '../common/ErrorBanner';
import { useToast } from '../common/Toast';
import { applicationsService } from '../../services/applicationsService';
import { evcService } from '../../services/evcService';
import { istDateString } from '../../utils/dates';

const STEPS = ['Application', 'Date & committee', 'Choose a slot'];

const SIZES = [
  { value: 2, label: '2 members', hint: 'Standard extension' },
  { value: 3, label: '3 members', hint: 'New course or intake increase' },
  { value: 4, label: '4 members', hint: 'New institution' },
];

const longDate = (iso) =>
  new Intl.DateTimeFormat('en-IN', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${iso}T00:00:00Z`));
const initials = (name = '') => name.replace(/^(Dr|Prof)\.?\s+/i, '').split(' ').map((w) => w[0]).slice(0, 2).join('');
const isSunday = (iso) => new Date(`${iso}T00:00:00Z`).getUTCDay() === 0;

/** Three steps: pick the application, say when, then choose from the dates on which a full committee is free. */
export function ScheduleWizard({ isOpen, onClose, onScheduled, initialDate }) {
  const toast = useToast();
  const today = istDateString(new Date());

  const [step, setStep] = useState(0);
  const [apps, setApps] = useState([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [appId, setAppId] = useState('');
  const [date, setDate] = useState(today);
  const [size, setSize] = useState(3);
  const [scope, setScope] = useState('');
  const [proposals, setProposals] = useState(null);
  const [picked, setPicked] = useState(0);
  const [leadId, setLeadId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // Every time the wizard opens it starts over, on the day that was clicked if there was one.
  useEffect(() => {
    if (!isOpen) return;
    setStep(0);
    setQuery('');
    setAppId('');
    setDate(initialDate && initialDate >= today ? initialDate : today);
    setSize(3);
    setScope('');
    setProposals(null);
    setPicked(0);
    setLeadId('');
    setError(null);
    setAppsLoading(true);
    applicationsService.getApplications({ page_size: 100 })
      .then((res) => {
        const open = (res?.items || []).filter((a) => !a.decision);
        setApps(open);
        const first = open.find((a) => a.current_stage_code === 'EVC') || open[0];
        if (first) setAppId(first.id);
      })
      .catch((err) => setError(apiErrorMessage(err, 'Could not load applications.')))
      .finally(() => setAppsLoading(false));
  }, [isOpen, initialDate, today]);

  const app = apps.find((a) => a.id === appId);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return apps.filter((a) => !q || a.application_number.toLowerCase().includes(q) || (a.institution_name || '').toLowerCase().includes(q));
  }, [apps, query]);
  const proposal = proposals?.[picked];

  async function findCommittees() {
    if (!date || date < today) return setError('Pick today or a later date.');
    setBusy(true);
    setError(null);
    try {
      const found = await evcService.suggestCommittee({ application_id: appId, target_date: date, committee_size: size });
      setProposals(found);
      setPicked(0);
      setLeadId(found[0]?.experts[0]?.id || '');
      setStep(2);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not look for committees.'));
    } finally {
      setBusy(false);
    }
  }

  function pick(index) {
    setPicked(index);
    setLeadId(proposals[index].experts[0]?.id || '');
  }

  async function schedule() {
    setBusy(true);
    setError(null);
    try {
      const visit = await evcService.scheduleVisit({
        application_id: app.id,
        application_number: app.application_number,
        institution_name: app.institution_name,
        region: app.region,
        scheduled_date: proposal.scheduled_date,
        expert_ids: proposal.experts.map((e) => e.id),
        lead_expert_id: leadId,
        remarks: scope.trim() || undefined,
      });
      toast.success(`Visit proposed for ${app.application_number} on ${longDate(proposal.scheduled_date)}. Confirm it to lock in the committee.`);
      onScheduled(visit);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not schedule the visit.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nominate & schedule a visit" maxWidth="max-w-2xl">
      <div className="space-y-5">
        <ol className="flex items-center" aria-label="Steps">
          {STEPS.map((label, i) => (
            <li key={label} className="flex-1 flex items-center" aria-current={i === step ? 'step' : undefined}>
              <span className="flex items-center gap-2">
                <span className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center transition ${
                  i < step ? 'bg-emerald-600 text-white' : i === step ? 'bg-emerald-100 text-emerald-800 ring-2 ring-emerald-500' : 'bg-slate-100 text-slate-400'
                }`}>
                  {i < step ? <Check className="w-3.5 h-3.5" aria-hidden="true" /> : i + 1}
                </span>
                <span className={`hidden sm:block text-xs font-semibold ${i === step ? 'text-slate-900' : 'text-slate-400'}`}>{label}</span>
              </span>
              {i < STEPS.length - 1 && <span className={`flex-1 h-0.5 mx-3 rounded ${i < step ? 'bg-emerald-600' : 'bg-slate-200'}`} aria-hidden="true" />}
            </li>
          ))}
        </ol>

        {error && <p role="alert" className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

        {step === 0 && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
              <input
                type="search" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search applications"
                placeholder="Search by number or institution"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl placeholder:text-slate-400"
              />
            </div>
            <ul role="radiogroup" aria-label="Application" className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {appsLoading && [0, 1, 2].map((i) => <li key={i} className="skeleton h-14" />)}
              {!appsLoading && shown.length === 0 && <li className="text-sm text-slate-500 text-center py-8">No open applications match.</li>}
              {shown.map((a) => (
                <li key={a.id}>
                  <button
                    type="button" role="radio" aria-checked={a.id === appId} onClick={() => setAppId(a.id)}
                    className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border transition ${
                      a.id === appId ? 'border-emerald-500 bg-emerald-50/70 ring-1 ring-emerald-500' : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${a.id === appId ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'}`}>
                      {a.id === appId && <Check className="w-3 h-3 text-white" aria-hidden="true" />}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-bold text-slate-900">{a.application_number}</span>
                      <span className="block text-xs text-slate-500 truncate">{a.institution_name} · {a.region}</span>
                    </span>
                    <StatusBadge status={a.current_stage_code} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {step === 1 && app && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="min-w-0">
                <span className="block text-sm font-bold text-slate-900 truncate">{app.institution_name}</span>
                <span className="block text-xs text-slate-500">{app.application_number} · {app.region} region</span>
              </span>
              <StatusBadge status={app.current_stage_code} />
            </div>

            <div>
              <label htmlFor="wiz-date" className="block text-xs font-semibold text-slate-700 mb-1">Earliest date for the visit</label>
              <input id="wiz-date" type="date" min={today} value={date} onChange={(e) => { setDate(e.target.value); setError(null); }}
                className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white" />
              {date && isSunday(date) && <p className="mt-1 text-[11px] text-amber-700">That is a Sunday. The engine will look from the next working day.</p>}
            </div>

            <fieldset>
              <legend className="block text-xs font-semibold text-slate-700 mb-2">Committee size</legend>
              <div className="grid sm:grid-cols-3 gap-2">
                {SIZES.map((s) => (
                  <label key={s.value} className={`cursor-pointer p-3 rounded-xl border transition ${size === s.value ? 'border-emerald-500 bg-emerald-50/70 ring-1 ring-emerald-500' : 'border-slate-200 hover:border-slate-300'}`}>
                    <input type="radio" name="wiz-size" className="sr-only" checked={size === s.value} onChange={() => setSize(s.value)} />
                    <span className="flex items-center gap-1.5 text-sm font-bold text-slate-900"><Users className="w-4 h-4 text-slate-400" aria-hidden="true" />{s.label}</span>
                    <span className="block text-[11px] text-slate-500 mt-0.5">{s.hint}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
              <label htmlFor="wiz-scope" className="block text-xs font-semibold text-slate-700 mb-1">Scope of the visit (optional)</label>
              <input id="wiz-scope" type="text" maxLength={300} value={scope} onChange={(e) => setScope(e.target.value)}
                placeholder="e.g. Laboratory verification, faculty records, library"
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2" />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            {proposals?.length === 0 ? (
              <div className="text-center py-8 px-4 rounded-xl border border-dashed border-slate-300">
                <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto" aria-hidden="true" />
                <p className="mt-2 text-sm font-bold text-slate-900">No full committee is free in the next two weeks</p>
                <p className="text-xs text-slate-500 mt-1">Try a smaller committee or a later start date. Experts must be in the {app?.region.toLowerCase()} region, available, and under their visit limit.</p>
              </div>
            ) : (
              <>
                <p className="text-xs text-slate-500 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" /> Dates when a full committee is free, with the least-loaded experts first.</p>
                <ul role="radiogroup" aria-label="Available slots" className="space-y-2.5">
                  {proposals.map((p, i) => {
                    const selected = i === picked;
                    return (
                      <li key={p.scheduled_date}>
                        <div
                          role="radio" tabIndex={0} aria-checked={selected} onClick={() => pick(i)}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(i); } }}
                          className={`rounded-xl border p-4 cursor-pointer transition ${selected ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="flex items-center gap-2 text-sm font-bold text-slate-900"><CalendarDays className="w-4 h-4 text-emerald-600" aria-hidden="true" />{longDate(p.scheduled_date)}</span>
                            {p.clash_detected ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full"><AlertTriangle className="w-3 h-3" aria-hidden="true" />Clash</span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full"><CheckCircle2 className="w-3 h-3" aria-hidden="true" />No clashes</span>
                            )}
                          </div>
                          <ul className="mt-3 grid sm:grid-cols-2 gap-2">
                            {p.experts.map((e) => (
                              <li key={e.id} className="flex items-center gap-2.5 text-xs">
                                <span className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center font-bold ${selected && leadId === e.id ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'}`}>{initials(e.name)}</span>
                                <span className="min-w-0 flex-1">
                                  <span className="block font-semibold text-slate-900 truncate">{e.name}</span>
                                  <span className="block text-slate-500 truncate">{e.affiliation || e.specialization}</span>
                                </span>
                                {selected && (
                                  <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 cursor-pointer">
                                    <input type="radio" name="wiz-lead" checked={leadId === e.id} onChange={() => setLeadId(e.id)} className="text-emerald-600" aria-label={`Make ${e.name} the lead`} />
                                    Lead
                                  </label>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100">
          <button
            type="button" onClick={step === 0 ? onClose : () => { setStep(step - 1); setError(null); }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
          >
            {step === 0 ? 'Cancel' : <><ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back</>}
          </button>

          {step === 0 && (
            <button type="button" disabled={!appId} onClick={() => { setStep(1); setError(null); }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl">
              Next <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
          {step === 1 && (
            <button type="button" disabled={busy} onClick={findCommittees}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl">
              {busy ? 'Looking…' : <>Find committees <Sparkles className="w-4 h-4" aria-hidden="true" /></>}
            </button>
          )}
          {step === 2 && proposals?.length > 0 && (
            <button type="button" disabled={busy || !proposal || !leadId} onClick={schedule}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl">
              {busy ? 'Scheduling…' : <>Schedule visit <Check className="w-4 h-4" aria-hidden="true" /></>}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
