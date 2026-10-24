import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, ArrowRight, CheckCircle2, Clock, AlertTriangle, 
  FileText, Shield, Calendar, Send 
} from 'lucide-react';
import { applicationsService } from '../../services/applicationsService';
import { workflowService } from '../../services/workflowService';
import { SlaChip } from '../../components/common/SlaChip';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { formatDate } from '../../utils/formatDate';

export function ApplicationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [app, setApp] = useState(null);
  const [stages, setStages] = useState([]);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [targetStage, setTargetStage] = useState('');
  const [remarks, setRemarks] = useState('');
  const [decision, setDecision] = useState('APPROVED');
  const [activeTab, setActiveTab] = useState('timeline');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function load() {
      const [appData, stageData] = await Promise.all([
        applicationsService.getApplicationById(id),
        workflowService.getStages()
      ]);
      setApp(appData);
      setStages(stageData);
    }
    load();
  }, [id]);

  if (!app) {
    return <div className="p-8 text-center text-slate-500">Loading application details...</div>;
  }

  const currentStageObj = stages.find(s => s.code === app.current_stage_code);
  const allowedNext = currentStageObj?.next_stages || [];

  const handleMove = async (e) => {
    e.preventDefault();
    if (!targetStage) return;
    try {
      setErrorMsg('');
      const updated = await applicationsService.moveStage(app.id, {
        to_stage: targetStage,
        notes: remarks,
        decision: targetStage === 'DECIDED' ? decision : null
      });
      setApp(updated);
      setIsMoveModalOpen(false);
      setRemarks('');
    } catch (err) {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to move stage');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Queue
        </button>
        <div className="flex items-center space-x-3">
          <SlaChip daysLeft={app.days_left} />
          {allowedNext.length > 0 && (
            <button
              onClick={() => {
                setTargetStage(allowedNext[0] || '');
                setIsMoveModalOpen(true);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition flex items-center space-x-1.5"
            >
              <span>Move to Next Stage</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Summary Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-bold text-slate-900">{app.application_number}</h1>
              <StatusBadge status={app.current_stage_code} />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Institution: <strong className="text-slate-700">{app.institution_name || 'Technical Institute'}</strong> • Region: <strong className="text-slate-700">{app.region}</strong> • Type: <strong className="text-slate-700">{app.application_type}</strong>
            </p>
          </div>
          <div className="flex items-center space-x-6 text-right">
            <div>
              <div className="text-[11px] text-slate-400 font-medium">Smart Priority Score</div>
              <div className="text-xl font-black text-slate-800">{app.priority_score} / 100</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-medium">Deficiency Counter</div>
              <div className="text-xl font-black text-slate-800">{app.deficiency_count}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6 text-xs font-semibold">
          {['timeline', 'undertakings', 'evc', 'activity'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 capitalize transition ${activeTab === tab ? 'border-b-2 border-emerald-600 text-emerald-800 font-bold' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {tab === 'evc' ? 'EVC Committee' : tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab 1: Timeline */}
      {activeTab === 'timeline' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <h3 className="text-sm font-bold text-slate-900">Configured Stage Progression Pipeline</h3>
          
          <div className="relative pl-6 border-l-2 border-slate-200 space-y-8">
            {stages.map((stg, idx) => {
              const isCurrent = stg.code === app.current_stage_code;
              const isPassed = stages.findIndex(s => s.code === app.current_stage_code) > idx;

              return (
                <div key={stg.code} className="relative">
                  <div className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center ${isCurrent ? 'border-emerald-600 bg-emerald-600 ring-4 ring-emerald-100' : (isPassed ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300')}`} />
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-900">{stg.name}</span>
                      {isCurrent && <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">Active Stage</span>}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">SLA Limit: {stg.sla_days} days • Owner Role: {stg.owner_role}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Move Stage Modal */}
      <Modal
        isOpen={isMoveModalOpen}
        onClose={() => setIsMoveModalOpen(false)}
        title={`Advance Workflow: ${app.application_number}`}
      >
        <form onSubmit={handleMove} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              {errorMsg}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Destination Stage (Enforced State Machine)
            </label>
            <select
              value={targetStage}
              onChange={(e) => setTargetStage(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              {allowedNext.map((stgCode) => (
                <option key={stgCode} value={stgCode}>
                  {stages.find(s => s.code === stgCode)?.name || stgCode}
                </option>
              ))}
            </select>
          </div>

          {targetStage === 'DECIDED' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Final AICTE Decision
              </label>
              <select
                value={decision}
                onChange={(e) => setDecision(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
              >
                <option value="APPROVED">Approved</option>
                <option value="APPROVED_WITH_CONDITIONS">Approved With Conditions</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reviewer Remarks / Outcome Notes
            </label>
            <textarea
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Scrutiny documentation verified and approved for EVC inspection."
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setIsMoveModalOpen(false)}
              className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs"
            >
              Confirm State Transition
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
