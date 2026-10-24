# SIH26262 Requirements Specification

## Problem Statement
AICTE Approval Workflow Automation, Compliance Monitoring, and Alert Management System.

## Core Functional Capabilities

### 1. Workflow Automation
- End-to-end movement of institution approval applications through configurable stages:
  `SUBMITTED` -> `SCRUTINY` -> `RE_SCRUTINY` -> `EVC` -> `REGIONAL_COMMITTEE` -> `SAC_SHC` -> `DECIDED`.
- Strict validation that state transitions match allowed `next_stages`.
- Automatic routing to the least-loaded officer with appropriate role/region.
- Re-scrutiny deficiency counter increments upon `DEFICIENCY_FOUND`.
- Terminal stage transitions require recorded decision (`APPROVED`, `REJECTED`, `APPROVED_WITH_CONDITIONS`).

### 2. SLA & Pendency Tracking
- Stage-wise due date calculation (`due_at = entered_at + sla_days`).
- Real-time SLA breach detection and aging analysis.
- Region, stage, and officer level pendency metrics.

### 3. Alerts & Escalation Ladder
- Configurable reminder offsets (Level 0: e.g. 7, 3, 1 days prior to due date).
- Progressive escalation upon SLA breach:
  - Level 1 (0 days overdue): Section / Scrutiny Officer
  - Level 2 (4 days overdue): Section Head
  - Level 3 (8 days overdue): Regional Head
  - Level 4 (15 days overdue): National Head
- Alert deduplication using composite keys (`dedupe_key = entity_type:entity_id:rule_code:level/offset`).
- Auto-resolution of active alerts when the underlying stage or requirement is completed.

### 4. Expert Visit Committee (EVC) Scheduling
- Greedy expert suggestion engine based on region, domain, availability, and active load.
- Avoid expert scheduling conflicts and clash verification inside transactions (HTTP 409 `EVC_CLASH`).
- Visit lifecycle tracking: `PROPOSED` -> `CONFIRMED` -> `COMPLETED`, or `RESCHEDULED` / `CANCELLED`.

### 5. Undertakings & Compliance Documents
- Institutional commitments tracked with deadlines: `PENDING`, `SUBMITTED`, `VERIFIED`, `OVERDUE`, `WAIVED`.
- Document validity management with 12-month expiry timeline: `VALID`, `EXPIRING` (<= 30 days), `EXPIRED`.
- Secure file storage references using private Supabase storage.

### 6. Innovation & Decision Support
- Smart Priority Score (0 to 100) combining overdue days, intake requested, deficiency count, and age days.
- ML Delay Risk Prediction (Gradient Boosting baseline with fallback heuristic) estimating SLA breach likelihood.
- Bottleneck analytics (Stage x Region heatmap).
