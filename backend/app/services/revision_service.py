import logging
import os
import re
import traceback
import uuid
from typing import Optional

from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..models import Note, Task, Tag
from ..config import settings

logger = logging.getLogger(__name__)


class ContentEvaluatorResponse(BaseModel):
    """Response model for content evaluation."""
    needs_revision: bool = Field(description="Whether the note needs revision")
    explanation: str = Field(description="Explanation of what needs to be revised, or why it's fine")


def extract_image_urls(content: str) -> list[str]:
    """Extract all image URLs from content <img src="..."> tags."""
    if not content:
        return []
    image_urls = re.findall(r'<img[^>]*src=["\']?([^"\'>\s]+)["\']?', content)
    return image_urls if image_urls else []


def _create_agent():
    """Create the content evaluator agent with proper settings."""
    logger.debug("[REVISION] Creating content evaluator agent...")
    try:
        from langchain.agents import create_agent
        from langchain.messages import HumanMessage
        
        logger.debug(f"[REVISION] Using model: {settings.openai_model}")
        agent = create_agent(
            model=settings.openai_model,
            system_prompt="""You are an expert content evaluator. Your task is to compare a note's current content 
with its original content to determine if the note has drifted from its original meaning or lost important information.

Evaluate whether:
1. The key concepts from the original are preserved
2. Important details haven't been lost
3. The meaning hasn't been changed or distorted
4. The note still serves its original educational purpose

If the note needs revision, explain specifically what aspects need attention.""",
            response_format=ContentEvaluatorResponse,
        )
        logger.debug("[REVISION] Agent created successfully")
        return agent, HumanMessage
    except ImportError as e:
        logger.error(f"[REVISION] Failed to create agent - ImportError: {e}")
        return None, None


def _form_evaluation_message(note_content: str, original_content: str, HumanMessage):
    """Form the evaluation message with content and optional images."""
    note_image_urls = extract_image_urls(note_content)
    original_image_urls = extract_image_urls(original_content)
    
    messages = [{"type": "text", "text": f"Here is the current content of the note:\n\n{note_content}"}]
    
    if note_image_urls:
        messages.extend([{"type": "image", "url": url} for url in note_image_urls])
    
    messages.append({"type": "text", "text": f"\n\nHere is the original content of the note:\n\n{original_content}"})
    
    if original_image_urls:
        messages.extend([{"type": "image", "url": url} for url in original_image_urls])
    
    return HumanMessage(content=messages)


async def evaluate_note_for_revision(
    note: Note
) -> tuple[bool, str]:
    """
    Evaluate a note to determine if it needs revision.
    
    Returns:
        tuple[bool, str]: (needs_revision, explanation)
    """
    logger.info(f"[REVISION] Evaluating note: {note.title} (id: {note.id})")
    
    if not note.original_text:
        logger.info(f"[REVISION] Note has no original_text, skipping")
        return False, "No original content to compare"
    
    if note.content == note.original_text:
        logger.info(f"[REVISION] Note content unchanged from original, skipping")
        return False, "Content unchanged from original"
    
    logger.debug(f"[REVISION] Note content length: {len(note.content or '')}, original length: {len(note.original_text or '')}")
    
    agent, HumanMessage = _create_agent()
    if agent is None:
        logger.warning(f"[REVISION] Agent not available - langchain not installed")
        return False, "AI evaluation not available - langchain not installed"
    
    try:
        logger.info(f"[REVISION] Invoking AI agent for evaluation...")
        message = _form_evaluation_message(note.content, note.original_text, HumanMessage)
        result = agent.invoke({"messages": [message]})
        
        response_content = result["messages"][-1].content
        if isinstance(response_content, str):
            import json
            response_data = json.loads(response_content)
        else:
            response_data = response_content
        
        needs_revision = response_data.get("needs_revision", False)
        explanation = response_data.get("explanation", "")
        logger.info(f"[REVISION] Evaluation result: needs_revision={needs_revision}, explanation={explanation[:100]}...")
        
        return needs_revision, explanation
    except Exception as e:
        logger.error(f"[REVISION] Evaluation error: {type(e).__name__}: {e}")
        logger.error(f"[REVISION] Traceback:\n{traceback.format_exc()}")
        return False, f"Evaluation error: {str(e)}"


async def get_notes_for_revision(
    db: AsyncSession,
    tag_id: uuid.UUID,
    limit: int = 3,
) -> list[Note]:
    """
    Get notes that are eligible for revision.
    
    Notes are eligible if:
    - They belong to the specified tag
    - They have original_text (something to compare against)
    - They haven't been revised yet (revision_count < 1)
    """
    logger.info(f"[REVISION] Querying notes for tag_id: {tag_id}, limit: {limit}")
    logger.debug(f"[REVISION] Query criteria: original_text != '', revision_count < 1")
    
    result = await db.execute(
        select(Note)
        .join(Note.tags)
        .where(Tag.id == tag_id)
        .where(Note.original_text != "")
        .where(Note.revision_count < 1)
        .order_by(Note.updated_at.asc())
        .limit(limit)
    )
    notes = list(result.scalars().all())
    
    logger.info(f"[REVISION] Found {len(notes)} eligible notes for revision")
    for note in notes:
        logger.debug(f"[REVISION]   - Note: {note.title} (id: {note.id}, revision_count: {note.revision_count})")
    
    if len(notes) == 0:
        logger.warning(f"[REVISION] No notes found for revision! Check if tag has notes with original_text and revision_count < 1")
    
    return notes


async def create_revision_task(
    db: AsyncSession,
    note: Note,
    tag_id: uuid.UUID,
    explanation: str,
) -> Task:
    """Create a revision task for a note."""
    logger.info(f"[REVISION] Creating revision task for note: {note.title}")
    
    task = Task(
        tag_id=tag_id,
        title=f"Revise: {note.title}",
        description=explanation,
        task_type="revising",
        note_id=note.id,
        revision_explanation=explanation,
        original_note_content=note.original_text,
    )
    db.add(task)
    
    note.revision_count += 1
    logger.debug(f"[REVISION] Incremented note revision_count to {note.revision_count}")
    
    await db.commit()
    await db.refresh(task)
    
    logger.info(f"[REVISION] Task created: {task.title} (id: {task.id})")
    return task


async def process_revision_tasks(
    db: AsyncSession,
    tag_id: uuid.UUID,
    quantity: int = 3,
) -> list[Task]:
    """
    Process notes for a tag and create revision tasks.
    
    Returns:
        list[Task]: List of created revision tasks
    """
    logger.info(f"[REVISION] ========== PROCESS REVISION TASKS ==========")
    logger.info(f"[REVISION] Tag ID: {tag_id}, Requested quantity: {quantity}")
    
    notes = await get_notes_for_revision(db, tag_id, limit=quantity * 2)
    
    if not notes:
        logger.warning(f"[REVISION] No eligible notes found, returning empty list")
        return []
    
    created_tasks = []
    evaluated_count = 0
    needs_revision_count = 0
    
    for note in notes:
        if len(created_tasks) >= quantity:
            logger.info(f"[REVISION] Reached requested quantity ({quantity}), stopping")
            break
        
        evaluated_count += 1
        logger.info(f"[REVISION] Processing note {evaluated_count}/{len(notes)}: {note.title}")
        
        needs_revision, explanation = await evaluate_note_for_revision(note)
        
        if needs_revision:
            needs_revision_count += 1
            task = await create_revision_task(db, note, tag_id, explanation)
            created_tasks.append(task)
            logger.info(f"[REVISION] Task created for note: {note.title}")
        else:
            note.revision_count += 1
            await db.commit()
            logger.info(f"[REVISION] Note doesn't need revision, incremented revision_count")
    
    logger.info(f"[REVISION] ========== SUMMARY ==========")
    logger.info(f"[REVISION] Notes evaluated: {evaluated_count}")
    logger.info(f"[REVISION] Notes needing revision: {needs_revision_count}")
    logger.info(f"[REVISION] Tasks created: {len(created_tasks)}")
    logger.info(f"[REVISION] ================================")
    
    return created_tasks


async def submit_revision(
    db: AsyncSession,
    task_id: uuid.UUID,
    revised_content: str,
) -> Optional[Task]:
    """
    Submit a revision for a task.
    
    Updates the note's content with the revised content and marks the task as completed.
    """
    result = await db.execute(
        select(Task).where(Task.id == task_id)
    )
    task = result.scalar_one_or_none()
    
    if task is None or task.task_type != "revising":
        return None
    
    if task.note_id:
        note_result = await db.execute(
            select(Note).where(Note.id == task.note_id)
        )
        note = note_result.scalar_one_or_none()
        if note:
            note.content = revised_content
    
    task.user_answer = revised_content
    task.status = "completed"
    task.result = "correct"
    
    await db.commit()
    await db.refresh(task)
    return task
