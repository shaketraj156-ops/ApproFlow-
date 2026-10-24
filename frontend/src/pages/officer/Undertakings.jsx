import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, AlertCircle, CheckCircle2, Clock, 
  ExternalLink, FileCheck, PlusCircle, Filter, ShieldCheck, XCircle, Building2
} from 'lucide-react';
import { undertakingsService } from '../../services/undertakingsService';
import { formatDate } from '../../utils/formatDate';
import { Modal } from '../../components/common/Modal';

export function Undertakings() {
  const [undertakings, setUndertakings] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  // Modals
  const [isVerifyOpen, setIsVerifyOpen] = useState(false);
  const [activeUndertaking, setActiveUndertaking] = useState(null);
  const [verifyDecision, setVerifyDecision] = useState('VERIFIED');
  const [verifyRemarks, setVerifyRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Undertaking modal
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDueDate, setNewDueDate] = useState('2026-11-30');

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  async function loadData() {
    setLoading(true);
    try {
      const data = await undertakingsService.getUndertakings({
        status: statusFilter === 'ALL' ? undefined : statusFilter
      });
      setUndertakings(data || []);
    } catch (err) {
      console.error('Failed to load undertakings:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifySubmit() {
    if (!activeUndertaking) return;
    setIsSubmitting(true);
    try {
      await undertakingsService.verifyUndertaking(activeUndertaking.id, {
        decision: verifyDecision,
        remarks: verifyRemarks
      });
      setIsVerifyOpen(false);
      setActiveUndertaking(null);
      await loadData();
    } catch (err) {
      console.error('Failed to verify undertaking:', err);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCreateSubmit() {
    if (!newTitle) return;
    setIsSubmitting(true);
    try {
      await undertakingsService.createUndertaking({
        application_id: 'e2222222-2222-2222-2222-222222222222',
        application_number: 'AICTE-2026-10002',
        institution_name: 'Pune College of Engineering & Research',
        region: 'WEST',
        title: newTitle,
        description: newDesc,
        due_date: newDueDate
      });
      setIsNewOpen(false);
      setNewTitle('');
      setNewDesc('');
      await loadData();
    } catch (err) {
      console.error('Failed to create undertaking:', err);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Calculate upcoming 45-day items
  const upcoming45Days = undertakings.filter(u => u.status !== 'VERIFIED' && u.days_remaining >= 0 && u.days_remaining <= 45);
  const overdueItems = undertakings.filter(u => u.status === 'OVERDUE' || (u.days_remaining < 0 && u.status !== 'VERIFIED'));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <ClipboardList className="w-7 h-7 text-emerald-600" />
            Institutional Undertakings & Commitments
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Track conditional approval covenants, statutory compliance deadlines, and officer verification
          </p>
        </div>
        <button
          onClick={() => setIsNewOpen(true)}
          className="inline-flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-xs transition"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Record New Undertaking</span>
        </button>
      </div>

      {/* 45-Day Deadline Watch Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-rose-500/10 border border-amber-200 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <span>Active 45-Day AICTE Statutory Compliance Window</span>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md">
            {upcoming45Days.length} due soon · {overdueItems.length} overdue
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {upcoming45Days.map(item => (
            <div key={item.id} className="bg-white/80 backdrop-blur-xs p-3 rounded-xl border border-amber-200/80 shadow-2xs">
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-bold text-slate-900 line-clamp-1">{item.title}</span>
                <span className="text-[11px] font-black px-2 py-0.5 bg-amber-100 text-amber-800 rounded whitespace-nowrap">
                  {item.days_remaining}d left
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{item.institution_name}</p>
              <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                <span>Due: {formatDate(item.due_date)}</span>
                <span className="font-semibold text-slate-700">{item.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter and Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Filter bar */}
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-700 uppercase">Filter Status:</span>
            {['ALL', 'PENDING', 'SUBMITTED', 'VERIFIED', 'OVERDUE'].map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition ${
                  statusFilter === status
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Showing {undertakings.length} undertakings
          </span>
        </div>

        {/* Undertakings Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
              <tr>
                <th className="px-4 py-3">Application & Institution</th>
                <th className="px-4 py-3">Commitment Title & Scope</th>
                <th className="px-4 py-3">Due Date (IST)</th>
                <th className="px-4 py-3">Remaining</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Evidence Document</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {undertakings.map((u) => {
                const isOverdue = u.status === 'OVERDUE' || (u.days_remaining < 0 && u.status !== 'VERIFIED');
                const isVerified = u.status === 'VERIFIED';
                const isSubmitted = u.status === 'SUBMITTED';

                return (
                  <tr key={u.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <span className="font-bold text-slate-900 block">{u.application_number}</span>
                      <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3 h-3 text-slate-400" />
                        {u.institution_name}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <span className="font-bold text-slate-800 block">{u.title}</span>
                      <span className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{u.description}</span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">
                      {formatDate(u.due_date)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {isVerified ? (
                        <span className="text-slate-400 font-semibold">—</span>
                      ) : (
                        <span className={`text-[11px] font-black px-2 py-0.5 rounded-md ${
                          isOverdue ? 'bg-rose-100 text-rose-800' :
                          u.days_remaining <= 30 ? 'bg-amber-100 text-amber-800' :
                          'bg-emerald-100 text-emerald-800'
                        }`}>
                          {isOverdue ? `${Math.abs(u.days_remaining)}d overdue` : `${u.days_remaining}d left`}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                        isVerified ? 'bg-emerald-100 text-emerald-800' :
                        isSubmitted ? 'bg-blue-100 text-blue-800' :
                        isOverdue ? 'bg-rose-100 text-rose-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {u.document_path ? (
                        <a
                          href={u.document_path}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-800 font-bold underline"
                        >
                          <FileCheck className="w-3.5 h-3.5" /> View PDF
                        </a>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">No file submitted</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {isSubmitted ? (
                        <button
                          onClick={() => {
                            setActiveUndertaking(u);
                            setIsVerifyOpen(true);
                          }}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs transition"
                        >
                          Review & Verify
                        </button>
                      ) : isVerified ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Satisfied
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            // Quick simulate institution submission
                            undertakingsService.submitEvidence(u.id, {
                              document_path: 'https://storage.supabase.co/aicte/compliance_affidavit.pdf',
                              remarks: 'Official affidavit submitted with statutory attachments'
                            }).then(() => loadData());
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition"
                          title="Simulate institution compliance submission"
                        >
                          Simulate Evidence
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review & Verify Modal */}
      <Modal
        isOpen={isVerifyOpen}
        onClose={() => setIsVerifyOpen(false)}
        title="Verify Institutional Undertaking Evidence"
      >
        <div className="space-y-4">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Commitment Title</span>
            <p className="font-bold text-slate-900 text-xs mt-0.5">{activeUndertaking?.title}</p>
            <p className="text-[11px] text-slate-500 mt-1">{activeUndertaking?.institution_name}</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Inspection Decision</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setVerifyDecision('VERIFIED')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition ${
                  verifyDecision === 'VERIFIED'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Satisfy & Verify Compliance
              </button>
              <button
                type="button"
                onClick={() => setVerifyDecision('REJECTED')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition ${
                  verifyDecision === 'REJECTED'
                    ? 'bg-rose-50 border-rose-500 text-rose-800'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <XCircle className="w-4 h-4 text-rose-600" />
                Reject & Demand Re-filing
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Verification Remarks / Audit Notes</label>
            <textarea
              rows={3}
              value={verifyRemarks}
              onChange={(e) => setVerifyRemarks(e.target.value)}
              placeholder="e.g. Verified against AICTE norms. Document is registered and valid."
              className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsVerifyOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleVerifySubmit}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs"
            >
              {isSubmitting ? 'Recording...' : 'Record Verification'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Record New Undertaking Modal */}
      <Modal
        isOpen={isNewOpen}
        onClose={() => setIsNewOpen(false)}
        title="Record New Institutional Undertaking"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Under-Taking Title</label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Barrier-Free Access Completion"
              className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Scope & Detailed Condition</label>
            <textarea
              rows={3}
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Describe what specific proof or rectified infrastructure is expected from the institution."
              className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Statutory Due Date</label>
            <input
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsNewOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmitting || !newTitle}
              onClick={handleCreateSubmit}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-xs"
            >
              {isSubmitting ? 'Recording...' : 'Save Commitment'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
export default Undertakings;
