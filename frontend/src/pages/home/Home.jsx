import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getRoleLandingRoute } from '../../routes/roleLanding';
import {
  Workflow, BellRing, CalendarCheck, ClipboardCheck, FileCheck2, BarChart3,
  History, ShieldCheck, ArrowRight, Menu, X, CheckCircle2, Building2,
  UserCheck, Settings2, Eye, KeyRound, TrendingUp, Scale, Lock, Layers,
  ChevronDown, Sparkles, Clock
} from 'lucide-react';

// Three.js is large, so the scene loads after the page is already usable.
const HeroScene = lazy(() => import('../../components/home/HeroScene'));

const NAV_LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#roles', label: 'Who it is for' },
  { href: '#escalation', label: 'Escalation' },
  { href: '#faq', label: 'FAQ' },
];

const STATS = [
  { value: '7', label: 'Configurable stages', hint: 'From submission to decision' },
  { value: '4', label: 'Escalation levels', hint: 'Owner up to national head' },
  { value: '6', label: 'Role-based views', hint: 'One question per screen' },
  { value: '1', label: 'Audit trail', hint: 'Every change, who and when' },
];

const FEATURES = [
  {
    icon: Workflow, title: 'Configurable approval workflow',
    text: 'Applications move through scrutiny, EVC, regional committee and decision. Stages, SLA days and owners are data, so the process can change without a code release.',
  },
  {
    icon: BellRing, title: 'Reminders and escalation',
    text: 'Officers are reminded before a deadline. After it passes, the alert widens to section head, regional head and national head. Running the daily check twice never duplicates an alert.',
  },
  {
    icon: CalendarCheck, title: 'Clash-free EVC scheduling',
    text: 'Suggests dates and committees from experts who are free, in the right region and under their visit limit, and re-checks clashes at the moment of confirmation.',
  },
  {
    icon: ClipboardCheck, title: 'Undertakings and compliance',
    text: 'Time-bound commitments with a clear submit, verify or reject flow. Rejected evidence goes back to the institution to resubmit.',
  },
  {
    icon: FileCheck2, title: 'Document validity tracking',
    text: 'Lease and similar documents are watched for expiry, marked expiring or expired automatically, and cleared again once renewed.',
  },
  {
    icon: BarChart3, title: 'Dashboards with one purpose each',
    text: 'Officers see what needs action today. Regional and national heads see where the delays are. Institutions see where their application stands.',
  },
  {
    icon: History, title: 'Complete audit trail',
    text: 'Every move, hold, assignment, visit and configuration change is recorded with who did it and the state before and after.',
  },
  {
    icon: TrendingUp, title: 'Priority score and delay hints',
    text: 'A transparent priority score and a "may need attention" hint help officers decide where to look first. They support people; they never judge an institution.',
  },
];

const STAGES = [
  { code: 'SUBMITTED', name: 'Submitted' },
  { code: 'SCRUTINY', name: 'Scrutiny' },
  { code: 'RE_SCRUTINY', name: 'Re-scrutiny', note: 'if deficiencies' },
  { code: 'EVC', name: 'Expert visit' },
  { code: 'REGIONAL', name: 'Regional committee' },
  { code: 'SAC_SHC', name: 'SAC / SHC' },
  { code: 'DECIDED', name: 'Decision' },
];

const ROLES = [
  { icon: UserCheck, name: 'Section / Scrutiny officer', question: 'What needs my action today?', tone: 'text-emerald-700 bg-emerald-50' },
  { icon: ShieldCheck, name: 'Regional head', question: 'Where is my region slow?', tone: 'text-blue-700 bg-blue-50' },
  { icon: KeyRound, name: 'National head', question: 'Where are the national bottlenecks?', tone: 'text-purple-700 bg-purple-50' },
  { icon: Building2, name: 'Institution', question: 'Where is my application, and what is due?', tone: 'text-amber-700 bg-amber-50' },
  { icon: Eye, name: 'Auditor', question: 'Who did what, and when?', tone: 'text-slate-700 bg-slate-100' },
  { icon: Settings2, name: 'System admin', question: 'Can I change stages and rules without code?', tone: 'text-indigo-700 bg-indigo-50' },
];

// Step height grows with severity; the class names are written out so Tailwind can see them.
const LADDER = [
  { level: 'Reminder', when: 'Before the deadline', who: 'Owner officer', bar: 'bg-emerald-500', height: 'h-14' },
  { level: 'Level 1', when: 'Deadline passed', who: 'Owner officer', bar: 'bg-amber-400', height: 'h-20' },
  { level: 'Level 2', when: 'A few days overdue', who: 'Section head', bar: 'bg-orange-500', height: 'h-28' },
  { level: 'Level 3', when: 'About a week overdue', who: 'Regional head', bar: 'bg-red-500', height: 'h-36' },
  { level: 'Level 4', when: 'Long overdue', who: 'National head', bar: 'bg-red-700', height: 'h-44' },
];

const PRINCIPLES = [
  { icon: Layers, title: 'Rules live in data', text: 'Anything that can change in the process lives in tables, not code.' },
  { icon: Scale, title: 'Decision support only', text: 'It never approves or rejects. Officers record every decision.' },
  { icon: Lock, title: 'Access that holds', text: 'Permissions are enforced in the API and the database, not just hidden in the menu.' },
];

const FAQ = [
  {
    q: 'Does Valid8 approve or reject applications?',
    a: 'No. It tracks, reminds and escalates. Officers move an application between stages and record every decision themselves.',
  },
  {
    q: 'Are the stage names and deadlines official AICTE values?',
    a: 'No. Stage names, SLA days, reminder offsets and escalation thresholds shown here are placeholders. An administrator can change them without a code release.',
  },
  {
    q: 'Is this running on real institution data?',
    a: 'No. This is a prototype that uses synthetic data only. No real institution, student or officer information is stored.',
  },
  {
    q: 'What happens when a deadline is missed?',
    a: 'The owner is alerted first. The longer it stays overdue, the wider the audience: section head, regional head, then national head. An alert clears itself once the cause is resolved.',
  },
];

/** Where the main call-to-action goes: the dashboard when signed in, otherwise the login page. */
function usePortalLink() {
  const { user } = useAuth();
  return user
    ? { to: getRoleLandingRoute(user.role, user.officer_level), signedIn: true }
    : { to: '/login', signedIn: false };
}

/** Fades and lifts content in each time it scrolls into view. Skips the animation for reduced-motion users. */
function Reveal({ children, delay = 0, className = '' }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!node || reduce || typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      // Not disconnected: the block resets when it leaves the screen, so the entrance plays on every scroll.
      ([entry]) => setShown(entry.isIntersecting),
      { threshold: 0.12 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: shown ? `${delay}ms` : '0ms' }}
      className={`transition-[opacity,transform] will-change-[opacity,transform] duration-700 ease-out ${shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'} ${className}`}
    >
      {children}
    </div>
  );
}

function Logo({ light = false }) {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="Valid8 home">
      <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-700 flex items-center justify-center text-white font-extrabold text-sm shadow-sm">
        V8
      </span>
      <span className={`text-lg font-bold tracking-tight ${light ? 'text-white' : 'text-slate-900'}`}>Valid8</span>
    </Link>
  );
}

function SiteHeader() {
  const [open, setOpen] = useState(false);
  const portal = usePortalLink();

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-50 bg-slate-900 border-b border-white/10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Logo light />

        <nav className="hidden md:flex items-center gap-7" aria-label="Page sections">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-sm font-medium text-slate-300 hover:text-white transition">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to={portal.to}
            className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-900 text-sm font-bold shadow-sm transition"
          >
            {portal.signedIn ? 'Go to dashboard' : 'Sign in'} <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
          <button
            onClick={() => setOpen((v) => !v)}
            className="md:hidden p-2 rounded-lg text-slate-200 hover:bg-white/10"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="mobile-menu"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-menu" className="md:hidden border-t border-white/10 bg-slate-900 px-4 py-3 space-y-1" aria-label="Page sections">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-sm font-medium text-slate-200 hover:bg-white/10"
            >
              {l.label}
            </a>
          ))}
          <Link to={portal.to} className="block px-3 py-2.5 rounded-lg text-sm font-semibold text-emerald-300 hover:bg-white/10">
            {portal.signedIn ? 'Go to dashboard' : 'Sign in'}
          </Link>
        </nav>
      )}
    </header>
  );
}

/** A static picture of the officer queue with two floating notifications. Decoration only. */
function ProductPreview() {
  const rows = [
    { no: 'AICTE-2026-10042', stage: 'Scrutiny', sla: '2 days overdue', tone: 'bg-red-50 text-red-700 border-red-200', score: 82, bar: 'bg-red-500' },
    { no: 'AICTE-2026-10017', stage: 'Expert visit', sla: '1 day left', tone: 'bg-amber-50 text-amber-800 border-amber-200', score: 61, bar: 'bg-amber-500' },
    { no: 'AICTE-2026-10033', stage: 'Regional committee', sla: '9 days left', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200', score: 28, bar: 'bg-emerald-500' },
  ];
  const funnel = [90, 70, 52, 38, 24, 14];

  return (
    <div aria-hidden="true" className="relative preview-3d">
      <div className="absolute -inset-6 bg-gradient-to-tr from-emerald-400/20 via-transparent to-indigo-400/20 rounded-[2rem]" />

      <div className="relative rounded-2xl border border-white/10 bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center gap-1.5 px-4 py-3 border-b border-slate-100 bg-slate-50">
          <span className="w-2.5 h-2.5 rounded-full bg-red-300" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-300" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-300" />
          <span className="ml-3 text-[11px] font-medium text-slate-400">Valid8 · My Queue</span>
        </div>

        <div className="flex">
          <div className="hidden sm:flex flex-col gap-2 w-12 border-r border-slate-100 bg-slate-50/60 py-3 items-center">
            {[Layers, Clock, CalendarCheck, BarChart3].map((Icon, i) => (
              <span key={i} className={`w-8 h-8 rounded-lg flex items-center justify-center ${i === 0 ? 'bg-emerald-100 text-emerald-700' : 'text-slate-400'}`}>
                <Icon className="w-4 h-4" />
              </span>
            ))}
          </div>

          <div className="flex-1 p-4 space-y-4 min-w-0">
            <div className="grid grid-cols-3 gap-3">
              {[['Assigned', '12', 'text-slate-900'], ['Overdue', '3', 'text-red-600'], ['Due this week', '5', 'text-amber-600']].map(([label, value, tone]) => (
                <div key={label} className="rounded-xl border border-slate-200 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
                  <p className={`mt-1 text-xl font-bold tabular-nums ${tone}`}>{value}</p>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Pipeline by stage</p>
              <div className="mt-2 flex items-end gap-2 h-14">
                {funnel.map((h, i) => (
                  <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-emerald-600 to-emerald-400" style={{ height: `${h}%`, opacity: 1 - i * 0.1 }} />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              {rows.map((r) => (
                <div key={r.no} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{r.no}</p>
                    <p className="text-[11px] text-slate-500">{r.stage}</p>
                  </div>
                  <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${r.tone}`}>{r.sla}</span>
                  <div className="hidden md:flex items-center gap-1.5 w-20 shrink-0">
                    <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className={`h-full ${r.bar}`} style={{ width: `${r.score}%` }} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-600">{r.score}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="hidden sm:flex absolute -top-6 -right-4 lg:-right-8 animate-float items-center gap-3 rounded-2xl bg-white shadow-xl border border-slate-100 px-4 py-3">
        <span className="relative w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
          <span className="absolute inset-0 rounded-xl bg-amber-300 animate-pulseRing" />
          <BellRing className="relative w-4 h-4" />
        </span>
        <div>
          <p className="text-xs font-bold text-slate-900">SLA reminder</p>
          <p className="text-[11px] text-slate-500">Scrutiny due in 3 days</p>
        </div>
      </div>

      <div className="hidden sm:flex absolute -bottom-12 -left-4 lg:-left-8 animate-floatSlow items-center gap-3 rounded-2xl bg-white shadow-xl border border-slate-100 px-4 py-3">
        <span className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
          <CalendarCheck className="w-4 h-4" />
        </span>
        <div>
          <p className="text-xs font-bold text-slate-900">EVC confirmed</p>
          <p className="text-[11px] text-slate-500">3 experts, no clashes</p>
        </div>
      </div>
    </div>
  );
}

function Hero() {
  const portal = usePortalLink();
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-900 text-white">
      <div className="absolute inset-0 opacity-[0.07]" aria-hidden="true"
        style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '44px 44px' }} />
      <div className="absolute -top-24 -right-24 w-[28rem] h-[28rem] rounded-full" style={{ background: 'radial-gradient(closest-side, rgba(16,185,129,0.3), transparent)' }} aria-hidden="true" />
      <div className="absolute -bottom-32 -left-16 w-[28rem] h-[28rem] rounded-full" style={{ background: 'radial-gradient(closest-side, rgba(99,102,241,0.3), transparent)' }} aria-hidden="true" />
      <Suspense fallback={null}>
        <HeroScene className="absolute inset-0" />
      </Suspense>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-28 sm:pt-24 sm:pb-36 grid lg:grid-cols-2 gap-16 items-center">
        <div className="animate-fadeIn">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-emerald-200 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            AICTE 8-Point Norms Approval Workflow
          </span>
          <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05]">
            Approvals that move on time,{' '}
            <span className="bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent">every time.</span>
          </h1>
          <p className="mt-6 text-lg text-slate-300 leading-relaxed max-w-xl">
            Valid8 moves AICTE applications through configurable stages, watches every deadline,
            schedules expert visits without clashes, and escalates automatically when something is late.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              to={portal.to}
              className="group w-full sm:w-auto justify-center inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold shadow-lg shadow-emerald-900/30 transition"
            >
              {portal.signedIn ? 'Go to your dashboard' : 'Open the portal'}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition" aria-hidden="true" />
            </Link>
            <a
              href="#how-it-works"
              className="w-full sm:w-auto justify-center inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 text-white font-semibold transition"
            >
              See how it works
            </a>
          </div>
          <ul className="mt-9 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-300">
            {['Every change audited', 'Role-based access', 'Times shown in IST'].map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" aria-hidden="true" /> {t}
              </li>
            ))}
          </ul>
        </div>
        <ProductPreview />
      </div>
    </section>
  );
}

function StatsStrip() {
  return (
    <section aria-label="At a glance" className="relative z-10 -mt-14 px-4 sm:px-6">
      <Reveal>
        <dl className="max-w-5xl mx-auto grid grid-cols-2 lg:grid-cols-4 rounded-2xl bg-white border border-slate-200 shadow-xl divide-x divide-y lg:divide-y-0 divide-slate-100 overflow-hidden">
          {STATS.map((s) => (
            <div key={s.label} className="p-5 sm:p-6 text-center">
              <dd className="text-4xl font-extrabold tracking-tight bg-gradient-to-br from-emerald-600 to-teal-500 bg-clip-text text-transparent">{s.value}</dd>
              <dt className="mt-1 text-sm font-semibold text-slate-900">{s.label}</dt>
              <p className="text-xs text-slate-500 mt-0.5">{s.hint}</p>
            </div>
          ))}
        </dl>
      </Reveal>
    </section>
  );
}

function SectionHeading({ eyebrow, title, text, light = false }) {
  return (
    <div className="max-w-2xl mx-auto text-center">
      <p className={`text-xs font-bold uppercase tracking-widest ${light ? 'text-emerald-400' : 'text-emerald-600'}`}>{eyebrow}</p>
      <h2 className={`mt-2 text-3xl sm:text-4xl font-bold tracking-tight ${light ? 'text-white' : 'text-slate-900'}`}>{title}</h2>
      {text && <p className={`mt-3 ${light ? 'text-slate-300' : 'text-slate-600'}`}>{text}</p>}
    </div>
  );
}

function Features() {
  const [first, second, ...rest] = FEATURES;
  const FirstIcon = first.icon;
  const SecondIcon = second.icon;

  return (
    <section id="features" className="scroll-mt-20 pt-24 pb-20 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <Reveal>
          <SectionHeading
            eyebrow="Features"
            title="Everything an approval desk needs"
            text="Built around how applications actually flow: stages, deadlines, visits, commitments and documents."
          />
        </Reveal>

        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <Reveal className="sm:col-span-2">
            <article className="relative h-full overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-emerald-900 text-white p-7 shadow-card">
              <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full" style={{ background: 'radial-gradient(closest-side, rgba(52,211,153,0.2), transparent)' }} aria-hidden="true" />
              <span className="relative w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center">
                <FirstIcon className="w-5 h-5 text-emerald-300" aria-hidden="true" />
              </span>
              <h3 className="relative mt-5 text-lg font-bold">{first.title}</h3>
              <p className="relative mt-2 text-sm text-slate-300 leading-relaxed max-w-lg">{first.text}</p>
              <ul className="relative mt-5 flex flex-wrap gap-2" aria-hidden="true">
                {['Submitted', 'Scrutiny', 'EVC', 'Committee', 'Decision'].map((s, i) => (
                  <li key={s} className="inline-flex items-center gap-2 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/10 border border-white/10">
                    <span className="w-4 h-4 rounded-full bg-emerald-400 text-slate-900 text-[9px] font-extrabold flex items-center justify-center">{i + 1}</span>
                    {s}
                  </li>
                ))}
              </ul>
            </article>
          </Reveal>

          <Reveal delay={100}>
            <article className="h-full rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 p-7 shadow-card">
              <span className="w-11 h-11 rounded-xl bg-white shadow-sm flex items-center justify-center">
                <SecondIcon className="w-5 h-5 text-emerald-700" aria-hidden="true" />
              </span>
              <h3 className="mt-5 text-lg font-bold text-slate-900">{second.title}</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">{second.text}</p>
            </article>
          </Reveal>

          {rest.map(({ icon: Icon, title, text }, i) => (
            <Reveal key={title} delay={(i % 3) * 90}>
              <article className="group h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-card hover:shadow-lg hover:-translate-y-1 hover:border-emerald-200 transition">
                <span className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition">
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-sm font-bold text-slate-900">{title}</h3>
                <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{text}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 py-20 bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <Reveal>
          <SectionHeading
            eyebrow="How it works"
            title="One application, seven stages, no lost files"
            text="Each stage has an owner and a deadline. Stage names and SLA days shown here are placeholders that an administrator can change."
          />
        </Reveal>

        <div className="relative mt-14">
          <div className="hidden lg:block absolute top-5 left-[7%] right-[7%] h-0.5 bg-gradient-to-r from-emerald-200 via-emerald-400 to-emerald-600" aria-hidden="true" />
          <ol className="relative grid sm:grid-cols-2 lg:grid-cols-7 gap-6">
            {STAGES.map((s, i) => (
              <li key={s.code}>
                <Reveal delay={i * 80} className="flex lg:flex-col items-center lg:text-center gap-4 lg:gap-0">
                  <span className="relative z-10 w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-white text-sm font-bold flex items-center justify-center shadow-md ring-4 ring-slate-50">
                    {i + 1}
                  </span>
                  <div className="lg:mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-card w-full lg:min-h-[4.5rem] flex flex-col justify-center">
                    <p className="text-sm font-semibold text-slate-900">{s.name}</p>
                    {s.note && <p className="text-[11px] text-amber-700 mt-0.5">{s.note}</p>}
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>

        <p className="mt-8 text-center text-xs text-slate-500">
          An officer moves the application on and records the decision. The system tracks, reminds and escalates; it never decides.
        </p>
      </div>
    </section>
  );
}

function Roles() {
  return (
    <section id="roles" className="scroll-mt-20 py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <Reveal>
          <SectionHeading
            eyebrow="Who it is for"
            title="A clear view for every role"
            text="Each person lands on the screen that answers their main question. Pick a role to explore the demo."
          />
        </Reveal>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {ROLES.map(({ icon: Icon, name, question, tone }, i) => (
            <Reveal key={name} delay={(i % 3) * 90}>
              <Link
                to="/login"
                className="group flex items-center gap-4 h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-card hover:border-emerald-300 hover:shadow-lg hover:-translate-y-0.5 transition"
              >
                <span className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${tone}`}>
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-bold text-slate-900">{name}</span>
                  <span className="block mt-1 text-sm text-slate-600">&ldquo;{question}&rdquo;</span>
                </span>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition" aria-hidden="true" />
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Escalation() {
  return (
    <section id="escalation" className="scroll-mt-20 py-20 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 text-white relative overflow-hidden">
      <div className="absolute -top-24 left-1/2 w-[32rem] h-[32rem] -translate-x-1/2 rounded-full" style={{ background: 'radial-gradient(closest-side, rgba(16,185,129,0.2), transparent)' }} aria-hidden="true" />
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
        <Reveal>
          <SectionHeading
            light
            eyebrow="Escalation"
            title="Delays get louder, not lost"
            text="Reminders go out before a deadline. Once it passes, each level notifies a wider audience. Thresholds are configuration, not code."
          />
        </Reveal>

        <ol className="mt-14 grid grid-cols-2 sm:grid-cols-5 gap-4 items-end">
          {LADDER.map((l, i) => (
            <li key={l.level} className={i === 4 ? 'col-span-2 sm:col-span-1' : ''}>
              <Reveal delay={i * 100}>
                <div className="flex flex-col">
                  <div className={`${l.height} ${l.bar} rounded-t-xl opacity-90`} aria-hidden="true" />
                  <div className="rounded-b-xl bg-white/5 border border-white/10 border-t-0 p-4">
                    <p className="text-sm font-bold">{l.level}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{l.when}</p>
                    <p className="text-sm text-slate-200 mt-3">{l.who}</p>
                  </div>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
        <p className="mt-8 text-center text-xs text-slate-400">
          Example ladder shown. Actual offsets and recipients are set by the administrator.
        </p>
      </div>
    </section>
  );
}

function Principles() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <Reveal>
          <SectionHeading eyebrow="Built to be trusted" title="Support for people, never a substitute" />
        </Reveal>
        <div className="mt-12 grid md:grid-cols-3 gap-5">
          {PRINCIPLES.map(({ icon: Icon, title, text }, i) => (
            <Reveal key={title} delay={i * 90}>
              <div className="h-full rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-6 text-center shadow-card">
                <span className="mx-auto w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-sm font-bold text-slate-900">{title}</h3>
                <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Faq() {
  return (
    <section id="faq" className="scroll-mt-20 py-20 bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <Reveal>
          <SectionHeading eyebrow="FAQ" title="Questions people ask first" />
        </Reveal>
        <div className="mt-10 space-y-3">
          {FAQ.map(({ q, a }, i) => (
            <Reveal key={q} delay={i * 70}>
              <details className="group rounded-2xl border border-slate-200 bg-white shadow-card open:border-emerald-200 open:shadow-md transition">
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none px-5 py-4 text-sm font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
                  {q}
                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <p className="px-5 pb-5 text-sm text-slate-600 leading-relaxed">{a}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function CallToAction() {
  const portal = usePortalLink();
  return (
    <section className="relative overflow-hidden py-24 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white">
      <div className="absolute -top-20 -left-16 w-80 h-80 rounded-full" style={{ background: 'radial-gradient(closest-side, rgba(255,255,255,0.2), transparent)' }} aria-hidden="true" />
      <div className="absolute -bottom-24 -right-10 w-96 h-96 rounded-full" style={{ background: 'radial-gradient(closest-side, rgba(94,234,212,0.2), transparent)' }} aria-hidden="true" />
      <Reveal>
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">See your queue, your deadlines, your alerts.</h2>
          <p className="mt-4 text-emerald-100">
            This is a prototype running on synthetic data. Pick a role and explore.
          </p>
          <Link
            to={portal.to}
            className="mt-9 inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white text-emerald-800 font-bold shadow-xl hover:bg-emerald-50 hover:-translate-y-0.5 transition"
          >
            {portal.signedIn ? 'Go to your dashboard' : 'Open the portal'} <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      </Reveal>
    </section>
  );
}

function SiteFooter() {
  const portal = usePortalLink();
  return (
    <footer className="bg-slate-900 text-slate-400">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <Logo light />
          <p className="mt-3 text-xs max-w-md leading-relaxed">
            Valid8 — Verification, Approval & Licensure Integrated Dashboard for 8-point AICTE Norms.
            Configurable stages, automated SLA monitoring, and delay risk intelligence.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm" aria-label="Footer">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="hover:text-white transition">{l.label}</a>
          ))}
          <Link to={portal.to} className="hover:text-white transition">{portal.signedIn ? 'Dashboard' : 'Sign in'}</Link>
        </nav>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-[11px]">
        Prototype with synthetic data only. No real institution, student or officer information.
      </div>
    </footer>
  );
}

export function Home() {
  useEffect(() => {
    const previous = document.title;
    document.title = 'Valid8 | Verification, Approval & Licensure Integrated Dashboard';
    return () => { document.title = previous; };
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:px-3 focus:py-2 focus:bg-white focus:rounded-lg focus:shadow-lg focus:text-sm"
      >
        Skip to main content
      </a>
      <SiteHeader />
      <main id="main">
        <Hero />
        <StatsStrip />
        <Features />
        <HowItWorks />
        <Roles />
        <Escalation />
        <Principles />
        <Faq />
        <CallToAction />
      </main>
      <SiteFooter />
    </div>
  );
}

export default Home;
