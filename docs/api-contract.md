# API Contract Specification

Base URL: `/api/v1`  
Authentication: `Authorization: Bearer <Supabase access token>`  
Date format: ISO-8601 UTC string (`2026-10-24T12:00:00Z`)

## Standard Response Envelopes

### Success (Paginated List)
```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "page_size": 20,
  "pages": 0
}
```

### Error Response
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human readable explanation",
    "details": {}
  }
}
```

Standard Error Codes:
- `UNAUTHENTICATED`: 401
- `FORBIDDEN`: 403
- `NOT_FOUND`: 404
- `VALIDATION_ERROR`: 422
- `INVALID_TRANSITION`: 409
- `EVC_CLASH`: 409
- `RATE_LIMITED`: 429
- `INTERNAL`: 500

---

## 1. Applications API
- `GET /applications?page=1&page_size=20&stage=&region=&search=&is_overdue=&sort=-priority_score`
- `POST /applications`: Create new application
- `GET /applications/{id}`: Detailed application info with timeline and history
- `POST /applications/{id}/move`:
  - Request: `{ "to_stage": "EVC", "notes": "Scrutiny passed", "outcome": "APPROVED" }`
- `POST /applications/{id}/assign`:
  - Request: `{ "officer_id": "uuid" }`
- `POST /applications/{id}/hold`:
  - Request: `{ "reason": "Court inquiry pending" }`
- `POST /applications/{id}/resume`

## 2. Workflow Configuration API
- `GET /workflow/stages`
- `PUT /workflow/stages/{code}`
- `GET /workflow/escalation-rules`
- `PUT /workflow/escalation-rules`
- `GET /workflow/alert-rules`
- `PUT /workflow/alert-rules`

## 3. Alerts API
- `GET /alerts?status=OPEN&severity=`
- `GET /alerts/summary`: Count of open, acknowledged, critical alerts
- `POST /alerts/{id}/acknowledge`
- `POST /alerts/{id}/resolve`

## 4. EVC Visits API
- `POST /evc-visits/suggest`:
  - Request: `{ "application_id": "uuid", "target_date": "2026-11-05", "committee_size": 3 }`
- `POST /evc-visits`: Schedule visit
- `GET /evc-visits`: List visits
- `POST /evc-visits/{id}/confirm`
- `POST /evc-visits/{id}/reschedule`
- `POST /evc-visits/{id}/complete`
- `POST /evc-visits/{id}/cancel`
- `GET /experts`: List experts with load and availability

## 5. Undertakings & Documents API
- `GET /undertakings?application_id=&status=`
- `POST /undertakings`: Add undertaking commitment
- `POST /undertakings/{id}/submit`: Institution uploads evidence
- `POST /undertakings/{id}/verify`: Officer verifies evidence
- `POST /undertakings/{id}/reject`
- `GET /compliance-documents`
- `POST /compliance-documents`
- `GET /compliance-documents/timeline`

## 6. Reports & Analytics API
- `GET /reports/kpis`
- `GET /reports/funnel`
- `GET /reports/pendency-aging`
- `GET /reports/sla-breaches`
- `GET /reports/bottlenecks`
- `GET /reports/officer-workload`
- `GET /reports/upcoming-deadlines`
- `GET /reports/region-summary`
- `GET /reports/{name}/export?format=csv|xlsx|pdf`

## 7. Predictions & Jobs
- `GET /predictions/at-risk`
- `GET /predictions/delay-risk?application_id=`
- `POST /jobs/run-daily-checks` (Requires Header: `X-Job-Secret`)
- `GET /audit-logs?entity_type=&entity_id=`
- `GET /health`
