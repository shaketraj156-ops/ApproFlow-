# Database Schema Specification

## Overview
The database uses Supabase Postgres with Row Level Security (RLS) enabled on all application tables. All timestamps are stored in UTC (`timestamptz`) and displayed in Indian Standard Time (IST) on client applications.

## Tables

### 1. Foundation Tables (`001_foundation.sql`)
- `institutions`:
  - `id`: UUID (PK)
  - `name`: VARCHAR(255) NOT NULL
  - `code`: VARCHAR(50) UNIQUE NOT NULL
  - `region`: VARCHAR(50) NOT NULL
  - `address`: TEXT
  - `created_at`, `updated_at`: TIMESTAMPTZ
- `profiles`:
  - `id`: UUID (PK, references auth.users)
  - `email`: VARCHAR(255) NOT NULL
  - `full_name`: VARCHAR(255) NOT NULL
  - `role`: user_role enum (`aicte_officer`, `institution_admin`, `institution_staff`, `auditor`, `system_admin`)
  - `officer_level`: officer_level enum (`SECTION_OFFICER`, `SCRUTINY_OFFICER`, `REGIONAL_HEAD`, `NATIONAL_HEAD`) NULL
  - `region`: VARCHAR(50) NULL
  - `institution_id`: UUID (FK institutions.id) NULL
  - `created_at`, `updated_at`: TIMESTAMPTZ
- `audit_logs`:
  - `id`: UUID (PK)
  - `entity_type`: VARCHAR(50) NOT NULL
  - `entity_id`: UUID NOT NULL
  - `action`: VARCHAR(50) NOT NULL
  - `actor_id`: UUID NULL
  - `actor_role`: VARCHAR(50) NULL
  - `old_state`: JSONB NULL
  - `new_state`: JSONB NULL
  - `ip_address`: VARCHAR(45) NULL
  - `created_at`: TIMESTAMPTZ DEFAULT NOW()

### 2. Workflow Configuration (`002_workflow_config.sql`)
- `workflow_stages`:
  - `id`: UUID (PK)
  - `code`: VARCHAR(50) UNIQUE NOT NULL
  - `name`: VARCHAR(100) NOT NULL
  - `sequence_order`: INT NOT NULL
  - `sla_days`: INT NOT NULL
  - `owner_role`: VARCHAR(50) NOT NULL
  - `next_stages`: JSONB NOT NULL DEFAULT '[]'
  - `is_terminal`: BOOLEAN DEFAULT FALSE
  - `requires_decision`: BOOLEAN DEFAULT FALSE
  - `active`: BOOLEAN DEFAULT TRUE

### 3. Applications & History (`003_applications.sql`)
- `applications`:
  - `id`: UUID (PK)
  - `application_number`: VARCHAR(64) UNIQUE NOT NULL
  - `institution_id`: UUID (FK institutions.id) NOT NULL
  - `region`: VARCHAR(50) NOT NULL
  - `application_type`: VARCHAR(50) NOT NULL
  - `current_stage_code`: VARCHAR(50) NOT NULL REFERENCES workflow_stages(code)
  - `owner_id`: UUID REFERENCES profiles(id)
  - `priority_score`: FLOAT DEFAULT 0.0
  - `deficiency_count`: INT DEFAULT 0
  - `intake_requested`: INT DEFAULT 0
  - `is_on_hold`: BOOLEAN DEFAULT FALSE
  - `hold_reason`: TEXT
  - `decision`: VARCHAR(50)
  - `decision_date`: TIMESTAMPTZ
  - `decision_remarks`: TEXT
  - `created_at`, `updated_at`: TIMESTAMPTZ
- `application_stage_history`:
  - `id`: UUID (PK)
  - `application_id`: UUID (FK applications.id) NOT NULL
  - `stage_code`: VARCHAR(50) NOT NULL
  - `owner_id`: UUID REFERENCES profiles(id)
  - `entered_at`: TIMESTAMPTZ DEFAULT NOW()
  - `due_at`: TIMESTAMPTZ NOT NULL
  - `exited_at`: TIMESTAMPTZ NULL
  - `outcome`: VARCHAR(50) NULL
  - `notes`: TEXT
  - `created_at`: TIMESTAMPTZ DEFAULT NOW()
  - Partial Unique Index: `(application_id) WHERE exited_at IS NULL`

### 4. Expert Visit Committee (`004_evc.sql`)
- `experts`:
  - `id`: UUID (PK)
  - `name`: VARCHAR(255) NOT NULL
  - `email`: VARCHAR(255) NOT NULL
  - `phone`: VARCHAR(50)
  - `domain`: VARCHAR(100) NOT NULL
  - `region`: VARCHAR(50) NOT NULL
  - `active`: BOOLEAN DEFAULT TRUE
  - `max_visits_per_cycle`: INT DEFAULT 5
  - `current_load`: INT DEFAULT 0
- `expert_unavailability`:
  - `id`: UUID (PK)
  - `expert_id`: UUID REFERENCES experts(id) ON DELETE CASCADE
  - `start_date`: DATE NOT NULL
  - `end_date`: DATE NOT NULL
  - `reason`: TEXT
- `evc_visits`:
  - `id`: UUID (PK)
  - `application_id`: UUID REFERENCES applications(id)
  - `scheduled_date`: DATE NOT NULL
  - `status`: VARCHAR(50) NOT NULL DEFAULT 'PROPOSED'
  - `remarks`: TEXT
  - `created_at`, `updated_at`: TIMESTAMPTZ
- `evc_visit_experts`:
  - `id`: UUID (PK)
  - `evc_visit_id`: UUID REFERENCES evc_visits(id) ON DELETE CASCADE
  - `expert_id`: UUID REFERENCES experts(id)
  - `is_lead`: BOOLEAN DEFAULT FALSE
  - `confirmed`: BOOLEAN DEFAULT FALSE
  - UNIQUE(`evc_visit_id`, `expert_id`)

### 5. Undertakings & Compliance Documents (`005_undertakings_documents.sql`)
- `undertakings`:
  - `id`: UUID (PK)
  - `application_id`: UUID REFERENCES applications(id)
  - `title`: VARCHAR(255) NOT NULL
  - `description`: TEXT
  - `due_date`: DATE NOT NULL
  - `status`: VARCHAR(50) NOT NULL DEFAULT 'PENDING'
  - `submitted_at`: TIMESTAMPTZ
  - `verified_at`: TIMESTAMPTZ
  - `verified_by`: UUID REFERENCES profiles(id)
  - `document_path`: TEXT
  - `remarks`: TEXT
  - `created_at`, `updated_at`: TIMESTAMPTZ
- `compliance_documents`:
  - `id`: UUID (PK)
  - `institution_id`: UUID REFERENCES institutions(id)
  - `application_id`: UUID REFERENCES applications(id)
  - `title`: VARCHAR(255) NOT NULL
  - `document_type`: VARCHAR(100) NOT NULL
  - `valid_from`: DATE NOT NULL
  - `valid_until`: DATE NOT NULL
  - `status`: VARCHAR(50) NOT NULL DEFAULT 'VALID'
  - `storage_path`: TEXT
  - `verified`: BOOLEAN DEFAULT FALSE
  - `created_at`, `updated_at`: TIMESTAMPTZ

### 6. Alerts & Escalation (`006_alerts_rules.sql`)
- `alert_rules`:
  - `id`: UUID (PK)
  - `code`: VARCHAR(50) UNIQUE NOT NULL
  - `name`: VARCHAR(255) NOT NULL
  - `entity_type`: VARCHAR(50) NOT NULL
  - `offsets_days`: INT[] NOT NULL
  - `active`: BOOLEAN DEFAULT TRUE
- `escalation_rules`:
  - `id`: UUID (PK)
  - `level`: INT NOT NULL
  - `overdue_days`: INT NOT NULL
  - `target_role`: VARCHAR(50) NOT NULL
  - `active`: BOOLEAN DEFAULT TRUE
- `alerts`:
  - `id`: UUID (PK)
  - `dedupe_key`: VARCHAR(255) UNIQUE NOT NULL
  - `entity_type`: VARCHAR(50) NOT NULL
  - `entity_id`: UUID NOT NULL
  - `rule_code`: VARCHAR(50) NOT NULL
  - `severity`: VARCHAR(20) NOT NULL
  - `title`: VARCHAR(255) NOT NULL
  - `message`: TEXT NOT NULL
  - `recipient_role`: VARCHAR(50) NOT NULL
  - `recipient_id`: UUID REFERENCES profiles(id)
  - `region`: VARCHAR(50)
  - `status`: VARCHAR(50) NOT NULL DEFAULT 'OPEN'
  - `acknowledged_at`: TIMESTAMPTZ
  - `acknowledged_by`: UUID REFERENCES profiles(id)
  - `resolved_at`: TIMESTAMPTZ
  - `created_at`: TIMESTAMPTZ DEFAULT NOW()
