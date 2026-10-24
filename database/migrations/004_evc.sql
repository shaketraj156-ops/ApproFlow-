-- =============================================================================
-- Migration 004: Expert Visit Committee (EVC)
-- =============================================================================

CREATE TABLE IF NOT EXISTS experts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    domain VARCHAR(100) NOT NULL,
    region VARCHAR(50) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    max_visits_per_cycle INT NOT NULL DEFAULT 5,
    current_load INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_experts_region_domain ON experts(region, domain);
CREATE INDEX IF NOT EXISTS idx_experts_active_load ON experts(active, current_load);

CREATE TABLE IF NOT EXISTS expert_unavailability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expert_id UUID NOT NULL REFERENCES experts(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_unavailability_dates CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_unavail_expert ON expert_unavailability(expert_id, start_date, end_date);

CREATE TABLE IF NOT EXISTS evc_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    scheduled_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PROPOSED', -- PROPOSED, CONFIRMED, COMPLETED, CANCELLED, RESCHEDULED
    remarks TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evc_app ON evc_visits(application_id);
CREATE INDEX IF NOT EXISTS idx_evc_date ON evc_visits(scheduled_date);

CREATE TRIGGER trg_evc_visits_updated_at
BEFORE UPDATE ON evc_visits
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS evc_visit_experts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evc_visit_id UUID NOT NULL REFERENCES evc_visits(id) ON DELETE CASCADE,
    expert_id UUID NOT NULL REFERENCES experts(id) ON DELETE RESTRICT,
    is_lead BOOLEAN NOT NULL DEFAULT FALSE,
    confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(evc_visit_id, expert_id)
);

CREATE INDEX IF NOT EXISTS idx_visit_expert ON evc_visit_experts(expert_id);
