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
  Building2,
} from 'lucide-react';

// Every page the top navigation can lead to, grouped, with the roles that may open it.
export const SECTIONS = [
  {
    title: 'Workspace',
    links: [
      { to: '/officer/dashboard', label: 'My Queue', icon: LayoutDashboard, roles: ['aicte_officer', 'system_admin'] },
      { to: '/officer/applications', label: 'Applications', icon: FileText, roles: ['aicte_officer', 'system_admin', 'auditor'] },
      { to: '/officer/alerts', label: 'Alerts', icon: BellRing, roles: ['aicte_officer', 'system_admin'] },
      { to: '/institution/dashboard', label: 'Institution Portal', icon: Building2, roles: ['institution_admin', 'institution_staff', 'system_admin'] },
    ],
  },
  {
    title: 'Compliance',
    links: [
      { to: '/officer/evc', label: 'EVC Scheduler', icon: CalendarCheck, roles: ['aicte_officer', 'system_admin'] },
      { to: '/officer/undertakings', label: 'Undertakings', icon: ClipboardList, roles: ['aicte_officer', 'system_admin'] },
      { to: '/officer/documents', label: 'Documents', icon: FolderCheck, roles: ['aicte_officer', 'system_admin'] },
    ],
  },
  {
    title: 'Insights',
    links: [
      { to: '/region/dashboard', label: 'Regional', icon: TrendingUp, roles: ['aicte_officer', 'system_admin'] },
      { to: '/national/dashboard', label: 'National', icon: Activity, roles: ['aicte_officer', 'system_admin'] },
      { to: '/bottlenecks', label: 'Bottlenecks', icon: Flame, roles: ['aicte_officer', 'system_admin', 'auditor'] },
    ],
  },
  {
    title: 'Administration',
    links: [
      { to: '/admin/workflow', label: 'Workflow Admin', icon: Settings, roles: ['system_admin'] },
      { to: '/audit', label: 'Audit Trail', icon: History, roles: ['auditor', 'system_admin', 'aicte_officer'] },
    ],
  },
];

/** The groups (and links within them) that a role may see. Empty groups are dropped. */
export function sectionsForRole(role) {
  return SECTIONS
    .map((s) => ({ ...s, links: s.links.filter((l) => l.roles.includes(role)) }))
    .filter((s) => s.links.length > 0);
}
