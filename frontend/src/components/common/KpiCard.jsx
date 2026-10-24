import React from 'react';

export function KpiCard({ title, value, subtitle, icon: Icon, trend, variant = 'default' }) {
  const variantStyles = {
    default: 'bg-white border-slate-200 text-slate-900',
    warning: 'bg-amber-50/60 border-amber-200 text-amber-950',
    danger: 'bg-red-50/60 border-red-200 text-red-950',
    success: 'bg-emerald-50/60 border-emerald-200 text-emerald-950',
    brand: 'bg-indigo-50/60 border-indigo-200 text-indigo-950'
  };

  return (
    <div className={`p-5 rounded-xl border shadow-sm transition hover:shadow-md ${variantStyles[variant]}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-slate-500">{title}</span>
        {Icon && (
          <div className="p-2 rounded-lg bg-white/80 shadow-xs border border-slate-100 text-slate-700">
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      <div className="flex items-baseline space-x-2">
        <span className="text-3xl font-bold tracking-tight">{value}</span>
        {trend && (
          <span className="text-xs font-semibold text-emerald-600">
            {trend}
          </span>
        )}
      </div>
      {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
    </div>
  );
}
