import logging
from fastapi import APIRouter, Query
from pydantic import BaseModel

from ..services.scheduler_service import (
    get_scheduled_jobs,
    sync_jobs_from_settings,
    send_telegram_message,
    get_job_history,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["scheduler"])


class ScheduledJob(BaseModel):
    id: str
    name: str
    next_run_time: str
    next_run_relative: str


class JobHistoryItem(BaseModel):
    id: str
    job_id: str
    job_name: str
    tag_name: str
    task_type: str
    status: str
    message: str
    tasks_created: int
    executed_at: str | None


class TestTelegramRequest(BaseModel):
    message: str = "Hello from LMS Notes! 👋"


@router.get("/scheduler/jobs", response_model=list[ScheduledJob])
async def list_scheduled_jobs():
    """List all scheduled jobs with their next run times."""
    logger.info("[API] GET /scheduler/jobs - listing scheduled jobs")
    jobs = get_scheduled_jobs()
    logger.info(f"[API] Returning {len(jobs)} scheduled jobs")
    return jobs


@router.post("/scheduler/sync")
async def sync_scheduler():
    """Manually sync jobs from tag settings."""
    logger.info("[API] POST /scheduler/sync - manual sync triggered")
    await sync_jobs_from_settings()
    jobs_count = len(get_scheduled_jobs())
    logger.info(f"[API] Sync complete, {jobs_count} jobs scheduled")
    return {"status": "ok", "jobs_count": jobs_count}


@router.post("/scheduler/test-telegram")
async def test_telegram(body: TestTelegramRequest):
    """Send a test message to Telegram."""
    from ..config import settings
    
    logger.info("[API] POST /scheduler/test-telegram - testing Telegram")
    
    if not settings.telegram_bot_token or not settings.telegram_chat_id:
        logger.warning(f"[API] Telegram not configured - token: {bool(settings.telegram_bot_token)}, chat_id: {bool(settings.telegram_chat_id)}")
        return {
            "status": "not_configured",
            "message_sent": False,
            "error": f"Missing config - token: {bool(settings.telegram_bot_token)}, chat_id: {bool(settings.telegram_chat_id)}"
        }
    
    success = await send_telegram_message(body.message)
    logger.info(f"[API] Telegram test result: {'success' if success else 'failed'}")
    return {"status": "ok" if success else "failed", "message_sent": success}


@router.get("/scheduler/history", response_model=list[JobHistoryItem])
async def list_job_history(limit: int = Query(50, ge=1, le=200)):
    """Get job execution history."""
    logger.info(f"[API] GET /scheduler/history - fetching history (limit: {limit})")
    history = await get_job_history(limit)
    logger.info(f"[API] Returning {len(history)} history records")
    return history


class ManualTriggerRequest(BaseModel):
    tag_id: str
    tag_name: str
    task_type: str  # "coding", "answering", "revising"
    quantity: int = 1


@router.post("/scheduler/trigger")
async def trigger_job_manually(body: ManualTriggerRequest):
    """Manually trigger a job for debugging purposes."""
    from ..services.scheduler_service import (
        process_coding_job,
        process_answering_job,
        process_revision_job,
    )
    
    logger.info(f"[API] POST /scheduler/trigger - manual trigger")
    logger.info(f"[API] Tag: {body.tag_name} (id: {body.tag_id}), Type: {body.task_type}, Quantity: {body.quantity}")
    
    try:
        if body.task_type == "coding":
            await process_coding_job(body.tag_id, body.tag_name, body.quantity)
        elif body.task_type == "answering":
            await process_answering_job(body.tag_id, body.tag_name, body.quantity)
        elif body.task_type == "revising":
            await process_revision_job(body.tag_id, body.tag_name, body.quantity)
        else:
            logger.error(f"[API] Invalid task_type: {body.task_type}")
            return {"status": "error", "message": f"Invalid task_type: {body.task_type}"}
        
        logger.info(f"[API] Manual trigger completed successfully")
        return {"status": "ok", "message": f"Job {body.task_type} triggered for {body.tag_name}"}
    except Exception as e:
        logger.error(f"[API] Manual trigger failed: {type(e).__name__}: {e}")
        return {"status": "error", "message": str(e)}
