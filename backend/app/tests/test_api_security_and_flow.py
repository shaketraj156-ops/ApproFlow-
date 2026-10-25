import uuid

from app.models import entities as m


def test_error_envelope_for_validation_errors(as_user, seed):
    client = as_user()
    r = client.post("/api/v1/applications", json={"application_number": "x"})
    assert r.status_code == 422
    body = r.json()
    assert body["error"]["code"] == "VALIDATION_ERROR"
    assert body["error"]["details"]["errors"]


def test_unknown_route_uses_the_error_envelope(as_user):
    r = as_user().get("/api/v1/nope")
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "NOT_FOUND"


def test_responses_carry_request_id_and_security_headers(as_user):
    r = as_user().get("/health")
    assert r.headers["X-Request-ID"]
    assert r.headers["X-Content-Type-Options"] == "nosniff"


def test_create_application_starts_in_first_stage(as_user, seed, db):
    client = as_user(role="aicte_officer", region="NORTH")
    r = client.post("/api/v1/applications", json={
        "application_number": "AICTE-2026-0001",
        "institution_id": str(seed["institution"].id),
        "region": "NORTH",
        "intake_requested": 120,
    })
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["current_stage_code"] == "SUBMITTED"
    assert body["days_left"] in (4, 5)
    assert db.query(m.ApplicationStageHistory).count() == 1

    dup = client.post("/api/v1/applications", json={
        "application_number": "AICTE-2026-0001",
        "institution_id": str(seed["institution"].id),
        "region": "NORTH",
    })
    assert dup.status_code == 409


def test_application_region_must_match_institution(as_user, seed):
    r = as_user().post("/api/v1/applications", json={
        "application_number": "AICTE-2026-0002",
        "institution_id": str(seed["institution"].id),
        "region": "WEST",
    })
    assert r.status_code == 422


def test_institution_cannot_file_for_another_institution(as_user, seed):
    client = as_user(role="institution_admin", institution_id=uuid.uuid4())
    r = client.post("/api/v1/applications", json={
        "application_number": "AICTE-2026-0003",
        "institution_id": str(seed["institution"].id),
        "region": "NORTH",
    })
    assert r.status_code == 403


def test_officer_cannot_see_or_move_another_regions_application(as_user, make_application):
    west = make_application("W-1", region="WEST")
    client = as_user(region="NORTH")
    assert client.get(f"/api/v1/applications/{west.id}").status_code == 403
    assert client.post(f"/api/v1/applications/{west.id}/move", json={"to_stage": "EVC"}).status_code == 403


def test_institution_only_sees_its_own_applications(as_user, seed, make_application, db):
    mine = make_application("MINE")
    other_inst = m.Institution(id=uuid.uuid4(), code="INST2", name="Other", region="NORTH")
    db.add(other_inst)
    db.commit()
    client = as_user(role="institution_admin", institution_id=seed["institution"].id)
    items = client.get("/api/v1/applications").json()["items"]
    assert [i["application_number"] for i in items] == ["MINE"]

    stranger = as_user(role="institution_admin", institution_id=other_inst.id)
    assert stranger.get(f"/api/v1/applications/{mine.id}").status_code == 403
    assert stranger.get("/api/v1/applications").json()["items"] == []


def test_institution_cannot_move_applications(as_user, seed, make_application):
    app = make_application()
    client = as_user(role="institution_admin", institution_id=seed["institution"].id)
    assert client.post(f"/api/v1/applications/{app.id}/move", json={"to_stage": "EVC"}).status_code == 403


def test_move_endpoint_validates_decision_value(as_user, make_application):
    app = make_application()
    r = as_user().post(f"/api/v1/applications/{app.id}/move", json={"to_stage": "DECIDED", "decision": "MAYBE"})
    assert r.status_code == 422


def test_hold_resume_cycle_and_conflicts(as_user, make_application):
    app = make_application()
    client = as_user()
    assert client.post(f"/api/v1/applications/{app.id}/resume").status_code == 409  # not on hold
    assert client.post(f"/api/v1/applications/{app.id}/hold", json={"reason": "Court inquiry"}).status_code == 200
    assert client.post(f"/api/v1/applications/{app.id}/hold", json={"reason": "Again"}).status_code == 409
    assert client.post(f"/api/v1/applications/{app.id}/move", json={"to_stage": "EVC"}).status_code == 409
    assert client.post(f"/api/v1/applications/{app.id}/resume").status_code == 200
    assert client.post(f"/api/v1/applications/{app.id}/move", json={"to_stage": "EVC"}).status_code == 200


def test_assign_requires_an_active_officer_in_region(as_user, seed, make_application):
    app = make_application()
    client = as_user()
    ok = client.post(f"/api/v1/applications/{app.id}/assign", json={"officer_id": str(seed["officer"].id)})
    assert ok.status_code == 200
    wrong_region = client.post(f"/api/v1/applications/{app.id}/assign", json={"officer_id": str(seed["other_officer"].id)})
    assert wrong_region.status_code == 422
    nobody = client.post(f"/api/v1/applications/{app.id}/assign", json={"officer_id": str(uuid.uuid4())})
    assert nobody.status_code == 422


def test_list_filters_and_search_wildcards(as_user, make_application):
    make_application("ALPHA_1")
    make_application("ALPHAX1")
    make_application("LATE-1", entered_days_ago=20, sla_days=10)
    client = as_user()

    names = lambda r: sorted(i["application_number"] for i in r.json()["items"])  # noqa: E731
    assert names(client.get("/api/v1/applications?search=ALPHA_")) == ["ALPHA_1"]  # _ is literal
    assert names(client.get("/api/v1/applications?is_overdue=true")) == ["LATE-1"]
    assert "LATE-1" not in names(client.get("/api/v1/applications?is_overdue=false"))
    assert client.get("/api/v1/applications?sort=drop_table").status_code == 422


def test_undertaking_lifecycle(as_user, seed, make_application):
    from datetime import timedelta
    from app.core.clock import utcnow
    app = make_application()
    officer = as_user()
    due = (utcnow() + timedelta(days=10)).date().isoformat()

    created = officer.post("/api/v1/undertakings", json={"application_id": str(app.id), "title": "Submit lease", "due_date": due})
    assert created.status_code == 201
    uid = created.json()["id"]

    inst = as_user(role="institution_admin", institution_id=seed["institution"].id)
    assert inst.post(f"/api/v1/undertakings/{uid}/submit", json={"document_path": "../../etc/passwd"}).status_code == 422
    assert inst.post(f"/api/v1/undertakings/{uid}/submit", json={"document_path": "docs/lease.pdf"}).status_code == 200
    assert inst.post(f"/api/v1/undertakings/{uid}/submit", json={"document_path": "docs/lease2.pdf"}).status_code == 409

    officer = as_user()
    assert officer.post(f"/api/v1/undertakings/{uid}/verify", json={"decision": "REJECTED"}).status_code == 422  # needs remarks
    assert officer.post(f"/api/v1/undertakings/{uid}/verify", json={"decision": "REJECTED", "remarks": "Unsigned"}).json()["status"] == "PENDING"

    inst = as_user(role="institution_admin", institution_id=seed["institution"].id)
    inst.post(f"/api/v1/undertakings/{uid}/submit", json={"document_path": "docs/lease-signed.pdf"})
    officer = as_user()
    assert officer.post(f"/api/v1/undertakings/{uid}/verify", json={"decision": "VERIFIED"}).json()["status"] == "VERIFIED"
    assert officer.post(f"/api/v1/undertakings/{uid}/verify", json={"decision": "VERIFIED"}).status_code == 409


def test_alert_acknowledge_flow_and_roles(as_user, seed, make_application, db):
    from app.services.alert_service import run_daily_checks_job
    make_application(entered_days_ago=15, sla_days=10)
    run_daily_checks_job(db)  # populate an alert
    client = as_user()
    alerts = client.get("/api/v1/alerts").json()
    assert len(alerts) == 1
    aid = alerts[0]["id"]

    assert as_user(role="institution_admin", institution_id=seed["institution"].id).get("/api/v1/alerts").status_code == 403
    assert as_user(role="auditor").post(f"/api/v1/alerts/{aid}/acknowledge").status_code == 403
    client = as_user()  # the override is global, so switch back to the officer
    assert client.post(f"/api/v1/alerts/{aid}/acknowledge").json()["status"] == "ACKNOWLEDGED"
    assert client.post(f"/api/v1/alerts/{aid}/acknowledge").status_code == 409
    assert client.get("/api/v1/alerts/summary").json()["acknowledged_count"] == 1


def test_kpis_report_real_numbers(as_user, make_application):
    make_application("A", entered_days_ago=20, sla_days=10)  # overdue
    make_application("B", entered_days_ago=1, sla_days=30)
    kpis = as_user().get("/api/v1/reports/kpis").json()
    assert kpis["total_applications"] == 2
    assert kpis["pending_actions"] == 2
    assert kpis["overdue_count"] == 1


def test_csv_export_neutralises_spreadsheet_formulas(as_user, make_application):
    make_application("=HYPERLINK(1)")
    r = as_user().get("/api/v1/reports/applications/export")
    assert r.status_code == 200
    assert "'=HYPERLINK(1)" in r.text
    assert as_user().get("/api/v1/reports/secrets/export").status_code == 422


def test_workflow_admin_endpoints(as_user, seed):
    assert as_user(role="aicte_officer").put("/api/v1/workflow/stages/EVC", json={"sla_days": 3}).status_code == 403
    admin = as_user(role="system_admin")  # the override is global, so create the admin after the officer call
    assert admin.put("/api/v1/workflow/stages/EVC", json={"sla_days": 20}).json()["sla_days"] == 20
    assert admin.put("/api/v1/workflow/stages/EVC", json={"next_stages": ["NOWHERE"]}).status_code == 422
    assert admin.put("/api/v1/workflow/stages/EVC", json={"next_stages": ["EVC"]}).status_code == 422
    assert admin.put("/api/v1/workflow/stages/EVC", json={"sla_days": -1}).status_code == 422
    assert admin.put("/api/v1/workflow/stages/NOPE", json={"sla_days": 3}).status_code == 404


def test_cannot_deactivate_stage_with_open_applications(as_user, make_application):
    make_application(stage="SCRUTINY")
    r = as_user(role="system_admin").put("/api/v1/workflow/stages/SCRUTINY", json={"active": False})
    assert r.status_code == 409


def test_escalation_rules_must_be_ordered(as_user):
    admin = as_user(role="system_admin")
    bad = [{"level": 1, "overdue_days": 5, "target_role": "A"}, {"level": 2, "overdue_days": 3, "target_role": "B"}]
    assert admin.put("/api/v1/workflow/escalation-rules", json=bad).status_code == 422
    good = [{"level": 1, "overdue_days": 0, "target_role": "SECTION_OFFICER"},
            {"level": 2, "overdue_days": 2, "target_role": "REGIONAL_HEAD"}]
    r = admin.put("/api/v1/workflow/escalation-rules", json=good)
    assert r.status_code == 200 and [x["level"] for x in r.json()] == [1, 2]


def test_region_summary_and_officer_workload(as_user, seed, make_application):
    make_application("N-LATE", entered_days_ago=20, sla_days=10)
    make_application("N-OK", entered_days_ago=1, sla_days=30)
    make_application("W-1", region="WEST", entered_days_ago=1, sla_days=30)

    national = as_user(role="aicte_officer", officer_level="NATIONAL_HEAD", region=None)
    rows = {r["region"]: r for r in national.get("/api/v1/reports/region-summary").json()}
    assert rows["NORTH"]["pending_count"] == 2 and rows["NORTH"]["overdue_count"] == 1
    assert rows["WEST"]["pending_count"] == 1 and rows["WEST"]["overdue_count"] == 0

    north = as_user(role="aicte_officer", region="NORTH")
    only_north = north.get("/api/v1/reports/region-summary").json()
    assert [r["region"] for r in only_north] == ["NORTH"]  # a regional officer never sees other regions

    workload = {o["email"]: o for o in north.get("/api/v1/reports/officer-workload").json()}
    assert workload["o@test.in"]["active_queue"] == 3  # owns all three test applications
    assert workload["o@test.in"]["overdue_count"] == 1
    assert "w@test.in" not in workload

    assert as_user(role="institution_admin", institution_id=seed["institution"].id).get(
        "/api/v1/reports/region-summary").status_code == 403


def test_kpis_ignore_applications_on_hold(as_user, make_application):
    make_application("LATE", entered_days_ago=20, sla_days=10)
    make_application("PAUSED", entered_days_ago=20, sla_days=10, is_on_hold=True)
    kpis = as_user().get("/api/v1/reports/kpis").json()
    assert kpis["pending_actions"] == 2   # both are still open files
    assert kpis["overdue_count"] == 1     # but the paused one is not overdue


def test_evc_visits_come_with_institution_and_committee(as_user, seed, make_application):
    from datetime import timedelta
    from app.core.clock import utcnow
    app = make_application("EVC-1")
    day = utcnow().date() + timedelta(days=3)
    while day.weekday() == 6:
        day += timedelta(days=1)
    client = as_user()
    experts = [str(e.id) for e in seed["experts"][:2]]
    created = client.post("/api/v1/evc-visits", json={
        "application_id": str(app.id), "scheduled_date": day.isoformat(),
        "expert_ids": experts, "lead_expert_id": experts[0],
    })
    assert created.status_code == 201, created.text
    body = created.json()
    assert body["application_number"] == "EVC-1"
    assert body["institution_name"] == "Test Institute"
    assert body["region"] == "NORTH"
    assert sorted(e["id"] for e in body["experts"]) == sorted(experts)
    assert [e["is_lead"] for e in sorted(body["experts"], key=lambda e: e["id"] != experts[0])] == [True, False]

    listed = client.get("/api/v1/evc-visits").json()
    assert len(listed) == 1 and listed[0]["institution_name"] == "Test Institute" and len(listed[0]["experts"]) == 2

    confirmed = client.post(f"/api/v1/evc-visits/{body['id']}/confirm").json()
    assert confirmed["status"] == "CONFIRMED" and all(e["confirmed"] for e in confirmed["experts"])

    roster = client.get("/api/v1/experts").json()
    assert all("max_visits_per_cycle" in e for e in roster)
