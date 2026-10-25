import React, { useEffect, useRef, useState } from 'react';
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

const regionLabel = (region) => (region === 'ALL' ? 'All regions' : `${region.charAt(0)}${region.slice(1).toLowerCase()} region`);

function Brand({ to }) {
  return (
    <Link to={to} className="flex items-center gap-2.5 shrink-0" aria-label="ApproFlow home">
      <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white font-extrabold text-sm shadow-sm">
        AF
      </span>
      <span className="hidden sm:block leading-tight">
        <span className="block text-base font-bold text-slate-900">ApproFlow</span>
        <span className="block text-[10px] font-medium text-slate-500">AICTE Approval Engine</span>
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
        className="flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-full hover:bg-slate-100 transition"
      >
        <span className={`w-9 h-9 rounded-full bg-gradient-to-br ${theme.avatar} text-white flex items-center justify-center font-bold text-xs shadow-sm`}>
          {initials(user)}
        </span>
        <span className="hidden md:block text-left leading-tight">
          <span className="block text-xs font-semibold text-slate-900">{displayName(user)}</span>
          <span className="block text-[11px] text-slate-500">{theme.title}</span>
        </span>
        <ChevronDown className={`hidden md:block w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
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

  // Close the mobile menu when the page changes, and keep the active tab in view on narrow desktops.
  useEffect(() => {
    setMenuOpen(false);
    tabsRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [location.pathname]);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="h-16 px-4 sm:px-6 flex items-center gap-3 sm:gap-5 max-w-[1500px] mx-auto">
        <button
          onClick={() => setMenuOpen(true)}
          className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <Brand to={getRoleLandingRoute(user?.role, user?.officer_level)} />

        <button
          onClick={() => setSearchOpen(true)}
          className="flex-1 max-w-md inline-flex items-center gap-2 pl-3 pr-2 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300 text-slate-500 text-sm transition"
          aria-label="Quick search (Ctrl+K)"
        >
          <Search className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span className="hidden sm:inline truncate">Search applications, pages…</span>
          <kbd className="hidden md:inline ml-auto text-[10px] font-semibold text-slate-400 border border-slate-200 bg-white rounded px-1.5 py-0.5">Ctrl K</kbd>
        </button>

        <div className="ml-auto flex items-center gap-2 sm:gap-4">
          <span
            className="hidden xl:inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200"
            title="Current time in India (IST)"
          >
            <Clock className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
            <span className="tabular-nums">{time} IST</span>
          </span>
          {showAlerts && <AlertBell />}
          <UserMenu user={user} theme={theme} onLogout={logout} />
        </div>
      </div>

      <nav aria-label="Main" className="hidden lg:block border-t border-slate-100 bg-white">
        <div ref={tabsRef} className="max-w-[1500px] mx-auto px-4 sm:px-6 flex items-stretch gap-1 overflow-x-auto no-scrollbar">
          {sections.map((section, i) => (
            <React.Fragment key={section.title}>
              {i > 0 && <span className="self-center w-px h-5 bg-slate-200 mx-2 shrink-0" aria-hidden="true" />}
              <ul aria-label={section.title} className="flex items-stretch gap-0.5">
                {section.links.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.to} className="flex">
                      <NavLink
                        to={item.to}
                        className={({ isActive }) =>
                          `group relative inline-flex items-center gap-2 px-3 py-3 text-[13px] whitespace-nowrap border-b-2 transition ${
                            isActive
                              ? 'text-emerald-800 font-semibold border-emerald-600 bg-gradient-to-t from-emerald-50 to-transparent'
                              : 'text-slate-600 font-medium border-transparent hover:text-slate-900 hover:border-slate-300 hover:bg-slate-50'
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-600' : 'text-slate-400 group-hover:text-emerald-600'}`} aria-hidden="true" />
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
