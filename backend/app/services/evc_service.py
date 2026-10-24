from sqlalchemy.orm import Session
from datetime import date, timedelta, datetime
from typing import List, Optional
from uuid import UUID

from app.models.entities import (
    Expert, ExpertUnavailability, EvcVisit, EvcVisitExpert, Application
)
from app.core.exceptions import EvcClashException, NotFoundException

def suggest_evc_committees(
    db: Session,
    application_id: UUID,
    target_date: date,
    committee_size: int = 3
) -> List[dict]:
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise NotFoundException("Application not found")

    proposals = []
    # Check candidate dates over the next 5 working days
    candidate_date = target_date
    checked_days = 0

    while len(proposals) < 3 and checked_days < 10:
        # Skip Sundays
        if candidate_date.weekday() != 6:
            # Find experts in same region not marked unavailable
            unavail_subq = (
                db.query(ExpertUnavailability.expert_id)
                .filter(
                    ExpertUnavailability.start_date <= candidate_date,
                    ExpertUnavailability.end_date >= candidate_date
                )
                .subquery()
            )
            
            # Find experts already booked for confirmed/proposed visits on that date
            booked_subq = (
                db.query(EvcVisitExpert.expert_id)
                .join(EvcVisit, EvcVisit.id == EvcVisitExpert.evc_visit_id)
                .filter(
                    EvcVisit.scheduled_date == candidate_date,
                    EvcVisit.status.in_(["PROPOSED", "CONFIRMED"])
                )
                .subquery()
            )

            available_experts = (
                db.query(Expert)
                .filter(
                    Expert.active == True,
                    Expert.region == app.region,
                    ~Expert.id.in_(unavail_subq),
                    ~Expert.id.in_(booked_subq),
                    Expert.current_load < Expert.max_visits_per_cycle
                )
                .order_by(Expert.current_load.asc())
                .limit(committee_size)
                .all()
            )

            if len(available_experts) >= committee_size:
                proposals.append({
                    "scheduled_date": candidate_date,
                    "experts": available_experts,
                    "clash_detected": False
                })

        candidate_date += timedelta(days=1)
        checked_days += 1

    return proposals

def confirm_evc_visit(db: Session, visit_id: UUID) -> EvcVisit:
    visit = db.query(EvcVisit).filter(EvcVisit.id == visit_id).first()
    if not visit:
        raise NotFoundException("EVC Visit not found")

    # Inside transaction: verify none of the assigned experts have a clash
    for ve in visit.experts:
        clashing = (
            db.query(EvcVisitExpert)
            .join(EvcVisit, EvcVisit.id == EvcVisitExpert.evc_visit_id)
            .filter(
                EvcVisitExpert.expert_id == ve.expert_id,
                EvcVisit.scheduled_date == visit.scheduled_date,
                EvcVisit.status == "CONFIRMED",
                EvcVisit.id != visit.id
            )
            .first()
        )
        if clashing:
            raise EvcClashException(f"Expert conflict detected on {visit.scheduled_date} for expert ID {ve.expert_id}")

        # Check unavailability
        unavail = (
            db.query(ExpertUnavailability)
            .filter(
                ExpertUnavailability.expert_id == ve.expert_id,
                ExpertUnavailability.start_date <= visit.scheduled_date,
                ExpertUnavailability.end_date >= visit.scheduled_date
            )
            .first()
        )
        if unavail:
            raise EvcClashException(f"Expert ID {ve.expert_id} is marked unavailable on {visit.scheduled_date}")

        # Increment expert load
        expert = db.query(Expert).filter(Expert.id == ve.expert_id).first()
        if expert:
            expert.current_load += 1
            ve.confirmed = True

    visit.status = "CONFIRMED"
    visit.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(visit)
    return visit
