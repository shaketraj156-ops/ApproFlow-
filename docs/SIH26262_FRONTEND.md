# Frontend Architecture Guide (SIH26262)

## 1. Design & UI System
- Modern, accessible, dashboard theme with glassmorphism and Tailwind CSS.
- Color semantics:
  - Green: On track (> 3 days left, valid, verified)
  - Orange: Due soon (0-3 days left, expiring)
  - Red: Overdue / expired / critical
  - Purple: Needs review / high predicted delay risk
  - Slate: Neutral / closed / informational
- High accessibility: Color is never the sole indicator; icons and text labels accompany all states.
- Dates rendered strictly in Indian Standard Time (`Asia/Kolkata`) via `Intl.DateTimeFormat`.

## 2. Directory Layout
- `src/api/`: Axios client with Supabase JWT interceptor and error handlers.
- `src/context/`: AuthContext managing sessions, roles, and profile data.
- `src/components/common/`: Modular UI primitives (KpiCard, StatusBadge, SlaChip, DataTable, Modal, Toast, Loader, EmptyState).
- `src/components/layout/`: AppShell, Sidebar, Navbar, AlertBell.
- `src/components/charts/`: Recharts-based visualizers (Funnel, Aging, Bottleneck Heatmap).
- `src/mocks/`: Comprehensive offline fixtures for full demo capability without backend connection.
- `src/services/`: Service layer dynamically toggling between mock fixtures and real REST endpoints via `VITE_USE_MOCKS`.

## 3. Route Map & Role Guarding
- Unauthenticated: `/login`, `/register`.
- Officer & Admin: `/officer/dashboard`, `/officer/applications`, `/officer/applications/:id`, `/officer/alerts`, `/officer/evc`, `/officer/undertakings`, `/officer/documents`.
- Regional Head: `/region/dashboard`, `/bottlenecks`.
- National Head: `/national/dashboard`, `/bottlenecks`.
- Institution: `/institution/dashboard`, `/institution/applications/:id`, `/institution/undertakings`, `/institution/documents`.
- System Admin: `/admin/workflow`, `/admin/escalation`, `/admin/alert-rules`, `/admin/jobs`.
- Auditor: `/audit`, `/reports`.
