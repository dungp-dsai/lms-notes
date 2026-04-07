import os
import re
import uuid
from typing import Optional

from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..models import Note, Task, Tag
from ..config import settings


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
    try:
        from langchain.agents import create_agent
        from langchain.messages import HumanMessage
        
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
        return agent, HumanMessage
    except ImportError:
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
    if not note.original_text:
        return False, "No original content to compare"
    
    if note.content == note.original_text:
        return False, "Content unchanged from original"
    
    agent, HumanMessage = _create_agent()
    if agent is None:
        return False, "AI evaluation not available - langchain not installed"
    
    try:
        message = _form_evaluation_message(note.content, note.original_text, HumanMessage)
        result = agent.invoke({"messages": [message]})
        
        response_content = result["messages"][-1].content
        if isinstance(response_content, str):
            import json
            response_data = json.loads(response_content)
        else:
            response_data = response_content
        
        return response_data.get("needs_revision", False), response_data.get("explanation", "")
    except Exception as e:
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
    result = await db.execute(
        select(Note)
        .join(Note.tags)
        .where(Tag.id == tag_id)
        .where(Note.original_text != "")
        .where(Note.revision_count < 1)
        .order_by(Note.updated_at.asc())
        .limit(limit)
    )
    return list(result.scalars().all())


async def create_revision_task(
    db: AsyncSession,
    note: Note,
    tag_id: uuid.UUID,
    explanation: str,
) -> Task:
    """Create a revision task for a note."""
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
    
    await db.commit()
    await db.refresh(task)
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
    notes = await get_notes_for_revision(db, tag_id, limit=quantity * 2)
    
    created_tasks = []
    for note in notes:
        if len(created_tasks) >= quantity:
            break
        
        needs_revision, explanation = await evaluate_note_for_revision(note)
        
        if needs_revision:
            task = await create_revision_task(db, note, tag_id, explanation)
            created_tasks.append(task)
        else:
            note.revision_count += 1
            await db.commit()
    
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
