import React, { useState, useEffect } from 'react';
import { reportsService } from '../../services/reportsService';
import { Flame, Info, AlertCircle } from 'lucide-react';

export function Bottlenecks() {
  const [bottlenecks, setBottlenecks] = useState([]);

  useEffect(() => {
    reportsService.getBottlenecks().then(setBottlenecks);
  }, []);

  const getHeatmapColor = (breachRate) => {
    if (breachRate >= 50) return 'bg-red-500 text-white';
    if (breachRate >= 25) return 'bg-amber-400 text-amber-950';
    if (breachRate > 0) return 'bg-amber-100 text-amber-800';
    return 'bg-emerald-50 text-emerald-800';
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <div className="flex items-center space-x-2">
          <Flame className="w-6 h-6 text-red-500" />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Stage × Region Bottleneck Heatmap</h1>
        </div>
        <p className="text-sm text-slate-500 mt-0.5">
          Identifies structural procedural delays, average days in stage, and SLA breach ratios across all regions.
        </p>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
              <tr>
                <th className="px-4 py-3">Region</th>
                <th className="px-4 py-3">Stage</th>
                <th className="px-4 py-3">Active Pending</th>
                <th className="px-4 py-3">Avg Days in Stage</th>
                <th className="px-4 py-3">Breaches</th>
                <th className="px-4 py-3">Breach Intensity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bottlenecks.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition">
                  <td className="px-4 py-3.5 font-bold text-slate-900">{item.region}</td>
                  <td className="px-4 py-3.5 font-medium">{item.stage_name}</td>
                  <td className="px-4 py-3.5 font-semibold">{item.pending_count}</td>
                  <td className="px-4 py-3.5">{item.avg_days_in_stage} days</td>
                  <td className="px-4 py-3.5 font-bold text-red-600">{item.breach_count}</td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex px-2.5 py-1 rounded-full font-bold text-[11px] ${getHeatmapColor(item.breach_rate_pct)}`}>
                      {item.breach_rate_pct}% breach rate
                    </span>
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
