import httpx
from datetime import datetime, timedelta, timezone
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..database import async_session
from ..models import TagSettings, Tag

scheduler = AsyncIOScheduler()


async def send_telegram_message(text: str) -> bool:
    """Send a message via Telegram Bot API."""
    if not settings.telegram_bot_token or not settings.telegram_chat_id:
        print("Telegram not configured")
        return False

    url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage"
    payload = {
        "chat_id": settings.telegram_chat_id,
        "text": text,
        "parse_mode": "HTML",
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, timeout=10.0)
            return response.status_code == 200
    except Exception as e:
        print(f"Telegram error: {e}")
        return False


async def task_reminder_job(tag_name: str, task_type: str):
    """Job function that sends a reminder via Telegram."""
    messages = {
        "coding": f"🖥️ Time for <b>coding</b> practice!\nTag: {tag_name}",
        "answering": f"✍️ Time to practice <b>answering</b> questions!\nTag: {tag_name}",
        "revising": f"📚 Time to <b>revise</b> your notes!\nTag: {tag_name}",
    }
    message = messages.get(task_type, f"⏰ Task reminder for {tag_name}")
    await send_telegram_message(message)


async def sync_jobs_from_settings():
    """Read all tag settings and create/update scheduled jobs."""
    scheduler.remove_all_jobs()

    async with async_session() as db:
        result = await db.execute(
            select(TagSettings).join(Tag)
        )
        all_settings = result.scalars().all()

        for tag_settings in all_settings:
            tag_result = await db.execute(
                select(Tag).where(Tag.id == tag_settings.tag_id)
            )
            tag = tag_result.scalar_one_or_none()
            if not tag:
                continue

            for task_type in ["coding", "answering", "revising"]:
                frequency = getattr(tag_settings, f"{task_type}_frequency", 0)
                times_str = getattr(tag_settings, f"{task_type}_times", "")

                if frequency == 0 or not times_str:
                    continue

                times = [t.strip() for t in times_str.split(",") if t.strip()]

                for i, time_str in enumerate(times[:frequency]):
                    try:
                        hour, minute = map(int, time_str.split(":"))
                        job_id = f"{tag.id}_{task_type}_{i}"

                        scheduler.add_job(
                            task_reminder_job,
                            CronTrigger(hour=hour, minute=minute),
                            id=job_id,
                            args=[tag.name, task_type],
                            replace_existing=True,
                            name=f"{task_type.title()} for {tag.name}",
                        )
                    except (ValueError, AttributeError) as e:
                        print(f"Error scheduling job: {e}")


def get_scheduled_jobs() -> list[dict]:
    """Return list of scheduled jobs with next run times."""
    jobs = []
    now = datetime.now(timezone.utc)

    for job in scheduler.get_jobs():
        next_run = job.next_run_time
        if next_run:
            if next_run.tzinfo is None:
                next_run = next_run.replace(tzinfo=timezone.utc)
            delta = next_run - now
            if delta.total_seconds() < 60:
                next_run_str = "in less than a minute"
            elif delta.total_seconds() < 3600:
                minutes = int(delta.total_seconds() / 60)
                next_run_str = f"in {minutes} minute{'s' if minutes != 1 else ''}"
            elif delta.total_seconds() < 86400:
                hours = int(delta.total_seconds() / 3600)
                next_run_str = f"in {hours} hour{'s' if hours != 1 else ''}"
            else:
                next_run_str = next_run.strftime("%Y-%m-%d %H:%M")

            jobs.append({
                "id": job.id,
                "name": job.name or job.id,
                "next_run_time": next_run.isoformat(),
                "next_run_relative": next_run_str,
            })

    jobs.sort(key=lambda x: x["next_run_time"])
    return jobs


def start_scheduler():
    """Start the scheduler if not already running."""
    if not scheduler.running:
        scheduler.start()


def stop_scheduler():
    """Stop the scheduler."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
