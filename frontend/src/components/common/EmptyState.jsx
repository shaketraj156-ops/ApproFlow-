import React from 'react';
import { Inbox } from 'lucide-react';

/** "Nothing here" message with an optional action. */
export function EmptyState({ icon: Icon = Inbox, title, text, action, className = '' }) {
  return (
    <div className={`flex flex-col items-center text-center py-12 px-6 bg-gradient-to-b from-white to-emerald-50/40 rounded-2xl border border-dashed border-emerald-200 ${className}`}>
      <span className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-700 shadow-sm flex items-center justify-center">
        <Icon className="w-6 h-6" aria-hidden="true" />
      </span>
      <h3 className="mt-4 text-sm font-bold text-slate-900">{title}</h3>
      {text && <p className="mt-1 text-sm text-slate-500 max-w-sm">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
