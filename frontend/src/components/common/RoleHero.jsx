import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { HealthRing } from './HealthRing';
import { roleTheme, displayName } from '../../utils/roleTheme';

const IST = 'Asia/Kolkata';

function greeting(now = new Date()) {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: IST, hour: '2-digit', hour12: false }).format(now)) % 24;
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const today = (now = new Date()) =>
  new Intl.DateTimeFormat('en-IN', { timeZone: IST, weekday: 'long', day: 'numeric', month: 'long' }).format(now);

/**
 * The banner at the top of an officer's main screen. Its colours follow the officer's role, it greets them
 * by name, says in one line what needs attention, and shows deadline health as a ring.
 * `actions` are buttons or links shown under the summary; `context` is a small line such as a region name.
 */
export function RoleHero({ summary, health, ring, loading = false, actions = [], context, children }) {
  const { user } = useAuth();
  const theme = roleTheme(user);
  const now = new Date();

  return (
    <section className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${theme.gradient} text-white p-6 sm:p-8 shadow-lg`}>
      <div className={`absolute -top-24 -right-20 w-80 h-80 rounded-full blur-3xl ${theme.glow}`} aria-hidden="true" />
      <div className="absolute -bottom-28 -left-16 w-72 h-72 rounded-full bg-white/5 blur-3xl" aria-hidden="true" />
      <div
        className="absolute inset-0 opacity-[0.06]"
        aria-hidden="true"
        style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '22px 22px' }}
      />

      <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] font-bold uppercase tracking-wider ${theme.chip}`}>
              {theme.title}
            </span>
            {context && <span className="text-xs font-semibold text-white/70">{context}</span>}
            <span className="text-xs text-white/60">{today(now)} · IST</span>
          </div>

          <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight">
            {greeting(now)}, <span className="text-white/95">{displayName(user)}</span>
          </h1>
          {summary && <p className="mt-2 text-base text-white/80 max-w-xl leading-relaxed">{summary}</p>}

          {(actions.length > 0 || children) && (
            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              {actions.map((a) => {
                const Icon = a.icon;
                const classes = a.primary
                  ? 'bg-white text-slate-900 hover:bg-white/90 shadow-md'
                  : 'bg-white/10 text-white border border-white/20 hover:bg-white/20';
                const body = (
                  <>
                    {Icon && <Icon className="w-4 h-4" aria-hidden="true" />} {a.label}
                  </>
                );
                const common = `inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${classes}`;
                return a.to ? (
                  <Link key={a.label} to={a.to} className={common}>{body}</Link>
                ) : (
                  <button key={a.label} type="button" onClick={a.onClick} disabled={a.disabled} className={`${common} disabled:opacity-60`}>{body}</button>
                );
              })}
              {children}
            </div>
          )}
        </div>

        {(health || ring) && (
          <div className="shrink-0 rounded-2xl bg-white/[0.07] border border-white/10 backdrop-blur-sm px-5 py-4">
            <p className="text-[11px] font-bold uppercase tracking-widest text-white/60 mb-3">{ring?.title ?? 'Deadline health'}</p>
            {ring ? (
              <HealthRing segments={ring.segments} centerValue={ring.centerValue} centerLabel={ring.centerLabel} loading={loading} />
            ) : (
              <HealthRing health={health} loading={loading} />
            )}
          </div>
        )}
      </div>
    </section>
  );
}
