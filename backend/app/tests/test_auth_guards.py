from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app

client = TestClient(app)


def test_requests_without_token_are_rejected(monkeypatch):
    monkeypatch.setattr(settings, "ALLOW_DEV_AUTH", False)
    for path in ("/api/v1/applications", "/api/v1/reports/kpis", "/api/v1/workflow/stages", "/api/v1/evc-visits"):
        assert client.get(path).status_code == 401, path


def test_job_endpoint_requires_secret(monkeypatch):
    monkeypatch.setattr(settings, "JOB_SECRET", "s3cret")
    assert client.post("/api/v1/jobs/run-daily-checks").status_code == 403
    assert client.post("/api/v1/jobs/run-daily-checks", headers={"X-Job-Secret": "wrong"}).status_code == 403


def test_job_endpoint_disabled_when_secret_unset(monkeypatch):
    monkeypatch.setattr(settings, "JOB_SECRET", "")
    assert client.post("/api/v1/jobs/run-daily-checks", headers={"X-Job-Secret": ""}).status_code == 403
