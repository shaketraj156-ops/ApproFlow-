import React, { useState, useEffect } from 'react';
import { 
  Building2, CheckCircle2, Clock, AlertTriangle, FileText, 
  UploadCloud, ArrowRight, ShieldCheck, Calendar, Check
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { undertakingsService } from '../../services/undertakingsService';
import { documentsService } from '../../services/documentsService';
import { formatDate } from '../../utils/formatDate';
import { Modal } from '../../components/common/Modal';

const STAGES = [
  { code: 'SUBMITTED', name: 'Submitted' },
  { code: 'SCRUTINY', name: 'Document Scrutiny' },
  { code: 'RE_SCRUTINY', name: 'Deficiency Re-Scrutiny' },
  { code: 'EVC', name: 'Expert Visit (EVC)' },
  { code: 'REGIONAL_COMMITTEE', name: 'Regional Committee' },
  { code: 'SAC_SHC', name: 'Hearing (SAC/SHC)' },
  { code: 'DECIDED', name: 'Final Decision' }
];

export function InstitutionDashboard() {
  const { user } = useAuth();
  const [undertakings, setUndertakings] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Evidence submit modal
  const [activeUndertaking, setActiveUndertaking] = useState(null);
  const [evidencePath, setEvidencePath] = useState('');
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Hardcoded current institution application for demo
  const application = {
    id: 'e1111111-1111-1111-1111-111111111111',
    application_number: 'AICTE-2026-10001',
    application_type: 'Extension of Approval (EoA) & Intake Increase',
    current_stage_code: 'SCRUTINY',
    submission_date: '2026-09-15T10:00:00Z',
    academic_year: '2026-2027',
    institution_name: user?.name || 'Apex Institute of Technology & Management',
    status: 'UNDER_PROCESS'
  };

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [u, d] = await Promise.all([
        undertakingsService.getUndertakings(),
        documentsService.getDocuments()
      ]);
      setUndertakings(u || []);
      setDocuments(d || []);
    } catch (err) {
      console.error('Failed to load institution data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleEvidenceSubmit() {
    if (!activeUndertaking) return;
    setIsSubmitting(true);
    try {
      await undertakingsService.submitEvidence(activeUndertaking.id, {
        document_path: evidencePath || 'https://storage.supabase.co/aicte/institution_affidavit.pdf',
        remarks
      });
      setActiveUndertaking(null);
      setEvidencePath('');
      setRemarks('');
      await loadData();
    } catch (err) {
      console.error('Evidence submission failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  }

  const currentStageIndex = STAGES.findIndex(s => s.code === application.current_stage_code);
  const pendingActions = undertakings.filter(u => u.status === 'PENDING' || u.status === 'OVERDUE');
  const expiringDocs = documents.filter(d => d.status === 'EXPIRING_SOON' || d.status === 'EXPIRED');

  return (
    <div className="space-y-6">
      {/* Institution Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider mb-1">
              <Building2 className="w-4 h-4" />
              <span>AICTE Institutional Applicant Portal</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight">{application.institution_name}</h1>
            <p className="text-slate-300 text-xs mt-1">
              Application No: <span className="font-bold text-white">{application.application_number}</span> · Academic Year {application.academic_year}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3.5 py-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold text-xs rounded-xl">
              Application Under Process
            </span>
          </div>
        </div>
      </div>

      {/* Visual Stage Progress Stepper */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-6 flex items-center justify-between">
          <span>AICTE Approval Progression Lifecycle</span>
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
            Current Stage: {STAGES[currentStageIndex]?.name || application.current_stage_code}
          </span>
        </h2>

        <div className="relative">
          {/* Progress track */}
          <div className="hidden lg:block absolute top-1/2 left-0 w-full h-1 bg-slate-100 -translate-y-1/2 z-0" />

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4 relative z-10">
            {STAGES.map((stage, idx) => {
              const isPast = idx < currentStageIndex;
              const isCurrent = idx === currentStageIndex;

              return (
                <div key={stage.code} className="flex flex-col items-center text-center">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition shadow-2xs ${
                      isPast
                        ? 'bg-emerald-600 text-white'
                        : isCurrent
                        ? 'bg-emerald-100 border-2 border-emerald-600 text-emerald-800 ring-4 ring-emerald-50'
                        : 'bg-white border border-slate-200 text-slate-400'
                    }`}
                  >
                    {isPast ? <Check className="w-4 h-4" /> : idx + 1}
                  </div>
                  <span className={`text-[11px] font-bold mt-2.5 ${isCurrent ? 'text-emerald-700' : isPast ? 'text-slate-800' : 'text-slate-400'}`}>
                    {stage.name}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5">
                    {isPast ? 'Completed' : isCurrent ? 'In Review' : 'Upcoming'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Action Items Grid: Undertakings & Document Warnings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Undertakings */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                Required Institutional Commitments ({pendingActions.length})
              </h3>
              <span className="text-xs text-slate-400">Statutory 45-day window</span>
            </div>

            {pendingActions.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                All statutory commitments are up to date. No pending actions.
              </div>
            ) : (
              <div className="space-y-3">
                {pendingActions.map(u => (
                  <div key={u.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900">{u.title}</span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                        u.days_remaining < 0 ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {u.days_remaining < 0 ? 'Overdue' : `${u.days_remaining}d left`}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{u.description}</p>
                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-200/60">
                      <span className="text-[11px] text-slate-400">Due: {formatDate(u.due_date)}</span>
                      <button
                        onClick={() => {
                          setActiveUndertaking(u);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs transition"
                      >
                        <UploadCloud className="w-3.5 h-3.5" /> Submit Evidence
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Document Validity Alerts */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                Document Expiry Warnings ({expiringDocs.length})
              </h3>
              <span className="text-xs text-slate-400">Mandatory AICTE Norms</span>
            </div>

            {expiringDocs.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                All statutory certificates and NOCs are active and valid.
              </div>
            ) : (
              <div className="space-y-3">
                {expiringDocs.map(doc => (
                  <div key={doc.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">{doc.title}</span>
                        <span className="text-[10px] uppercase font-bold text-slate-400">{doc.document_type}</span>
                      </div>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                        doc.status === 'EXPIRED' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {doc.status === 'EXPIRED' ? 'Expired' : 'Expiring in <60 Days'}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-200/60">
                      <span className="text-[11px] text-slate-500">Valid Until: {formatDate(doc.valid_until)}</span>
                      <span className="text-xs text-emerald-700 font-bold">Renewal Required</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Submit Evidence Modal */}
      <Modal
        isOpen={!!activeUndertaking}
        onClose={() => setActiveUndertaking(null)}
        title="Upload Compliance Evidence"
      >
        <div className="space-y-4">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Fulfilling Requirement</span>
            <p className="font-bold text-slate-900 text-xs mt-0.5">{activeUndertaking?.title}</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Document Storage URL / PDF Link</label>
            <input
              type="text"
              value={evidencePath}
              onChange={(e) => setEvidencePath(e.target.value)}
              placeholder="https://storage.supabase.co/aicte/institution_affidavit.pdf"
              className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Institutional Remarks / Compliance Declaration</label>
            <textarea
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Duly notarized affidavit and supporting payment receipts attached for Scrutiny Committee review."
              className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setActiveUndertaking(null)}
              className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleEvidenceSubmit}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs"
            >
              {isSubmitting ? 'Submitting...' : 'Submit to AICTE'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
export default InstitutionDashboard;
