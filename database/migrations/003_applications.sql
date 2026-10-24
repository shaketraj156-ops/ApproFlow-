-- =============================================================================
-- Migration 003: Applications & Stage History
-- =============================================================================

CREATE TABLE IF NOT EXISTS applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_number VARCHAR(64) UNIQUE NOT NULL,
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
    region VARCHAR(50) NOT NULL,
    application_type VARCHAR(50) NOT NULL DEFAULT 'EXTENSION_OF_APPROVAL',
    current_stage_code VARCHAR(50) NOT NULL REFERENCES workflow_stages(code),
    owner_id UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,
    priority_score NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    deficiency_count INT NOT NULL DEFAULT 0,
    intake_requested INT NOT NULL DEFAULT 60,
    is_on_hold BOOLEAN NOT NULL DEFAULT FALSE,
    hold_reason TEXT NULL,
    decision VARCHAR(50) NULL,
    decision_date TIMESTAMPTZ NULL,
    decision_remarks TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_apps_institution ON applications(institution_id);
CREATE INDEX IF NOT EXISTS idx_apps_stage ON applications(current_stage_code);
CREATE INDEX IF NOT EXISTS idx_apps_region ON applications(region);
CREATE INDEX IF NOT EXISTS idx_apps_owner ON applications(owner_id);
CREATE INDEX IF NOT EXISTS idx_apps_priority ON applications(priority_score DESC);

CREATE TRIGGER trg_applications_updated_at
BEFORE UPDATE ON applications
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Application Stage History
CREATE TABLE IF NOT EXISTS application_stage_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    stage_code VARCHAR(50) NOT NULL REFERENCES workflow_stages(code),
    owner_id UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,
    entered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    due_at TIMESTAMPTZ NOT NULL,
    exited_at TIMESTAMPTZ NULL,
    outcome VARCHAR(50) NULL,
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hist_application ON application_stage_history(application_id);
CREATE INDEX IF NOT EXISTS idx_hist_stage ON application_stage_history(stage_code);
CREATE INDEX IF NOT EXISTS idx_hist_due ON application_stage_history(due_at);

-- Partial Unique Index: Guarantees exactly one active/open stage per application
CREATE UNIQUE INDEX IF NOT EXISTS idx_open_stage_per_app 
ON application_stage_history (application_id) 
WHERE exited_at IS NULL;
