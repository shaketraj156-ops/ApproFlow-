from sqlalchemy.orm import Session
from datetime import date, timedelta
from typing import List, Optional
from uuid import UUID

from app.core.clock import utcnow
from app.models.entities import (
    Expert, ExpertUnavailability, EvcVisit, EvcVisitExpert, Application
)
from app.core.exceptions import (
    ConflictException, EvcClashException, NotFoundException, ValidationErrorException
)

OPEN_VISIT_STATUSES = ("PROPOSED", "CONFIRMED")


def _check_visit_date(visit_date: date) -> None:
    if visit_date < utcnow().date():
        raise ValidationErrorException("EVC visit date cannot be in the past")
    if visit_date.weekday() == 6:
        raise ValidationErrorException("EVC visits cannot be scheduled on a Sunday")


def _assert_expert_free(
    db: Session,
    expert_id: UUID,
    visit_date: date,
    booked_statuses=OPEN_VISIT_STATUSES,
    exclude_visit_id: Optional[UUID] = None,
) -> None:
    """Raises EvcClashException if the expert is unavailable or already booked on that date."""
    unavailable = (
        db.query(ExpertUnavailability.id)
        .filter(
            ExpertUnavailability.expert_id == expert_id,
            ExpertUnavailability.start_date <= visit_date,
            ExpertUnavailability.end_date >= visit_date,
        )
        .first()
    )
    if unavailable:
        raise EvcClashException(f"Expert ID {expert_id} is marked unavailable on {visit_date}")

    booked = (
        db.query(EvcVisitExpert.id)
        .join(EvcVisit, EvcVisit.id == EvcVisitExpert.evc_visit_id)
        .filter(
            EvcVisitExpert.expert_id == expert_id,
            EvcVisit.scheduled_date == visit_date,
            EvcVisit.status.in_(booked_statuses),
        )
    )
    if exclude_visit_id:
        booked = booked.filter(EvcVisit.id != exclude_visit_id)
    if booked.first():
        raise EvcClashException(f"Expert conflict detected on {visit_date} for expert ID {expert_id}")


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
    candidate_date = max(target_date, utcnow().date())
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
                .scalar_subquery()
            )

            # Find experts already booked for confirmed/proposed visits on that date
            booked_subq = (
                db.query(EvcVisitExpert.expert_id)
                .join(EvcVisit, EvcVisit.id == EvcVisitExpert.evc_visit_id)
                .filter(
                    EvcVisit.scheduled_date == candidate_date,
                    EvcVisit.status.in_(OPEN_VISIT_STATUSES)
                )
                .scalar_subquery()
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


def create_evc_visit(
    db: Session,
    application_id: UUID,
    scheduled_date: date,
    expert_ids: List[UUID],
    lead_expert_id: Optional[UUID] = None,
    remarks: Optional[str] = None,
) -> EvcVisit:
    """Creates a PROPOSED visit after checking application, experts, date and clashes."""
    try:
        app = db.query(Application).filter(Application.id == application_id).first()
        if not app:
            raise NotFoundException("Application not found")
        if app.decision:
            raise ConflictException("Application already has a final decision; no EVC visit can be scheduled")

        _check_visit_date(scheduled_date)

        experts = db.query(Expert).filter(Expert.id.in_(expert_ids)).all()
        found = {e.id for e in experts}
        missing = [str(i) for i in expert_ids if i not in found]
        if missing:
            raise ValidationErrorException("Unknown expert(s)", {"expert_ids": missing})
        for expert in experts:
            if not expert.active:
                raise ValidationErrorException(f"Expert {expert.name} is not active")
            if expert.region != app.region:
                raise ValidationErrorException(f"Expert {expert.name} belongs to region {expert.region}, not {app.region}")
            _assert_expert_free(db, expert.id, scheduled_date)

        visit = EvcVisit(
            application_id=application_id,
            scheduled_date=scheduled_date,
            status="PROPOSED",
            remarks=remarks,
            created_at=utcnow(),
        )
        db.add(visit)
        db.flush()
        for expert_id in expert_ids:
            db.add(EvcVisitExpert(
                evc_visit_id=visit.id,
                expert_id=expert_id,
                is_lead=(expert_id == lead_expert_id),
            ))
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(visit)
    return visit


def _get_visit_locked(db: Session, visit_id: UUID) -> EvcVisit:
    visit = db.query(EvcVisit).filter(EvcVisit.id == visit_id).with_for_update().first()
    if not visit:
        raise NotFoundException("EVC Visit not found")
    return visit


def _release_expert_load(db: Session, visit: EvcVisit) -> None:
    """Gives back the load that confirming the visit added to each expert."""
    for ve in visit.experts:
        expert = db.query(Expert).filter(Expert.id == ve.expert_id).first()
        if expert and ve.confirmed:
            expert.current_load = max(0, expert.current_load - 1)
        ve.confirmed = False


def confirm_evc_visit(db: Session, visit_id: UUID) -> EvcVisit:
    try:
        visit = _get_visit_locked(db, visit_id)
        if visit.status != "PROPOSED":
            raise ConflictException(f"Only a PROPOSED visit can be confirmed (current status: {visit.status})")

        _check_visit_date(visit.scheduled_date)

        # Inside the transaction: verify none of the assigned experts has a clash
        for ve in visit.experts:
            _assert_expert_free(
                db, ve.expert_id, visit.scheduled_date,
                booked_statuses=("CONFIRMED",), exclude_visit_id=visit.id,
            )
            expert = db.query(Expert).filter(Expert.id == ve.expert_id).with_for_update().first()
            if not expert or not expert.active:
                raise EvcClashException(f"Expert ID {ve.expert_id} is no longer active")
            if expert.current_load >= expert.max_visits_per_cycle:
                raise EvcClashException(f"Expert {expert.name} has reached the maximum visits for this cycle")
            expert.current_load += 1
            ve.confirmed = True

        visit.status = "CONFIRMED"
        visit.updated_at = utcnow()
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(visit)
    return visit


def reschedule_evc_visit(db: Session, visit_id: UUID, new_date: date, remarks: Optional[str] = None) -> EvcVisit:
    """Moves the visit to a new date. It goes back to PROPOSED and must be confirmed again."""
    try:
        visit = _get_visit_locked(db, visit_id)
        if visit.status not in OPEN_VISIT_STATUSES:
            raise ConflictException(f"A {visit.status} visit cannot be rescheduled")
        _check_visit_date(new_date)
        for ve in visit.experts:
            _assert_expert_free(db, ve.expert_id, new_date, exclude_visit_id=visit.id)

        if visit.status == "CONFIRMED":
            _release_expert_load(db, visit)
        visit.scheduled_date = new_date
        visit.status = "PROPOSED"
        if remarks:
            visit.remarks = remarks
        visit.updated_at = utcnow()
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(visit)
    return visit


def cancel_evc_visit(db: Session, visit_id: UUID, reason: str) -> EvcVisit:
    try:
        visit = _get_visit_locked(db, visit_id)
        if visit.status not in OPEN_VISIT_STATUSES:
            raise ConflictException(f"A {visit.status} visit cannot be cancelled")
        if visit.status == "CONFIRMED":
            _release_expert_load(db, visit)
        visit.status = "CANCELLED"
        visit.remarks = f"{visit.remarks}\nCancelled: {reason}" if visit.remarks else f"Cancelled: {reason}"
        visit.updated_at = utcnow()
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(visit)
    return visit


def complete_evc_visit(db: Session, visit_id: UUID) -> EvcVisit:
    try:
        visit = _get_visit_locked(db, visit_id)
        if visit.status != "CONFIRMED":
            raise ConflictException(f"Only a CONFIRMED visit can be completed (current status: {visit.status})")
        if visit.scheduled_date > utcnow().date():
            raise ConflictException("A visit cannot be completed before its scheduled date")
        visit.status = "COMPLETED"
        visit.updated_at = utcnow()
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(visit)
    return visit
