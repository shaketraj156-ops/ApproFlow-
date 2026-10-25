// How each kind of officer is presented: a title, and the colours of their banner and avatar.
// Class names are written out in full so Tailwind can see them.

const THEMES = {
  section: {
    key: 'section',
    title: 'Section officer',
    tagline: 'Your queue, your deadlines',
    gradient: 'from-slate-900 via-emerald-950 to-emerald-700',
    glow: 'bg-emerald-400/20',
    avatar: 'from-emerald-400 to-teal-600',
    chip: 'bg-emerald-300/15 text-emerald-100 border-emerald-200/30',
  },
  regional: {
    key: 'regional',
    title: 'Regional head',
    tagline: 'Your region at a glance',
    gradient: 'from-slate-900 via-sky-950 to-cyan-700',
    glow: 'bg-cyan-300/20',
    avatar: 'from-sky-400 to-cyan-600',
    chip: 'bg-sky-300/15 text-sky-100 border-sky-200/30',
  },
  national: {
    key: 'national',
    title: 'National head',
    tagline: 'The whole pipeline, one view',
    gradient: 'from-slate-900 via-indigo-950 to-violet-700',
    glow: 'bg-violet-300/20',
    avatar: 'from-violet-400 to-indigo-600',
    chip: 'bg-violet-300/15 text-violet-100 border-violet-200/30',
  },
  admin: {
    key: 'admin',
    title: 'System administrator',
    tagline: 'Configure and oversee',
    gradient: 'from-slate-900 via-slate-800 to-emerald-800',
    glow: 'bg-emerald-300/15',
    avatar: 'from-slate-500 to-slate-700',
    chip: 'bg-white/10 text-slate-100 border-white/20',
  },
  auditor: {
    key: 'auditor',
    title: 'Auditor',
    tagline: 'Who did what, and when',
    gradient: 'from-slate-900 via-slate-800 to-amber-700',
    glow: 'bg-amber-300/15',
    avatar: 'from-amber-400 to-orange-600',
    chip: 'bg-amber-300/15 text-amber-100 border-amber-200/30',
  },
  institution: {
    key: 'institution',
    title: 'Institution',
    tagline: 'Your application, your deadlines',
    gradient: 'from-slate-900 via-teal-950 to-teal-700',
    glow: 'bg-teal-300/20',
    avatar: 'from-teal-400 to-emerald-600',
    chip: 'bg-teal-300/15 text-teal-100 border-teal-200/30',
  },
};

export function roleTheme(user) {
  if (user?.role === 'aicte_officer') {
    if (user.officer_level === 'NATIONAL_HEAD') return THEMES.national;
    if (user.officer_level === 'REGIONAL_HEAD') return THEMES.regional;
    return THEMES.section;
  }
  if (user?.role === 'system_admin') return THEMES.admin;
  if (user?.role === 'auditor') return THEMES.auditor;
  if (user?.role === 'institution_admin' || user?.role === 'institution_staff') return THEMES.institution;
  return THEMES.section;
}

/** "Dr. S. Sharma (Regional Head - WEST)" becomes "Dr. S. Sharma"; the role is shown separately. */
export function displayName(user) {
  const name = user?.full_name || '';
  return name.replace(/\s*\(.*\)\s*$/, '').trim() || 'there';
}

export function initials(user) {
  const parts = displayName(user).replace(/^(Dr|Prof|Mr|Ms|Mrs)\.?\s+/i, '').split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || 'U';
}
