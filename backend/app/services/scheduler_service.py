import httpx
from datetime import datetime, timedelta, timezone
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..database import async_session
from ..models import TagSettings, Tag, JobHistory

scheduler = AsyncIOScheduler()


async def send_telegram_message(text: str) -> bool:
    """Send a message via Telegram Bot API."""
    if not settings.telegram_bot_token or not settings.telegram_chat_id:
        print(f"Telegram not configured - token: {bool(settings.telegram_bot_token)}, chat_id: {bool(settings.telegram_chat_id)}")
        return False

    url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage"
    payload = {
        "chat_id": settings.telegram_chat_id,
        "text": text,
        "parse_mode": "HTML",
    }

    print(f"Sending Telegram message to chat_id: {settings.telegram_chat_id}")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, timeout=10.0)
            print(f"Telegram response: {response.status_code} - {response.text[:200]}")
            if response.status_code != 200:
                print(f"Telegram API error: {response.text}")
                return False
            return True
    except Exception as e:
        print(f"Telegram error: {type(e).__name__}: {e}")
        return False


async def process_revision_job(tag_id: str, tag_name: str, quantity: int):
    """Job function that processes revision tasks and sends notifications."""
    from .revision_service import process_revision_tasks
    import uuid as uuid_module
    
    job_id = f"{tag_id}_revising"
    
    async with async_session() as db:
        tag_uuid = uuid_module.UUID(tag_id)
        
        try:
            tasks = await process_revision_tasks(db, tag_uuid, quantity)
            
            if tasks:
                task_list = "\n".join([f"• {task.title.replace('Revise: ', '')}" for task in tasks])
                message = (
                    f"🧠 <b>Time to sharpen your brain!</b>\n\n"
                    f"You have {len(tasks)} card{'s' if len(tasks) > 1 else ''} that need{'s' if len(tasks) == 1 else ''} revision:\n"
                    f"{task_list}\n\n"
                    f"Complete these to improve your brain quality! 💪"
                )
                await send_telegram_message(message)
                
                history = JobHistory(
                    job_id=job_id,
                    job_name=f"Revising for {tag_name}",
                    tag_name=tag_name,
                    task_type="revising",
                    status="success",
                    message=f"Created {len(tasks)} revision tasks",
                    tasks_created=len(tasks),
                )
                db.add(history)
                await db.commit()
            else:
                message = (
                    f"✨ <b>Your notes are on point!</b>\n\n"
                    f"No revisions needed for {tag_name}.\n"
                    f"Keep up the great work! 🎯"
                )
                await send_telegram_message(message)
                
                history = JobHistory(
                    job_id=job_id,
                    job_name=f"Revising for {tag_name}",
                    tag_name=tag_name,
                    task_type="revising",
                    status="success",
                    message="No revisions needed - all notes are good",
                    tasks_created=0,
                )
                db.add(history)
                await db.commit()
        except Exception as e:
            print(f"Error processing revision job: {e}")
            error_msg = str(e)[:500]
            message = (
                f"⚠️ <b>Revision check failed</b>\n\n"
                f"Tag: {tag_name}\n"
                f"Error: {error_msg[:100]}"
            )
            await send_telegram_message(message)
            
            history = JobHistory(
                job_id=job_id,
                job_name=f"Revising for {tag_name}",
                tag_name=tag_name,
                task_type="revising",
                status="failed",
                message=f"Error: {error_msg}",
                tasks_created=0,
            )
            db.add(history)
            await db.commit()


async def task_reminder_job(tag_name: str, task_type: str):
    """Job function that sends a reminder via Telegram."""
    messages = {
        "coding": f"🖥️ Time for <b>coding</b> practice!\nTag: {tag_name}",
        "answering": f"✍️ Time to practice <b>answering</b> questions!\nTag: {tag_name}",
        "revising": f"📚 Time to <b>revise</b> your notes!\nTag: {tag_name}",
    }
    message = messages.get(task_type, f"⏰ Task reminder for {tag_name}")
    success = await send_telegram_message(message)
    
    async with async_session() as db:
        history = JobHistory(
            job_id=f"{tag_name}_{task_type}",
            job_name=f"{task_type.title()} for {tag_name}",
            tag_name=tag_name,
            task_type=task_type,
            status="success" if success else "failed",
            message="Reminder sent" if success else "Failed to send reminder",
            tasks_created=0,
        )
        db.add(history)
        await db.commit()


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
                quantity = getattr(tag_settings, f"{task_type}_quantity", 1)

                if frequency == 0 or not times_str:
                    continue

                times = [t.strip() for t in times_str.split(",") if t.strip()]

                for i, time_str in enumerate(times[:frequency]):
                    try:
                        hour, minute = map(int, time_str.split(":"))
                        job_id = f"{tag.id}_{task_type}_{i}"

                        if task_type == "revising":
                            scheduler.add_job(
                                process_revision_job,
                                CronTrigger(hour=hour, minute=minute),
                                id=job_id,
                                args=[str(tag.id), tag.name, quantity],
                                replace_existing=True,
                                name=f"{task_type.title()} for {tag.name}",
                            )
                        else:
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


async def get_job_history(limit: int = 50) -> list[dict]:
    """Get recent job execution history."""
    from sqlalchemy import select
    
    async with async_session() as db:
        result = await db.execute(
            select(JobHistory)
            .order_by(JobHistory.executed_at.desc())
            .limit(limit)
        )
        history = result.scalars().all()
        
        return [
            {
                "id": str(h.id),
                "job_id": h.job_id,
                "job_name": h.job_name,
                "tag_name": h.tag_name,
                "task_type": h.task_type,
                "status": h.status,
                "message": h.message,
                "tasks_created": h.tasks_created,
                "executed_at": h.executed_at.isoformat() if h.executed_at else None,
            }
            for h in history
        ]


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
