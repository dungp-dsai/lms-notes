import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..schemas import TaskCreate, TaskUpdate, TaskSubmit, TaskResponse, TaskListItem, TagTaskStats, RevisionSubmit, CodeEvaluationRequest, CodeEvaluationResponse, AnswerEvaluationRequest, AnswerEvaluationResponse
from ..services import task_service
from ..services.revision_service import submit_revision, process_revision_tasks
from ..services.question_service import process_coding_tasks, process_answering_tasks, evaluate_code_submission, evaluate_answer_submission
from ..models import Note

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
    if body.task_type not in ("coding", "answering", "revising"):
        raise HTTPException(status_code=400, detail="task_type must be 'coding', 'answering', or 'revising'")
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
        note_id=body.note_id,
        revision_explanation=body.revision_explanation,
        original_note_content=body.original_note_content,
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


@router.post("/tasks/{task_id}/redo", response_model=TaskResponse)
async def redo_task(task_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Reset a completed task to pending status so it can be redone."""
    task = await task_service.redo_task(db, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.post("/tasks/{task_id}/skip", response_model=TaskResponse)
async def skip_task(task_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Skip a task without completing it."""
    task = await task_service.skip_task(db, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.post("/tasks/{task_id}/revision", response_model=TaskResponse)
async def submit_revision_task(
    task_id: uuid.UUID,
    body: RevisionSubmit,
    db: AsyncSession = Depends(get_db),
):
    """Submit a revision for a revising task."""
    task = await submit_revision(db, task_id, body.revised_content)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found or not a revising task")
    return task


@router.post("/tasks/trigger-revision/{tag_id}", response_model=list[TaskResponse])
async def trigger_revision_check(
    tag_id: uuid.UUID,
    quantity: int = Query(3, ge=1, le=10, description="Number of cards to check"),
    db: AsyncSession = Depends(get_db),
):
    """Manually trigger revision check for a tag."""
    tasks = await process_revision_tasks(db, tag_id, quantity)
    return tasks


@router.post("/tasks/trigger-coding/{tag_id}", response_model=list[TaskResponse])
async def trigger_coding_tasks(
    tag_id: uuid.UUID,
    quantity: int = Query(1, ge=1, le=5, description="Number of coding tasks to generate"),
    db: AsyncSession = Depends(get_db),
):
    """Manually trigger coding task generation for a tag."""
    tasks = await process_coding_tasks(db, tag_id, quantity)
    return tasks


@router.post("/tasks/trigger-answering/{tag_id}", response_model=list[TaskResponse])
async def trigger_answering_tasks(
    tag_id: uuid.UUID,
    quantity: int = Query(1, ge=1, le=5, description="Number of answering tasks to generate"),
    db: AsyncSession = Depends(get_db),
):
    """Manually trigger answering task generation for a tag."""
    tasks = await process_answering_tasks(db, tag_id, quantity)
    return tasks


@router.post("/tasks/{task_id}/evaluate", response_model=CodeEvaluationResponse)
async def evaluate_code(
    task_id: uuid.UUID,
    body: CodeEvaluationRequest,
    db: AsyncSession = Depends(get_db),
):
    """Evaluate code submission using LLM as a judge."""
    import json
    from sqlalchemy import select, update
    from ..models import Task
    
    task = await task_service.get_task(db, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if task.task_type != "coding":
        raise HTTPException(status_code=400, detail="Only coding tasks can be evaluated")
    
    if not task.note_id:
        raise HTTPException(status_code=400, detail="Task has no associated note")
    
    result = await db.execute(select(Note).where(Note.id == task.note_id))
    note = result.scalar_one_or_none()
    
    if note is None:
        raise HTTPException(status_code=404, detail="Associated note not found")
    
    evaluation = await evaluate_code_submission(task, note, body.code)
    
    await task_service.submit_task(db, task_id, body.code)
    await task_service.update_task_result(
        db, 
        task_id, 
        "correct" if evaluation.get("is_correct", False) else "wrong"
    )
    
    # Store evaluation feedback in task
    await db.execute(
        update(Task)
        .where(Task.id == task_id)
        .values(evaluation_feedback=json.dumps(evaluation))
    )
    await db.commit()
    
    return CodeEvaluationResponse(**evaluation)


@router.post("/tasks/{task_id}/evaluate-answer", response_model=AnswerEvaluationResponse)
async def evaluate_answer(
    task_id: uuid.UUID,
    body: AnswerEvaluationRequest,
    db: AsyncSession = Depends(get_db),
):
    """Evaluate answer submission using LLM as a judge."""
    import json
    from sqlalchemy import select, update
    from ..models import Task
    
    task = await task_service.get_task(db, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if task.task_type != "answering":
        raise HTTPException(status_code=400, detail="Only answering tasks can be evaluated with this endpoint")
    
    if not task.note_id:
        raise HTTPException(status_code=400, detail="Task has no associated note")
    
    result = await db.execute(select(Note).where(Note.id == task.note_id))
    note = result.scalar_one_or_none()
    
    if note is None:
        raise HTTPException(status_code=404, detail="Associated note not found")
    
    evaluation = await evaluate_answer_submission(task, note, body.answer)
    
    # Submit the answer and set result
    await task_service.submit_task(db, task_id, body.answer)
    await task_service.update_task_result(
        db, 
        task_id, 
        "correct" if evaluation.get("is_correct", False) else "wrong"
    )
    
    # Store evaluation feedback in task
    await db.execute(
        update(Task)
        .where(Task.id == task_id)
        .values(evaluation_feedback=json.dumps(evaluation))
    )
    await db.commit()
    
    return AnswerEvaluationResponse(**evaluation)
