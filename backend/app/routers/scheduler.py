from fastapi import APIRouter
from pydantic import BaseModel

from ..services.scheduler_service import (
    get_scheduled_jobs,
    sync_jobs_from_settings,
    send_telegram_message,
)

router = APIRouter(tags=["scheduler"])


class ScheduledJob(BaseModel):
    id: str
    name: str
    next_run_time: str
    next_run_relative: str


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
    success = await send_telegram_message(body.message)
    return {"status": "ok" if success else "failed", "message_sent": success}
