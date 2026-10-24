import React, { useState, useEffect } from 'react';
import { 
  CalendarCheck, Users, ShieldAlert, CheckCircle2, Clock, 
  MapPin, UserCheck, AlertTriangle, ChevronRight, PlusCircle, Building2
} from 'lucide-react';
import { evcService } from '../../services/evcService';
import { formatDate } from '../../utils/formatDate';
import { Modal } from '../../components/common/Modal';

export function Evc() {
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
      await loadData();
    } catch (err) {
      console.error('Failed to schedule visit:', err);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConfirmVisit(visitId) {
    try {
      await evcService.confirmVisit(visitId);
      await loadData();
    } catch (err) {
      console.error('Failed to confirm visit:', err);
    }
  }

  const confirmedCount = visits.filter(v => v.status === 'CONFIRMED').length;
  const proposedCount = visits.filter(v => v.status === 'PROPOSED').length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <CalendarCheck className="w-7 h-7 text-emerald-600" />
            Expert Visit Committee (EVC) Scheduler
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            AICTE physical site inspections, peer expert committee nomination & clash detection
          </p>
        </div>
        <button
          onClick={() => {
            setIsWizardOpen(true);
            handleGenerateProposal();
          }}
          className="inline-flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-xs transition"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Nominate & Schedule Visit</span>
        </button>
      </div>

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Scheduled Visits</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{visits.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <CalendarCheck className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Confirmed Ready</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{confirmedCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Awaiting Confirmation</p>
            <p className="text-2xl font-black text-amber-600 mt-1">{proposedCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Empanelled Experts</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{experts.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
        </div>
      </div>

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
          {visits.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-400">
              No EVC visits scheduled yet. Click "Nominate & Schedule Visit" to create one.
            </div>
          ) : (
            visits.map((visit) => {
              const isConfirmed = visit.status === 'CONFIRMED';
              const isCompleted = visit.status === 'COMPLETED';

              return (
                <div 
                  key={visit.id} 
                  className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:border-slate-300 transition"
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-xs font-black px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg">
                          {visit.application_number}
                        </span>
                        <span className="text-xs font-semibold px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-md">
                          {visit.region} REGION
                        </span>
                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md ${
                          isCompleted ? 'bg-slate-100 text-slate-700' :
                          isConfirmed ? 'bg-emerald-100 text-emerald-800' : 
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {visit.status}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-slate-400" />
                        {visit.institution_name}
                      </h3>

                      <p className="text-xs text-slate-500">
                        {visit.remarks}
                      </p>
                    </div>

                    <div className="flex flex-col md:items-end gap-2">
                      <div className="text-right">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase block">Visit Target Date (IST)</span>
                        <span className="text-sm font-bold text-slate-900">{formatDate(visit.scheduled_date)}</span>
                      </div>

                      {!isConfirmed && !isCompleted && (
                        <button
                          onClick={() => handleConfirmVisit(visit.id)}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition"
                        >
                          Confirm & Seal Visit
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Experts List in this visit */}
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      Appointed Committee Members:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                      {visit.experts?.map((exp, idx) => (
                        <div 
                          key={exp.id || idx}
                          className={`p-2.5 rounded-xl border text-xs ${
                            exp.is_lead 
                              ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900' 
                              : 'bg-slate-50 border-slate-200/80 text-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold">{exp.name}</span>
                            {exp.is_lead && (
                              <span className="text-[10px] font-black uppercase px-1.5 py-0.5 bg-emerald-200 text-emerald-800 rounded">
                                LEAD
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">{exp.affiliation}</p>
                          <p className="text-[10px] text-slate-400 italic mt-0.5">{exp.specialization}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
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
