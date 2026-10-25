from fastapi import APIRouter
from app.api.v1.applications import router as applications_router
from app.api.v1.workflow import router as workflow_router
from app.api.v1.alerts import router as alerts_router
from app.api.v1.evc import router as evc_router, experts_router
from app.api.v1.undertakings import router as undertakings_router
from app.api.v1.documents import router as documents_router
from app.api.v1.reports import router as reports_router
from app.api.v1.predictions import router as predictions_router
from app.api.v1.jobs import router as jobs_router
from app.api.v1.audit import router as audit_router

api_v1_router = APIRouter()
api_v1_router.include_router(applications_router)
api_v1_router.include_router(workflow_router)
api_v1_router.include_router(alerts_router)
api_v1_router.include_router(evc_router)
api_v1_router.include_router(experts_router)
api_v1_router.include_router(undertakings_router)
api_v1_router.include_router(documents_router)
api_v1_router.include_router(reports_router)
api_v1_router.include_router(predictions_router)
api_v1_router.include_router(jobs_router)
api_v1_router.include_router(audit_router)
