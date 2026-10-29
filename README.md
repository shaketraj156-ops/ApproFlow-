Valid8: Verification, Approval & Licensure Integrated Dashboard
￼ 

A rule-driven, auditable, deadline-aware workflow automation, compliance monitoring, and alert management platform for institutional approvals. 

Features • How It Works • Architecture • Tech Stack • Quick Start • Environment • API Contract • Evaluation Scenarios 

1. Project Overview & Purpose
Valid8 is an end-to-end operational platform designed to streamline, track, and audit regulatory approval workflows for educational and technical institutions (e.g., AICTE approval processes). Institutional applications traditionally move through multiple review stages—document scrutiny, deficiency re-scrutiny, physical/virtual inspection committees, regional evaluations, and standing appellate committees—often suffering from opaque backlogs, untracked conditional undertakings, and uncoordinated expert scheduling.
Valid8 solves these bottlenecks through five foundational principles:
Rules as Configuration: Approval stages, SLA durations, reminder offsets, and escalation thresholds live in database configuration tables rather than hardcoded logic, allowing administrators to modify procedures without application code changes or redeployments.
Strict State Machine & Concurrency Control: Applications transition only through configured next-stage paths. Transitions execute atomically with database row locks (FOR UPDATE), automatically route work to the least-loaded officer in the region, and close existing stage timers.
Automated Reminders & 4-Level Escalation Ladder: A daily deadline monitor issues pre-deadline reminders and progressively escalates overdue applications through section officers, section heads, regional heads, and national leadership. Idempotent composite keys guarantee no duplicate alerts occur across repeated runs.
Clash-Free Expert Visit Committee (EVC) Scheduling: An automated suggestion engine matches available subject-matter experts within the region while filtering out conflicts, blackouts, and load limits. Transactional re-checks prevent double-booking.
Officer-in-the-Loop & Tamper-Evident Auditability: Machine learning delay predictions and priority scores act strictly as assistive decision support. All final decisions remain with human officers, and every state modification is written to an immutable audit log capturing actors, timestamps, and before/after states.
[!NOTE] Synthetic Data & Sandbox Scope: Valid8 is configured as a standalone prototype operating exclusively on synthetic institutions, dummy applications, and simulated expert profiles. No real personal or institutional data is stored or processed.
2. Key Features & Supported Workflows
Capability
What It Delivers
Configurable Approval Pipeline
Manages the full lifecycle (SUBMITTED → SCRUTINY → RE_SCRUTINY → EVC → REGIONAL_COMMITTEE → SAC_SHC → DECIDED). Enforces valid transitions and records final determinations (APPROVED, REJECTED, APPROVED_WITH_CONDITIONS).
SLA & Pendency Tracking
Calculates stage-specific due dates (entered_at + sla_days), measures real-time pendency aging, highlights SLA breaches, and displays dates in Indian Standard Time (IST).
Idempotent Alert Engine
Delivers pre-deadline notifications at configured intervals (e.g., $T-7$, $T-3$, $T-1$ days) and advances overdue files through a 4-tier escalation hierarchy. Auto-resolves alerts once an underlying task is resolved.
EVC Clash-Free Scheduling
Proposes 3-member inspection committees from regional expert pools, checks expert unavailability calendars, avoids Sunday bookings, enforces per-cycle visit caps, and generates downloadable RFC-compliant .ics calendar invites.
Institutional Undertakings Register
Tracks conditional commitments requiring time-bound evidence submissions (e.g., barrier-free campus compliance, land conversion certificates) through a PENDING → SUBMITTED → VERIFIED / REJECTED lifecycle.
Document Validity Calendar
Monitors statutory documents (e.g., registered lease deeds, building safety NOCs, fire safety clearances) against expiration horizons ($30$, $15$, $7$ days), auto-flagging statuses as VALID, EXPIRING, or EXPIRED.
Smart Priority Score (0–100)
Assistive mathematical heuristic that prioritizes work queues based on days overdue ($40%$), requested student intake ($25%$), historical deficiencies ($20%$), and application age ($15%$).
Assistive ML Delay Prediction
Gradient Boosting classifier backed by a heuristic fallback that estimates the probability ($0.0$ to $1.0$) of a stage breaching its SLA. Prompts visual "Needs Attention" warnings without penalizing institutions.
Stage × Region Bottleneck Heatmap
Interactive matrix pinpointing regional queue pile-ups, average days spent per stage, and percentage breach rates for senior authorities.
Granular Audit Log
Append-only audit record detailing every stage change, ownership assignment, administrative hold, and schedule confirmation with JSON diffs of previous and updated states.
3. User Personas & Role-Based Access
Valid8 implements role-based access control (RBAC) enforced at both the API layer (FastAPI dependencies) and database layer (PostgreSQL Row Level Security):
flowchart TD
    User([Authenticated User]) --> Auth{Role & Level}
    Auth -->|aicte_officer + SECTION_OFFICER| SO[Section / Scrutiny Officer<br/><i>Queue management & stage progression</i>]
    Auth -->|aicte_officer + REGIONAL_HEAD| RH[Regional Head<br/><i>EVC scheduling & regional bottlenecks</i>]
    Auth -->|aicte_officer + NATIONAL_HEAD| NH[National Head / Member Secretary<br/><i>National heatmap & final decisions</i>]
    Auth -->|institution_admin / staff| INST[Institution Portal<br/><i>Application status & undertaking uploads</i>]
    Auth -->|auditor| AUD[Independent Auditor<br/><i>Full audit trail & before/after diffs</i>]
    Auth -->|system_admin| ADM[System Administrator<br/><i>Zero-code workflow rules & manual jobs</i>]
Persona / Role
Role Claims
Default Route
Primary Focus & Capabilities
Section / Scrutiny Officer
aicte_officer (SECTION_OFFICER / SCRUTINY_OFFICER)
/officer/dashboard
"What needs my action today?" Works active queue ordered by Priority Score; inspects dossiers, increments deficiency counters, moves applications to allowed next stages, and verifies uploaded undertakings.
Regional Head
aicte_officer (REGIONAL_HEAD)
/region/dashboard
"Where is my region slow?" Monitors regional officer workloads; schedules EVC visits using clash-detection suggestions; manages regional stage bottlenecks.
National Head
aicte_officer (NATIONAL_HEAD)
/national/dashboard
"Where are the national bottlenecks?" High-level visibility across all regions; reviews cross-region Stage × Region heatmaps; participates in SAC/SHC appeal reviews and final decisions.
Institution User
institution_admin / institution_staff
/institution/dashboard
"Where is my application, and what is due?" Reads status of submitted applications, reviews identified deficiencies, submits undertaking documents, and tracks statutory document renewals.
Auditor
auditor
/audit
"Who did what, and when?" Read-only cross-region access to application histories, stage movements, actor IDs, client IP addresses, and state diffs.
System Administrator
system_admin
/admin/workflow
"Can I change stages, SLAs, and rules without code?" Live configuration of stage ordering, SLA days, reminder offsets, escalation tiers, and manual triggers for daily compliance checks.
4. How the System Works
4.1 State Machine & Stage Transitions
Applications follow an explicit, unidirectional workflow with branching for deficiencies:
[SUBMITTED] ──(SLA: 5d)──> [SCRUTINY] ──┬─(Deficiencies Found)──> [RE_SCRUTINY] ──┐
                                        │                                         │
                                        ├─(Clean / Approved)─────> [EVC] <────────┘
                                        │                           │ (SLA: 15d)
                                        │                           ▼
                                        │                 [REGIONAL_COMMITTEE]
                                        │                           │ (SLA: 10d)
                                        │                           ▼
                                        │                       [SAC_SHC]
                                        │                           │ (SLA: 10d)
                                        │                           ▼
                                        └───────────────────> [DECIDED] (Terminal)
Transition Validation: When an officer initiates a stage movement (POST /api/v1/applications/{id}/move), the engine queries the active stage's next_stages JSON array. If the target code is absent or marked inactive, an HTTP 409 INVALID_TRANSITION error is returned.
Hold Verification: If an application has an active administrative hold (is_on_hold = True), transitions are blocked until the hold is lifted via /resume.
Atomic Execution: In a single database transaction:
Row-level lock acquired via with_for_update() on applications.
The current application_stage_history entry is marked with exited_at = NOW(), recorded notes, and outcome.
If the scrutiny outcome is DEFICIENCY_FOUND, deficiency_count is incremented.
Automatic workload balancing finds the active officer in the region with the fewest assigned open cases.
A new application_stage_history row is created with due_at = NOW() + INTERVAL 'sla_days days'.
If transitioning to DECIDED, a final decision (APPROVED, REJECTED, or APPROVED_WITH_CONDITIONS) and remarks are validated and saved.
An immutable record is created in audit_logs.
4.2 SLA Monitoring & 4-Level Escalation Ladder
Daily checks run via background scheduler (APScheduler locally or HTTP cron POST /api/v1/jobs/run-daily-checks in production):
Due Date (T)
  ├── T - 7 days ──> Reminder (Level 0) ──> Assigned Section Officer
  ├── T - 3 days ──> Reminder (Level 0) ──> Assigned Section Officer
  ├── T - 1 day  ──> Reminder (Level 0) ──> Assigned Section Officer
  ├── T + 0 days ──> Escalation Level 1 ──> Section Officer (Overdue)
  ├── T + 4 days ──> Escalation Level 2 ──> Section Head
  ├── T + 8 days ──> Escalation Level 3 ──> Regional Head
  └── T + 15 days ─> Escalation Level 4 ──> National Head (Member Secretary)
Idempotent Deduplication: Every generated alert stores a composite dedupe_key:
Reminders: APPLICATION:<app_id>:STAGE_DUE_REMINDER:R<offset_days>
Escalations: APPLICATION:<app_id>:STAGE_SLA_BREACH:L<level>
Undertakings: UNDERTAKING:<u_id>:REMINDER:R<days> / OVERDUE:L1
Documents: DOCUMENT:<doc_id>:EXPIRY_REMINDER:R<days> / EXPIRED:L1
Auto-Resolution: When daily checks run, existing OPEN or ACKNOWLEDGED alerts are evaluated. If the application has moved to a subsequent stage, the undertaking was verified, or the document was renewed, the alert status updates to RESOLVED with resolved_at = NOW().
4.3 Smart Priority Score & Delay Radar
To help officers navigate voluminous queues without arbitrary sorting, Valid8 evaluates a composite Smart Priority Score ($0.00$ to $100.00$):
$$\text{Priority} = 100 \times \left( 0.40 \times \min\left(\frac{\text{overdue_days}}{30}, 1\right) + 0.25 \times \min\left(\frac{\text{intake_requested}}{300}, 1\right) + 0.20 \times \min\left(\frac{\text{deficiency_count}}{5}, 1\right) + 0.15 \times \min\left(\frac{\text{age_days}}{120}, 1\right) \right)$$
Additionally, an integrated Scikit-learn Gradient Boosting model (backend/models/delay_model.joblib) analyzes [days_in_stage, sla_days, deficiency_count, intake_requested, age_days] to forecast SLA breach probability ($0.0$ to $1.0$). If the model artifact is unavailable, an automated deterministic ratio fallback is applied.
5. System Architecture
flowchart TB
    subgraph Client["Client Tier (Browser)"]
        SPA["React 18 Single Page App<br/>(Vite, Tailwind CSS, Recharts, Three.js)"]
        MockAdapter["Intelligent Mock Adapter<br/>(Zero-backend standalone mode)"]
    end

    subgraph API["Application Tier (FastAPI)"]
        Router["FastAPI REST Routers<br/>(/api/v1)"]
        AuthMid["JWT Auth & App Metadata Verification<br/>(HS256 claims)"]
        WfEngine["Workflow State Machine<br/>(Atomic transitions + least-loaded routing)"]
        EvcEngine["EVC Clash & Availability Scheduler"]
        AlertEngine["Alert & Escalation Engine<br/>(Idempotent deduplication)"]
        Predictor["ML Delay Risk Predictor<br/>(Gradient Boosting / Heuristic)"]
        Scheduler["APScheduler Async Cron<br/>(Daily compliance checks)"]
    end

    subgraph DataTier["Data & Persistence Tier (Supabase / Postgres)"]
        PG[(PostgreSQL 15+ Database)]
        RLS["Row Level Security Policies"]
        Views["Security Invoker Analytical Views<br/>(v_pipeline_funnel, v_stage_bottlenecks, etc.)"]
        Storage["Object Storage<br/>(Compliance documents & undertakings)"]
    end

    SPA -->|HTTPS + Bearer JWT| Router
    SPA -.->|VITE_USE_MOCKS=true| MockAdapter
    Router --> AuthMid
    AuthMid --> WfEngine & EvcEngine & AlertEngine & Predictor
    Scheduler -->|Internal Session| AlertEngine
    WfEngine & EvcEngine & AlertEngine --> RLS
    RLS --> PG
    PG --> Views
    SPA -->|Uploads / Downloads| Storage
6. Technology Stack
Frontend
Core Framework: React 18.2, React DOM 18.2
Build Tool: Vite 5.1
Styling & Design System: Tailwind CSS 3.4, PostCSS, Autoprefixer
Routing: React Router DOM 6.22 (code-split pages with Suspense and role-based AuthGuard)
Visualizations & Charts: Recharts 2.12 (funnels, aging charts, trend lines, heatmap grids)
3D Animation: Three.js 0.160 (interactive canvas on the public landing page)
Icons & UI Utilities: Lucide React, clsx, tailwind-merge, date-fns
Testing: Vitest 1.4
Backend
Framework: FastAPI 0.110 (ASGI application running on Uvicorn)
Data Validation & Settings: Pydantic 2.6, Pydantic-Settings 2.2
Database ORM & Drivers: SQLAlchemy 2.0, Psycopg 3 / Psycopg2-binary, AsyncPG
Security & Cryptography: PyJWT 2.8 with cryptography (HS256 verification against Supabase Auth)
Task Scheduling: APScheduler 3.10
Data Science & ML: Scikit-learn 1.4, NumPy 1.26, Pandas 2.2, Joblib 1.3
Document & Export Utilities: ReportLab 4.1, OpenPyXL 3.1
Testing: Pytest 8.1, Pytest-Asyncio, HTTPX
Database & Infrastructure
Database Engine: PostgreSQL 15+ (Hosted on Supabase or self-hosted)
Security Model: PostgreSQL Row Level Security (RLS) on all tables with custom SQL helper functions
Analytical Views: 7 SQL views configured with WITH (security_invoker = true) to respect caller permissions
Storage: Private bucket storage for PDFs and compliance evidence
7. Repository Structure
valid8/
├── .github/
│   └── pull_request_template.md        # Standardized pull request template
├── database/
│   ├── README.md                       # Migration documentation
│   ├── full_schema_combined.sql        # Consolidated one-click setup script (820+ lines)
│   ├── migrations/
│   │   ├── 001_foundation.sql          # Enums, institutions, profiles, audit_logs, RLS helpers
│   │   ├── 002_workflow_config.sql     # workflow_stages schema and seed records
│   │   ├── 003_applications.sql        # applications & application_stage_history tables
│   │   ├── 004_evc.sql                 # experts, availability, evc_visits, visit_experts
│   │   ├── 005_undertakings_documents.sql # undertakings & compliance_documents tables
│   │   ├── 006_alerts_rules.sql        # alert_rules, escalation_rules, alerts tables
│   │   └── 007_rls.sql                 # Row Level Security policies across all tables
│   └── views/
│       └── 008_reports_views.sql       # Analytical dashboard views (funnel, bottlenecks, aging)
├── backend/
│   ├── Dockerfile                      # Production Docker container definition for FastAPI
│   ├── alembic.ini                     # Alembic configuration
│   ├── pytest.ini                      # Pytest suite configuration
│   ├── requirements.txt                # Python package dependencies
│   ├── .env.example                    # Sample backend environment configuration
│   ├── models/
│   │   └── delay_model.joblib          # Serialized scikit-learn Gradient Boosting model
│   ├── scripts/
│   │   ├── seed_262.py                 # Deterministic synthetic dataset generator
│   │   └── train_delay_model.py        # ML training script for delay risk classifier
│   └── app/
│       ├── main.py                     # FastAPI entry point, CORS, error handlers, lifespan
│       ├── core/                       # App settings, security, clock, scheduler, permissions
│       ├── api/v1/                     # Modular API route controllers
│       ├── models/                     # SQLAlchemy declarative entity models
│       ├── schemas/                    # Pydantic request and response schemas
│       ├── services/                   # Business logic (workflow, SLA, alerts, EVC, reports)
│       ├── integrations/               # External AICTE portal mock adapter
│       └── tests/                      # Pytest unit and integration test suite
├── frontend/
│   ├── index.html                      # Application entry HTML
│   ├── package.json                    # Frontend package dependencies and scripts
│   ├── tailwind.config.js              # Tailwind theme, typography, and color setup
│   ├── vercel.json                     # SPA routing rewrite rule for Vercel
│   ├── vite.config.js                  # Vite bundler configuration
│   ├── .env.example                    # Sample frontend environment configuration
│   ├── public/                         # Public static assets (logos, sample documents, favicons)
│   └── src/
│       ├── App.jsx                     # Root React application component
│       ├── main.jsx                    # React DOM client bootstrap
│       ├── api/                        # Axios HTTP client and Supabase client
│       ├── components/                 # Reusable UI components (charts, modals, layouts)
│       ├── context/                    # AuthContext managing demo personas and tokens
│       ├── hooks/                      # Custom hooks (useApi, usePolling, useDebounce)
│       ├── mocks/                      # Static JSON fixtures for zero-backend mock mode
│       ├── pages/                      # Role-specific dashboard views and administration
│       ├── routes/                     # AppRoutes and AuthGuard navigation logic
│       ├── services/                   # Frontend API communication layer
│       └── utils/                      # Formatting, health calculations, ICS generators, tests
├── docs/                               # Architecture, schema, and API contract specifications
├── .env.example                        # Monorepo combined environment template
├── docker-compose.yml                  # Docker Compose orchestration
└── pytest.ini                          # Root pytest configuration
8. Prerequisites
Before installing, ensure the following runtimes and services are available:
Node.js: v18.0.0 or higher (v20+ recommended)
npm: v9.0.0 or higher
Python: v3.11 or v3.12
PostgreSQL / Supabase: A PostgreSQL 15+ database instance or a free-tier Supabase project.
Git: v2.30 or higher
9. Installation & Setup
Step 1: Clone the Repository
git clone https://github.com/shaketraj156-ops/valid8.git
cd valid8
Step 2: Database Initialization
You can initialize the database using either the single consolidated script or sequential migration files.
Option A: One-Click Combined Script (Recommended)
Open your Supabase project dashboard and navigate to the SQL Editor.
Copy the entire contents of database/full_schema_combined.sql.
Paste and run the script in the SQL Editor. This creates all types, tables, triggers, helper functions, RLS policies, and analytical views in one transaction.
Option B: Step-by-Step Migrations
Execute the SQL files inside database/migrations/ sequentially in the SQL Editor:
001_foundation.sql
002_workflow_config.sql
003_applications.sql
004_evc.sql
005_undertakings_documents.sql
006_alerts_rules.sql
007_rls.sql
database/views/008_reports_views.sql
St
