-- =============================================================================
-- ApproFlow (SIH26262) Full Database Schema (All Migrations + Views)
-- Copy and run this ENTIRE file once in your Supabase SQL Editor
-- =============================================================================


-- >>> START OF database/migrations/001_foundation.sql <<<
-- =============================================================================
-- Migration 001: Foundation Schema
-- Standalone setup for SIH26262 ApproFlow
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Enums
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM (
        'aicte_officer',
        'institution_admin',
        'institution_staff',
        'auditor',
        'system_admin'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE officer_level AS ENUM (
        'SECTION_OFFICER',
        'SCRUTINY_OFFICER',
        'REGIONAL_HEAD',
        'NATIONAL_HEAD'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Utility Trigger Function: updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Institutions Table
CREATE TABLE IF NOT EXISTS institutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    region VARCHAR(50) NOT NULL,
    address TEXT,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_institutions_updated_at
BEFORE UPDATE ON institutions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 4. Profiles Table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'institution_staff',
    officer_level officer_level NULL,
    region VARCHAR(50) NULL,
    institution_id UUID NULL REFERENCES institutions(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_region ON profiles(region);
CREATE INDEX IF NOT EXISTS idx_profiles_institution ON profiles(institution_id);

CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 5. Audit Logs Table (Append-Only)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    actor_id UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,
    actor_role VARCHAR(50) NULL,
    old_state JSONB NULL,
    new_state JSONB NULL,
    ip_address VARCHAR(45) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

-- 6. Helper Functions for RLS
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role AS $$
    SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION current_user_region()
RETURNS VARCHAR AS $$
    SELECT region FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION current_user_institution()
RETURNS UUID AS $$
    SELECT institution_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_aicte_officer()
RETURNS BOOLEAN AS $$
    SELECT role = 'aicte_officer' FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_system_admin()
RETURNS BOOLEAN AS $$
    SELECT role = 'system_admin' FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 7. Automatic Auth Sync Trigger
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'institution_staff')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- >>> END OF database/migrations/001_foundation.sql <<<


-- >>> START OF database/migrations/002_workflow_config.sql <<<
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

-- >>> END OF database/migrations/002_workflow_config.sql <<<


-- >>> START OF database/migrations/003_applications.sql <<<
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

-- >>> END OF database/migrations/003_applications.sql <<<


-- >>> START OF database/migrations/004_evc.sql <<<
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

-- >>> END OF database/migrations/004_evc.sql <<<


-- >>> START OF database/migrations/005_undertakings_documents.sql <<<
-- =============================================================================
-- Migration 005: Undertakings & Compliance Documents
-- =============================================================================

CREATE TABLE IF NOT EXISTS undertakings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, SUBMITTED, VERIFIED, OVERDUE, WAIVED
    submitted_at TIMESTAMPTZ NULL,
    verified_at TIMESTAMPTZ NULL,
    verified_by UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,
    document_path TEXT NULL,
    remarks TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_undertakings_app ON undertakings(application_id);
CREATE INDEX IF NOT EXISTS idx_undertakings_due ON undertakings(due_date);
CREATE INDEX IF NOT EXISTS idx_undertakings_status ON undertakings(status);

CREATE TRIGGER trg_undertakings_updated_at
BEFORE UPDATE ON undertakings
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS compliance_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    application_id UUID NULL REFERENCES applications(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    document_type VARCHAR(100) NOT NULL,
    valid_from DATE NOT NULL,
    valid_until DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'VALID', -- VALID, EXPIRING, EXPIRED
    storage_path TEXT NULL,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comp_docs_inst ON compliance_documents(institution_id);
CREATE INDEX IF NOT EXISTS idx_comp_docs_app ON compliance_documents(application_id);
CREATE INDEX IF NOT EXISTS idx_comp_docs_expiry ON compliance_documents(valid_until);
CREATE INDEX IF NOT EXISTS idx_comp_docs_status ON compliance_documents(status);

CREATE TRIGGER trg_compliance_documents_updated_at
BEFORE UPDATE ON compliance_documents
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- >>> END OF database/migrations/005_undertakings_documents.sql <<<


-- >>> START OF database/migrations/006_alerts_rules.sql <<<
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

-- >>> END OF database/migrations/006_alerts_rules.sql <<<


-- >>> START OF database/migrations/007_rls.sql <<<
-- =============================================================================
-- Migration 007: Row Level Security (RLS) Policies
-- =============================================================================

-- Enable RLS across all tables
ALTER TABLE workflow_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_stage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE experts ENABLE ROW LEVEL SECURITY;
ALTER TABLE expert_unavailability ENABLE ROW LEVEL SECURITY;
ALTER TABLE evc_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE evc_visit_experts ENABLE ROW LEVEL SECURITY;
ALTER TABLE undertakings ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. Configuration Tables (workflow_stages, alert_rules, escalation_rules)
CREATE POLICY p_stages_select ON workflow_stages
    FOR SELECT TO authenticated USING (true);
CREATE POLICY p_stages_admin ON workflow_stages
    FOR ALL TO authenticated USING (is_system_admin());

CREATE POLICY p_alert_rules_select ON alert_rules
    FOR SELECT TO authenticated USING (true);
CREATE POLICY p_alert_rules_admin ON alert_rules
    FOR ALL TO authenticated USING (is_system_admin());

CREATE POLICY p_escalation_rules_select ON escalation_rules
    FOR SELECT TO authenticated USING (true);
CREATE POLICY p_escalation_rules_admin ON escalation_rules
    FOR ALL TO authenticated USING (is_system_admin());

-- 2. Institutions & Profiles
CREATE POLICY p_inst_select ON institutions
    FOR SELECT TO authenticated
    USING (
        is_aicte_officer() OR
        current_user_role() IN ('auditor', 'system_admin') OR
        id = current_user_institution()
    );

CREATE POLICY p_profiles_select ON profiles
    FOR SELECT TO authenticated
    USING (
        id = auth.uid() OR
        is_aicte_officer() OR
        current_user_role() IN ('auditor', 'system_admin')
    );

CREATE POLICY p_profiles_update_self ON profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid());

-- 3. Applications
CREATE POLICY p_applications_select ON applications
    FOR SELECT TO authenticated
    USING (
        current_user_role() IN ('auditor', 'system_admin') OR
        (is_aicte_officer() AND (
            (SELECT officer_level FROM profiles WHERE id = auth.uid()) = 'NATIONAL_HEAD' OR
            region = current_user_region()
        )) OR
        (current_user_role() IN ('institution_admin', 'institution_staff') AND institution_id = current_user_institution())
    );

CREATE POLICY p_applications_insert ON applications
    FOR INSERT TO authenticated
    WITH CHECK (
        current_user_role() = 'system_admin' OR
        (current_user_role() IN ('institution_admin', 'institution_staff') AND institution_id = current_user_institution())
    );

CREATE POLICY p_applications_update ON applications
    FOR UPDATE TO authenticated
    USING (
        is_system_admin() OR
        (is_aicte_officer() AND (
            (SELECT officer_level FROM profiles WHERE id = auth.uid()) = 'NATIONAL_HEAD' OR
            region = current_user_region()
        ))
    );

-- 4. Application Stage History
CREATE POLICY p_history_select ON application_stage_history
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM applications a 
            WHERE a.id = application_stage_history.application_id
        )
    );

-- 5. EVC Tables (experts, expert_unavailability, evc_visits, evc_visit_experts)
CREATE POLICY p_experts_select ON experts
    FOR SELECT TO authenticated
    USING (is_aicte_officer() OR current_user_role() IN ('auditor', 'system_admin'));

CREATE POLICY p_experts_modify ON experts
    FOR ALL TO authenticated
    USING (
        is_system_admin() OR
        (is_aicte_officer() AND (SELECT officer_level FROM profiles WHERE id = auth.uid()) IN ('REGIONAL_HEAD', 'NATIONAL_HEAD'))
    );

CREATE POLICY p_evc_visits_select ON evc_visits
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM applications a 
            WHERE a.id = evc_visits.application_id
        )
    );

CREATE POLICY p_evc_visits_modify ON evc_visits
    FOR ALL TO authenticated
    USING (
        is_system_admin() OR
        (is_aicte_officer() AND (SELECT officer_level FROM profiles WHERE id = auth.uid()) IN ('REGIONAL_HEAD', 'NATIONAL_HEAD'))
    );

CREATE POLICY p_evc_experts_select ON evc_visit_experts
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM evc_visits v 
            WHERE v.id = evc_visit_experts.evc_visit_id
        )
    );

-- 6. Undertakings & Compliance Documents
CREATE POLICY p_undertakings_select ON undertakings
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM applications a 
            WHERE a.id = undertakings.application_id
        )
    );

CREATE POLICY p_undertakings_insert ON undertakings
    FOR INSERT TO authenticated
    WITH CHECK (is_aicte_officer() OR is_system_admin());

CREATE POLICY p_undertakings_update ON undertakings
    FOR UPDATE TO authenticated
    USING (
        is_aicte_officer() OR 
        is_system_admin() OR
        EXISTS (
            SELECT 1 FROM applications a 
            WHERE a.id = undertakings.application_id AND a.institution_id = current_user_institution()
        )
    );

CREATE POLICY p_comp_docs_select ON compliance_documents
    FOR SELECT TO authenticated
    USING (
        is_aicte_officer() OR
        current_user_role() IN ('auditor', 'system_admin') OR
        institution_id = current_user_institution()
    );

CREATE POLICY p_comp_docs_modify ON compliance_documents
    FOR ALL TO authenticated
    USING (
        is_system_admin() OR
        institution_id = current_user_institution() OR
        is_aicte_officer()
    );

-- 7. Alerts
CREATE POLICY p_alerts_select ON alerts
    FOR SELECT TO authenticated
    USING (
        current_user_role() = 'system_admin' OR
        recipient_id = auth.uid() OR
        (is_aicte_officer() AND (
            recipient_role = (SELECT officer_level::text FROM profiles WHERE id = auth.uid()) OR
            recipient_role = 'SECTION_OFFICER'
        ) AND (region IS NULL OR region = current_user_region()))
    );

CREATE POLICY p_alerts_ack ON alerts
    FOR UPDATE TO authenticated
    USING (
        recipient_id = auth.uid() OR
        is_system_admin() OR
        is_aicte_officer()
    );

-- 8. Audit Logs
CREATE POLICY p_audit_select ON audit_logs
    FOR SELECT TO authenticated
    USING (current_user_role() IN ('auditor', 'system_admin', 'aicte_officer'));

-- >>> END OF database/migrations/007_rls.sql <<<


-- >>> START OF database/views/008_reports_views.sql <<<
-- =============================================================================
-- Migration 008: Dashboard and Analytics Views
-- Created with security_invoker = true so PostgreSQL applies RLS to callers
-- =============================================================================

-- 1. Pipeline Funnel View
CREATE OR REPLACE VIEW v_pipeline_funnel
WITH (security_invoker = true) AS
SELECT 
    ws.code AS stage_code,
    ws.name AS stage_name,
    ws.sequence_order,
    COUNT(a.id) AS application_count,
    COALESCE(SUM(a.intake_requested), 0) AS total_intake_requested,
    ROUND(AVG(a.priority_score)::numeric, 1) AS avg_priority_score
FROM workflow_stages ws
LEFT JOIN applications a ON a.current_stage_code = ws.code
WHERE ws.active = TRUE
GROUP BY ws.code, ws.name, ws.sequence_order
ORDER BY ws.sequence_order;

-- 2. Pendency Aging View
CREATE OR REPLACE VIEW v_pendency_aging
WITH (security_invoker = true) AS
SELECT 
    a.id AS application_id,
    a.application_number,
    a.region,
    a.current_stage_code,
    ws.name AS stage_name,
    h.entered_at,
    h.due_at,
    GREATEST(0, EXTRACT(DAY FROM (NOW() - h.entered_at)))::int AS days_in_stage,
    GREATEST(0, EXTRACT(DAY FROM (NOW() - h.due_at)))::int AS overdue_days,
    CASE 
        WHEN NOW() > h.due_at THEN 'OVERDUE'
        WHEN NOW() >= (h.due_at - INTERVAL '3 days') THEN 'DUE_SOON'
        ELSE 'ON_TRACK'
    END AS sla_status,
    a.priority_score,
    a.owner_id,
    p.full_name AS owner_name
FROM applications a
JOIN application_stage_history h ON h.application_id = a.id AND h.exited_at IS NULL
JOIN workflow_stages ws ON ws.code = a.current_stage_code
LEFT JOIN profiles p ON p.id = a.owner_id;

-- 3. SLA Breaches View
CREATE OR REPLACE VIEW v_sla_breaches
WITH (security_invoker = true) AS
SELECT 
    a.id AS application_id,
    a.application_number,
    i.name AS institution_name,
    a.region,
    ws.name AS stage_name,
    h.due_at,
    EXTRACT(DAY FROM (NOW() - h.due_at))::int AS days_overdue,
    a.priority_score,
    p.full_name AS assigned_officer,
    p.email AS officer_email
FROM applications a
JOIN institutions i ON i.id = a.institution_id
JOIN application_stage_history h ON h.application_id = a.id AND h.exited_at IS NULL
JOIN workflow_stages ws ON ws.code = a.current_stage_code
LEFT JOIN profiles p ON p.id = a.owner_id
WHERE NOW() > h.due_at
ORDER BY h.due_at ASC;

-- 4. Stage Bottlenecks Heatmap View (Stage x Region)
CREATE OR REPLACE VIEW v_stage_bottlenecks
WITH (security_invoker = true) AS
SELECT 
    a.region,
    ws.code AS stage_code,
    ws.name AS stage_name,
    COUNT(a.id) AS pending_count,
    ROUND(AVG(EXTRACT(DAY FROM (NOW() - h.entered_at)))::numeric, 1) AS avg_days_in_stage,
    COUNT(CASE WHEN NOW() > h.due_at THEN 1 END) AS breach_count,
    ROUND((COUNT(CASE WHEN NOW() > h.due_at THEN 1 END)::numeric / NULLIF(COUNT(a.id), 0) * 100), 1) AS breach_rate_pct
FROM applications a
JOIN application_stage_history h ON h.application_id = a.id AND h.exited_at IS NULL
JOIN workflow_stages ws ON ws.code = a.current_stage_code
GROUP BY a.region, ws.code, ws.name, ws.sequence_order
ORDER BY a.region, ws.sequence_order;

-- 5. Officer Workload View
CREATE OR REPLACE VIEW v_officer_workload
WITH (security_invoker = true) AS
SELECT 
    p.id AS officer_id,
    p.full_name AS officer_name,
    p.email,
    p.region,
    p.officer_level,
    COUNT(a.id) AS active_applications,
    COUNT(CASE WHEN NOW() > h.due_at THEN 1 END) AS overdue_count,
    ROUND(AVG(a.priority_score)::numeric, 1) AS avg_priority_score
FROM profiles p
LEFT JOIN applications a ON a.owner_id = p.id
LEFT JOIN application_stage_history h ON h.application_id = a.id AND h.exited_at IS NULL
WHERE p.role = 'aicte_officer' AND p.is_active = TRUE
GROUP BY p.id, p.full_name, p.email, p.region, p.officer_level
ORDER BY active_applications DESC;

-- 6. Upcoming Deadlines View (Combined Stage, Undertakings, Documents)
CREATE OR REPLACE VIEW v_upcoming_deadlines
WITH (security_invoker = true) AS
SELECT 
    'APPLICATION_STAGE' AS entity_type,
    a.id AS entity_id,
    a.application_number AS identifier,
    'Stage: ' || ws.name AS title,
    h.due_at::date AS deadline,
    a.region,
    EXTRACT(DAY FROM (h.due_at - NOW()))::int AS days_remaining
FROM applications a
JOIN application_stage_history h ON h.application_id = a.id AND h.exited_at IS NULL
JOIN workflow_stages ws ON ws.code = a.current_stage_code
WHERE h.due_at >= NOW() AND h.due_at <= (NOW() + INTERVAL '15 days')

UNION ALL

SELECT 
    'UNDERTAKING' AS entity_type,
    u.id AS entity_id,
    a.application_number AS identifier,
    'Undertaking: ' || u.title AS title,
    u.due_date AS deadline,
    a.region,
    (u.due_date - CURRENT_DATE) AS days_remaining
FROM undertakings u
JOIN applications a ON a.id = u.application_id
WHERE u.status IN ('PENDING', 'SUBMITTED') AND u.due_date >= CURRENT_DATE AND u.due_date <= (CURRENT_DATE + 30)

UNION ALL

SELECT 
    'COMPLIANCE_DOCUMENT' AS entity_type,
    d.id AS entity_id,
    i.code AS identifier,
    'Doc Expiry: ' || d.title AS title,
    d.valid_until AS deadline,
    i.region,
    (d.valid_until - CURRENT_DATE) AS days_remaining
FROM compliance_documents d
JOIN institutions i ON i.id = d.institution_id
WHERE d.valid_until >= CURRENT_DATE AND d.valid_until <= (CURRENT_DATE + 60)
ORDER BY deadline ASC;

-- 7. Region Summary View
CREATE OR REPLACE VIEW v_region_summary
WITH (security_invoker = true) AS
SELECT 
    a.region,
    COUNT(a.id) AS total_applications,
    COUNT(CASE WHEN NOW() > h.due_at THEN 1 END) AS overdue_applications,
    COUNT(CASE WHEN a.decision IS NOT NULL THEN 1 END) AS decided_applications,
    ROUND(AVG(a.priority_score)::numeric, 1) AS avg_priority,
    COUNT(DISTINCT a.institution_id) AS total_institutions
FROM applications a
JOIN application_stage_history h ON h.application_id = a.id AND h.exited_at IS NULL
GROUP BY a.region;

-- >>> END OF database/views/008_reports_views.sql <<<

