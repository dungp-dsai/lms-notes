from fastapi import APIRouter, Query
from pydantic import BaseModel

from ..services.scheduler_service import (
    get_scheduled_jobs,
    sync_jobs_from_settings,
    send_telegram_message,
    get_job_history,
)

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
    return get_scheduled_jobs()


@router.post("/scheduler/sync")
async def sync_scheduler():
    """Manually sync jobs from tag settings."""
    await sync_jobs_from_settings()
    return {"status": "ok", "jobs_count": len(get_scheduled_jobs())}


@router.post("/scheduler/test-telegram")
async def test_telegram(body: TestTelegramRequest):
    """Send a test message to Telegram."""
    from ..config import settings
    
    if not settings.telegram_bot_token or not settings.telegram_chat_id:
        return {
            "status": "not_configured",
            "message_sent": False,
            "error": f"Missing config - token: {bool(settings.telegram_bot_token)}, chat_id: {bool(settings.telegram_chat_id)}"
        }
    
    success = await send_telegram_message(body.message)
    return {"status": "ok" if success else "failed", "message_sent": success}


@router.get("/scheduler/history", response_model=list[JobHistoryItem])
async def list_job_history(limit: int = Query(50, ge=1, le=200)):
    """Get job execution history."""
    return await get_job_history(limit)
