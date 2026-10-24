# Database Migrations and Setup

This directory contains pure PostgreSQL migrations designed for Supabase.

## Execution Order
Execute the migration scripts in sequential order inside the Supabase SQL Editor:

1. `migrations/001_foundation.sql` - Enums, institutions, profiles, audit logs, trigger functions, RLS helpers
2. `migrations/002_workflow_config.sql` - Workflow stages configuration and default stage seed
3. `migrations/003_applications.sql` - Applications and stage history with partial unique index
4. `migrations/004_evc.sql` - Expert pool, availability, EVC visits, and visit committees
5. `migrations/005_undertakings_documents.sql` - Undertakings commitments and compliance document validity
6. `migrations/006_alerts_rules.sql` - Alert rules, escalation matrix, and alerts table
7. `migrations/007_rls.sql` - Row Level Security policies
8. `views/008_reports_views.sql` - Dashboard and analytics views (with `security_invoker = true`)
9. Seed script: run `backend/scripts/seed_262.py`
