import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldCheck, UserCheck, Building2, KeyRound, Settings2, ArrowRight,
  Workflow, BellRing, CalendarCheck, ArrowLeft
} from 'lucide-react';
import { getRoleLandingRoute } from '../../routes/roleLanding';

const PERSONAS = [
  {
    role: 'aicte_officer', level: 'SECTION_OFFICER', region: 'NORTH',
    title: 'Section / Scrutiny Officer', subtitle: 'North Region • My Queue',
    icon: UserCheck, tone: 'text-emerald-600 bg-emerald-50 group-hover:bg-emerald-100',
  },
  {
    role: 'aicte_officer', level: 'REGIONAL_HEAD', region: 'WEST',
    title: 'Regional Head (West)', subtitle: 'EVC scheduler • Regional bottlenecks',
    icon: ShieldCheck, tone: 'text-blue-600 bg-blue-50 group-hover:bg-blue-100',
  },
  {
    role: 'aicte_officer', level: 'NATIONAL_HEAD', region: 'ALL',
    title: 'National Head (Member Secretary)', subtitle: 'National heatmap • Cross-region view',
    icon: KeyRound, tone: 'text-purple-600 bg-purple-50 group-hover:bg-purple-100',
  },
  {
    role: 'institution_admin', level: 'SECTION_OFFICER', region: 'NORTH',
    title: 'Institution Admin', subtitle: 'Status tracking • Undertaking uploads',
    icon: Building2, tone: 'text-amber-600 bg-amber-50 group-hover:bg-amber-100',
  },
  {
    role: 'system_admin', level: 'SECTION_OFFICER', region: 'NORTH',
    title: 'System Administrator', subtitle: 'Configure stages, SLA & daily jobs',
    icon: Settings2, tone: 'text-indigo-600 bg-indigo-50 group-hover:bg-indigo-100',
  },
];

const HIGHLIGHTS = [
  { icon: Workflow, text: 'Configurable approval stages with SLA tracking' },
  { icon: BellRing, text: 'Automatic reminders and widening escalations' },
  { icon: CalendarCheck, text: 'Clash-free EVC scheduling and document validity' },
];

export function Login() {
  const { loginAsRole } = useAuth();
  const navigate = useNavigate();

  const handleRoleLogin = (persona) => {
    loginAsRole(persona.role, persona.level, persona.region);
    navigate(getRoleLandingRoute(persona.role, persona.level));
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-slate-50">
      {/* Brand panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 text-white bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-900 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl" aria-hidden="true" />
        <div className="absolute -bottom-32 -left-16 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl" aria-hidden="true" />

        <Link to="/" className="relative flex items-center gap-3 w-fit" aria-label="ApproFlow homepage">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center font-black text-lg shadow-lg">
            AF
          </div>
          <span className="text-xl font-bold tracking-tight">ApproFlow</span>
        </Link>

        <div className="relative max-w-md">
          <h1 className="text-4xl font-bold leading-tight tracking-tight">
            Approvals that move on time, every time.
          </h1>
          <p className="mt-4 text-slate-300 leading-relaxed">
            AICTE approval workflow automation, compliance monitoring and alert management in one place.
          </p>
          <ul className="mt-8 space-y-4">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-slate-200">
                <span className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-emerald-300" aria-hidden="true" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-slate-400">SIH26262 • Synthetic demo environment</p>
      </div>

      {/* Persona picker */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md animate-fadeIn">
          <Link to="/" className="lg:hidden flex items-center gap-3 mb-8 w-fit" aria-label="ApproFlow homepage">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center font-black text-white shadow">
              AF
            </div>
            <span className="text-lg font-bold text-slate-900">ApproFlow</span>
          </Link>

          <Link to="/" className="inline-flex items-center gap-1.5 mb-5 text-sm font-medium text-slate-500 hover:text-emerald-700 transition">
            <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back to homepage
          </Link>

          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Welcome back</h2>
          <p className="text-sm text-slate-500 mt-1">
            Demo evaluation — choose a persona to explore the portal.
          </p>

          <div className="mt-6 space-y-3">
            {PERSONAS.map((p) => {
              const Icon = p.icon;
              return (
                <button
                  key={p.title}
                  onClick={() => handleRoleLogin(p)}
                  className="group w-full flex items-center gap-4 p-4 rounded-2xl bg-white border border-slate-200 shadow-card hover:border-emerald-300 hover:shadow-md transition text-left"
                >
                  <span className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition ${p.tone}`}>
                    <Icon className="w-5 h-5" aria-hidden="true" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-slate-900">{p.title}</span>
                    <span className="block text-xs text-slate-500 mt-0.5">{p.subtitle}</span>
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition" aria-hidden="true" />
                </button>
              );
            })}
          </div>

          <p className="mt-8 text-[11px] text-center text-slate-400">
            Synthetic data only. No real institution, student or officer information.
          </p>
        </div>
      </div>
    </div>
  );
}
