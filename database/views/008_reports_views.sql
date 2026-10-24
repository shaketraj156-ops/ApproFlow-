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
