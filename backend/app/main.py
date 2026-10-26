import logging
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError, OperationalError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.core.exceptions import ApproFlowException
from app.core.scheduler import start_scheduler, stop_scheduler
from app.api.v1 import api_v1_router

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("approflow.api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduler()
    yield
    stop_scheduler()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS Configuration (de-duplicated, order preserved)
origins = list(dict.fromkeys([
    settings.FRONTEND_ORIGIN,
    "http://localhost:5173",
    "http://localhost:3000",
    "https://appro-flow.vercel.app",
]))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _error(status_code: int, code: str, message: str, details=None, headers=None) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"error": {"code": code, "message": message, "details": details or {}}},
        headers=headers,
    )


@app.middleware("http")
async def request_context(request: Request, call_next):
    """Tags every request with an id (also returned to the caller) and logs method, path, status, time."""
    request_id = request.headers.get("x-request-id") or uuid.uuid4().hex[:12]
    request.state.request_id = request_id
    started = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        logger.exception("Unhandled error [%s] %s %s", request_id, request.method, request.url.path)
        response = _error(500, "INTERNAL", "An unexpected error occurred", {"request_id": request_id})
    elapsed_ms = (time.perf_counter() - started) * 1000
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    logger.info("[%s] %s %s -> %s (%.0f ms)", request_id, request.method, request.url.path, response.status_code, elapsed_ms)
    return response


# Every error leaves the API in the same envelope: { "error": { "code", "message", "details" } }
@app.exception_handler(ApproFlowException)
async def approflow_exception_handler(request: Request, exc: ApproFlowException):
    return _error(exc.status_code, exc.code, exc.message, exc.details, getattr(exc, "headers", None))


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    problems = [
        {"field": ".".join(str(p) for p in err["loc"] if p != "body"), "message": err["msg"]}
        for err in exc.errors()
    ]
    return _error(422, "VALIDATION_ERROR", "Request validation failed", {"errors": problems})


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    code = {401: "UNAUTHENTICATED", 403: "FORBIDDEN", 404: "NOT_FOUND", 405: "METHOD_NOT_ALLOWED"}.get(exc.status_code, "HTTP_ERROR")
    message = exc.detail if isinstance(exc.detail, str) else "Request failed"
    return _error(exc.status_code, code, message, headers=getattr(exc, "headers", None))


@app.exception_handler(IntegrityError)
async def integrity_exception_handler(request: Request, exc: IntegrityError):
    logger.warning("Integrity error on %s %s: %s", request.method, request.url.path, exc.orig)
    return _error(409, "CONFLICT", "The change conflicts with existing data (duplicate or missing reference)")


@app.exception_handler(OperationalError)
async def db_unavailable_handler(request: Request, exc: OperationalError):
    logger.error("Database unavailable on %s %s: %s", request.method, request.url.path, exc.orig)
    return _error(503, "SERVICE_UNAVAILABLE", "The database is temporarily unavailable. Please retry shortly.")


# Include API v1 Router
app.include_router(api_v1_router, prefix=settings.API_V1_PREFIX)

@app.get("/health", tags=["Health"])
def health_check():
    """Liveness: the process is up. Does not touch the database."""
    return {
        "status": "healthy",
        "service": "Valid8 — Verification, Approval & Licensure Integrated Engine",
        "version": "1.0.0"
    }

@app.get("/health/ready", tags=["Health"])
def readiness_check():
    """Readiness: the database answers a trivial query."""
    from app.models.base import SessionLocal
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ready", "database": "ok"}
    except Exception:
        return _error(503, "SERVICE_UNAVAILABLE", "Database is not reachable")
    finally:
        db.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
