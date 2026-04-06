"""
Question generation service for coding and answering tasks.
Uses LLM to generate questions based on note content (concepts).
"""
import json
import re
import uuid
from typing import Optional

from pydantic import BaseModel, Field
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Note, Task, Tag


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
    try:
        from langchain.agents import create_agent
        from langchain.messages import HumanMessage
        
        agent = create_agent(
            model="openai:gpt-4o-mini",
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
        return agent, HumanMessage
    except ImportError:
        return None, None


def _create_answering_agent():
    """Create the answering question generator agent."""
    try:
        from langchain.agents import create_agent
        from langchain.messages import HumanMessage
        
        agent = create_agent(
            model="openai:gpt-4o-mini",
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
        return agent, HumanMessage
    except ImportError:
        return None, None


async def generate_coding_question(note: Note) -> Optional[dict]:
    """
    Generate a coding question based on a note's content.
    
    Returns:
        dict with keys: title, description, language, starter_code, test_code, expected_answer
        or None if generation fails
    """
    agent, HumanMessage = _create_coding_agent()
    if agent is None:
        return None
    
    text_content = extract_text_content(note.content)
    if not text_content:
        text_content = extract_text_content(note.original_text)
    
    if not text_content:
        return None
    
    try:
        message = HumanMessage(content=[
            {"type": "text", "text": f"Note Title: {note.title}\n\nNote Content:\n{text_content}"}
        ])
        result = agent.invoke({"messages": [message]})
        
        response_content = result["messages"][-1].content
        if isinstance(response_content, str):
            response_data = json.loads(response_content)
        else:
            response_data = response_content
        
        return {
            "title": response_data.get("title", f"Coding: {note.title}"),
            "description": response_data.get("description", ""),
            "language": response_data.get("language", "python"),
            "starter_code": "",  # Always empty - user writes from scratch
            "test_code": "",  # Minimal tests - focus on expression
            "expected_answer": response_data.get("expected_answer", ""),
        }
    except Exception as e:
        print(f"Error generating coding question: {e}")
        return None


async def generate_answering_question(note: Note) -> Optional[dict]:
    """
    Generate an answering question based on a note's content.
    
    Returns:
        dict with keys: title, description, expected_answer
        or None if generation fails
    """
    agent, HumanMessage = _create_answering_agent()
    if agent is None:
        return None
    
    text_content = extract_text_content(note.content)
    if not text_content:
        text_content = extract_text_content(note.original_text)
    
    if not text_content:
        return None
    
    try:
        message = HumanMessage(content=[
            {"type": "text", "text": f"Note Title: {note.title}\n\nNote Content:\n{text_content}"}
        ])
        result = agent.invoke({"messages": [message]})
        
        response_content = result["messages"][-1].content
        if isinstance(response_content, str):
            response_data = json.loads(response_content)
        else:
            response_data = response_content
        
        return {
            "title": response_data.get("title", f"Question: {note.title}"),
            "description": response_data.get("description", ""),
            "expected_answer": response_data.get("expected_answer", ""),
        }
    except Exception as e:
        print(f"Error generating answering question: {e}")
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
    count_field = f"{task_type}_count"
    
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
    return list(result.scalars().all())


async def create_coding_task(
    db: AsyncSession,
    note: Note,
    tag_id: uuid.UUID,
    question_data: dict,
) -> Task:
    """Create a coding task from generated question data."""
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
    
    await db.commit()
    await db.refresh(task)
    return task


async def create_answering_task(
    db: AsyncSession,
    note: Note,
    tag_id: uuid.UUID,
    question_data: dict,
) -> Task:
    """Create an answering task from generated question data."""
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
    
    await db.commit()
    await db.refresh(task)
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
    notes = await get_notes_for_tasks(db, tag_id, "coding", limit=quantity * 2)
    
    created_tasks = []
    for note in notes:
        if len(created_tasks) >= quantity:
            break
        
        question_data = await generate_coding_question(note)
        
        if question_data:
            task = await create_coding_task(db, note, tag_id, question_data)
            created_tasks.append(task)
    
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
    notes = await get_notes_for_tasks(db, tag_id, "answering", limit=quantity * 2)
    
    created_tasks = []
    for note in notes:
        if len(created_tasks) >= quantity:
            break
        
        question_data = await generate_answering_question(note)
        
        if question_data:
            task = await create_answering_task(db, note, tag_id, question_data)
            created_tasks.append(task)
    
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
    try:
        from langchain_openai import ChatOpenAI
        from langchain_core.prompts import ChatPromptTemplate
        
        llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
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
        
        response = chain.invoke({
            "note_title": note.title,
            "note_content": note_content,
            "task_title": task.title,
            "task_description": task.description or "",
            "user_code": user_code,
            "expected_answer": task.expected_answer or "No reference provided"
        })
        
        if hasattr(response, 'model_dump'):
            return response.model_dump()
        elif isinstance(response, dict):
            return response
        else:
            return {
                "is_correct": False,
                "score": 0,
                "feedback": str(response),
                "concept_understanding": "Unable to parse",
                "comment_quality": "Unable to parse",
            }
    except Exception as e:
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
    try:
        from langchain_openai import ChatOpenAI
        from langchain_core.prompts import ChatPromptTemplate
        
        llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
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
        
        response = chain.invoke({
            "note_title": note.title,
            "note_content": note_content,
            "question": task.title,
            "hints": task.description or "No hints provided",
            "expected_answer": task.expected_answer or "No reference provided",
            "user_answer": user_answer
        })
        
        if hasattr(response, 'model_dump'):
            return response.model_dump()
        elif isinstance(response, dict):
            return response
        else:
            return {
                "is_correct": False,
                "feedback": str(response),
            }
    except Exception as e:
        return {
            "is_correct": False,
            "feedback": f"Evaluation error: {str(e)}",
        }
