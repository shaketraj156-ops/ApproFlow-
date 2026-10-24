import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, Clock, AlertTriangle, CheckCircle, 
  ArrowUpRight, Flame, ShieldAlert, Sparkles 
} from 'lucide-react';
import { KpiCard } from '../../components/common/KpiCard';
import { DataTable } from '../../components/common/DataTable';
import { SlaChip } from '../../components/common/SlaChip';
import { StatusBadge } from '../../components/common/StatusBadge';
import { applicationsService } from '../../services/applicationsService';
import { alertsService } from '../../services/alertsService';
import { reportsService } from '../../services/reportsService';
import { formatDate } from '../../utils/formatDate';

export function OfficerDashboard() {
  const navigate = useNavigate();
  const [kpis, setKpis] = useState(null);
  const [applications, setApplications] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [kpiData, appData, alertData] = await Promise.all([
          reportsService.getKpis(),
          applicationsService.getApplications({ sort: '-priority_score' }),
          alertsService.getAlerts({ status: 'OPEN' })
        ]);
        setKpis(kpiData);
        setApplications(appData.items || []);
        setAlerts(alertData || []);
      } catch (err) {
        console.error("Dashboard data load error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const columns = [
    {
      header: 'Application',
      accessor: 'application_number',
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-900 flex items-center space-x-1.5">
            <span>{row.application_number}</span>
            {row.delay_risk_score >= 0.7 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200">
                <Sparkles className="w-2.5 h-2.5 text-purple-600" />
                Attention
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500">{row.institution_name || 'Technical Institute'}</div>
        </div>
      )
    },
    {
      header: 'Region',
      accessor: 'region',
      render: (row) => <span className="font-medium text-slate-700">{row.region}</span>
    },
    {
      header: 'Current Stage',
      accessor: 'current_stage_code',
      render: (row) => <StatusBadge status={row.current_stage_code} />
    },
    {
      header: 'SLA Status (IST)',
      accessor: 'days_left',
      render: (row) => <SlaChip daysLeft={row.days_left} />
    },
    {
      header: 'Smart Priority',
      accessor: 'priority_score',
      render: (row) => (
        <div className="flex items-center space-x-2">
          <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden">
            <div 
              className={`h-full ${row.priority_score > 70 ? 'bg-red-500' : (row.priority_score > 40 ? 'bg-amber-500' : 'bg-emerald-500')}`}
              style={{ width: `${Math.min(row.priority_score, 100)}%` }}
            />
          </div>
          <span className="text-xs font-bold text-slate-700">{row.priority_score}</span>
        </div>
      )
    },
    {
      header: 'Action',
      render: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/officer/applications/${row.id}`);
          }}
          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-800 hover:underline"
        >
          Review <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      )
    }
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Officer Dashboard — My Queue</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time stage tracking, automated SLA pendency & escalation management
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 font-medium shadow-2xs">
            🕒 All timestamps in IST (Asia/Kolkata)
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Assigned"
          value={kpis?.total_applications || '45'}
          subtitle="Active approval pipeline"
          icon={FileText}
        />
        <KpiCard
          title="SLA Breached (Overdue)"
          value={kpis?.overdue_count || '5'}
          subtitle="Escalated to sectional/reg head"
          icon={AlertTriangle}
          variant="danger"
        />
        <KpiCard
          title="Due This Week"
          value={kpis?.due_this_week || '8'}
          subtitle="Within 0-3 days window"
          icon={Clock}
          variant="warning"
        />
        <KpiCard
          title="EVC Visits Scheduled"
          value={kpis?.evc_scheduled_count || '6'}
          subtitle="Committees verified clash-free"
          icon={CheckCircle}
          variant="success"
        />
      </div>

      {/* Grid: Action Needed Queue & Latest Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Flame className="w-5 h-5 text-red-500" />
              <h2 className="text-base font-bold text-slate-900">Needs Action First (Priority Sorted)</h2>
            </div>
            <span className="text-xs font-semibold text-slate-500">Sorted by Smart Priority Score</span>
          </div>

          <DataTable
            columns={columns}
            data={applications}
            onRowClick={(row) => navigate(`/officer/applications/${row.id}`)}
          />
        </div>

        {/* Right Rail: Alerts & High Risk Notifications */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-bold text-slate-900">Critical Escalations & Alerts</h2>
          </div>

          <div className="space-y-3">
            {alerts.slice(0, 4).map((alt) => (
              <div 
                key={alt.id}
                className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-2 hover:border-slate-300 transition"
              >
                <div className="flex items-start justify-between">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${alt.severity === 'CRITICAL' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                    {alt.severity} • {alt.rule_code}
                  </span>
                  <span className="text-[11px] text-slate-400">{formatDate(alt.created_at, true)}</span>
                </div>
                <h4 className="text-xs font-bold text-slate-900">{alt.title}</h4>
                <p className="text-xs text-slate-600 leading-relaxed">{alt.message}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
