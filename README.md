# Valid8: Verification, Approval & Licensure Integrated Dashboard

<p align="center">
  <img src="frontend/public/valid8-logo.png" alt="Valid8 Logo" width="140" />
</p>

<p align="center">
  <strong>A rule-driven, auditable, deadline-aware workflow automation, compliance monitoring, and alert management platform for institutional approvals.</strong>
</p>

<p align="center">
  <a href="#key-features">Features</a> •
  <a href="#how-the-system-works">How It Works</a> •
  <a href="#system-architecture">Architecture</a> •
  <a href="#technology-stack">Tech Stack</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#environment-variables">Environment</a> •
  <a href="#api-specification">API Contract</a> •
  <a href="#planted-demo-scenarios">Evaluation Scenarios</a>
</p>

---

## 1. Project Overview & Purpose

**Valid8** is an end-to-end operational platform designed to streamline, track, and audit regulatory approval workflows for educational and technical institutions (e.g., AICTE approval processes). Institutional applications traditionally move through multiple review stages—document scrutiny, deficiency re-scrutiny, physical/virtual inspection committees, regional evaluations, and standing appellate committees—often suffering from opaque backlogs, untracked conditional undertakings, and uncoordinated expert scheduling.

Valid8 solves these bottlenecks through five foundational principles:

1. **Rules as Configuration:** Approval stages, SLA durations, reminder offsets, and escalation thresholds live in database configuration tables rather than hardcoded logic, allowing administrators to modify procedures without application code changes or redeployments.
2. **Strict State Machine & Concurrency Control:** Applications transition only through configured next-stage paths. Transitions execute atomically with database row locks (`FOR UPDATE`), automatically route work to the least-loaded officer in the region, and close existing stage timers.
3. **Automated Reminders & 4-Level Escalation Ladder:** A daily deadline monitor issues pre-deadline reminders and progressively escalates overdue applications through section officers, section heads, regional heads, and national leadership. Idempotent composite keys guarantee no duplicate alerts occur across repeated runs.
4. **Clash-Free Expert Visit Committee (EVC) Scheduling:** An automated suggestion engine matches available subject-matter experts within the region while filtering out conflicts, blackouts, and load limits. Transactional re-checks prevent double-booking.
5. **Officer-in-the-Loop & Tamper-Evident Auditability:** Machine learning delay predictions and priority scores act strictly as assistive decision support. All final decisions remain with human officers, and every state modification is written to an immutable audit log capturing actors, timestamps, and before/after states.

> [!NOTE]
> **Synthetic Data & Sandbox Scope:** Valid8 is configured as a standalone prototype operating exclusively on synthetic institutions, dummy applications, and simulated expert profiles. No real personal or institutional data is stored or processed.

---

## 2. Key Features & Supported Workflows

| Capability | What It Delivers |
|---|---|
| **Configurable Approval Pipeline** | Manages the full lifecycle (`SUBMITTED` &rarr; `SCRUTINY` &rarr; `RE_SCRUTINY` &rarr; `EVC` &rarr; `REGIONAL_COMMITTEE` &rarr; `SAC_SHC` &rarr; `DECIDED`). Enforces valid transitions and records final determinations (`APPROVED`, `REJECTED`, `APPROVED_WITH_CONDITIONS`). |
| **SLA & Pendency Tracking** | Calculates stage-specific due dates (`entered_at + sla_days`), measures real-time pendency aging, highlights SLA breaches, and displays dates in Indian Standard Time (IST). |
| **Idempotent Alert Engine** | Delivers pre-deadline notifications at configured intervals (e.g., $T-7$, $T-3$, $T-1$ days) and advances overdue files through a 4-tier escalation hierarchy. Auto-resolves alerts once an underlying task is resolved. |
| **EVC Clash-Free Scheduling** | Proposes 3-member inspection committees from regional expert pools, checks expert unavailability calendars, avoids Sunday bookings, enforces per-cycle visit caps, and generates downloadable RFC-compliant `.ics` calendar invites. |
| **Institutional Undertakings Register** | Tracks conditional commitments requiring time-bound evidence submissions (e.g., barrier-free campus compliance, land conversion certificates) through a `PENDING` &rarr; `SUBMITTED` &rarr; `VERIFIED` / `REJECTED` lifecycle. |
| **Document Validity Calendar** | Monitors statutory documents (e.g., registered lease deeds, building safety NOCs, fire safety clearances) against expiration horizons ($30$, $15$, $7$ days), auto-flagging statuses as `VALID`, `EXPIRING`, or `EXPIRED`. |
| **Smart Priority Score (0–100)** | Assistive mathematical heuristic that prioritizes work queues based on days overdue ($40\%$), requested student intake ($25\%$), historical deficiencies ($20\%$), and application age ($15\%$). |
| **Assistive ML Delay Prediction** | Gradient Boosting classifier backed by a heuristic fallback that estimates the probability ($0.0$ to $1.0$) of a stage breaching its SLA. Prompts visual "Needs Attention" warnings without penalizing institutions. |
| **Stage &times; Region Bottleneck Heatmap** | Interactive matrix pinpointing regional queue pile-ups, average days spent per stage, and percentage breach rates for senior authorities. |
| **Granular Audit Log** | Append-only audit record detailing every stage change, ownership assignment, administrative hold, and schedule confirmation with JSON diffs of previous and updated states. |

---

## 3. User Personas & Role-Based Access

Valid8 implements role-based access control (RBAC) enforced at both the API layer (FastAPI dependencies) and database layer (PostgreSQL Row Level Security):

```mermaid
flowchart TD
    User([Authenticated User]) --> Auth{Role & Level}
    Auth -->|aicte_officer + SECTION_OFFICER| SO[Section / Scrutiny Officer<br/><i>Queue management & stage progression</i>]
    Auth -->|aicte_officer + REGIONAL_HEAD| RH[Regional Head<br/><i>EVC scheduling & regional bottlenecks</i>]
    Auth -->|aicte_officer + NATIONAL_HEAD| NH[National Head / Member Secretary<br/><i>National heatmap & final decisions</i>]
    Auth -->|institution_admin / staff| INST[Institution Portal<br/><i>Application status & undertaking uploads</i>]
    Auth -->|auditor| AUD[Independent Auditor<br/><i>Full audit trail & before/after diffs</i>]
    Auth -->|system_admin| ADM[System Administrator<br/><i>Zero-code workflow rules & manual jobs</i>]
```

| Persona / Role | Role Claims | Default Route | Primary Focus & Capabilities |
|---|---|---|---|
| **Section / Scrutiny Officer** | `aicte_officer` (`SECTION_OFFICER` / `SCRUTINY_OFFICER`) | `/officer/dashboard` | **"What needs my action today?"** Works active queue ordered by Priority Score; inspects dossiers, increments deficiency counters, moves applications to allowed next stages, and verifies uploaded undertakings. |
| **Regional Head** | `aicte_officer` (`REGIONAL_HEAD`) | `/region/dashboard` | **"Where is my region slow?"** Monitors regional officer workloads; schedules EVC visits using clash-detection suggestions; manages regional stage bottlenecks. |
| **National Head** | `aicte_officer` (`NATIONAL_HEAD`) | `/national/dashboard` | **"Where are the national bottlenecks?"** High-level visibility across all regions; reviews cross-region Stage &times; Region heatmaps; participates in SAC/SHC appeal reviews and final decisions. |
| **Institution User** | `institution_admin` / `institution_staff` | `/institution/dashboard` | **"Where is my application, and what is due?"** Reads status of submitted applications, reviews identified deficiencies, submits undertaking documents, and tracks statutory document renewals. |
| **Auditor** | `auditor` | `/audit` | **"Who did what, and when?"** Read-only cross-region access to application histories, stage movements, actor IDs, client IP addresses, and state diffs. |
| **System Administrator** | `system_admin` | `/admin/workflow` | **"Can I change stages, SLAs, and rules without code?"** Live configuration of stage ordering, SLA days, reminder offsets, escalation tiers, and manual triggers for daily compliance checks. |

---

## 4. How the System Works

### 4.1 State Machine & Stage Transitions

Applications follow an explicit, unidirectional workflow with branching for deficiencies:

```
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
```

1. **Transition Validation:** When an officer initiates a stage movement (`POST /api/v1/applications/{id}/move`), the engine queries the active stage's `next_stages` JSON array. If the target code is absent or marked inactive, an HTTP 409 `INVALID_TRANSITION` error is returned.
2. **Hold Verification:** If an application has an active administrative hold (`is_on_hold = True`), transitions are blocked until the hold is lifted via `/resume`.
3. **Atomic Execution:** In a single database transaction:
   - Row-level lock acquired via `with_for_update()` on `applications`.
   - The current `application_stage_history` entry is marked with `exited_at = NOW()`, recorded notes, and outcome.
   - If the scrutiny outcome is `DEFICIENCY_FOUND`, `deficiency_count` is incremented.
   - Automatic workload balancing finds the active officer in the region with the fewest assigned open cases.
   - A new `application_stage_history` row is created with `due_at = NOW() + INTERVAL 'sla_days days'`.
   - If transitioning to `DECIDED`, a final `decision` (`APPROVED`, `REJECTED`, or `APPROVED_WITH_CONDITIONS`) and remarks are validated and saved.
   - An immutable record is created in `audit_logs`.

### 4.2 SLA Monitoring & 4-Level Escalation Ladder

Daily checks run via background scheduler (`APScheduler` locally or HTTP cron `POST /api/v1/jobs/run-daily-checks` in production):

```
Due Date (T)
  ├── T - 7 days ──> Reminder (Level 0) ──> Assigned Section Officer
  ├── T - 3 days ──> Reminder (Level 0) ──> Assigned Section Officer
  ├── T - 1 day  ──> Reminder (Level 0) ──> Assigned Section Officer
  ├── T + 0 days ──> Escalation Level 1 ──> Section Officer (Overdue)
  ├── T + 4 days ──> Escalation Level 2 ──> Section Head
  ├── T + 8 days ──> Escalation Level 3 ──> Regional Head
  └── T + 15 days ─> Escalation Level 4 ──> National Head (Member Secretary)
```

- **Idempotent Deduplication:** Every generated alert stores a composite `dedupe_key`:
  - Reminders: `APPLICATION:<app_id>:STAGE_DUE_REMINDER:R<offset_days>`
  - Escalations: `APPLICATION:<app_id>:STAGE_SLA_BREACH:L<level>`
  - Undertakings: `UNDERTAKING:<u_id>:REMINDER:R<days>` / `OVERDUE:L1`
  - Documents: `DOCUMENT:<doc_id>:EXPIRY_REMINDER:R<days>` / `EXPIRED:L1`
- **Auto-Resolution:** When daily checks run, existing `OPEN` or `ACKNOWLEDGED` alerts are evaluated. If the application has moved to a subsequent stage, the undertaking was verified, or the document was renewed, the alert status updates to `RESOLVED` with `resolved_at = NOW()`.

### 4.3 Smart Priority Score & Delay Radar

To help officers navigate voluminous queues without arbitrary sorting, Valid8 evaluates a composite **Smart Priority Score ($0.00$ to $100.00$)**:

$$\text{Priority} = 100 \times \left( 0.40 \times \min\left(\frac{\text{overdue\_days}}{30}, 1\right) + 0.25 \times \min\left(\frac{\text{intake\_requested}}{300}, 1\right) + 0.20 \times \min\left(\frac{\text{deficiency\_count}}{5}, 1\right) + 0.15 \times \min\left(\frac{\text{age\_days}}{120}, 1\right) \right)$$

Additionally, an integrated **Scikit-learn Gradient Boosting model** (`backend/models/delay_model.joblib`) analyzes `[days_in_stage, sla_days, deficiency_count, intake_requested, age_days]` to forecast SLA breach probability ($0.0$ to $1.0$). If the model artifact is unavailable, an automated deterministic ratio fallback is applied.

---

## 5. System Architecture

```mermaid
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
```

---

## 6. Technology Stack

### Frontend
- **Core Framework:** React 18.2, React DOM 18.2
- **Build Tool:** Vite 5.1
- **Styling & Design System:** Tailwind CSS 3.4, PostCSS, Autoprefixer
- **Routing:** React Router DOM 6.22 (code-split pages with `Suspense` and role-based `AuthGuard`)
- **Visualizations & Charts:** Recharts 2.12 (funnels, aging charts, trend lines, heatmap grids)
- **3D Animation:** Three.js 0.160 (interactive canvas on the public landing page)
- **Icons & UI Utilities:** Lucide React, `clsx`, `tailwind-merge`, `date-fns`
- **Testing:** Vitest 1.4

### Backend
- **Framework:** FastAPI 0.110 (ASGI application running on Uvicorn)
- **Data Validation & Settings:** Pydantic 2.6, Pydantic-Settings 2.2
- **Database ORM & Drivers:** SQLAlchemy 2.0, Psycopg 3 / Psycopg2-binary, AsyncPG
- **Security & Cryptography:** PyJWT 2.8 with cryptography (HS256 verification against Supabase Auth)
- **Task Scheduling:** APScheduler 3.10
- **Data Science & ML:** Scikit-learn 1.4, NumPy 1.26, Pandas 2.2, Joblib 1.3
- **Document & Export Utilities:** ReportLab 4.1, OpenPyXL 3.1
- **Testing:** Pytest 8.1, Pytest-Asyncio, HTTPX

### Database & Infrastructure
- **Database Engine:** PostgreSQL 15+ (Hosted on Supabase or self-hosted)
- **Security Model:** PostgreSQL Row Level Security (RLS) on all tables with custom SQL helper functions
- **Analytical Views:** 7 SQL views configured with `WITH (security_invoker = true)` to respect caller permissions
- **Storage:** Private bucket storage for PDFs and compliance evidence

---

## 7. Repository Structure

```text
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
```

---

## 8. Prerequisites

Before installing, ensure the following runtimes and services are available:

- **Node.js:** v18.0.0 or higher (v20+ recommended)
- **npm:** v9.0.0 or higher
- **Python:** v3.11 or v3.12
- **PostgreSQL / Supabase:** A PostgreSQL 15+ database instance or a free-tier [Supabase](https://supabase.com) project.
- **Git:** v2.30 or higher

---

## 9. Installation & Setup

### Step 1: Clone the Repository

```bash
git clone https://github.com/shaketraj156-ops/valid8.git
cd valid8
```

### Step 2: Database Initialization

You can initialize the database using either the single consolidated script or sequential migration files.

#### Option A: One-Click Combined Script (Recommended)
1. Open your Supabase project dashboard and navigate to the **SQL Editor**.
2. Copy the entire contents of [`database/full_schema_combined.sql`](file:///c:/Users/SIDDHARTH%20SAURABH/Documents/GitHub/valid8/database/full_schema_combined.sql).
3. Paste and run the script in the SQL Editor. This creates all types, tables, triggers, helper functions, RLS policies, and analytical views in one transaction.

#### Option B: Step-by-Step Migrations
Execute the SQL files inside [`database/migrations/`](file:///c:/Users/SIDDHARTH%20SAURABH/Documents/GitHub/valid8/database/migrations/) sequentially in the SQL Editor:
1. `001_foundation.sql`
2. `002_workflow_config.sql`
3. `003_applications.sql`
4. `004_evc.sql`
5. `005_undertakings_documents.sql`
6. `006_alerts_rules.sql`
7. `007_rls.sql`
8. `database/views/008_reports_views.sql`

---

### Step 3: Backend Setup

1. Open a terminal and navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   # On macOS/Linux:
   python3 -m venv venv
   source venv/bin/activate

   # On Windows (PowerShell):
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure the environment:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your Supabase credentials, database URL, and settings.
5. Populate the database with synthetic evaluation data:
   ```bash
   python scripts/seed_262.py
   ```
   *(Optional)* Re-train the machine learning delay prediction model:
   ```bash
   python scripts/train_delay_model.py
   ```

---

### Step 4: Frontend Setup

1. Open a new terminal and navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```
2. Install frontend dependencies:
   ```bash
   npm install
   ```
3. Configure the frontend environment:
   ```bash
   cp .env.example .env.local
   ```
   *(By default, `VITE_USE_MOCKS=true` is enabled, allowing instant testing without backend connectivity).*

---

## 10. Environment Variables & Configuration

### Backend Configuration (`backend/.env`)

| Variable | Type | Default | Description |
|---|---|---|---|
| `SUPABASE_URL` | string | `https://placeholder.supabase.co` | Supabase project API URL. |
| `SUPABASE_JWT_SECRET` | string | `placeholder-jwt-secret` | JWT secret used to verify Bearer tokens (found in Supabase Settings &gt; API). |
| `SUPABASE_SERVICE_ROLE_KEY` | string | `placeholder-service-role-key` | Privileged service key for backend admin operations. **Never expose to the frontend.** |
| `DATABASE_URL` | string | `postgresql://postgres:postgres@localhost:5432/postgres` | PostgreSQL connection string (pooler or direct connection). |
| `FRONTEND_ORIGIN` | string | `http://localhost:5173` | Allowed origin for CORS headers. |
| `JOB_SECRET` | string | `""` | Secret required in the `X-Job-Secret` HTTP header to invoke `/api/v1/jobs/run-daily-checks`. |
| `SCHEDULER_ENABLED` | boolean | `true` | Enables or disables internal APScheduler daily background checks. |
| `DAILY_JOB_HOUR` | integer | `1` | Hour of day ($0$–$23$ in `TZ_DISPLAY`) to trigger automated checks. |
| `ALLOW_DEV_AUTH` | boolean | `false` | When `true`, requests without an `Authorization` header act as a default system administrator. **Must remain `false` in production.** |
| `NOTIFY_EMAIL_ENABLED` | boolean | `false` | Enables external email delivery for generated alerts. |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASSWORD` | string | `smtp.example.com` / `""` / `""` | SMTP mail server credentials for alert notifications. |
| `TZ_DISPLAY` | string | `Asia/Kolkata` | Application timezone for scheduler and date parsing. |
| `SLA_USE_WORKING_DAYS` | boolean | `false` | If `true`, excludes weekends when calculating SLA due dates. |
| `DOCUMENT_EXPIRING_DAYS` | integer | `30` | Horizon window (in days) before expiry to flag compliance documents as `EXPIRING`. |
| `REMINDER_OFFSETS` | string | `"7,3,1"` | Comma-separated list of day offsets before a deadline to issue stage reminders. |
| `DELAY_MODEL_PATH` | string | `models/delay_model.joblib` | Relative or absolute path to the serialized scikit-learn model artifact. |
| `LOG_LEVEL` | string | `INFO` | Application logging verbosity (`DEBUG`, `INFO`, `WARNING`, `ERROR`). |

### Frontend Configuration (`frontend/.env.local`)

| Variable | Type | Default | Description |
|---|---|---|---|
| `VITE_API_URL` | string | `http://localhost:8000/api/v1` | Target endpoint for FastAPI backend requests. |
| `VITE_SUPABASE_URL` | string | `https://your-project.supabase.co` | Public Supabase project URL. |
| `VITE_SUPABASE_ANON_KEY` | string | `your-anon-key` | Public anonymous client key for Supabase client initialization. |
| `VITE_USE_MOCKS` | string | `"true"` | When `"true"`, the frontend operates completely offline using built-in mock fixtures and client-side mutations. |
| `VITE_RISK_TAG_THRESHOLD` | number | `0.7` | Model probability threshold ($0.0$–$1.0$) above which an application displays a "High Risk" tag. |

> [!TIP]
> **Intelligent Mock Mode:** If `VITE_USE_MOCKS=true` is set, or if `VITE_API_URL` is pointing to an unreachable placeholder, the frontend automatically falls back to client-side mock datasets. This permits instant demonstrations of all user flows without spinning up Python or PostgreSQL!

---

## 11. Running the Application

### Mode A: Standalone Mock Mode (Fastest)

Run the frontend interface immediately with pre-loaded mock scenarios:

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173` in your browser. From the landing page or login screen, select any of the pre-configured persona buttons to enter the respective dashboard with full interactive capabilities.

---

### Mode B: Full-Stack Connected Mode

1. **Start the FastAPI Backend:**
   ```bash
   cd backend
   # Ensure virtual environment is activated
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```
   - Swagger Interactive Documentation: `http://localhost:8000/docs`
   - ReDoc Documentation: `http://localhost:8000/redoc`
   - Health Check: `http://localhost:8000/health`
   - Database Readiness Check: `http://localhost:8000/health/ready`

2. **Start the Frontend:**
   ```bash
   cd frontend
   # In frontend/.env.local, set VITE_USE_MOCKS=false
   npm run dev
   ```
   Open `http://localhost:5173`.

---

## 12. Available Scripts & Commands

### Frontend (`frontend/`)

| Command | Action |
|---|---|
| `npm run dev` | Starts Vite development server at `http://localhost:5173`. |
| `npm run build` | Builds production-optimized bundle into `frontend/dist/`. |
| `npm run preview` | Locally serves the production build. |
| `npm run test` | Executes the Vitest unit test suite. |

### Backend (`backend/`)

| Command | Action |
|---|---|
| `uvicorn app.main:app --reload --port 8000` | Starts FastAPI development server with hot-reloading. |
| `python scripts/seed_262.py` | Seeds database with 12 institutions, 48 experts, 45 applications, and 5 planted scenarios. |
| `python scripts/train_delay_model.py` | Trains and exports the Gradient Boosting delay prediction model to `models/delay_model.joblib`. |
| `pytest` | Runs all backend unit, security, and workflow test suites against an in-memory SQLite database. |

---

## 13. Testing & Quality Checks

### Backend Test Suite (Pytest)

Backend tests are designed to execute quickly against an in-memory SQLite database with mocked JWT auth—no external PostgreSQL or network access required.

```bash
# From repository root:
pytest

# Or from backend directory:
cd backend
pytest -v
```

The test suite covers:
- **Core SLA & Priority Logic (`test_core_engine.py`):** Reminder offsets, escalation level boundaries, priority score monotonicity, and delay prediction fallbacks.
- **Authentication & Guards (`test_auth_guards.py`):** Missing headers, invalid tokens, `ALLOW_DEV_AUTH` behavior, and role validation.
- **Workflow State Engine (`test_workflow_engine.py`):** Permitted and unpermitted stage moves, terminal state requirements, deficiency count increments, and transactional rollback.
- **EVC Scheduling Engine (`test_evc_scheduling.py`):** Rejection of past dates and Sundays, unavailability blackouts, concurrent double-booking conflicts (HTTP 409 `EVC_CLASH`), and load distribution.
- **Daily Compliance Checks (`test_daily_job.py`):** Idempotent alert creation, composite deduplication keys, multi-tier escalation transitions, undertaking reminders, and auto-resolution of resolved alerts.
- **API Security & Response Envelope (`test_api_security_and_flow.py`):** Standardized error shapes (`{"error": {"code", "message", "details"}}`), pagination contracts, and cross-region isolation.

### Frontend Test Suite (Vitest)

Frontend unit tests verify date math in IST, workflow form validators, and calendar generation:

```bash
cd frontend
npm run test
```

Verified test modules:
- `dates.test.js`: Validates calendar day difference computations in Indian Standard Time (`Asia/Kolkata`).
- `health.test.js`: Checks SLA health badge determinations (`ON_TRACK`, `DUE_SOON`, `OVERDUE`).
- `moveStage.test.js`: Validates allowed next-stage lookups and required notes on deficiency outcomes.
- `ics.test.js`: Confirms RFC-compliant line folding and formatting of generated `.ics` calendar files.

---

## 14. API Specification & Data Model

### API Endpoints Overview

All API endpoints reside under prefix `/api/v1` and return standardized JSON responses.

```json
// Standard Error Envelope (HTTP 4xx / 5xx)
{
  "error": {
    "code": "INVALID_TRANSITION",
    "message": "Cannot move application from 'SCRUTINY' to 'SAC_SHC'. Allowed: ['RE_SCRUTINY', 'EVC', 'DECIDED']",
    "details": {}
  }
}
```

| Area | Method | Endpoint | Description |
|---|---|---|---|
| **Health** | `GET` | `/health` | Liveness check (process running). |
| | `GET` | `/health/ready` | Readiness check (database responding). |
| **Applications** | `GET` | `/api/v1/applications` | Paginated list with filtering by stage, region, search term, and overdue flag. |
| | `POST` | `/api/v1/applications` | Creates a new application. |
| | `GET` | `/api/v1/applications/{id}` | Detailed application dossier including full stage history timeline. |
| | `POST` | `/api/v1/applications/{id}/move` | Moves application to next stage with outcome, remarks, or decision. |
| | `POST` | `/api/v1/applications/{id}/assign` | Reassigns application to a specific officer. |
| | `POST` | `/api/v1/applications/{id}/hold` | Places application on administrative hold with reason. |
| | `POST` | `/api/v1/applications/{id}/resume` | Lifts administrative hold. |
| **Workflow Config** | `GET` | `/api/v1/workflow/stages` | Retrieves all configured stages, sequence orders, and SLAs. |
| | `PUT` | `/api/v1/workflow/stages/{code}` | Updates SLA days, owner role, or next allowed stages. |
| | `GET` | `/api/v1/workflow/alert-rules` | Lists active reminder offset rules. |
| | `PUT` | `/api/v1/workflow/alert-rules/{code}` | Updates reminder offset days. |
| | `GET` / `PUT` | `/api/v1/workflow/escalation-rules` | Lists or updates the 4-level escalation overdue thresholds. |
| **Alerts** | `GET` | `/api/v1/alerts` | Lists alerts filtered by status (`OPEN`, `ACKNOWLEDGED`, `RESOLVED`), region, or severity. |
| | `POST` | `/api/v1/alerts/{id}/acknowledge` | Marks an alert as acknowledged. |
| | `POST` | `/api/v1/alerts/{id}/resolve` | Manually marks an alert as resolved. |
| **EVC Visits** | `POST` | `/api/v1/evc/suggest` | Computes clash-free committee recommendations for a target date. |
| | `POST` | `/api/v1/evc/visits` | Schedules an EVC visit. |
| | `POST` | `/api/v1/evc/visits/{id}/confirm` | Confirms visit after transactional clash re-check. |
| | `POST` | `/api/v1/evc/visits/{id}/reschedule` | Reschedules visit to a new candidate date. |
| | `POST` | `/api/v1/evc/visits/{id}/complete` | Records visit completion notes and recommendations. |
| | `POST` | `/api/v1/evc/visits/{id}/cancel` | Cancels scheduled visit. |
| | `GET` | `/api/v1/evc/experts` | Lists experts with domain, region, and current workload. |
| **Undertakings** | `GET` | `/api/v1/undertakings` | Lists undertakings by application or status. |
| | `POST` | `/api/v1/undertakings` | Creates a new time-bound undertaking commitment. |
| | `POST` | `/api/v1/undertakings/{id}/submit` | Submits proof document for an undertaking. |
| | `POST` | `/api/v1/undertakings/{id}/verify` | Officer approves or rejects submitted evidence. |
| | `POST` | `/api/v1/undertakings/{id}/waive` | Waives undertaking with official justification. |
| **Documents** | `GET` | `/api/v1/documents` | Lists compliance documents and expiry horizons. |
| | `POST` | `/api/v1/documents` | Registers new statutory document metadata. |
| | `POST` | `/api/v1/documents/{id}/verify` | Verifies document authenticity. |
| | `GET` | `/api/v1/documents/calendar` | 12-month document expiry timeline. |
| **Reports** | `GET` | `/api/v1/reports/summary` | Executive KPI counts (total, overdue, due this week, scheduled EVCs). |
| | `GET` | `/api/v1/reports/funnel` | Stage-by-stage funnel volume and intake numbers. |
| | `GET` | `/api/v1/reports/aging` | Stage aging and overdue day distributions. |
| | `GET` | `/api/v1/reports/bottlenecks` | Stage &times; Region breach heatmap. |
| | `GET` | `/api/v1/reports/export` | Generates report export in CSV format. |
| **Predictions** | `GET` | `/api/v1/predictions/delay-risk/{id}` | Calculates model breach probability for a specific application. |
| | `GET` | `/api/v1/predictions/at-risk` | Returns open applications exceeding the high-risk threshold. |
| **Jobs** | `POST` | `/api/v1/jobs/run-daily-checks` | Triggers full compliance scan (requires `X-Job-Secret` header). |
| **Audit** | `GET` | `/api/v1/audit` | Retrieves append-only audit trail with filtering. |

---

### Database Schema Summary

The relational database architecture is structured across core domain areas:

- **Foundation (`001_foundation.sql`):** `institutions` (regional education bodies), `profiles` (extends `auth.users` with roles, officer levels, and assigned regions), `audit_logs` (immutable event log).
- **Workflow (`002_workflow_config.sql`, `003_applications.sql`):** `workflow_stages` (process blueprint), `applications` (primary entity with priority scores and hold flags), `application_stage_history` (contains a partial unique index ensuring exactly one active open stage per application: `WHERE exited_at IS NULL`).
- **EVC (`004_evc.sql`):** `experts`, `expert_unavailability` (date-range blackouts), `evc_visits` (`PROPOSED`, `CONFIRMED`, `COMPLETED`, `CANCELLED`), `evc_visit_experts` (links visits to experts with `is_lead` and `confirmed` flags).
- **Compliance (`005_undertakings_documents.sql`):** `undertakings` (time-bound institutional obligations), `compliance_documents` (statutory certificates with `valid_from` and `valid_until`).
- **Alerts & Escalation (`006_alerts_rules.sql`):** `alert_rules`, `escalation_rules`, `alerts` (with unique `dedupe_key` constraint).
- **Security & Views (`007_rls.sql`, `008_reports_views.sql`):** Row-Level Security policies restricting data access by role and region; analytical SQL views (`v_pipeline_funnel`, `v_pendency_aging`, `v_sla_breaches`, `v_stage_bottlenecks`, `v_officer_workload`, `v_upcoming_deadlines`) built with `security_invoker = true`.

---

## 15. Planted Demo Scenarios

The synthetic seed generator (`python backend/scripts/seed_262.py`) plants 5 verifiable evaluation scenarios so evaluators can inspect every facet of the system:

1. **Overdue Scrutiny (Level 1 & Level 2 Escalation):**
   - *Application:* `AICTE-2026-10010` (Application #10).
   - *State:* Entered `SCRUTINY` 15 days ago (10-day SLA); currently 5 days overdue.
   - *Expected Result:* Triggers Level 1 and Level 2 escalations to Section Officer and Section Head. Highlighted with red badge in officer queue.
2. **Severe Overdue Application (Level 3 Regional Escalation):**
   - *Application:* `AICTE-2026-10011` (Application #11).
   - *State:* Entered stage 22 days ago; 12 days overdue.
   - *Expected Result:* Escalated directly to the Regional Head (`REGIONAL_HEAD`). Visible on the Regional Dashboard.
3. **Expiring & Expired Compliance Documents:**
   - *Institution:* `1-1000001` (Campus #1) and `1-1000002` (Campus #2).
   - *State:* One Land Use Certificate expires in 12 days; one Lease Deed expired 10 days ago.
   - *Expected Result:* Appears under Document Expiry Reminders with amber (`EXPIRING`) and red (`EXPIRED`) flags.
4. **Time-Bound Undertaking Commitments:**
   - *Application:* `AICTE-2026-10001` and `AICTE-2026-10002`.
   - *State:* One undertaking overdue by 5 days; another due in 6 days.
   - *Expected Result:* Listed on the Undertakings tracking screen; allows upload of proof documents and officer verification.
5. **EVC Expert Conflict & Clash Detection:**
   - *Expert:* Prof. Dr. Expert NOR_1 (`experts[0]`).
   - *State:* Marked unavailable 5 days from today due to an academic conference.
   - *Expected Result:* When requesting EVC committee suggestions for that date, the recommendation engine bypasses this expert. If manually forced, returns an HTTP 409 `EVC_CLASH` error.

---

## 16. Deployment Guidance

### Frontend Deployment (Vercel)
The `frontend/` directory includes [`vercel.json`](file:///c:/Users/SIDDHARTH%20SAURABH/Documents/GitHub/valid8/frontend/vercel.json) configured for single-page application (SPA) rewrites:
1. Connect your repository to Vercel.
2. Set **Root Directory** to `frontend`.
3. Configure Environment Variables:
   - `VITE_API_URL`: Your deployed FastAPI backend URL (e.g., `https://your-backend.onrender.com/api/v1`).
   - `VITE_USE_MOCKS`: Set to `false` when connecting to a live backend, or leave `true` for a static demo.
4. Deploy.

### Backend Deployment (Container / Cloud Services)
The `backend/` directory provides a production [`Dockerfile`](file:///c:/Users/SIDDHARTH%20SAURABH/Documents/GitHub/valid8/backend/Dockerfile) based on `python:3.11-slim`:
1. Build and test container:
   ```bash
   docker build -t valid8-backend ./backend
   docker run -p 8000:8000 --env-file ./backend/.env valid8-backend
   ```
2. Deploy to services such as Render, Railway, AWS ECS, or Google Cloud Run.
3. Configure all backend environment variables (`SUPABASE_URL`, `DATABASE_URL`, `SUPABASE_JWT_SECRET`, etc.).

### External Daily Cron Configuration
On serverless hosting (e.g., free-tier Render or Fly.io) where background processes may spin down during inactivity, configure an external cron job (e.g., GitHub Actions or `cron-job.org`) to invoke the daily compliance check:
- **Method:** `POST`
- **URL:** `https://<your-backend-domain>/api/v1/jobs/run-daily-checks`
- **Header:** `X-Job-Secret: <your-configured-job-secret>`
- **Schedule:** Once daily (e.g., `0 1 * * *` at 01:00 UTC).

---

## 17. Limitations & Verified Status

During repository audit, the following technical specifics were verified:

1. **Frontend Dockerfile:** While [`docker-compose.yml`](file:///c:/Users/SIDDHARTH%20SAURABH/Documents/GitHub/valid8/docker-compose.yml) defines both a backend and frontend service, a `frontend/Dockerfile` is not included in the repository. Run the frontend via `npm run dev` or build with Vite.
2. **SQLite vs PostgreSQL Concurrency in Tests:** Pytest suites utilize in-memory SQLite for high-speed local testing. SQLite does not enforce PostgreSQL row locks (`FOR UPDATE`) or native `ARRAY` types (handled via JSON compilation in test fixtures). Full concurrency testing requires a live PostgreSQL instance.
3. **Root Manifest vs Frontend Directory:** The root directory contains an initial Vite package scaffold, but the active, feature-complete application code resides in [`frontend/`](file:///c:/Users/SIDDHARTH%20SAURABH/Documents/GitHub/valid8/frontend/). Always install dependencies and run commands inside `frontend/`.
4. **Synthetic Data Only:** The repository is configured as a prototype demonstration. All institution names, application identifiers, student intake numbers, and expert contacts are randomly generated synthetic data.

---

## 18. License & Acknowledgments

This project is open-source under standard permissive terms. See repository commits and contributors for project history.
