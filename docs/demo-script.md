# 5-Minute Evaluation Demo Script

## 1. Login & Role-Based Landing (0:00 - 0:45)
- Open frontend at `http://localhost:5173`.
- Log in as Section Officer (`officer@aicte.gov.in`).
- Highlight Officer "My Queue", KPI cards (Pending, Overdue, Due Soon), and Smart Priority ordering.
- Point out that SLA dates are shown in IST with days-left chips.

## 2. Stage Progression & Audit Trail (0:45 - 1:45)
- Open an application currently in `SCRUTINY`.
- Inspect the interactive stage timeline.
- Click "Move to Next Stage". Show that the modal only permits configured transitions (`RE_SCRUTINY` or `EVC`).
- Select `EVC`, add reviewer remarks, and confirm.
- Show the auto-recorded entry in the Audit Log tab with UTC/IST timestamp and actor ID.

## 3. SLA Escalation & Alert Center (1:45 - 2:30)
- Navigate to the Alerts Center or click the Alert Bell in the top navigation bar.
- Point out Level 1 and Level 2 escalations for overdue applications.
- Demonstrate that running daily checks never creates duplicate alerts due to idempotent deduplication keys.
- Acknowledge and resolve an alert.

## 4. EVC Scheduling with Clash Prevention (2:30 - 3:30)
- Open the EVC visit scheduler.
- Request automated suggestions for a 3-member committee.
- Explain how load balancing selects available experts in the same region.
- Simulate an expert conflict to demonstrate the 409 `EVC_CLASH` handling and resolution.

## 5. Compliance, Heatmap & Admin Config (3:30 - 5:00)
- Check Undertakings and the 12-month Document Expiry Calendar.
- Switch to National Head view to show the regional bottleneck heatmap (Stage x Region).
- Switch to System Admin to show zero-code configuration: change an SLA parameter or reminder threshold, and execute manual daily checks.
