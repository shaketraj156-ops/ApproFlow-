import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { alertsService } from '../../services/alertsService';

export function AlertBell() {
  const [summary, setSummary] = useState({ open_count: 0, critical_count: 0 });

  useEffect(() => {
    alertsService.getSummary().then(setSummary).catch(() => {});
    // Poll every 60s as specified in README.md architecture
    const interval = setInterval(() => {
      alertsService.getSummary().then(setSummary).catch(() => {});
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Link
      to="/officer/alerts"
      className="relative p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition focus:outline-none"
      title="Alerts Center"
    >
      <Bell className="w-5 h-5" />
      {summary.open_count > 0 && (
        <span className={`absolute top-1 right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full text-[10px] font-bold text-white ${summary.critical_count > 0 ? 'bg-red-500 animate-pulse' : 'bg-amber-500'}`}>
          {summary.open_count}
        </span>
      )}
    </Link>
  );
}
