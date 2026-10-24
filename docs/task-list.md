# Task List & Implementation Progress

## Milestone 1: Database & Foundation
- [x] Initial monorepo configuration (.gitignore, docker-compose.yml, .env.example)
- [x] 001_foundation.sql (auth, user roles, institutions, profiles, audit_logs, RLS helpers)
- [x] 002_workflow_config.sql (stages, SLA, allowed transitions)
- [x] 003_applications.sql (applications, stage history, open stage partial index)
- [x] 004_evc.sql (experts pool, unavailability, visits, committee)
- [x] 005_undertakings_documents.sql (undertakings lifecycle, document validity)
- [x] 006_alerts_rules.sql (alert rules, escalation rules, alerts dedupe)
- [x] 007_rls.sql (Row Level Security policies)
- [x] 008_reports_views.sql (SQL views for dashboards and funnel)

## Milestone 2: Backend Core & Engine
- [x] FastAPI skeleton, Pydantic schemas, SQLAlchemy models
- [x] Workflow service (transition validation, stage movement transaction)
- [x] SLA service & Priority score calculator
- [x] Alert service & daily checks background job
- [x] EVC suggestion & clash detection engine
- [x] Undertakings & Document validity tracking
- [x] Seed generation script (seed_262.py)
- [x] Delay prediction ML baseline model & training script

## Milestone 3: Frontend Architecture & UI
- [x] Vite + React + Tailwind CSS layout & design system
- [x] Auth context with mock mode fallback (`VITE_USE_MOCKS=true`)
- [x] Reusable component kit: KPI cards, StatusBadge, SlaChip, DataTable, Modal
- [x] Mock fixtures for standalone offline testing
- [x] Officer dashboard (My Queue, SLA pendency, quick filters)
- [x] Application detail & interactive stage transition modal
- [x] EVC scheduling interface & committee picker
- [x] Undertakings timeline & document validity tracker
- [x] Regional & National bottleneck dashboards
- [x] Admin workflow configuration & rule editor
