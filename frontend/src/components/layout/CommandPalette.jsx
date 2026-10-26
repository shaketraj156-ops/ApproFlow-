import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, CornerDownLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { applicationsService } from '../../services/applicationsService';
import { SECTIONS } from './navConfig';
import { StatusBadge } from '../common/StatusBadge';

const APPLICATION_ROLES = ['aicte_officer', 'auditor', 'system_admin'];

/**
 * Quick search (Ctrl+K). Type to jump to a page or an application; arrow keys move, Enter opens, Escape closes.
 */
export function CommandPalette({ open, onClose }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [applications, setApplications] = useState([]);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const pages = useMemo(
    () => SECTIONS.flatMap((s) => s.links).filter((l) => l.roles.includes(user?.role)),
    [user?.role]
  );

  // Applications are fetched once, when the palette is first opened.
  useEffect(() => {
    if (!open || applications.length > 0 || !APPLICATION_ROLES.includes(user?.role)) return;
    applicationsService.getApplications({ page_size: 100 })
      .then((res) => setApplications(res?.items || []))
      .catch(() => {});
  }, [open, applications.length, user?.role]);

  useEffect(() => {
    if (!open) return undefined;
    setQuery('');
    setActive(0);
    const previous = document.activeElement;
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      cancelAnimationFrame(id);
      previous?.focus?.();
    };
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matchedPages = pages
      .filter((p) => !q || p.label.toLowerCase().includes(q))
      .map((p) => ({ kind: 'page', key: p.to, label: p.label, to: p.to, icon: p.icon }));
    const matchedApps = q
      ? applications
          .filter((a) => a.application_number.toLowerCase().includes(q) || (a.institution_name || '').toLowerCase().includes(q))
          .slice(0, 6)
          .map((a) => ({ kind: 'application', key: a.id, label: a.application_number, sub: a.institution_name, stage: a.current_stage_code, to: `/officer/applications/${a.id}` }))
      : [];
    return [...matchedPages, ...matchedApps];
  }, [query, pages, applications]);

  // Keep the highlighted row in range and in view.
  useEffect(() => { setActive((a) => Math.min(a, Math.max(results.length - 1, 0))); }, [results.length]);
  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  if (!open) return null;

  function choose(item) {
    onClose();
    navigate(item.to);
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => (results.length ? (a + 1) % results.length : 0)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => (results.length ? (a - 1 + results.length) % results.length : 0)); }
    else if (e.key === 'Enter' && results[active]) { e.preventDefault(); choose(results[active]); }
  }

  const groups = [
    { title: 'Pages', items: results.filter((r) => r.kind === 'page') },
    { title: 'Applications', items: results.filter((r) => r.kind === 'application') },
  ].filter((g) => g.items.length > 0);

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-[12vh] px-4 bg-gradient-to-b from-slate-900/70 to-emerald-950/60"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div role="dialog" aria-modal="true" aria-label="Quick search" className="w-full max-w-xl bg-white rounded-3xl shadow-2xl shadow-emerald-900/30 ring-1 ring-white/20 border border-slate-200 overflow-hidden animate-fadeIn">
        <div className="flex items-center gap-3 px-5 border-b border-slate-100 bg-gradient-to-r from-emerald-50 via-white to-indigo-50/60">
          <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/30 shrink-0">
            <Search className="w-4 h-4" aria-hidden="true" />
          </span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActive(0); }}
            onKeyDown={onKeyDown}
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-activedescendant={results[active] ? `palette-${active}` : undefined}
            aria-label="Search pages and applications"
            placeholder={APPLICATION_ROLES.includes(user?.role) ? 'Search pages, applications, institutions…' : 'Search pages…'}
            className="flex-1 py-5 text-base font-medium bg-transparent outline-none focus:outline-none focus-visible:outline-none placeholder:text-slate-400"
          />
          <kbd className="hidden sm:inline text-[10px] font-bold text-slate-500 border border-slate-200 bg-white rounded-md px-2 py-1 shadow-xs">Esc</kbd>
        </div>

        <div id="palette-list" role="listbox" ref={listRef} className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-slate-500">No matches for “{query}”.</p>
          ) : (
            groups.map((g) => (
              <div key={g.title} role="group" aria-label={g.title}>
                <p className="px-3 pt-3 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-700/70">{g.title}</p>
                {g.items.map((item) => {
                  const index = results.indexOf(item);
                  const Icon = item.icon || FileText;
                  const isActive = index === active;
                  return (
                    <div
                      key={item.key}
                      id={`palette-${index}`}
                      data-index={index}
                      role="option"
                      aria-selected={isActive}
                      onMouseEnter={() => setActive(index)}
                      onClick={() => choose(item)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer border-l-4 transition-colors ${isActive ? 'bg-gradient-to-r from-emerald-50 to-white border-emerald-500' : 'border-transparent'}`}
                    >
                      <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition ${isActive ? 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/30' : 'bg-slate-100 text-slate-500'}`}>
                        <Icon className="w-4 h-4" aria-hidden="true" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold text-slate-900 truncate">{item.label}</span>
                        {item.sub && <span className="block text-xs text-slate-500 truncate">{item.sub}</span>}
                      </span>
                      {item.stage && <StatusBadge status={item.stage} />}
                      {isActive && <CornerDownLeft className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-hidden="true" />}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="flex items-center gap-4 px-5 py-2.5 border-t border-slate-100 bg-slate-50 text-[11px] text-slate-500">
          {[['↑↓', 'move'], ['Enter', 'open'], ['Esc', 'close']].map(([k, t]) => (
            <span key={k} className="inline-flex items-center gap-1.5"><kbd className="font-bold text-slate-600 bg-white border border-slate-200 rounded-md px-1.5 py-0.5 shadow-xs">{k}</kbd> {t}</span>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
