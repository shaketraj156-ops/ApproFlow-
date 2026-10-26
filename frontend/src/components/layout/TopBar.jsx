import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { LogOut, Menu, Search, Clock, MapPin, ChevronDown, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AlertBell } from './AlertBell';
import { CommandPalette } from './CommandPalette';
import { sectionsForRole } from './navConfig';
import { useClock } from '../../hooks/useClock';
import { useNavBadges } from '../../hooks/useNavBadges';
import { getRoleLandingRoute } from '../../routes/roleLanding';
import { roleTheme, displayName, initials } from '../../utils/roleTheme';
import { Valid8Logo } from '../common/Valid8Logo';

const regionLabel = (region) => (region === 'ALL' ? 'All regions' : `${region.charAt(0)}${region.slice(1).toLowerCase()} region`);

function Brand({ to }) {
  return (
    <Link to={to} className="flex items-center gap-2.5 shrink-0" aria-label="Valid8 home">
      <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-sm p-1 flex items-center justify-center ring-1 ring-white/20 shadow-md">
        <Valid8Logo className="w-full h-full" />
      </div>
      <span className="hidden sm:block leading-tight">
        <span className="block text-base font-bold text-white tracking-tight">Valid8</span>
        <span className="block text-[10px] font-medium text-slate-400">AICTE 8-Point Norms Engine</span>
      </span>
    </Link>
  );
}

/** The profile card: who is signed in, in the colours of their role. */
function ProfileCard({ user, theme }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${theme.gradient} p-4 text-white`}>
      <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl ${theme.glow}`} aria-hidden="true" />
      <div className="relative flex items-center gap-3">
        <span className={`w-12 h-12 shrink-0 rounded-full bg-gradient-to-br ${theme.avatar} ring-2 ring-white/40 flex items-center justify-center text-sm font-extrabold`}>
          {initials(user)}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold truncate">{displayName(user)}</p>
          <p className="text-xs text-white/75 truncate">{theme.title}</p>
        </div>
      </div>
      {user?.region && (
        <p className="relative mt-3 inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/10 border border-white/15">
          <MapPin className="w-3 h-3" aria-hidden="true" /> {regionLabel(user.region)}
        </p>
      )}
    </div>
  );
}

function Badge({ badge }) {
  if (!badge || !(badge.count > 0)) return null;
  return (
    <span
      aria-label={`${badge.count} ${badge.label}`}
      className={`min-w-5 h-5 px-1.5 inline-flex items-center justify-center rounded-full text-[10px] font-bold text-white ${
        badge.tone === 'danger' ? 'bg-red-600' : 'bg-amber-700'
      }`}
    >
      {badge.count}
    </span>
  );
}

function UserMenu({ user, theme, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-full hover:bg-white/10 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
      >
        <span className={`w-9 h-9 rounded-full bg-gradient-to-br ${theme.avatar} text-white flex items-center justify-center font-bold text-xs ring-2 ring-white/25`}>
          {initials(user)}
        </span>
        <span className="hidden md:block text-left leading-tight">
          <span className="block text-xs font-semibold text-white">{displayName(user)}</span>
          <span className="block text-[11px] text-slate-300">{theme.title}</span>
        </span>
        <ChevronDown className={`hidden md:block w-4 h-4 text-slate-300 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {open && (
        <div role="menu" aria-label="Account" className="absolute right-0 top-full mt-2 w-72 rounded-2xl bg-white border border-slate-200 shadow-xl p-2 animate-fadeIn z-50">
          <ProfileCard user={user} theme={theme} />
          <button
            role="menuitem"
            onClick={() => { setOpen(false); onLogout(); }}
            className="mt-2 w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-red-50 hover:text-red-700 transition"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

/** Slide-in menu for small screens: the same links as the top bar, stacked. */
function MobileDrawer({ open, onClose, sections, badges, user, theme, onLogout }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  // Rendered on <body>: the header's blur effect would otherwise confine a fixed panel to the header.
  return createPortal(
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-slate-900/40 animate-fade" onClick={onClose} aria-hidden="true" />
      <aside aria-label="Menu" className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-2xl flex flex-col animate-fadeIn">
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200 shrink-0">
          <span className="text-base font-bold text-slate-900">Menu</span>
          <button onClick={onClose} aria-label="Close menu" className="p-2 rounded-lg text-slate-500 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-3 overflow-y-auto flex-1 space-y-5">
          <ProfileCard user={user} theme={theme} />
          {sections.map((section) => (
            <div key={section.title}>
              <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">{section.title}</p>
              <ul className="space-y-0.5">
                {section.links.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        onClick={onClose}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                            isActive ? 'bg-emerald-50 text-emerald-800 font-semibold' : 'text-slate-600 hover:bg-slate-50'
                          }`
                        }
                      >
                        <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span className="flex-1">{item.label}</span>
                        <Badge badge={badges[item.to]} />
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
        <div className="p-3 border-t border-slate-200 shrink-0">
          <button
            onClick={() => { onClose(); onLogout(); }}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-red-50 hover:text-red-700 transition"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" /> Sign out
          </button>
        </div>
      </aside>
    </div>,
    document.body
  );
}

/**
 * The bar across the top of every signed-in screen. The first row has the brand, quick search, the IST clock,
 * alerts and the account menu. The second row is the navigation: one tab per page, so each feature opens on
 * its own page. On small screens the tabs fold into a menu.
 */
export function TopBar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const theme = roleTheme(user);
  const sections = sectionsForRole(user?.role);
  const badges = useNavBadges(user?.role);
  const time = useClock();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const tabsRef = useRef(null);
  const [indicator, setIndicator] = useState({ visible: false, left: 0, width: 0 });

  const showAlerts = ['aicte_officer', 'system_admin'].includes(user?.role);

  // Ctrl+K (Cmd+K on a Mac) opens the quick search from anywhere.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Place the sliding highlight under the active tab, and move it whenever the page, the badges or the size change.
  useLayoutEffect(() => {
    const root = tabsRef.current;
    if (!root) return undefined;
    const place = () => {
      const active = root.querySelector('a[aria-current="page"]');
      if (!active) {
        setIndicator((i) => (i.visible ? { ...i, visible: false } : i));
        return;
      }
      const r = root.getBoundingClientRect();
      const a = active.getBoundingClientRect();
      setIndicator({ visible: true, left: a.left - r.left, width: a.width });
    };
    place();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(place) : null;
    observer?.observe(root);
    window.addEventListener('resize', place);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', place);
    };
  }, [location.pathname, badges, sections.length]);

  // Close the mobile menu when the page changes, and keep the active tab in view on narrow desktops.
  useEffect(() => {
    setMenuOpen(false);
    tabsRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [location.pathname]);

  return (
    <header className="sticky top-0 z-40 bg-slate-900 text-white shadow-lg shadow-slate-900/10">
      {/* A soft glow in the colour of the signed-in role. It sits in its own clipped layer so the account menu can still overflow the header. */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className={`absolute -top-24 right-[10%] w-96 h-48 rounded-full blur-3xl ${theme.glow}`} />
        <div className="absolute -top-24 left-[20%] w-72 h-40 rounded-full bg-white/[0.03] blur-3xl" />
      </div>

      <div className="relative h-16 px-4 sm:px-6 flex items-center gap-3 sm:gap-5 max-w-[1500px] mx-auto">
        <button
          onClick={() => setMenuOpen(true)}
          className="lg:hidden p-2 -ml-2 rounded-lg text-slate-200 hover:bg-white/10"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <Brand to={getRoleLandingRoute(user?.role, user?.officer_level)} />

        <button
          onClick={() => setSearchOpen(true)}
          className="group flex-1 max-w-md inline-flex items-center gap-2.5 pl-3 pr-2 py-2 rounded-2xl border border-emerald-400/20 bg-gradient-to-r from-white/[0.08] to-emerald-400/[0.07] shadow-inner shadow-black/20 hover:border-emerald-400/50 hover:from-white/[0.12] hover:shadow-[0_0_0_3px_rgba(52,211,153,0.12)] text-slate-300 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          aria-label="Quick search (Ctrl+K)"
        >
          <span className="w-7 h-7 shrink-0 rounded-lg bg-emerald-400/15 text-emerald-300 flex items-center justify-center group-hover:bg-emerald-400/25 transition">
            <Search className="w-4 h-4" aria-hidden="true" />
          </span>
          <span className="hidden sm:inline truncate text-slate-400 group-hover:text-slate-200 transition">Search applications, pages…</span>
        </button>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <span
            className="hidden xl:inline-flex items-center gap-1.5 text-xs font-semibold text-slate-200 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/10"
            title="Current time in India (IST)"
          >
            <Clock className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
            <span className="tabular-nums">{time} IST</span>
          </span>
          {showAlerts && <AlertBell />}
          <UserMenu user={user} theme={theme} onLogout={logout} />
        </div>
      </div>

      <nav aria-label="Main" className="relative hidden lg:block border-t border-white/10">
        <div className="overflow-x-auto no-scrollbar">
          <div className="max-w-[1500px] mx-auto">
            <div ref={tabsRef} className="relative flex items-stretch gap-1 w-max min-w-full px-4 sm:px-6 pt-2">
              {indicator.visible && (
                <>
                  {/* the soft pill behind the current tab and the coloured line under it both glide to the tab you open */}
                  <span
                    aria-hidden="true"
                    className="absolute top-2 bottom-1.5 rounded-xl bg-white/10 ring-1 ring-white/10 transition-[left,width] duration-300 ease-out"
                    style={{ left: indicator.left, width: indicator.width }}
                  />
                  <span
                    aria-hidden="true"
                    className={`absolute bottom-0 h-[3px] rounded-t-full bg-gradient-to-r ${theme.avatar} transition-[left,width] duration-300 ease-out`}
                    style={{ left: indicator.left + 12, width: Math.max(indicator.width - 24, 8) }}
                  />
                </>
              )}
              {sections.map((section, i) => (
                <React.Fragment key={section.title}>
                  {i > 0 && <span className="self-center w-px h-5 bg-white/15 mx-2 shrink-0" aria-hidden="true" />}
                  <ul aria-label={section.title} className="flex items-stretch gap-0.5">
                    {section.links.map((item) => {
                      const Icon = item.icon;
                      return (
                        <li key={item.to} className="flex">
                          <NavLink
                            to={item.to}
                            className={({ isActive }) =>
                              `group relative z-10 inline-flex items-center gap-2 px-3.5 py-2.5 mb-1.5 rounded-xl text-[13px] whitespace-nowrap transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                                isActive
                                  ? 'text-white font-semibold'
                                  : 'text-slate-300 font-medium hover:text-white hover:bg-white/5'
                              }`
                            }
                          >
                            {({ isActive }) => (
                              <>
                                <Icon
                                  className={`w-4 h-4 shrink-0 transition duration-200 group-hover:-translate-y-0.5 group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`}
                                  aria-hidden="true"
                                />
                                {item.label}
                                <Badge badge={badges[item.to]} />
                              </>
                            )}
                          </NavLink>
                        </li>
                      );
                    })}
                  </ul>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </nav>

      <MobileDrawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        sections={sections}
        badges={badges}
        user={user}
        theme={theme}
        onLogout={logout}
      />
      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}
