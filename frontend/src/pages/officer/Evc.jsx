import React, { useState, useEffect } from 'react';
import { 
  CalendarCheck, Users, ShieldAlert, CheckCircle2, Clock, 
  MapPin, UserCheck, AlertTriangle, ChevronRight, PlusCircle, Building2
} from 'lucide-react';
import { evcService } from '../../services/evcService';
import { formatDate } from '../../utils/formatDate';
import { Modal } from '../../components/common/Modal';
import { KpiCard } from '../../components/common/KpiCard';
import { RoleHero } from '../../components/common/RoleHero';
import { useToast } from '../../components/common/Toast';
import { VisitStrip, dayKey } from '../../components/evc/VisitStrip';

export function Evc() {
  const toast = useToast();
  const [dayFilter, setDayFilter] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [visits, setVisits] = useState([]);
  const [experts, setExperts] = useState([]);
  const [activeTab, setActiveTab] = useState('visits'); // 'visits' | 'experts'
  const [loading, setLoading] = useState(true);

  // Wizard modal state
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState({
    id: 'e2222222-2222-2222-2222-222222222222',
    appNo: 'AICTE-2026-10002',
    institution: 'Pune College of Engineering & Research',
    region: 'WEST'
  });
  const [targetDate, setTargetDate] = useState('2026-11-12');
  const [committeeSize, setCommitteeSize] = useState(3);
  const [suggestedProposals, setSuggestedProposals] = useState(null);
  const [leadExpertId, setLeadExpertId] = useState('');
  const [remarks, setRemarks] = useState('Comprehensive infrastructure and lab verification');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clashWarning, setClashWarning] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [v, e] = await Promise.all([
        evcService.getVisits(),
        evcService.getExperts()
      ]);
      setVisits(v || []);
      setExperts(e || []);
    } catch (err) {
      console.error('Error loading EVC data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateProposal() {
    try {
      const proposals = await evcService.suggestCommittee({
        application_id: selectedApp.id,
        target_date: targetDate,
        committee_size: Number(committeeSize)
      });
      setSuggestedProposals(proposals);
      if (proposals && proposals.length > 0 && proposals[0].experts.length > 0) {
        setLeadExpertId(proposals[0].experts[0].id);
        setClashWarning(proposals[0].clash_detected || false);
      }
    } catch (err) {
      console.error('Failed to generate suggestions:', err);
    }
  }

  async function handleScheduleConfirm() {
    if (!suggestedProposals || suggestedProposals.length === 0) return;
    setIsSubmitting(true);
    try {
      const currentProp = suggestedProposals[0];
      const selectedExpertIds = currentProp.experts.map(exp => exp.id);
      const lead = currentProp.experts.find(exp => exp.id === leadExpertId);

      await evcService.scheduleVisit({
        application_id: selectedApp.id,
        application_number: selectedApp.appNo,
        institution_name: selectedApp.institution,
        region: selectedApp.region,
        scheduled_date: targetDate,
        expert_ids: selectedExpertIds,
        lead_expert_id: leadExpertId,
        lead_expert_name: lead ? `${lead.name} (${lead.affiliation})` : 'Lead Expert',
        remarks
      });

      setIsWizardOpen(false);
      setSuggestedProposals(null);
      toast.success(`EVC visit proposed for ${selectedApp.appNo}. Confirm it to lock in the committee.`);
      await loadData();
    } catch (err) {
      console.error('Failed to schedule visit:', err);
      toast.error(err?.response?.data?.error?.message || 'Could not schedule the visit.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConfirmVisit(visitId) {
    try {
      await evcService.confirmVisit(visitId);
      toast.success('Visit confirmed. The committee is locked in.');
      await loadData();
    } catch (err) {
      console.error('Failed to confirm visit:', err);
      toast.error(err?.response?.data?.error?.message || 'Could not confirm the visit.');
    }
  }

  const confirmedCount = visits.filter(v => v.status === 'CONFIRMED').length;
  const shownVisits = visits
    .filter((v) => statusFilter === 'ALL' || v.status === statusFilter)
    .filter((v) => !dayFilter || dayKey(new Date(v.scheduled_date)) === dayFilter)
    .sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));
  const nextVisit = [...visits].filter((v) => v.status !== 'COMPLETED' && v.status !== 'CANCELLED')
    .sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date))[0];
  const proposedCount = visits.filter(v => v.status === 'PROPOSED').length;

  return (
    <div className="space-y-6">
      <RoleHero
        loading={loading}
        context="EVC scheduler"
        summary={
          loading
            ? 'Loading the visit calendar…'
            : visits.length === 0
            ? 'No expert visits are scheduled yet. Nominate a committee to get started.'
            : `${confirmedCount} visit${confirmedCount === 1 ? ' is' : 's are'} confirmed and ${proposedCount} awaiting confirmation.${nextVisit ? ` Next up: ${nextVisit.institution_name} on ${formatDate(nextVisit.scheduled_date, false)}.` : ''}`
        }
        actions={[
          {
            label: 'Nominate & schedule a visit',
            icon: PlusCircle,
            primary: true,
            onClick: () => { setIsWizardOpen(true); handleGenerateProposal(); },
          },
        ]}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Scheduled visits" value={visits.length} subtitle="All upcoming and past" icon={CalendarCheck} variant="brand" loading={loading} />
        <KpiCard title="Confirmed" value={confirmedCount} subtitle="Committee locked in" icon={CheckCircle2} variant="success" loading={loading} />
        <KpiCard title="Awaiting confirmation" value={proposedCount} subtitle="Proposed, not yet sealed" icon={Clock} variant="warning" loading={loading} />
        <KpiCard title="Empanelled experts" value={experts.length} subtitle="In the roster" icon={Users} loading={loading} />
      </div>

      {!loading && visits.length > 0 && <VisitStrip visits={visits} selected={dayFilter} onSelect={setDayFilter} />}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-4">
        <button
          onClick={() => setActiveTab('visits')}
          className={`pb-3 text-sm font-bold border-b-2 transition ${
            activeTab === 'visits'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Scheduled Visits ({visits.length})
        </button>
        <button
          onClick={() => setActiveTab('experts')}
          className={`pb-3 text-sm font-bold border-b-2 transition ${
            activeTab === 'experts'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Experts Roster & Availability Pool ({experts.length})
        </button>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'visits' ? (
        <div className="space-y-4">
          {visits.length > 0 && (
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter visits by status">
              {['ALL', 'CONFIRMED', 'PROPOSED', 'COMPLETED'].map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  aria-pressed={statusFilter === f}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                    statusFilter === f ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
                  }`}
                >
                  {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
                </button>
              ))}
              {dayFilter && (
                <button onClick={() => setDayFilter(null)} className="px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Showing {dayFilter} · clear
                </button>
              )}
            </div>
          )}

          {visits.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-dashed border-slate-300 text-slate-500">
              No EVC visits scheduled yet. Use "Nominate & schedule a visit" to create one.
            </div>
          ) : shownVisits.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-dashed border-slate-300 text-slate-500">
              No visits match these filters.
            </div>
          ) : (
            shownVisits.map((visit) => {
              const isConfirmed = visit.status === 'CONFIRMED';
              const isCompleted = visit.status === 'COMPLETED';
              const when = new Date(visit.scheduled_date);
              const block = isCompleted
                ? 'from-slate-500 to-slate-700'
                : isConfirmed
                ? 'from-emerald-500 to-emerald-700'
                : 'from-amber-400 to-orange-500';
              const part = (opts) => new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', ...opts }).format(when);

              return (
                <article
                  key={visit.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-card hover:shadow-md hover:-translate-y-0.5 transition overflow-hidden flex flex-col sm:flex-row"
                >
                  <div className={`bg-gradient-to-br ${block} text-white sm:w-32 shrink-0 p-4 flex sm:flex-col items-center justify-center gap-3 sm:gap-0 text-center`}>
                    <span className="text-[11px] font-bold uppercase tracking-widest text-white/80">{part({ month: 'short' })}</span>
                    <span className="text-4xl font-extrabold leading-none tabular-nums">{part({ day: 'numeric' })}</span>
                    <span className="text-xs font-semibold text-white/90 sm:mt-1">{part({ weekday: 'long' })}</span>
                    <span className="text-[11px] text-white/75">{part({ hour: 'numeric', minute: '2-digit', hour12: true })} IST</span>
                  </div>

                  <div className="flex-1 p-5 min-w-0">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                      <div className="space-y-2 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg">{visit.application_number}</span>
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-md">
                            <MapPin className="w-3 h-3" aria-hidden="true" /> {visit.region}
                          </span>
                          <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-md ${
                            isCompleted ? 'bg-slate-100 text-slate-700' : isConfirmed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {isCompleted ? <CheckCircle2 className="w-3 h-3" aria-hidden="true" /> : isConfirmed ? <CheckCircle2 className="w-3 h-3" aria-hidden="true" /> : <Clock className="w-3 h-3" aria-hidden="true" />}
                            {isCompleted ? 'Completed' : isConfirmed ? 'Confirmed' : 'Awaiting confirmation'}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                          <Building2 className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                          <span className="truncate">{visit.institution_name}</span>
                        </h3>
                        {visit.remarks && <p className="text-xs text-slate-500">{visit.remarks}</p>}
                      </div>

                      {!isConfirmed && !isCompleted && (
                        <button
                          onClick={() => handleConfirmVisit(visit.id)}
                          className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-sm transition"
                        >
                          <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> Confirm visit
                        </button>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex -space-x-2" aria-hidden="true">
                          {visit.experts?.map((exp, idx) => (
                            <span
                              key={exp.id || idx}
                              className={`w-9 h-9 rounded-full border-2 border-white flex items-center justify-center text-[11px] font-bold ${
                                exp.is_lead ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {exp.name.replace(/^(Dr|Prof)\.?\s+/i, '').split(' ').map((w) => w[0]).slice(0, 2).join('')}
                            </span>
                          ))}
                        </div>
                        <span className="text-xs font-bold text-slate-700">
                          Committee of {visit.experts?.length || 0}
                        </span>
                      </div>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
                        {visit.experts?.map((exp, idx) => (
                          <li
                            key={exp.id || idx}
                            className={`p-2.5 rounded-xl border text-xs ${
                              exp.is_lead ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' : 'bg-slate-50 border-slate-200/80 text-slate-800'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold truncate">{exp.name}</span>
                              {exp.is_lead && (
                                <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 bg-emerald-200 text-emerald-800 rounded">Lead</span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">{exp.affiliation}</p>
                            <p className="text-[10px] text-slate-400 italic mt-0.5">{exp.specialization}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      ) : (
        /* Experts Pool Table */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="text-sm font-bold text-slate-900">National AICTE Experts Roster</h3>
              <p className="text-xs text-slate-500">Autonomous balancing preventing committee member overload and bias</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-3">Expert Name</th>
                  <th className="px-4 py-3">Affiliation / University</th>
                  <th className="px-4 py-3">Specialization</th>
                  <th className="px-4 py-3">Region</th>
                  <th className="px-4 py-3">Current Load</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {experts.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-bold text-slate-900">
                      {exp.name}
                      <span className="block text-[11px] font-normal text-slate-400">{exp.email}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-medium">{exp.affiliation}</td>
                    <td className="px-4 py-3 text-slate-600">{exp.specialization}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-semibold rounded">
                        {exp.region}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className={`h-full ${exp.load_count >= exp.max_load ? 'bg-rose-500' : 'bg-emerald-500'}`}
                            style={{ width: `${(exp.load_count / exp.max_load) * 100}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-bold text-slate-600">
                          {exp.load_count}/{exp.max_load}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {exp.is_available ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          <UserCheck className="w-3 h-3" /> Available
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                          <ShieldAlert className="w-3 h-3" /> Clashed/Unavailable
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Schedule Committee Wizard Modal */}
      <Modal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        title="Nominate & Schedule EVC Committee"
        size="lg"
      >
        <div className="space-y-5">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <span className="text-xs font-bold text-slate-500 uppercase">Target Application</span>
            <div className="flex items-center justify-between mt-1">
              <div>
                <span className="font-bold text-slate-900 text-sm">{selectedApp.institution}</span>
                <span className="text-xs text-slate-500 block">{selectedApp.appNo} · Region: {selectedApp.region}</span>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg">
                Stage: EVC
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Proposed Inspection Date</label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Committee Size</label>
              <select
                value={committeeSize}
                onChange={(e) => setCommitteeSize(Number(e.target.value))}
                className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value={2}>2 Members (Standard Extension)</option>
                <option value={3}>3 Members (New Course / Intake Increase)</option>
                <option value={4}>4 Members (Establishment of New Institution)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Inspection Terms / Scope</label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              placeholder="e.g. Laboratory verification, faculty Aadhaar authentication, library holdings"
            />
          </div>

          <div className="flex justify-between items-center pt-2">
            <span className="text-xs font-bold text-slate-800">AICTE Autonomous Nomination Engine</span>
            <button
              type="button"
              onClick={handleGenerateProposal}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition"
            >
              Re-calculate Suggestions
            </button>
          </div>

          {/* Proposal Preview Box */}
          {suggestedProposals && suggestedProposals.length > 0 && (
            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Recommended Committee Roster:</span>
                {clashWarning ? (
                  <span className="text-[11px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> 409 EVC_CLASH Detected
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> No Schedule Clashes
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {suggestedProposals[0].experts.map((exp) => (
                  <label 
                    key={exp.id}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer ${
                      leadExpertId === exp.id 
                        ? 'bg-emerald-50 border-emerald-300' 
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="leadExpert"
                        checked={leadExpertId === exp.id}
                        onChange={() => setLeadExpertId(exp.id)}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <div>
                        <span className="font-bold text-slate-900">{exp.name}</span>
                        <span className="text-slate-500 block text-[11px]">{exp.affiliation} · {exp.specialization}</span>
                      </div>
                    </div>
                    {leadExpertId === exp.id && (
                      <span className="text-[10px] font-black uppercase text-emerald-800 bg-emerald-200 px-1.5 py-0.5 rounded">
                        Selected as Lead
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsWizardOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmitting || !suggestedProposals}
              onClick={handleScheduleConfirm}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-xs"
            >
              {isSubmitting ? 'Scheduling...' : 'Confirm Schedule & Issue Letters'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
export default Evc;
