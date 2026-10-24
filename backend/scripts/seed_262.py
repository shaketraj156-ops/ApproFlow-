"""
seed_262.py: Deterministic Synthetic Data Generator for SIH26262 Demo
Populates 4 regions, 12 institutions, 48 experts, 45 applications,
20 undertakings, 25 compliance documents, and planted evaluation scenarios.
"""
import random
from datetime import datetime, date, timedelta
from uuid import uuid4

from app.models.base import SessionLocal
from app.models.entities import (
    Institution, Profile, WorkflowStage, Application, ApplicationStageHistory,
    Expert, ExpertUnavailability, EvcVisit, EvcVisitExpert, Undertaking, ComplianceDocument
)
from app.services.priority_service import calculate_priority_score

REGIONS = ["NORTH", "SOUTH", "WEST", "EAST"]
DOMAINS = ["Computer Science & Eng", "Electronics & Comm", "Mechanical Eng", "Civil Eng", "Management Studies", "Pharmacy"]

def seed_database():
    db = SessionLocal()
    print("[INFO] Initiating deterministic synthetic seeding for ApproFlow (SIH26262)...")
    
    random.seed(26262)
    now = datetime.utcnow()
    today = now.date()

    # 1. Institutions (12 total across 4 regions)
    institutions = []
    for i in range(1, 13):
        region = REGIONS[(i - 1) % len(REGIONS)]
        code = f"1-{1000000 + i}"
        name = f"Institute of Technology & Science {region} Campus #{i}"
        inst = Institution(
            code=code,
            name=name,
            region=region,
            address=f"Plot {i*10}, Knowledge Park, {region} Sector",
            contact_email=f"registrar@inst{i}.edu.in",
            contact_phone=f"+91 98765 {10000 + i}"
        )
        db.add(inst)
        institutions.append(inst)
    db.flush()
    print(f"[SUCCESS] Created {len(institutions)} institutions across 4 regions.")

    # 2. Experts (12 per region = 48 total)
    experts = []
    for region in REGIONS:
        for idx in range(1, 13):
            domain = DOMAINS[(idx - 1) % len(DOMAINS)]
            exp = Expert(
                name=f"Prof. Dr. Expert {region[:3]}_{idx}",
                email=f"expert_{region.lower()}_{idx}@aicte-eval.gov.in",
                phone=f"+91 94000 {random.randint(10000, 99999)}",
                domain=domain,
                region=region,
                active=True,
                max_visits_per_cycle=5,
                current_load=random.randint(0, 3)
            )
            db.add(exp)
            experts.append(exp)
    db.flush()
    print(f"[SUCCESS] Created {len(experts)} evaluators & experts pool.")

    # 3. Seed planted expert clash & unavailability
    # Planted scenario 5: Two experts unavailable/clashing on next Monday
    plant_date = today + timedelta(days=5)
    unavail_exp = experts[0]
    unavail = ExpertUnavailability(
        expert_id=unavail_exp.id,
        start_date=plant_date,
        end_date=plant_date + timedelta(days=2),
        reason="Attending National Conference on Technical Education"
    )
    db.add(unavail)

    # 4. Applications (45 across workflow stages)
    stages = db.query(WorkflowStage).order_by(WorkflowStage.sequence_order).all()
    stage_codes = [s.code for s in stages]
    
    applications = []
    for app_idx in range(1, 46):
        inst = institutions[(app_idx - 1) % len(institutions)]
        app_num = f"AICTE-2026-{10000 + app_idx}"
        
        # Pick stage distribution
        if app_idx <= 8:
            stage_code = "SUBMITTED"
        elif app_idx <= 22:
            stage_code = "SCRUTINY"
        elif app_idx <= 28:
            stage_code = "RE_SCRUTINY"
        elif app_idx <= 35:
            stage_code = "EVC"
        elif app_idx <= 39:
            stage_code = "REGIONAL_COMMITTEE"
        elif app_idx <= 41:
            stage_code = "SAC_SHC"
        else:
            stage_code = "DECIDED"

        intake = random.choice([60, 120, 180, 240, 300])
        deficiencies = 0
        if stage_code in ("RE_SCRUTINY", "EVC"):
            deficiencies = random.randint(1, 3)

        app = Application(
            application_number=app_num,
            institution_id=inst.id,
            region=inst.region,
            application_type="EXTENSION_OF_APPROVAL" if app_idx % 3 != 0 else "NEW_COURSE",
            current_stage_code=stage_code,
            deficiency_count=deficiencies,
            intake_requested=intake,
            priority_score=0.0
        )
        
        if stage_code == "DECIDED":
            app.decision = "APPROVED" if app_idx % 2 == 0 else "APPROVED_WITH_CONDITIONS"
            app.decision_date = now - timedelta(days=random.randint(2, 20))
            app.decision_remarks = "All requirements satisfied as per Approval Process Handbook."

        db.add(app)
        applications.append(app)

    db.flush()

    # 5. Populate Stage History and Planted Scenarios
    for idx, app in enumerate(applications):
        stg = next(s for s in stages if s.code == app.current_stage_code)
        
        # Planted Scenario 1: App 5 days past scrutiny SLA (escalation level 1 and 2)
        if idx == 9:
            entered_at = now - timedelta(days=15)
            due_at = entered_at + timedelta(days=stg.sla_days) # overdue by 5 days
        # Planted Scenario 2: App 9+ days overdue (escalates to regional head level 3)
        elif idx == 10:
            entered_at = now - timedelta(days=22)
            due_at = entered_at + timedelta(days=stg.sla_days) # overdue by 12 days
        else:
            entered_at = now - timedelta(days=random.randint(1, 10))
            due_at = entered_at + timedelta(days=stg.sla_days)

        days_overdue = max(0, (now - due_at).days)
        app.priority_score = calculate_priority_score(
            overdue_days=days_overdue,
            intake_requested=app.intake_requested,
            deficiency_count=app.deficiency_count,
            age_days=15
        )

        hist = ApplicationStageHistory(
            application_id=app.id,
            stage_code=app.current_stage_code,
            entered_at=entered_at,
            due_at=due_at
        )
        db.add(hist)

    # 6. Undertakings (20 items: some overdue, due soon, submitted)
    for u_idx in range(1, 21):
        app = applications[u_idx - 1]
        if u_idx == 1:
            due_d = today - timedelta(days=5) # Overdue (planted scenario 4)
            status = "OVERDUE"
        elif u_idx == 2:
            due_d = today + timedelta(days=6) # Due in 6 days (planted scenario 4)
            status = "PENDING"
        elif u_idx <= 8:
            due_d = today + timedelta(days=random.randint(10, 45))
            status = "PENDING"
        else:
            due_d = today + timedelta(days=random.randint(15, 60))
            status = "VERIFIED"

        u = Undertaking(
            application_id=app.id,
            title=f"Submission of Registered Lease Deed & Building Safety ({u_idx})",
            description="Submit certified copy of registered lease deed for academic facility.",
            due_date=due_d,
            status=status,
            document_path=f"undertakings/{app.application_number}_lease.pdf" if status != "PENDING" else None
        )
        db.add(u)

    # 7. Compliance Documents (25 items: expiring, expired, valid)
    doc_types = ["LEASE_DEED", "LAND_USE_CERT", "BUILDING_SAFETY_NOC", "FIRE_SERVICE_NOC", "WATER_TEST_CERT"]
    for d_idx in range(1, 26):
        inst = institutions[(d_idx - 1) % len(institutions)]
        doc_t = doc_types[(d_idx - 1) % len(doc_types)]
        
        if d_idx == 1:
            valid_until = today + timedelta(days=12) # Expiring in 12 days (planted scenario 3)
            status = "EXPIRING"
        elif d_idx == 2:
            valid_until = today - timedelta(days=10) # Expired (planted scenario 3)
            status = "EXPIRED"
        else:
            valid_until = today + timedelta(days=random.randint(40, 180))
            status = "VALID"

        cd = ComplianceDocument(
            institution_id=inst.id,
            title=f"{doc_t.replace('_', ' ').title()} - {inst.code}",
            document_type=doc_t,
            valid_from=today - timedelta(days=365),
            valid_until=valid_until,
            status=status,
            storage_path=f"compliance/{inst.code}/{doc_t.lower()}.pdf",
            verified=True
        )
        db.add(cd)

    db.commit()
    db.close()
    print("[SUCCESS] Synthetic seed data generation finished successfully!")

if __name__ == "__main__":
    seed_database()
