import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { alertsService, ALERTS_CHANGED_EVENT } from '../../services/alertsService';

export function AlertBell() {
  const [summary, setSummary] = useState({ open_count: 0, critical_count: 0 });

  useEffect(() => {
    const refresh = () => alertsService.getSummary().then(setSummary).catch(() => {});
    refresh();
    // Poll every 60s, and refresh right away when an alert is acknowledged or resolved elsewhere.
    const interval = setInterval(refresh, 60000);
    window.addEventListener(ALERTS_CHANGED_EVENT, refresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener(ALERTS_CHANGED_EVENT, refresh);
    };
  }, []);

  const critical = summary.critical_count > 0;

  return (
    <Link
      to="/officer/alerts"
      className="relative p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
      title="Alerts Center"
      aria-label={`Alerts Center, ${summary.open_count} open${critical ? `, ${summary.critical_count} critical` : ''}`}
    >
      <Bell className={`w-5 h-5 origin-top ${critical ? 'animate-wiggle' : ''}`} aria-hidden="true" />
      {summary.open_count > 0 && (
        <span className={`absolute top-1 right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full text-[10px] font-bold text-white ${critical ? 'bg-red-600 animate-pulse' : 'bg-amber-700'}`}>
          {summary.open_count}
        </span>
      )}
    </Link>
  );
}
