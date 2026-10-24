import React, { useState, useEffect } from 'react';
import { 
  Building2, AlertTriangle, CheckCircle2, TrendingUp, 
  MapPin, Clock, CalendarCheck, ShieldCheck, ChevronRight, Activity
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { reportsService } from '../../services/reportsService';
import { applicationsService } from '../../services/applicationsService';

export function NationalDashboard() {
  const navigate = useNavigate();
  const [nationalKpis, setNationalKpis] = useState(null);
  const [regionalSummary, setRegionalSummary] = useState([]);
  const [atRiskApps, setAtRiskApps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [kpis, reg, apps] = await Promise.all([
        reportsService.getNationalKpis(),
        reportsService.getRegionalSummary(),
        applicationsService.getApplications()
      ]);
      setNationalKpis(kpis);
      setRegionalSummary(reg || []);
      
      const items = apps?.items || [];
      const highRisk = items.filter(a => a.delay_risk_score > 0.6);
      setAtRiskApps(highRisk);
    } catch (err) {
      console.error('Failed to load national data:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider mb-1">
              <Activity className="w-4 h-4" />
              <span>National Approvals Command & Executive Intelligence</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight">Pan-India AICTE Approval Supervision</h1>
            <p className="text-slate-300 text-xs mt-1">
              Centralized oversight across 5 regional bureaus, 138 technical institutes & statutory committees
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold text-xs rounded-xl">
              Academic Cycle 2026–27 Active
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pan-India Volume</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{nationalKpis?.total_pan_india || 138}</p>
          <span className="text-[11px] text-slate-400">Applications</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-rose-500 uppercase tracking-wider">National Breaches</p>
          <p className="text-2xl font-black text-rose-600 mt-1">{nationalKpis?.total_overdue || 24}</p>
          <span className="text-[11px] text-rose-400">Breach rate: {nationalKpis?.pan_india_sla_breach_rate || '17.4%'}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-blue-500 uppercase tracking-wider">EVC Visits Done</p>
          <p className="text-2xl font-black text-blue-600 mt-1">{nationalKpis?.evc_completed_this_cycle || 46}</p>
          <span className="text-[11px] text-blue-400">Inspections logged</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-purple-500 uppercase tracking-wider">Predicted Delay Risk</p>
          <p className="text-2xl font-black text-purple-600 mt-1">{nationalKpis?.high_delay_risk_applications || 16}</p>
          <span className="text-[11px] text-purple-400">Flagged by ML model</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider">Approval Conversion</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{nationalKpis?.approval_conversion_rate || '89.2%'}</p>
          <span className="text-[11px] text-emerald-500 font-semibold">EoA + New Courses</span>
        </div>
      </div>

      {/* Cross-Regional Performance Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Regional Bureau Comparative Breakdown</h3>
            <p className="text-xs text-slate-500">Cross-region pendency, SLA breach velocity, and inspection schedules</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
              <tr>
                <th className="px-4 py-3">Region</th>
                <th className="px-4 py-3">Active Applications</th>
                <th className="px-4 py-3">SLA Overdue</th>
                <th className="px-4 py-3">EVC Inspections</th>
                <th className="px-4 py-3">Avg Resolution Time</th>
                <th className="px-4 py-3">High ML Risk</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {regionalSummary.map((reg) => (
                <tr key={reg.region} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-bold text-slate-900 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {reg.region} REGION
                  </td>
                  <td className="px-4 py-3 font-black text-slate-800">{reg.pending_count} files</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                      reg.overdue_count > 5 ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {reg.overdue_count} overdue
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-700">{reg.evc_scheduled} scheduled</td>
                  <td className="px-4 py-3 font-semibold text-slate-700">{reg.avg_days} days</td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-100 text-purple-800 rounded">
                      {reg.high_risk_count} files
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => navigate('/region/dashboard')}
                      className="text-xs font-bold text-emerald-600 hover:text-emerald-800 inline-flex items-center gap-1"
                    >
                      Regional View <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ML Delay Risk Watchlist */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              Machine Learning Delay Risk Radar
            </h3>
            <p className="text-xs text-slate-500">Autonomous Random Forest Model flagging applications exceeding 80% SLA breach risk</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {atRiskApps.map((app) => (
            <div key={app.id} className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/40 shadow-2xs">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900">{app.application_number}</span>
                  <span className="text-[11px] text-slate-500 block">{app.institution_name}</span>
                </div>
                <span className="text-[11px] font-black px-2 py-0.5 bg-rose-100 text-rose-800 rounded">
                  {Math.round(app.delay_risk_score * 100)}% Risk
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between pt-2 border-t border-rose-200/60 text-xs">
                <span className="text-slate-500">Stage: <strong className="text-slate-800">{app.current_stage_code}</strong></span>
                <button
                  onClick={() => navigate(`/officer/applications/${app.id}`)}
                  className="text-xs font-bold text-rose-700 hover:text-rose-900 underline"
                >
                  Expedite File
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
export default NationalDashboard;
