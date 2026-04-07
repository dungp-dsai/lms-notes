import httpx
import logging
import traceback
from datetime import datetime, timedelta, timezone
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.events import EVENT_JOB_EXECUTED, EVENT_JOB_ERROR, EVENT_JOB_MISSED
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..database import async_session
from ..models import TagSettings, Tag, JobHistory

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


def job_listener(event):
    """Listen to job events for logging."""
    if event.exception:
        logger.error(f"[SCHEDULER] Job {event.job_id} FAILED with exception: {event.exception}")
        logger.error(f"[SCHEDULER] Traceback: {traceback.format_exc()}")
    else:
        logger.info(f"[SCHEDULER] Job {event.job_id} executed successfully")


scheduler.add_listener(job_listener, EVENT_JOB_EXECUTED | EVENT_JOB_ERROR | EVENT_JOB_MISSED)


async def send_telegram_message(text: str) -> bool:
    """Send a message via Telegram Bot API."""
    logger.info(f"[TELEGRAM] Attempting to send message...")
    
    if not settings.telegram_bot_token or not settings.telegram_chat_id:
        logger.warning(f"[TELEGRAM] Not configured - token: {bool(settings.telegram_bot_token)}, chat_id: {bool(settings.telegram_chat_id)}")
        return False

    url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage"
    payload = {
        "chat_id": settings.telegram_chat_id,
        "text": text,
        "parse_mode": "HTML",
    }

    logger.info(f"[TELEGRAM] Sending to chat_id: {settings.telegram_chat_id}, message length: {len(text)} chars")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, timeout=10.0)
            logger.info(f"[TELEGRAM] Response status: {response.status_code}")
            
            if response.status_code != 200:
                logger.error(f"[TELEGRAM] API error: {response.text}")
                return False
            
            logger.info(f"[TELEGRAM] Message sent successfully")
            return True
    except httpx.TimeoutException as e:
        logger.error(f"[TELEGRAM] Timeout error: {e}")
        return False
    except httpx.RequestError as e:
        logger.error(f"[TELEGRAM] Request error: {type(e).__name__}: {e}")
        return False
    except Exception as e:
        logger.error(f"[TELEGRAM] Unexpected error: {type(e).__name__}: {e}")
        logger.error(f"[TELEGRAM] Traceback: {traceback.format_exc()}")
        return False


async def process_revision_job(tag_id: str, tag_name: str, quantity: int):
    """Job function that processes revision tasks and sends notifications."""
    from .revision_service import process_revision_tasks
    import uuid as uuid_module
    
    job_id = f"{tag_id}_revising"
    logger.info(f"[JOB:REVISION] ========== START ==========")
    logger.info(f"[JOB:REVISION] Tag: {tag_name} (id: {tag_id}), Quantity: {quantity}")
    
    async with async_session() as db:
        tag_uuid = uuid_module.UUID(tag_id)
        
        try:
            logger.info(f"[JOB:REVISION] Calling process_revision_tasks...")
            tasks = await process_revision_tasks(db, tag_uuid, quantity)
            logger.info(f"[JOB:REVISION] process_revision_tasks returned {len(tasks) if tasks else 0} tasks")
            
            if tasks:
                task_list = "\n".join([f"• {task.title.replace('Revise: ', '')}" for task in tasks])
                message = (
                    f"🧠 <b>Time to sharpen your brain!</b>\n\n"
                    f"You have {len(tasks)} card{'s' if len(tasks) > 1 else ''} that need{'s' if len(tasks) == 1 else ''} revision:\n"
                    f"{task_list}\n\n"
                    f"Complete these to improve your brain quality! 💪"
                )
                logger.info(f"[JOB:REVISION] Sending Telegram notification for {len(tasks)} tasks")
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
                logger.info(f"[JOB:REVISION] History saved to database")
            else:
                message = (
                    f"✨ <b>Your notes are on point!</b>\n\n"
                    f"No revisions needed for {tag_name}.\n"
                    f"Keep up the great work! 🎯"
                )
                logger.info(f"[JOB:REVISION] No revisions needed, sending notification")
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
                logger.info(f"[JOB:REVISION] History saved to database")
            
            logger.info(f"[JOB:REVISION] ========== SUCCESS ==========")
        except Exception as e:
            error_msg = str(e)[:500]
            logger.error(f"[JOB:REVISION] ========== FAILED ==========")
            logger.error(f"[JOB:REVISION] Error: {type(e).__name__}: {e}")
            logger.error(f"[JOB:REVISION] Traceback:\n{traceback.format_exc()}")
            
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
            logger.info(f"[JOB:REVISION] Failure history saved to database")


async def process_coding_job(tag_id: str, tag_name: str, quantity: int):
    """Job function that generates coding tasks and sends notifications."""
    from .question_service import process_coding_tasks
    import uuid as uuid_module
    
    job_id = f"{tag_id}_coding"
    logger.info(f"[JOB:CODING] ========== START ==========")
    logger.info(f"[JOB:CODING] Tag: {tag_name} (id: {tag_id}), Quantity: {quantity}")
    
    async with async_session() as db:
        tag_uuid = uuid_module.UUID(tag_id)
        
        try:
            logger.info(f"[JOB:CODING] Calling process_coding_tasks...")
            tasks = await process_coding_tasks(db, tag_uuid, quantity)
            logger.info(f"[JOB:CODING] process_coding_tasks returned {len(tasks) if tasks else 0} tasks")
            
            if tasks:
                task_list = "\n".join([f"• {task.title}" for task in tasks])
                message = (
                    f"💻 <b>Coding Challenge Time!</b>\n\n"
                    f"You have {len(tasks)} new coding task{'s' if len(tasks) > 1 else ''} for <b>{tag_name}</b>:\n"
                    f"{task_list}\n\n"
                    f"Apply what you've learned! 🚀"
                )
                logger.info(f"[JOB:CODING] Sending Telegram notification for {len(tasks)} tasks")
                await send_telegram_message(message)
                
                history = JobHistory(
                    job_id=job_id,
                    job_name=f"Coding for {tag_name}",
                    tag_name=tag_name,
                    task_type="coding",
                    status="success",
                    message=f"Created {len(tasks)} coding tasks",
                    tasks_created=len(tasks),
                )
                db.add(history)
                await db.commit()
                logger.info(f"[JOB:CODING] History saved to database")
            else:
                message = (
                    f"📝 <b>No coding tasks generated</b>\n\n"
                    f"No new concepts available for {tag_name}.\n"
                    f"Add more notes to get coding challenges!"
                )
                logger.info(f"[JOB:CODING] No tasks generated, sending notification")
                await send_telegram_message(message)
                
                history = JobHistory(
                    job_id=job_id,
                    job_name=f"Coding for {tag_name}",
                    tag_name=tag_name,
                    task_type="coding",
                    status="success",
                    message="No notes available for coding tasks",
                    tasks_created=0,
                )
                db.add(history)
                await db.commit()
                logger.info(f"[JOB:CODING] History saved to database")
            
            logger.info(f"[JOB:CODING] ========== SUCCESS ==========")
        except Exception as e:
            error_msg = str(e)[:500]
            logger.error(f"[JOB:CODING] ========== FAILED ==========")
            logger.error(f"[JOB:CODING] Error: {type(e).__name__}: {e}")
            logger.error(f"[JOB:CODING] Traceback:\n{traceback.format_exc()}")
            
            message = (
                f"⚠️ <b>Coding task generation failed</b>\n\n"
                f"Tag: {tag_name}\n"
                f"Error: {error_msg[:100]}"
            )
            await send_telegram_message(message)
            
            history = JobHistory(
                job_id=job_id,
                job_name=f"Coding for {tag_name}",
                tag_name=tag_name,
                task_type="coding",
                status="failed",
                message=f"Error: {error_msg}",
                tasks_created=0,
            )
            db.add(history)
            await db.commit()
            logger.info(f"[JOB:CODING] Failure history saved to database")


async def process_answering_job(tag_id: str, tag_name: str, quantity: int):
    """Job function that generates answering tasks and sends notifications."""
    from .question_service import process_answering_tasks
    import uuid as uuid_module
    
    job_id = f"{tag_id}_answering"
    logger.info(f"[JOB:ANSWERING] ========== START ==========")
    logger.info(f"[JOB:ANSWERING] Tag: {tag_name} (id: {tag_id}), Quantity: {quantity}")
    
    async with async_session() as db:
        tag_uuid = uuid_module.UUID(tag_id)
        
        try:
            logger.info(f"[JOB:ANSWERING] Calling process_answering_tasks...")
            tasks = await process_answering_tasks(db, tag_uuid, quantity)
            logger.info(f"[JOB:ANSWERING] process_answering_tasks returned {len(tasks) if tasks else 0} tasks")
            
            if tasks:
                task_list = "\n".join([f"• {task.title[:60]}..." if len(task.title) > 60 else f"• {task.title}" for task in tasks])
                message = (
                    f"🤔 <b>Deep Thinking Time!</b>\n\n"
                    f"You have {len(tasks)} question{'s' if len(tasks) > 1 else ''} to answer for <b>{tag_name}</b>:\n"
                    f"{task_list}\n\n"
                    f"Test your understanding! 🧠"
                )
                logger.info(f"[JOB:ANSWERING] Sending Telegram notification for {len(tasks)} tasks")
                await send_telegram_message(message)
                
                history = JobHistory(
                    job_id=job_id,
                    job_name=f"Answering for {tag_name}",
                    tag_name=tag_name,
                    task_type="answering",
                    status="success",
                    message=f"Created {len(tasks)} answering tasks",
                    tasks_created=len(tasks),
                )
                db.add(history)
                await db.commit()
                logger.info(f"[JOB:ANSWERING] History saved to database")
            else:
                message = (
                    f"📝 <b>No questions generated</b>\n\n"
                    f"No new concepts available for {tag_name}.\n"
                    f"Add more notes to get deep questions!"
                )
                logger.info(f"[JOB:ANSWERING] No tasks generated, sending notification")
                await send_telegram_message(message)
                
                history = JobHistory(
                    job_id=job_id,
                    job_name=f"Answering for {tag_name}",
                    tag_name=tag_name,
                    task_type="answering",
                    status="success",
                    message="No notes available for answering tasks",
                    tasks_created=0,
                )
                db.add(history)
                await db.commit()
                logger.info(f"[JOB:ANSWERING] History saved to database")
            
            logger.info(f"[JOB:ANSWERING] ========== SUCCESS ==========")
        except Exception as e:
            error_msg = str(e)[:500]
            logger.error(f"[JOB:ANSWERING] ========== FAILED ==========")
            logger.error(f"[JOB:ANSWERING] Error: {type(e).__name__}: {e}")
            logger.error(f"[JOB:ANSWERING] Traceback:\n{traceback.format_exc()}")
            
            message = (
                f"⚠️ <b>Question generation failed</b>\n\n"
                f"Tag: {tag_name}\n"
                f"Error: {error_msg[:100]}"
            )
            await send_telegram_message(message)
            
            history = JobHistory(
                job_id=job_id,
                job_name=f"Answering for {tag_name}",
                tag_name=tag_name,
                task_type="answering",
                status="failed",
                message=f"Error: {error_msg}",
                tasks_created=0,
            )
            db.add(history)
            await db.commit()
            logger.info(f"[JOB:ANSWERING] Failure history saved to database")


async def sync_jobs_from_settings():
    """Read all tag settings and create/update scheduled jobs."""
    logger.info(f"[SYNC] ========== STARTING JOB SYNC ==========")
    
    existing_jobs = len(scheduler.get_jobs())
    logger.info(f"[SYNC] Removing {existing_jobs} existing jobs...")
    scheduler.remove_all_jobs()

    async with async_session() as db:
        logger.info(f"[SYNC] Fetching tag settings from database...")
        result = await db.execute(
            select(TagSettings).join(Tag)
        )
        all_settings = result.scalars().all()
        logger.info(f"[SYNC] Found {len(all_settings)} tag settings")

        jobs_created = 0
        for tag_settings in all_settings:
            tag_result = await db.execute(
                select(Tag).where(Tag.id == tag_settings.tag_id)
            )
            tag = tag_result.scalar_one_or_none()
            if not tag:
                logger.warning(f"[SYNC] Tag not found for settings id: {tag_settings.id}")
                continue

            logger.debug(f"[SYNC] Processing tag: {tag.name} (id: {tag.id})")

            for task_type in ["coding", "answering", "revising"]:
                frequency = getattr(tag_settings, f"{task_type}_frequency", 0)
                times_str = getattr(tag_settings, f"{task_type}_times", "")
                quantity = getattr(tag_settings, f"{task_type}_quantity", 1)

                logger.debug(f"[SYNC]   {task_type}: frequency={frequency}, times='{times_str}', quantity={quantity}")

                if frequency == 0 or not times_str:
                    logger.debug(f"[SYNC]   Skipping {task_type} - disabled or no times configured")
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
                        elif task_type == "coding":
                            scheduler.add_job(
                                process_coding_job,
                                CronTrigger(hour=hour, minute=minute),
                                id=job_id,
                                args=[str(tag.id), tag.name, quantity],
                                replace_existing=True,
                                name=f"{task_type.title()} for {tag.name}",
                            )
                        elif task_type == "answering":
                            scheduler.add_job(
                                process_answering_job,
                                CronTrigger(hour=hour, minute=minute),
                                id=job_id,
                                args=[str(tag.id), tag.name, quantity],
                                replace_existing=True,
                                name=f"{task_type.title()} for {tag.name}",
                            )
                        
                        jobs_created += 1
                        logger.info(f"[SYNC] Scheduled: {job_id} at {hour:02d}:{minute:02d} (tag: {tag.name}, type: {task_type}, qty: {quantity})")
                    except (ValueError, AttributeError) as e:
                        logger.error(f"[SYNC] Error scheduling job for {tag.name}/{task_type}: {type(e).__name__}: {e}")
    
    logger.info(f"[SYNC] ========== SYNC COMPLETE: {jobs_created} jobs scheduled ==========")


async def get_job_history(limit: int = 50) -> list[dict]:
    """Get recent job execution history."""
    from sqlalchemy import select
    
    logger.debug(f"[HISTORY] Fetching job history (limit: {limit})")
    
    async with async_session() as db:
        result = await db.execute(
            select(JobHistory)
            .order_by(JobHistory.executed_at.desc())
            .limit(limit)
        )
        history = result.scalars().all()
        logger.debug(f"[HISTORY] Found {len(history)} history records")
        
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
    
    all_jobs = scheduler.get_jobs()
    logger.debug(f"[JOBS] Getting scheduled jobs: {len(all_jobs)} total in scheduler")

    for job in all_jobs:
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
        else:
            logger.warning(f"[JOBS] Job {job.id} has no next_run_time")

    jobs.sort(key=lambda x: x["next_run_time"])
    logger.debug(f"[JOBS] Returning {len(jobs)} scheduled jobs")
    return jobs


def start_scheduler():
    """Start the scheduler if not already running."""
    if not scheduler.running:
        logger.info(f"[SCHEDULER] Starting APScheduler...")
        scheduler.start()
        logger.info(f"[SCHEDULER] APScheduler started successfully")
    else:
        logger.info(f"[SCHEDULER] Scheduler already running, skipping start")


def stop_scheduler():
    """Stop the scheduler."""
    if scheduler.running:
        logger.info(f"[SCHEDULER] Stopping APScheduler...")
        scheduler.shutdown(wait=False)
        logger.info(f"[SCHEDULER] APScheduler stopped")
    else:
        logger.info(f"[SCHEDULER] Scheduler not running, skipping stop")
