import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  BellRing,
  CalendarCheck,
  ClipboardList,
  FolderCheck,
  TrendingUp,
  Flame,
  Settings,
  Activity,
  History,
  Building2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export function Sidebar() {
  const { user } = useAuth();
  const role = user?.role;

  const links = [
    { to: '/officer/dashboard', label: 'My Queue', icon: LayoutDashboard, roles: ['aicte_officer', 'system_admin'] },
    { to: '/officer/applications', label: 'Applications', icon: FileText, roles: ['aicte_officer', 'system_admin', 'auditor'] },
    { to: '/officer/alerts', label: 'Alerts Center', icon: BellRing, roles: ['aicte_officer', 'system_admin'] },
    { to: '/officer/evc', label: 'EVC Scheduler', icon: CalendarCheck, roles: ['aicte_officer', 'system_admin'] },
    { to: '/officer/undertakings', label: 'Undertakings', icon: ClipboardList, roles: ['aicte_officer', 'system_admin'] },
    { to: '/officer/documents', label: 'Document Validity', icon: FolderCheck, roles: ['aicte_officer', 'system_admin'] },
    { to: '/region/dashboard', label: 'Regional View', icon: TrendingUp, roles: ['aicte_officer', 'system_admin'] },
    { to: '/national/dashboard', label: 'National Command', icon: Activity, roles: ['aicte_officer', 'system_admin'] },
    { to: '/bottlenecks', label: 'Bottlenecks', icon: Flame, roles: ['aicte_officer', 'system_admin'] },
    { to: '/institution/dashboard', label: 'Institution Portal', icon: Building2, roles: ['institution_admin', 'institution_staff', 'system_admin'] },
    { to: '/admin/workflow', label: 'Workflow Admin', icon: Settings, roles: ['system_admin'] },
    { to: '/audit', label: 'Audit Trail', icon: History, roles: ['auditor', 'system_admin', 'aicte_officer'] },
  ];

  const filteredLinks = links.filter(l => !l.roles || l.roles.includes(role));

  return (
    <aside className="w-64 border-r border-slate-200 bg-white flex flex-col h-screen sticky top-0">
      <div className="h-16 flex items-center px-6 border-b border-slate-200">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-extrabold text-sm shadow-xs">
            AF
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-tight">ApproFlow</h1>
            <p className="text-[10px] text-slate-500 font-medium">AICTE Approval Engine</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {filteredLinks.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-100'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-100 text-center">
        <p className="text-[11px] text-slate-400">SIH26262 Prototype v1.0</p>
      </div>
    </aside>
  );
}
