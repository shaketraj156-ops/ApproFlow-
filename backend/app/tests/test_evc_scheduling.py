import uuid
from datetime import timedelta

import pytest

from app.core.clock import utcnow
from app.core.exceptions import (
    ConflictException, EvcClashException, NotFoundException, ValidationErrorException
)
from app.models import entities as m
from app.services import evc_service


def _next_weekday(offset_days=3):
    d = utcnow().date() + timedelta(days=offset_days)
    while d.weekday() == 6:
        d += timedelta(days=1)
    return d


def _ids(experts, n):
    return [e.id for e in experts[:n]]


def test_create_and_confirm_updates_expert_load(db, seed, make_application):
    app = make_application()
    visit = evc_service.create_evc_visit(db, app.id, _next_weekday(), _ids(seed["experts"], 3))
    assert visit.status == "PROPOSED"

    confirmed = evc_service.confirm_evc_visit(db, visit.id)
    assert confirmed.status == "CONFIRMED"
    assert [e.current_load for e in seed["experts"][:3]] == [1, 1, 1]


def test_same_expert_cannot_be_booked_twice_on_one_day(db, seed, make_application):
    day = _next_weekday()
    evc_service.create_evc_visit(db, make_application("A").id, day, _ids(seed["experts"], 3))
    with pytest.raises(EvcClashException):
        evc_service.create_evc_visit(db, make_application("B").id, day, _ids(seed["experts"][1:], 3))


def test_unavailable_expert_is_rejected(db, seed, make_application):
    day = _next_weekday()
    expert = seed["experts"][0]
    db.add(m.ExpertUnavailability(expert_id=expert.id, start_date=day, end_date=day))
    db.commit()
    with pytest.raises(EvcClashException):
        evc_service.create_evc_visit(db, make_application().id, day, [expert.id])


def test_expert_from_another_region_is_rejected(db, seed, make_application):
    west = m.Expert(id=uuid.uuid4(), name="West expert", email="we@test.in", domain="IT", region="WEST")
    db.add(west)
    db.commit()
    with pytest.raises(ValidationErrorException):
        evc_service.create_evc_visit(db, make_application().id, _next_weekday(), [west.id])


def test_past_date_and_sunday_are_rejected(db, seed, make_application):
    app = make_application()
    with pytest.raises(ValidationErrorException):
        evc_service.create_evc_visit(db, app.id, utcnow().date() - timedelta(days=1), _ids(seed["experts"], 1))
    sunday = utcnow().date() + timedelta(days=1)
    while sunday.weekday() != 6:
        sunday += timedelta(days=1)
    with pytest.raises(ValidationErrorException):
        evc_service.create_evc_visit(db, app.id, sunday, _ids(seed["experts"], 1))


def test_unknown_expert_and_unknown_application(db, seed, make_application):
    with pytest.raises(ValidationErrorException):
        evc_service.create_evc_visit(db, make_application().id, _next_weekday(), [uuid.uuid4()])
    with pytest.raises(NotFoundException):
        evc_service.create_evc_visit(db, uuid.uuid4(), _next_weekday(), _ids(seed["experts"], 1))


def test_only_proposed_visits_can_be_confirmed(db, seed, make_application):
    visit = evc_service.create_evc_visit(db, make_application().id, _next_weekday(), _ids(seed["experts"], 2))
    evc_service.confirm_evc_visit(db, visit.id)
    with pytest.raises(ConflictException):
        evc_service.confirm_evc_visit(db, visit.id)


def test_cancel_releases_expert_load(db, seed, make_application):
    visit = evc_service.create_evc_visit(db, make_application().id, _next_weekday(), _ids(seed["experts"], 2))
    evc_service.confirm_evc_visit(db, visit.id)
    evc_service.cancel_evc_visit(db, visit.id, "Institution unavailable")

    db.refresh(visit)
    assert visit.status == "CANCELLED"
    assert [e.current_load for e in seed["experts"][:2]] == [0, 0]
    with pytest.raises(ConflictException):
        evc_service.cancel_evc_visit(db, visit.id, "again")


def test_reschedule_goes_back_to_proposed_and_checks_clashes(db, seed, make_application):
    day, later = _next_weekday(3), _next_weekday(5)
    visit = evc_service.create_evc_visit(db, make_application("A").id, day, _ids(seed["experts"], 2))
    evc_service.confirm_evc_visit(db, visit.id)

    moved = evc_service.reschedule_evc_visit(db, visit.id, later)
    assert (moved.status, moved.scheduled_date) == ("PROPOSED", later)
    assert [e.current_load for e in seed["experts"][:2]] == [0, 0]

    # another visit now holds expert 0 on the original day, so moving back there must clash
    evc_service.create_evc_visit(db, make_application("B").id, day, [seed["experts"][0].id])
    with pytest.raises(EvcClashException):
        evc_service.reschedule_evc_visit(db, visit.id, day)


def test_a_visit_cannot_be_completed_before_its_date(db, seed, make_application):
    visit = evc_service.create_evc_visit(db, make_application().id, _next_weekday(3), _ids(seed["experts"], 1))
    evc_service.confirm_evc_visit(db, visit.id)
    with pytest.raises(ConflictException):
        evc_service.complete_evc_visit(db, visit.id)


def test_suggestions_skip_booked_experts_and_sundays(db, seed, make_application):
    day = _next_weekday(2)
    evc_service.create_evc_visit(db, make_application("A").id, day, _ids(seed["experts"], 2))

    proposals = evc_service.suggest_evc_committees(db, make_application("B").id, day, committee_size=3)
    assert proposals, "later days should still have enough free experts"
    assert all(p["scheduled_date"].weekday() != 6 for p in proposals)
    assert all(p["scheduled_date"] != day for p in proposals)  # only 2 of 4 experts free that day
