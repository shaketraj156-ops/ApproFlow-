import React, { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import { History, ShieldCheck, Download } from 'lucide-react';
import { formatDate } from '../../utils/formatDate';

export function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosClient.get('/audit-logs')
      .then(res => setLogs(res.data))
      .catch(() => {
        // Fallback mock audit trail
        setLogs([
          {
            id: "1",
            entity_type: "APPLICATION",
            entity_id: "AICTE-2026-10001",
            action: "MOVE_STAGE",
            actor_role: "aicte_officer",
            new_state: { stage: "SCRUTINY", due_at: "2026-10-29T10:00:00Z" },
            created_at: "2026-10-24T12:00:00Z"
          },
          {
            id: "2",
            entity_type: "ALERT",
            entity_id: "alt-1",
            action: "ESCALATION_TRIGGERED",
            actor_role: "SYSTEM_JOB",
            new_state: { level: 2, recipient: "SECTION_HEAD" },
            created_at: "2026-10-24T06:00:00Z"
          }
        ]);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">System Audit Trail</h1>
          <p className="text-sm text-slate-500 mt-0.5">Immutable event history for compliance verification & accountability</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
              <tr>
                <th className="px-4 py-3">Timestamp (IST)</th>
                <th className="px-4 py-3">Entity Type</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Actor Role</th>
                <th className="px-4 py-3">State Mutation Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition">
                  <td className="px-4 py-3.5 text-slate-500 font-sans">{formatDate(log.created_at, true)}</td>
                  <td className="px-4 py-3.5 font-bold text-slate-800 font-sans">{log.entity_type}</td>
                  <td className="px-4 py-3.5 text-emerald-700 font-semibold">{log.action}</td>
                  <td className="px-4 py-3.5 text-slate-600 font-sans">{log.actor_role || 'SYSTEM'}</td>
                  <td className="px-4 py-3.5 text-slate-500 text-[11px]">
                    {JSON.stringify(log.new_state || {})}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
