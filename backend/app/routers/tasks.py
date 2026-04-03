import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..schemas import TaskCreate, TaskUpdate, TaskSubmit, TaskResponse, TaskListItem, TagTaskStats
from ..services import task_service

router = APIRouter(tags=["tasks"])


@router.get("/tasks", response_model=list[TaskListItem])
async def list_tasks(
    tag_id: uuid.UUID | None = Query(None, description="Filter by tag ID"),
    status: str | None = Query(None, description="Filter by status (pending/completed)"),
    db: AsyncSession = Depends(get_db),
):
    return await task_service.list_tasks(db, tag_id=tag_id, status=status)


@router.get("/tasks/stats", response_model=list[TagTaskStats])
async def get_task_stats(db: AsyncSession = Depends(get_db)):
    stats = await task_service.get_task_stats_by_tag(db)
    return [
        TagTaskStats(tag_id=tag_id, **counts)
        for tag_id, counts in stats.items()
    ]


@router.get("/tasks/{task_id}", response_model=TaskResponse)
async def get_task(task_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    task = await task_service.get_task(db, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.post("/tasks", response_model=TaskResponse, status_code=201)
async def create_task(body: TaskCreate, db: AsyncSession = Depends(get_db)):
    if body.task_type not in ("coding", "answering"):
        raise HTTPException(status_code=400, detail="task_type must be 'coding' or 'answering'")
    return await task_service.create_task(
        db,
        tag_id=body.tag_id,
        title=body.title,
        description=body.description,
        task_type=body.task_type,
        language=body.language,
        starter_code=body.starter_code,
        test_code=body.test_code,
        expected_answer=body.expected_answer,
    )


@router.put("/tasks/{task_id}", response_model=TaskResponse)
async def update_task(task_id: uuid.UUID, body: TaskUpdate, db: AsyncSession = Depends(get_db)):
    task = await task_service.update_task(
        db,
        task_id,
        title=body.title,
        description=body.description,
        language=body.language,
        starter_code=body.starter_code,
        test_code=body.test_code,
        expected_answer=body.expected_answer,
    )
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.post("/tasks/{task_id}/submit", response_model=TaskResponse)
async def submit_task(task_id: uuid.UUID, body: TaskSubmit, db: AsyncSession = Depends(get_db)):
    task = await task_service.submit_task(db, task_id, body.answer)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.post("/tasks/{task_id}/result", response_model=TaskResponse)
async def update_task_result(
    task_id: uuid.UUID,
    result: str = Query(..., description="Result: 'correct' or 'wrong'"),
    db: AsyncSession = Depends(get_db),
):
    if result not in ("correct", "wrong"):
        raise HTTPException(status_code=400, detail="result must be 'correct' or 'wrong'")
    task = await task_service.update_task_result(db, task_id, result)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.delete("/tasks/{task_id}", status_code=204)
async def delete_task(task_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    deleted = await task_service.delete_task(db, task_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Task not found")
