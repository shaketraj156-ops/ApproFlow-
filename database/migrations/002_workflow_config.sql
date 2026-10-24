-- =============================================================================
-- Migration 002: Workflow Configuration
-- =============================================================================

CREATE TABLE IF NOT EXISTS workflow_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    sequence_order INT NOT NULL,
    sla_days INT NOT NULL DEFAULT 7,
    owner_role VARCHAR(50) NOT NULL,
    next_stages JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_terminal BOOLEAN NOT NULL DEFAULT FALSE,
    requires_decision BOOLEAN NOT NULL DEFAULT FALSE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_sequence ON workflow_stages(sequence_order);

CREATE TRIGGER trg_workflow_stages_updated_at
BEFORE UPDATE ON workflow_stages
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Seed Default Configurable AICTE Stages
INSERT INTO workflow_stages (code, name, sequence_order, sla_days, owner_role, next_stages, is_terminal, requires_decision)
VALUES
    ('SUBMITTED', 'Application Submitted', 1, 5, 'SCRUTINY_OFFICER', '["SCRUTINY"]'::jsonb, FALSE, FALSE),
    ('SCRUTINY', 'Document Scrutiny', 2, 10, 'SCRUTINY_OFFICER', '["RE_SCRUTINY", "EVC", "DECIDED"]'::jsonb, FALSE, FALSE),
    ('RE_SCRUTINY', 'Deficiency Re-Scrutiny', 3, 7, 'SCRUTINY_OFFICER', '["EVC", "DECIDED"]'::jsonb, FALSE, FALSE),
    ('EVC', 'Expert Visit Committee', 4, 15, 'REGIONAL_HEAD', '["REGIONAL_COMMITTEE", "DECIDED"]'::jsonb, FALSE, FALSE),
    ('REGIONAL_COMMITTEE', 'Regional Committee Review', 5, 10, 'REGIONAL_HEAD', '["SAC_SHC", "DECIDED"]'::jsonb, FALSE, FALSE),
    ('SAC_SHC', 'Standing Hearing / Appeal Committee', 6, 10, 'NATIONAL_HEAD', '["DECIDED"]'::jsonb, FALSE, FALSE),
    ('DECIDED', 'Final Decision Recorded', 7, 0, 'NATIONAL_HEAD', '[]'::jsonb, TRUE, TRUE)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    sequence_order = EXCLUDED.sequence_order,
    sla_days = EXCLUDED.sla_days,
    owner_role = EXCLUDED.owner_role,
    next_stages = EXCLUDED.next_stages,
    is_terminal = EXCLUDED.is_terminal,
    requires_decision = EXCLUDED.requires_decision;
