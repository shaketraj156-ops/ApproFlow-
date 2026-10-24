# Backend Architecture Guide (SIH26262)

## 1. Core Principles
- Single Source of Truth: All workflow definitions, SLA durations, and escalation matrices are stored in Postgres tables, not hardcoded.
- Atomicity: State changes, stage closure, priority recalculation, and audit logging execute in a single ACID transaction.
- Defensive Security: JWT validation at API boundary + Supabase Row Level Security (RLS) on Postgres tables.
- Idempotent Background Processing: Daily SLA sweeps use deterministic deduplication keys.

## 2. Directory Layout
- `app/main.py`: Application entry point with CORS and routers.
- `app/core/`: Configuration, JWT auth, RBAC permissions, and custom exceptions.
- `app/models/`: Declarative SQLAlchemy models.
- `app/schemas/`: Pydantic V2 validation schemas.
- `app/services/`: Pure business logic (workflow, SLA, alerts, EVC, undertakings, reports, predictions).
- `app/api/v1/`: HTTP route handlers.
- `scripts/`: Seed data generator and ML model trainer.

## 3. Key Services
- `WorkflowService`: Validates transitions against `workflow_stages.next_stages`, calculates `due_at = entered_at + sla_days`, closes open history records.
- `SlaService`: Computes remaining days, reminder offsets, and escalation level triggers.
- `AlertService`: Generates alerts with dedupe keys (`entity_type:entity_id:rule_code:level`), auto-resolves obsolete alerts.
- `EvcService`: Proposes balanced 3-expert committees and blocks double-booking with `409 EVC_CLASH`.
- `PriorityService`: Computes dynamic score (0-100) combining overdue days, intake, deficiencies, and age.
- `PredictionService`: Provides ML delay risk estimate with statistical fallback.
