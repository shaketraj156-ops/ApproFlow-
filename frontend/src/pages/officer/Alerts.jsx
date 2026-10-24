import React, { useState, useEffect } from 'react';
import { alertsService } from '../../services/alertsService';
import { Bell, CheckCircle, ShieldAlert } from 'lucide-react';
import { formatDate } from '../../utils/formatDate';

export function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [activeTab, setActiveTab] = useState('OPEN');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    alertsService.getAlerts({ status: activeTab })
      .then(setAlerts)
      .finally(() => setLoading(false));
  }, [activeTab]);

  const handleAcknowledge = async (id) => {
    await alertsService.acknowledgeAlert(id);
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Alerts & Escalation Center</h1>
          <p className="text-sm text-slate-500 mt-0.5">Automated SLA breaches, document expiries and multi-level escalations</p>
        </div>
      </div>

      <div className="border-b border-slate-200">
        <nav className="flex space-x-6 text-xs font-semibold">
          {['OPEN', 'ACKNOWLEDGED', 'RESOLVED'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 capitalize transition ${activeTab === tab ? 'border-b-2 border-emerald-600 text-emerald-800 font-bold' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {tab.toLowerCase()} Alerts
            </button>
          ))}
        </nav>
      </div>

      <div className="space-y-3">
        {alerts.length === 0 ? (
          <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
            <CheckCircle className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
            <p className="text-sm font-semibold">No {activeTab.toLowerCase()} alerts</p>
            <p className="text-xs text-slate-400 mt-1">All application stages and compliance deadlines are currently within limits.</p>
          </div>
        ) : (
          alerts.map(alt => (
            <div
              key={alt.id}
              className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex items-center space-x-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${alt.severity === 'CRITICAL' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                    {alt.severity} • {alt.rule_code}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">{formatDate(alt.created_at, true)}</span>
                </div>
                <h3 className="text-sm font-bold text-slate-900">{alt.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{alt.message}</p>
              </div>

              {activeTab === 'OPEN' && (
                <button
                  onClick={() => handleAcknowledge(alt.id)}
                  className="px-3.5 py-2 text-xs font-semibold bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-200 border border-slate-200 rounded-xl transition shrink-0"
                >
                  Acknowledge Alert
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
