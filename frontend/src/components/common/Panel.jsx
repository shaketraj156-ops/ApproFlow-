import React from 'react';

/** A titled card used for tables and lists on the dashboards. */
export function Panel({ title, subtitle, icon: Icon, actions, children, className = '', flush = false }) {
  return (
    <section className={`bg-white rounded-2xl border border-slate-200/80 shadow-card overflow-hidden card-lift ${className}`}>
      {(title || actions) && (
        <header className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-emerald-50/60 via-white to-transparent">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              {Icon && <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0"><Icon className="w-4 h-4" aria-hidden="true" /></span>}
              <span className="truncate">{title}</span>
            </h2>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </header>
      )}
      <div className={flush ? '' : 'p-5'}>{children}</div>
    </section>
  );
}
