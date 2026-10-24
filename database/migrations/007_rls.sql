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
