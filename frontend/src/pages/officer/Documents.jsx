import React, { useState, useEffect } from 'react';
import { 
  FolderCheck, ShieldAlert, CheckCircle2, Clock, 
  PlusCircle, Filter, FileText, AlertTriangle, Building2, Calendar
} from 'lucide-react';
import { documentsService } from '../../services/documentsService';
import { formatDate } from '../../utils/formatDate';
import { Modal } from '../../components/common/Modal';

export function Documents() {
  const [docs, setDocs] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  // New Document modal
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('FIRE_NOC');
  const [newValidFrom, setNewValidFrom] = useState('2026-01-01');
  const [newValidUntil, setNewValidUntil] = useState('2027-01-01');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  async function loadData() {
    setLoading(true);
    try {
      const data = await documentsService.getDocuments({
        status: statusFilter === 'ALL' ? undefined : statusFilter
      });
      setDocs(data || []);
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddDocument() {
    if (!newTitle) return;
    setIsSubmitting(true);
    try {
      await documentsService.addDocument({
        institution_id: 'inst-1',
        institution_name: 'Delhi Institute of Advanced Technology',
        region: 'NORTH',
        title: newTitle,
        document_type: newType,
        valid_from: newValidFrom,
        valid_until: newValidUntil
      });
      setIsNewOpen(false);
      setNewTitle('');
      await loadData();
    } catch (err) {
      console.error('Failed to add document:', err);
    } finally {
      setIsSubmitting(false);
    }
  }

  const expiredDocs = docs.filter(d => d.status === 'EXPIRED');
  const expiringSoonDocs = docs.filter(d => d.status === 'EXPIRING_SOON');
  const validDocs = docs.filter(d => d.status === 'VALID');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <FolderCheck className="w-7 h-7 text-emerald-600" />
            Statutory Document Validity & Expiry Watch
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Continuous watchdog for Fire Safety, Environmental Clearances, Land Deeds, and University Affiliations
          </p>
        </div>
        <button
          onClick={() => setIsNewOpen(true)}
          className="inline-flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-xs transition"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Register Compliance Document</span>
        </button>
      </div>

      {/* Expiry Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-rose-500 uppercase tracking-wider">Expired Documents</p>
            <p className="text-2xl font-black text-rose-600 mt-1">{expiredDocs.length}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Deficiency notice triggered</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-amber-500 uppercase tracking-wider">Expiring in 60 Days</p>
            <p className="text-2xl font-black text-amber-600 mt-1">{expiringSoonDocs.length}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Urgent renewal required</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-emerald-500 uppercase tracking-wider">Verified Valid</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{validDocs.length}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Compliant with AICTE norms</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Filter bar */}
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-700 uppercase">Filter:</span>
            {['ALL', 'EXPIRING_SOON', 'EXPIRED', 'VALID'].map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition ${
                  statusFilter === status
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {status.replace('_', ' ')}
              </button>
            ))}
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Showing {docs.length} tracked documents
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
              <tr>
                <th className="px-4 py-3">Document Title & Type</th>
                <th className="px-4 py-3">Institution & Region</th>
                <th className="px-4 py-3">Valid From</th>
                <th className="px-4 py-3">Valid Until (IST)</th>
                <th className="px-4 py-3">Time Remaining</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Certificate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {docs.map((doc) => {
                const isExpired = doc.status === 'EXPIRED';
                const isExpiring = doc.status === 'EXPIRING_SOON';

                return (
                  <tr key={doc.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <span className="font-bold text-slate-900 block">{doc.title}</span>
                      <span className="text-[10px] font-black uppercase text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded inline-block mt-0.5">
                        {doc.document_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-800 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        {doc.institution_name}
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">{doc.region} Region</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {formatDate(doc.valid_from)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">
                      {formatDate(doc.valid_until)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-[11px] font-black px-2 py-0.5 rounded-md ${
                        isExpired ? 'bg-rose-100 text-rose-800' :
                        isExpiring ? 'bg-amber-100 text-amber-800' :
                        'bg-emerald-100 text-emerald-800'
                      }`}>
                        {isExpired ? 'Expired' : `${doc.days_remaining} days left`}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                        isExpired ? 'bg-rose-100 text-rose-800' :
                        isExpiring ? 'bg-amber-100 text-amber-800' :
                        'bg-emerald-100 text-emerald-800'
                      }`}>
                        {doc.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <a
                        href={doc.storage_path}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-800 font-bold underline"
                      >
                        <FileText className="w-3.5 h-3.5" /> View
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register New Compliance Document Modal */}
      <Modal
        isOpen={isNewOpen}
        onClose={() => setIsNewOpen(false)}
        title="Register Statutory Compliance Document"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Document Title</label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. State Pollution Control Board Renewal 2026"
              className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Document Category</label>
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="FIRE_NOC">Fire & Life Safety NOC</option>
              <option value="BUILDING_PLAN">Municipal Approved Building Plan</option>
              <option value="TRUST_DEED">Registered Trust Deed / Land Title</option>
              <option value="POLLUTION_CLEARANCE">Pollution Control Board Clearance</option>
              <option value="AFFILIATION_ORDER">University Affiliation Order</option>
              <option value="OCCUPANCY_CERT">Occupancy / Structural Stability</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Issue Date</label>
              <input
                type="date"
                value={newValidFrom}
                onChange={(e) => setNewValidFrom(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Expiry Date</label>
              <input
                type="date"
                value={newValidUntil}
                onChange={(e) => setNewValidUntil(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
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
              onClick={handleAddDocument}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-xs"
            >
              {isSubmitting ? 'Recording...' : 'Register Document'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
export default Documents;
