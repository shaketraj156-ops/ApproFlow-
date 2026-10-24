import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, Users, AlertTriangle, CalendarCheck, Clock, 
  ArrowRight, ShieldCheck, ChevronRight, UserCheck, RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { reportsService } from '../../services/reportsService';
import { applicationsService } from '../../services/applicationsService';
import { SlaChip } from '../../components/common/SlaChip';
import { Modal } from '../../components/common/Modal';

export function RegionalDashboard() {
  const navigate = useNavigate();
  const [selectedRegion, setSelectedRegion] = useState('NORTH');
  const [regionStats, setRegionStats] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [applications, setApplications] = useState([]);
  const [funnel, setFunnel] = useState([]);
  const [loading, setLoading] = useState(true);

  // Reassign modal state
  const [isReassignOpen, setIsReassignOpen] = useState(false);
  const [targetOfficer, setTargetOfficer] = useState('');
  const [reassignSuccess, setReassignSuccess] = useState(false);

  useEffect(() => {
    loadData();
  }, [selectedRegion]);

  async function loadData() {
    setLoading(true);
    try {
      const [stats, offs, apps, fnl] = await Promise.all([
        reportsService.getRegionalSummary(),
        reportsService.getOfficerWorkload(),
        applicationsService.getApplications({ region: selectedRegion }),
        reportsService.getFunnel()
      ]);
      setRegionStats(stats || []);
      setOfficers(offs || []);
      setApplications(apps?.items || []);
      setFunnel(fnl || []);
    } catch (err) {
      console.error('Failed to load regional data:', err);
    } finally {
      setLoading(false);
    }
  }

  const currentStat = regionStats.find(r => r.region === selectedRegion) || {
    pending_count: 24,
    overdue_count: 5,
    evc_scheduled: 8,
    avg_days: 14.5,
    high_risk_count: 3
  };

  const regionalOfficers = officers.filter(o => o.region === selectedRegion);

  function handleReassignSubmit() {
    setReassignSuccess(true);
    setTimeout(() => {
      setReassignSuccess(false);
      setIsReassignOpen(false);
    }, 1200);
  }

  return (
    <div className="space-y-6">
      {/* Header with Region Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <TrendingUp className="w-7 h-7 text-emerald-600" />
            Regional Committee & Workload Operations
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Regional oversight, officer queue balancing & committee pendency supervision
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-500 uppercase">Region:</label>
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="text-xs font-bold bg-white border border-slate-300 text-slate-800 rounded-xl px-3.5 py-2 shadow-2xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          >
            <option value="NORTH">Northern Region (HQ: Kanpur)</option>
            <option value="WEST">Western Region (HQ: Mumbai)</option>
            <option value="SOUTH">Southern Region (HQ: Chennai)</option>
            <option value="EAST">Eastern Region (HQ: Kolkata)</option>
            <option value="CENTRAL">Central Region (HQ: Bhopal)</option>
          </select>
        </div>
      </div>

      {/* Regional KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Queue</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{currentStat.pending_count}</p>
          <span className="text-[11px] text-slate-400">Applications</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-rose-500 uppercase tracking-wider">SLA Overdue</p>
          <p className="text-2xl font-black text-rose-600 mt-1">{currentStat.overdue_count}</p>
          <span className="text-[11px] text-rose-400">Needs intervention</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-blue-500 uppercase tracking-wider">EVC Inspections</p>
          <p className="text-2xl font-black text-blue-600 mt-1">{currentStat.evc_scheduled}</p>
          <span className="text-[11px] text-blue-400">Scheduled / Confirmed</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Avg Stage Turnaround</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{currentStat.avg_days}d</p>
          <span className="text-[11px] text-emerald-600 font-semibold">AICTE Benchmark: 15d</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-purple-500 uppercase tracking-wider">ML High Risk</p>
          <p className="text-2xl font-black text-purple-600 mt-1">{currentStat.high_risk_count}</p>
          <span className="text-[11px] text-purple-400">Predicted delay &gt; 70%</span>
        </div>
      </div>

      {/* Grid: Officer Queue Workload + Stage Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Officer Workload Roster */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                Regional Scrutiny Officer Workload Balancing
              </h3>
              <p className="text-xs text-slate-500">Active caseload distribution and turnaround velocity</p>
            </div>
            <button
              onClick={() => setIsReassignOpen(true)}
              className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition"
            >
              Rebalance Queue
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="px-3 py-2.5">Officer Name</th>
                  <th className="px-3 py-2.5">Role</th>
                  <th className="px-3 py-2.5">Active Queue</th>
                  <th className="px-3 py-2.5">Overdue</th>
                  <th className="px-3 py-2.5">Avg Turnaround</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {regionalOfficers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-slate-400">No officers assigned in this region</td>
                  </tr>
                ) : (
                  regionalOfficers.map((off) => (
                    <tr key={off.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2.5 font-bold text-slate-900">
                        {off.name}
                        <span className="block text-[11px] font-normal text-slate-400">{off.email}</span>
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 font-medium">
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold">
                          {off.level}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-black text-slate-900">{off.active_queue} files</td>
                      <td className="px-3 py-2.5">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                          off.overdue_count > 0 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {off.overdue_count} overdue
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-slate-700">{off.avg_completion_days} days</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Regional Funnel */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Regional Pipeline Funnel</h3>
            <p className="text-xs text-slate-500 mb-4">Volume at each approval stage</p>

            <div className="space-y-2.5">
              {funnel.map((stage) => (
                <div key={stage.stage_code} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">{stage.stage_name}</span>
                    <span className="font-bold text-slate-900">{stage.application_count}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((stage.application_count / 15) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Regional Applications List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Regional Application Queue ({selectedRegion})</h3>
            <p className="text-xs text-slate-500">Autonomous priority-ranked applications for regional review</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
              <tr>
                <th className="px-4 py-3">Application & Institution</th>
                <th className="px-4 py-3">Stage</th>
                <th className="px-4 py-3">Priority Score</th>
                <th className="px-4 py-3">SLA Status</th>
                <th className="px-4 py-3">ML Delay Risk</th>
                <th className="px-4 py-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {applications.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400">
                    No active applications found in this region.
                  </td>
                </tr>
              ) : (
                applications.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <span className="font-bold text-slate-900 block">{app.application_number}</span>
                      <span className="text-[11px] text-slate-500">{app.institution_name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] font-bold px-2 py-0.5 bg-slate-100 text-slate-800 rounded">
                        {app.current_stage_code}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-black text-slate-900 text-xs">
                        {Number(app.priority_score).toFixed(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <SlaChip daysLeft={app.days_left} />
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        app.delay_risk_score > 0.7 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {Math.round(app.delay_risk_score * 100)}% Risk
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => navigate(`/officer/applications/${app.id}`)}
                        className="text-xs font-bold text-emerald-600 hover:text-emerald-800 inline-flex items-center gap-1"
                      >
                        Inspect <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reassign Modal */}
      <Modal
        isOpen={isReassignOpen}
        onClose={() => setIsReassignOpen(false)}
        title="Reassign & Rebalance Regional Caseload"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Reassign highest-priority pending applications to balance workload across scrutiny officers.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Target Officer</label>
            <select
              value={targetOfficer}
              onChange={(e) => setTargetOfficer(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="">Select target scrutiny officer...</option>
              {regionalOfficers.map(o => (
                <option key={o.id} value={o.id}>{o.name} ({o.active_queue} active files)</option>
              ))}
            </select>
          </div>

          {reassignSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              Caseload successfully redistributed!
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsReassignOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleReassignSubmit}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs"
            >
              Execute Reassignment
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
export default RegionalDashboard;
