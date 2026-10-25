import React from 'react';
import { Inbox } from 'lucide-react';

/** "Nothing here" message with an optional action. */
export function EmptyState({ icon: Icon = Inbox, title, text, action, className = '' }) {
  return (
    <div className={`flex flex-col items-center text-center py-12 px-6 bg-white rounded-2xl border border-dashed border-slate-300 ${className}`}>
      <span className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center">
        <Icon className="w-6 h-6" aria-hidden="true" />
      </span>
      <h3 className="mt-4 text-sm font-bold text-slate-900">{title}</h3>
      {text && <p className="mt-1 text-sm text-slate-500 max-w-sm">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
