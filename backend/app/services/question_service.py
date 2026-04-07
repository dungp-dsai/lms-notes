"""
Question generation service for coding and answering tasks.
Uses LLM to generate questions based on note content (concepts).
"""
import json
import logging
import re
import traceback
import uuid
from typing import Optional

from pydantic import BaseModel, Field
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Note, Task, Tag
from ..config import settings

logger = logging.getLogger(__name__)


class CodingQuestionResponse(BaseModel):
    """Response model for coding question generation."""
    title: str = Field(description="A concise title for the coding challenge")
    description: str = Field(description="Detailed problem description explaining what to implement")
    language: str = Field(default="python", description="Programming language for the task (e.g., python, javascript, cpp)")
    starter_code: str = Field(default="", description="Starter code template with function signature and comments")
    test_code: str = Field(default="", description="Test code to verify the solution (assert statements or test cases)")
    expected_answer: str = Field(default="", description="A reference solution or key points for evaluation")
    difficulty: str = Field(default="medium", description="Difficulty level: easy, medium, or hard")


class AnsweringQuestionResponse(BaseModel):
    """Response model for answering question generation."""
    title: str = Field(description="The main question to test understanding")
    description: str = Field(default="", description="Additional context or sub-questions to guide the answer")
    expected_answer: str = Field(default="", description="Key points that a good answer should cover")
    difficulty: str = Field(default="medium", description="Difficulty level: easy, medium, or hard")


class CodeEvaluationResponse(BaseModel):
    """Response model for LLM-based code evaluation."""
    is_correct: bool = Field(description="Whether the code correctly demonstrates the concept")
    feedback: str = Field(description="Detailed feedback explaining the evaluation")
    concept_understanding: str = Field(description="Assessment of how well the code demonstrates understanding of the concept")
    comment_quality: str = Field(description="Assessment of the quality and accuracy of code comments")


class AnswerEvaluationResponse(BaseModel):
    """Response model for LLM-based answer evaluation."""
    is_correct: bool = Field(description="Whether the answer captures the main idea of the concept")
    feedback: str = Field(description="Detailed feedback explaining what was good and what could be improved")


def extract_text_content(html_content: str) -> str:
    """Extract plain text from HTML content for LLM processing."""
    if not html_content:
        return ""
    text = re.sub(r'<[^>]+>', ' ', html_content)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


def _create_coding_agent():
    """Create the coding question generator agent."""
    logger.debug("[CODING] Creating coding question agent...")
    try:
        from langchain.agents import create_agent
        from langchain.messages import HumanMessage
        
        logger.debug(f"[CODING] Using model: {settings.openai_model}")
        agent = create_agent(
            model=settings.openai_model,
            system_prompt="""You are an expert programming instructor. Your task is to create coding challenges 
that encourage students to EXPRESS and DEMONSTRATE concepts they've learned by writing code from scratch.

Given a note about a programming concept, create a coding challenge that:
1. Asks the user to WRITE CODE that demonstrates their understanding of the concept
2. Does NOT ask them to solve a puzzle or fix a bug
3. Encourages them to implement the concept from memory
4. Is simple and focused on the core concept

For the title:
- Make it a clear instruction like "Implement X" or "Demonstrate Y" or "Write code showing Z"

For the description:
- Explain what concept they should demonstrate
- Give them freedom to implement it their way
- Keep it short (2-3 sentences max)

For the language field:
- Detect from the note content which language is being discussed
- Default to "python" if unclear
- Use lowercase language names (python, javascript, cpp, java, etc.)

For starter_code:
- LEAVE IT EMPTY or just include basic imports if needed
- Do NOT provide any function signatures or templates
- The user should write everything from scratch

For test_code:
- Keep it minimal or empty
- The goal is self-expression, not passing tests

For expected_answer:
- Provide a simple reference implementation
- This is just for comparison after they submit
- IMPORTANT: Format the code properly with newlines and indentation (not all on one line)""",
            response_format=CodingQuestionResponse,
        )
        logger.debug("[CODING] Agent created successfully")
        return agent, HumanMessage
    except ImportError as e:
        logger.error(f"[CODING] Failed to create agent - ImportError: {e}")
        return None, None


def _create_answering_agent():
    """Create the answering question generator agent."""
    logger.debug("[ANSWERING] Creating answering question agent...")
    try:
        from langchain.agents import create_agent
        from langchain.messages import HumanMessage
        
        logger.debug(f"[ANSWERING] Using model: {settings.openai_model}")
        agent = create_agent(
            model=settings.openai_model,
            system_prompt="""You are an expert educator specialized in testing deep understanding.
Your task is to create thought-provoking questions that test whether someone truly understands a concept.

Given a note about a concept, create questions that:
1. Go beyond surface-level recall
2. Test understanding of WHY and HOW, not just WHAT
3. Require connecting ideas or applying knowledge
4. Challenge common misconceptions
5. Encourage critical thinking

For the title:
- Create a single, clear main question
- Make it open-ended, not yes/no

For description:
- Add 2-3 follow-up questions or prompts
- These should deepen the exploration of the concept
- Can include "What would happen if..." or "Why does this work..." type questions

For expected_answer:
- List 3-5 key points that a complete answer should cover
- Include both factual points and conceptual understanding
- Note any common mistakes to avoid""",
            response_format=AnsweringQuestionResponse,
        )
        logger.debug("[ANSWERING] Agent created successfully")
        return agent, HumanMessage
    except ImportError as e:
        logger.error(f"[ANSWERING] Failed to create agent - ImportError: {e}")
        return None, None


async def generate_coding_question(note: Note) -> Optional[dict]:
    """
    Generate a coding question based on a note's content.
    
    Returns:
        dict with keys: title, description, language, starter_code, test_code, expected_answer
        or None if generation fails
    """
    logger.info(f"[CODING] Generating question for note: {note.title} (id: {note.id})")
    
    agent, HumanMessage = _create_coding_agent()
    if agent is None:
        logger.error("[CODING] Agent creation failed, returning None")
        return None
    
    text_content = extract_text_content(note.content)
    if not text_content:
        logger.debug("[CODING] No content in note.content, trying original_text")
        text_content = extract_text_content(note.original_text)
    
    if not text_content:
        logger.warning(f"[CODING] Note has no extractable text content, skipping")
        return None
    
    logger.debug(f"[CODING] Extracted text content length: {len(text_content)} chars")
    
    try:
        logger.info("[CODING] Invoking AI agent for question generation...")
        message = HumanMessage(content=[
            {"type": "text", "text": f"Note Title: {note.title}\n\nNote Content:\n{text_content}"}
        ])
        result = agent.invoke({"messages": [message]})
        
        response_content = result["messages"][-1].content
        if isinstance(response_content, str):
            response_data = json.loads(response_content)
        else:
            response_data = response_content
        
        question_data = {
            "title": response_data.get("title", f"Coding: {note.title}"),
            "description": response_data.get("description", ""),
            "language": response_data.get("language", "python"),
            "starter_code": "",
            "test_code": "",
            "expected_answer": response_data.get("expected_answer", ""),
        }
        
        logger.info(f"[CODING] Question generated: {question_data['title']}")
        logger.debug(f"[CODING] Language: {question_data['language']}, description length: {len(question_data['description'])}")
        
        return question_data
    except Exception as e:
        logger.error(f"[CODING] Error generating question: {type(e).__name__}: {e}")
        logger.error(f"[CODING] Traceback:\n{traceback.format_exc()}")
        return None


async def generate_answering_question(note: Note) -> Optional[dict]:
    """
    Generate an answering question based on a note's content.
    
    Returns:
        dict with keys: title, description, expected_answer
        or None if generation fails
    """
    logger.info(f"[ANSWERING] Generating question for note: {note.title} (id: {note.id})")
    
    agent, HumanMessage = _create_answering_agent()
    if agent is None:
        logger.error("[ANSWERING] Agent creation failed, returning None")
        return None
    
    text_content = extract_text_content(note.content)
    if not text_content:
        logger.debug("[ANSWERING] No content in note.content, trying original_text")
        text_content = extract_text_content(note.original_text)
    
    if not text_content:
        logger.warning(f"[ANSWERING] Note has no extractable text content, skipping")
        return None
    
    logger.debug(f"[ANSWERING] Extracted text content length: {len(text_content)} chars")
    
    try:
        logger.info("[ANSWERING] Invoking AI agent for question generation...")
        message = HumanMessage(content=[
            {"type": "text", "text": f"Note Title: {note.title}\n\nNote Content:\n{text_content}"}
        ])
        result = agent.invoke({"messages": [message]})
        
        response_content = result["messages"][-1].content
        if isinstance(response_content, str):
            response_data = json.loads(response_content)
        else:
            response_data = response_content
        
        question_data = {
            "title": response_data.get("title", f"Question: {note.title}"),
            "description": response_data.get("description", ""),
            "expected_answer": response_data.get("expected_answer", ""),
        }
        
        logger.info(f"[ANSWERING] Question generated: {question_data['title'][:80]}...")
        logger.debug(f"[ANSWERING] Description length: {len(question_data['description'])}")
        
        return question_data
    except Exception as e:
        logger.error(f"[ANSWERING] Error generating question: {type(e).__name__}: {e}")
        logger.error(f"[ANSWERING] Traceback:\n{traceback.format_exc()}")
        return None


async def get_notes_for_tasks(
    db: AsyncSession,
    tag_id: uuid.UUID,
    task_type: str,
    limit: int = 3,
) -> list[Note]:
    """
    Get notes eligible for task generation.
    
    Notes are selected based on:
    - They belong to the specified tag
    - They have content
    - Prioritize notes with fewer tasks of this type
    """
    logger.info(f"[TASKS] Querying notes for tag_id: {tag_id}, task_type: {task_type}, limit: {limit}")
    
    count_field = f"{task_type}_count"
    logger.debug(f"[TASKS] Query criteria: content != '', order by {count_field}")
    
    result = await db.execute(
        select(Note)
        .join(Note.tags)
        .where(Tag.id == tag_id)
        .where(Note.content != "")
        .order_by(
            getattr(Note, count_field, Note.updated_at).asc(),
            Note.updated_at.asc()
        )
        .limit(limit * 2)
    )
    notes = list(result.scalars().all())
    
    logger.info(f"[TASKS] Found {len(notes)} eligible notes for {task_type} tasks")
    for note in notes:
        count_val = getattr(note, count_field, 'N/A')
        logger.debug(f"[TASKS]   - Note: {note.title} (id: {note.id}, {count_field}: {count_val})")
    
    if len(notes) == 0:
        logger.warning(f"[TASKS] No notes found! Check if tag has notes with content")
    
    return notes


async def create_coding_task(
    db: AsyncSession,
    note: Note,
    tag_id: uuid.UUID,
    question_data: dict,
) -> Task:
    """Create a coding task from generated question data."""
    logger.info(f"[CODING] Creating task for note: {note.title}")
    
    task = Task(
        tag_id=tag_id,
        title=question_data["title"],
        description=question_data["description"],
        task_type="coding",
        language=question_data["language"],
        starter_code=question_data["starter_code"],
        test_code=question_data["test_code"],
        expected_answer=question_data["expected_answer"],
        note_id=note.id,
    )
    db.add(task)
    
    if hasattr(note, 'coding_count'):
        note.coding_count += 1
        logger.debug(f"[CODING] Incremented note coding_count to {note.coding_count}")
    
    await db.commit()
    await db.refresh(task)
    
    logger.info(f"[CODING] Task saved: {task.title} (id: {task.id})")
    return task


async def create_answering_task(
    db: AsyncSession,
    note: Note,
    tag_id: uuid.UUID,
    question_data: dict,
) -> Task:
    """Create an answering task from generated question data."""
    logger.info(f"[ANSWERING] Creating task for note: {note.title}")
    
    task = Task(
        tag_id=tag_id,
        title=question_data["title"],
        description=question_data["description"],
        task_type="answering",
        expected_answer=question_data["expected_answer"],
        note_id=note.id,
    )
    db.add(task)
    
    if hasattr(note, 'answering_count'):
        note.answering_count += 1
        logger.debug(f"[ANSWERING] Incremented note answering_count to {note.answering_count}")
    
    await db.commit()
    await db.refresh(task)
    
    logger.info(f"[ANSWERING] Task saved: {task.title[:60]}... (id: {task.id})")
    return task


async def process_coding_tasks(
    db: AsyncSession,
    tag_id: uuid.UUID,
    quantity: int = 1,
) -> list[Task]:
    """
    Generate coding tasks for notes in a tag.
    
    Returns:
        list[Task]: List of created coding tasks
    """
    logger.info(f"[CODING] ========== PROCESS CODING TASKS ==========")
    logger.info(f"[CODING] Tag ID: {tag_id}, Requested quantity: {quantity}")
    
    notes = await get_notes_for_tasks(db, tag_id, "coding", limit=quantity * 2)
    
    if not notes:
        logger.warning(f"[CODING] No eligible notes found, returning empty list")
        return []
    
    created_tasks = []
    processed_count = 0
    generation_failures = 0
    
    for note in notes:
        if len(created_tasks) >= quantity:
            logger.info(f"[CODING] Reached requested quantity ({quantity}), stopping")
            break
        
        processed_count += 1
        logger.info(f"[CODING] Processing note {processed_count}/{len(notes)}: {note.title}")
        
        question_data = await generate_coding_question(note)
        
        if question_data:
            task = await create_coding_task(db, note, tag_id, question_data)
            created_tasks.append(task)
            logger.info(f"[CODING] Task created: {task.title}")
        else:
            generation_failures += 1
            logger.warning(f"[CODING] Failed to generate question for note: {note.title}")
    
    logger.info(f"[CODING] ========== SUMMARY ==========")
    logger.info(f"[CODING] Notes processed: {processed_count}")
    logger.info(f"[CODING] Generation failures: {generation_failures}")
    logger.info(f"[CODING] Tasks created: {len(created_tasks)}")
    logger.info(f"[CODING] ================================")
    
    return created_tasks


async def process_answering_tasks(
    db: AsyncSession,
    tag_id: uuid.UUID,
    quantity: int = 1,
) -> list[Task]:
    """
    Generate answering tasks for notes in a tag.
    
    Returns:
        list[Task]: List of created answering tasks
    """
    logger.info(f"[ANSWERING] ========== PROCESS ANSWERING TASKS ==========")
    logger.info(f"[ANSWERING] Tag ID: {tag_id}, Requested quantity: {quantity}")
    
    notes = await get_notes_for_tasks(db, tag_id, "answering", limit=quantity * 2)
    
    if not notes:
        logger.warning(f"[ANSWERING] No eligible notes found, returning empty list")
        return []
    
    created_tasks = []
    processed_count = 0
    generation_failures = 0
    
    for note in notes:
        if len(created_tasks) >= quantity:
            logger.info(f"[ANSWERING] Reached requested quantity ({quantity}), stopping")
            break
        
        processed_count += 1
        logger.info(f"[ANSWERING] Processing note {processed_count}/{len(notes)}: {note.title}")
        
        question_data = await generate_answering_question(note)
        
        if question_data:
            task = await create_answering_task(db, note, tag_id, question_data)
            created_tasks.append(task)
            logger.info(f"[ANSWERING] Task created: {task.title[:60]}...")
        else:
            generation_failures += 1
            logger.warning(f"[ANSWERING] Failed to generate question for note: {note.title}")
    
    logger.info(f"[ANSWERING] ========== SUMMARY ==========")
    logger.info(f"[ANSWERING] Notes processed: {processed_count}")
    logger.info(f"[ANSWERING] Generation failures: {generation_failures}")
    logger.info(f"[ANSWERING] Tasks created: {len(created_tasks)}")
    logger.info(f"[ANSWERING] ==================================")
    
    return created_tasks


async def evaluate_code_submission(
    task: Task,
    note: Note,
    user_code: str,
) -> dict:
    """
    Evaluate a user's code submission using LLM.
    
    Args:
        task: The coding task
        note: The note containing the concept
        user_code: The user's submitted code
    
    Returns:
        dict with evaluation results
    """
    logger.info(f"[EVAL:CODE] Evaluating submission for task: {task.title} (id: {task.id})")
    logger.debug(f"[EVAL:CODE] User code length: {len(user_code)} chars")
    
    try:
        from langchain_openai import ChatOpenAI
        from langchain_core.prompts import ChatPromptTemplate
        
        model_name = settings.openai_model.split(":", 1)[-1] if ":" in settings.openai_model else settings.openai_model
        logger.debug(f"[EVAL:CODE] Using model: {model_name}")
        llm = ChatOpenAI(model=model_name, temperature=0)
        structured_llm = llm.with_structured_output(CodeEvaluationResponse)
        
        note_content = extract_text_content(note.content) if note.content else note.title
        
        system_prompt = """You are an expert programming instructor and code evaluator. Your task is to evaluate 
student code submissions to assess their understanding of programming concepts.

Your evaluation criteria:
1. CONCEPT DEMONSTRATION: Does the code correctly demonstrate the concept from the note?
   - The code should show understanding of the core idea, not just syntax
   - It doesn't need to be perfect, but should capture the essence of the concept

2. COMMENT QUALITY: Are the comments explaining the concept accurately?
   - Comments should explain WHY, not just WHAT the code does
   - Comments should show understanding of the underlying concept
   - Inaccurate or misleading comments indicate lack of understanding

3. CORRECTNESS: Would the code work and demonstrate the concept if run?

Be encouraging but honest. If the student shows partial understanding, acknowledge what they got right
while pointing out what they missed.

Set is_correct to TRUE if:
- The code demonstrates reasonable understanding of the concept (doesn't need to be perfect)
- The comments show they understand what they're doing
- The overall submission shows learning

Set is_correct to FALSE if:
- The code doesn't relate to the concept
- The comments are wrong or show misunderstanding
- The submission is incomplete or doesn't attempt the challenge"""

        human_template = """Please evaluate this code submission:

## CONCEPT/NOTE (What the student should understand):
Title: {note_title}
Content: {note_content}

## CHALLENGE (What the student was asked to do):
{task_title}
{task_description}

## STUDENT'S CODE SUBMISSION:
```
{user_code}
```

## REFERENCE SOLUTION (for comparison):
```
{expected_answer}
```

Please evaluate the student's understanding based on their code AND comments.
Remember: The goal is to assess if they understand the concept, not if the code is production-ready."""

        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("human", human_template)
        ])
        
        chain = prompt | structured_llm
        
        logger.info(f"[EVAL:CODE] Invoking LLM for evaluation...")
        response = chain.invoke({
            "note_title": note.title,
            "note_content": note_content,
            "task_title": task.title,
            "task_description": task.description or "",
            "user_code": user_code,
            "expected_answer": task.expected_answer or "No reference provided"
        })
        
        if hasattr(response, 'model_dump'):
            result = response.model_dump()
        elif isinstance(response, dict):
            result = response
        else:
            logger.warning(f"[EVAL:CODE] Unexpected response type: {type(response)}")
            result = {
                "is_correct": False,
                "score": 0,
                "feedback": str(response),
                "concept_understanding": "Unable to parse",
                "comment_quality": "Unable to parse",
            }
        
        logger.info(f"[EVAL:CODE] Evaluation complete: is_correct={result.get('is_correct')}")
        logger.debug(f"[EVAL:CODE] Feedback: {result.get('feedback', '')[:200]}...")
        return result
    except Exception as e:
        logger.error(f"[EVAL:CODE] Evaluation error: {type(e).__name__}: {e}")
        logger.error(f"[EVAL:CODE] Traceback:\n{traceback.format_exc()}")
        return {
            "is_correct": False,
            "feedback": f"Evaluation error: {str(e)}",
            "concept_understanding": "Error during evaluation",
            "comment_quality": "Error during evaluation",
        }


async def evaluate_answer_submission(
    task: Task,
    note: Note,
    user_answer: str,
) -> dict:
    """
    Evaluate a user's answer submission using LLM.
    
    Args:
        task: The answering task
        note: The note containing the concept
        user_answer: The user's submitted answer
    
    Returns:
        dict with evaluation results
    """
    logger.info(f"[EVAL:ANSWER] Evaluating submission for task: {task.title[:60]}... (id: {task.id})")
    logger.debug(f"[EVAL:ANSWER] User answer length: {len(user_answer)} chars")
    
    try:
        from langchain_openai import ChatOpenAI
        from langchain_core.prompts import ChatPromptTemplate
        
        model_name = settings.openai_model.split(":", 1)[-1] if ":" in settings.openai_model else settings.openai_model
        logger.debug(f"[EVAL:ANSWER] Using model: {model_name}")
        llm = ChatOpenAI(model=model_name, temperature=0)
        structured_llm = llm.with_structured_output(AnswerEvaluationResponse)
        
        note_content = extract_text_content(note.content) if note.content else note.title
        
        system_prompt = """You are an expert educator evaluating student answers. Your task is to assess whether 
the student understands the core concept being tested.

IMPORTANT EVALUATION CRITERIA:
1. The answer should CAPTURE THE MAIN IDEA of the concept
2. The student does NOT need to use exact words from the reference
3. The student does NOT need to cover every single detail
4. Partial understanding with correct core idea = CORRECT
5. Focus on conceptual understanding, not perfect wording

Set is_correct to TRUE if:
- The answer shows understanding of the main concept
- The core idea is captured, even if not perfectly worded
- The student demonstrates they "get it" conceptually

Set is_correct to FALSE if:
- The answer misses the main point entirely
- There are fundamental misunderstandings
- The answer is completely off-topic or empty

Be encouraging in your feedback. If they got it mostly right, celebrate that while suggesting improvements.
If they missed something, explain what the key insight should be."""

        human_template = """Please evaluate this answer:

## THE CONCEPT (from the student's notes):
Title: {note_title}
Content: {note_content}

## THE QUESTION:
{question}

## HINTS PROVIDED:
{hints}

## EXPECTED KEY POINTS (for reference only):
{expected_answer}

## STUDENT'S ANSWER:
{user_answer}

Evaluate if the student understands the main concept. Remember: they don't need exact wording or complete coverage."""

        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("human", human_template)
        ])
        
        chain = prompt | structured_llm
        
        logger.info(f"[EVAL:ANSWER] Invoking LLM for evaluation...")
        response = chain.invoke({
            "note_title": note.title,
            "note_content": note_content,
            "question": task.title,
            "hints": task.description or "No hints provided",
            "expected_answer": task.expected_answer or "No reference provided",
            "user_answer": user_answer
        })
        
        if hasattr(response, 'model_dump'):
            result = response.model_dump()
        elif isinstance(response, dict):
            result = response
        else:
            logger.warning(f"[EVAL:ANSWER] Unexpected response type: {type(response)}")
            result = {
                "is_correct": False,
                "feedback": str(response),
            }
        
        logger.info(f"[EVAL:ANSWER] Evaluation complete: is_correct={result.get('is_correct')}")
        logger.debug(f"[EVAL:ANSWER] Feedback: {result.get('feedback', '')[:200]}...")
        return result
    except Exception as e:
        logger.error(f"[EVAL:ANSWER] Evaluation error: {type(e).__name__}: {e}")
        logger.error(f"[EVAL:ANSWER] Traceback:\n{traceback.format_exc()}")
        return {
            "is_correct": False,
            "feedback": f"Evaluation error: {str(e)}",
        }
