import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { roleTheme } from '../../utils/roleTheme';

/**
 * The banner at the top of a page. Its colours follow the signed-in role, the same as the dashboard hero.
 * `icon` is shown in a glass tile; `actions` sit on the right (use light buttons, the banner is dark).
 */
export function PageHeader({ title, description, actions, icon: Icon }) {
  const { user } = useAuth();
  const theme = roleTheme(user);

  return (
    <header className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${theme.gradient} text-white px-6 py-6 sm:px-8 sm:py-7 shadow-lg ring-1 ring-white/10 banner-sweep`}>
      <div className="absolute -top-20 -right-16 w-72 h-72 rounded-full" style={{ background: 'radial-gradient(closest-side, rgba(255,255,255,0.16), transparent)' }} aria-hidden="true" />
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="dots-drift opacity-[0.07]" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
      </div>
      <div className="orbit-ring right-16 -top-10 w-40 h-40 hidden md:block" aria-hidden="true" />
      <div className="absolute right-24 -bottom-6 w-20 h-20 rounded-3xl border border-white/15 bg-white/5 rotate-12 hidden md:block" aria-hidden="true" />

      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4 min-w-0">
          {Icon && (
            <span className="shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/10 border border-white/20 shadow-inner flex items-center justify-center">
              <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-white" aria-hidden="true" />
            </span>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{title}</h1>
            {description && <p className="text-sm sm:text-base text-white/75 mt-1 max-w-2xl leading-relaxed">{description}</p>}
          </div>
        </div>
        {actions && <div className="relative flex flex-wrap items-center gap-3 shrink-0">{actions}</div>}
      </div>
    </header>
  );
}
