-- =============================================================================
-- Migration 006: Alerts & Escalation Rules
-- =============================================================================

CREATE TABLE IF NOT EXISTS alert_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    offsets_days INT[] NOT NULL DEFAULT '{7,3,1}',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS escalation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level INT UNIQUE NOT NULL,
    overdue_days INT NOT NULL,
    target_role VARCHAR(50) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Default Rules
INSERT INTO alert_rules (code, name, entity_type, offsets_days, active)
VALUES
    ('STAGE_DUE_REMINDER', 'Application Stage Due Reminder', 'APPLICATION_STAGE', '{7,3,1}', TRUE),
    ('UNDERTAKING_DUE_REMINDER', 'Undertaking Submission Reminder', 'UNDERTAKING', '{7,3,1}', TRUE),
    ('DOCUMENT_EXPIRY_REMINDER', 'Compliance Document Expiry Reminder', 'COMPLIANCE_DOCUMENT', '{30,15,7}', TRUE)
ON CONFLICT (code) DO NOTHING;

INSERT INTO escalation_rules (level, overdue_days, target_role, active)
VALUES
    (1, 0, 'SECTION_OFFICER', TRUE),
    (2, 4, 'SECTION_HEAD', TRUE),
    (3, 8, 'REGIONAL_HEAD', TRUE),
    (4, 15, 'NATIONAL_HEAD', TRUE)
ON CONFLICT (level) DO NOTHING;

-- Alerts Table (Deduplicated with dedupe_key)
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dedupe_key VARCHAR(255) UNIQUE NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    rule_code VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, CRITICAL
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    recipient_role VARCHAR(50) NOT NULL,
    recipient_id UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,
    region VARCHAR(50) NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'OPEN', -- OPEN, ACKNOWLEDGED, RESOLVED
    acknowledged_at TIMESTAMPTZ NULL,
    acknowledged_by UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_status_recip ON alerts(status, recipient_role, recipient_id);
CREATE INDEX IF NOT EXISTS idx_alerts_region ON alerts(region);
CREATE INDEX IF NOT EXISTS idx_alerts_entity ON alerts(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts(created_at DESC);
