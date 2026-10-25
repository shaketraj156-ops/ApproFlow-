from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
import logging

from app.core.config import settings

logger = logging.getLogger("approflow.scheduler")

scheduler = AsyncIOScheduler(timezone=settings.TZ_DISPLAY)

DAILY_JOB_ID = "daily-compliance-checks"


def run_daily_job_in_new_session() -> None:
    """Scheduler entry point. Owns its DB session, and never lets an error kill the scheduler."""
    # Imported here so importing the scheduler module does not open DB machinery.
    from app.models.base import SessionLocal
    from app.services.alert_service import run_daily_checks_job

    db = SessionLocal()
    try:
        result = run_daily_checks_job(db)
        logger.info("Daily checks finished: %s", result)
    except Exception:
        db.rollback()
        logger.exception("Daily checks failed")
    finally:
        db.close()


def start_scheduler():
    try:
        if not settings.SCHEDULER_ENABLED:
            logger.info("Scheduler disabled by configuration (SCHEDULER_ENABLED=false).")
            return
        if not scheduler.running:
            # Alerts are deduplicated by key, so running on several instances is safe, just wasteful.
            scheduler.add_job(
                run_daily_job_in_new_session,
                CronTrigger(hour=settings.DAILY_JOB_HOUR, minute=0),
                id=DAILY_JOB_ID,
                replace_existing=True,
                max_instances=1,
                coalesce=True,
                misfire_grace_time=3600,
            )
            scheduler.start()
            logger.info("ApproFlow scheduler started; daily checks at %02d:00 %s.", settings.DAILY_JOB_HOUR, settings.TZ_DISPLAY)
    except Exception as e:
        logger.warning(f"Failed to start scheduler: {e}")

def stop_scheduler():
    try:
        if scheduler.running:
            scheduler.shutdown(wait=False)
            logger.info("ApproFlow background task scheduler stopped.")
    except Exception as e:
        logger.warning(f"Error stopping scheduler: {e}")
