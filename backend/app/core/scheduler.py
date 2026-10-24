from apscheduler.schedulers.asyncio import AsyncIOScheduler
import logging

logger = logging.getLogger("approflow.scheduler")

scheduler = AsyncIOScheduler()

def start_scheduler():
    try:
        if not scheduler.running:
            scheduler.start()
            logger.info("ApproFlow background task scheduler started successfully.")
    except Exception as e:
        logger.warning(f"Failed to start scheduler: {e}")

def stop_scheduler():
    try:
        if scheduler.running:
            scheduler.shutdown()
            logger.info("ApproFlow background task scheduler stopped.")
    except Exception as e:
        logger.warning(f"Error stopping scheduler: {e}")
