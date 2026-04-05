import uuid
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Task, Tag


async def list_tasks(
    db: AsyncSession,
    tag_id: uuid.UUID | None = None,
    status: str | None = None,
) -> list[Task]:
    query = select(Task).order_by(Task.created_at.desc())
    if tag_id:
        query = query.where(Task.tag_id == tag_id)
    if status:
        query = query.where(Task.status == status)
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_task(db: AsyncSession, task_id: uuid.UUID) -> Task | None:
    result = await db.execute(select(Task).where(Task.id == task_id))
    return result.scalar_one_or_none()


async def create_task(
    db: AsyncSession,
    tag_id: uuid.UUID,
    title: str,
    description: str,
    task_type: str,
    language: str | None = None,
    starter_code: str | None = None,
    test_code: str | None = None,
    expected_answer: str | None = None,
    note_id: uuid.UUID | None = None,
    revision_explanation: str | None = None,
    original_note_content: str | None = None,
) -> Task:
    task = Task(
        tag_id=tag_id,
        title=title,
        description=description,
        task_type=task_type,
        language=language,
        starter_code=starter_code,
        test_code=test_code,
        expected_answer=expected_answer,
        note_id=note_id,
        revision_explanation=revision_explanation,
        original_note_content=original_note_content,
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return task


async def update_task(
    db: AsyncSession,
    task_id: uuid.UUID,
    title: str | None = None,
    description: str | None = None,
    language: str | None = None,
    starter_code: str | None = None,
    test_code: str | None = None,
    expected_answer: str | None = None,
) -> Task | None:
    task = await get_task(db, task_id)
    if task is None:
        return None
    if title is not None:
        task.title = title
    if description is not None:
        task.description = description
    if language is not None:
        task.language = language
    if starter_code is not None:
        task.starter_code = starter_code
    if test_code is not None:
        task.test_code = test_code
    if expected_answer is not None:
        task.expected_answer = expected_answer
    await db.commit()
    await db.refresh(task)
    return task


async def submit_task(
    db: AsyncSession,
    task_id: uuid.UUID,
    answer: str,
) -> Task | None:
    task = await get_task(db, task_id)
    if task is None:
        return None

    task.user_answer = answer
    task.status = "completed"

    if task.task_type == "answering":
        if task.expected_answer and answer.strip().lower() == task.expected_answer.strip().lower():
            task.result = "correct"
        else:
            task.result = "wrong"
    else:
        task.result = None

    await db.commit()
    await db.refresh(task)
    return task


async def update_task_result(
    db: AsyncSession,
    task_id: uuid.UUID,
    result: str,
) -> Task | None:
    task = await get_task(db, task_id)
    if task is None:
        return None
    task.result = result
    task.status = "completed"
    await db.commit()
    await db.refresh(task)
    return task


async def delete_task(db: AsyncSession, task_id: uuid.UUID) -> bool:
    task = await get_task(db, task_id)
    if task is None:
        return False
    await db.delete(task)
    await db.commit()
    return True


async def get_task_stats_by_tag(db: AsyncSession) -> dict[uuid.UUID, dict]:
    result = await db.execute(
        select(
            Task.tag_id,
            Task.status,
            Task.result,
            func.count(Task.id).label("count"),
        )
        .group_by(Task.tag_id, Task.status, Task.result)
    )
    rows = result.all()

    stats: dict[uuid.UUID, dict] = {}
    for row in rows:
        tag_id = row.tag_id
        if tag_id not in stats:
            stats[tag_id] = {"pending": 0, "completed": 0, "correct": 0, "wrong": 0}

        if row.status == "pending":
            stats[tag_id]["pending"] += row.count
        elif row.status == "completed":
            stats[tag_id]["completed"] += row.count
            if row.result == "correct":
                stats[tag_id]["correct"] += row.count
            elif row.result == "wrong":
                stats[tag_id]["wrong"] += row.count

    return stats
