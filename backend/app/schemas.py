from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class TagBase(BaseModel):
    name: str
    color: str = "#8b5cf6"


class TagCreate(TagBase):
    pass


class TagResponse(TagBase):
    id: UUID

    model_config = {"from_attributes": True}


class NoteCreate(BaseModel):
    title: str = "Untitled"
    content: str = ""
    original_text: str = ""
    tag_ids: list[UUID] = []


class NoteUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    original_text: str | None = None
    tag_ids: list[UUID] | None = None


class NoteListItem(BaseModel):
    id: UUID
    title: str
    updated_at: datetime
    tags: list[TagResponse] = []

    model_config = {"from_attributes": True}


class NoteDetail(BaseModel):
    id: UUID
    title: str
    content: str
    original_text: str = ""
    created_at: datetime
    updated_at: datetime
    tags: list[TagResponse] = []

    model_config = {"from_attributes": True}


class NoteSearchResult(BaseModel):
    id: UUID
    title: str

    model_config = {"from_attributes": True}


class BacklinkItem(BaseModel):
    id: UUID
    title: str

    model_config = {"from_attributes": True}


class ImageUploadResponse(BaseModel):
    id: UUID
    url: str
    filename: str


class TaskCreate(BaseModel):
    tag_id: UUID
    title: str
    description: str = ""
    task_type: str  # "coding", "answering", or "revising"
    language: str | None = None
    starter_code: str | None = None
    test_code: str | None = None
    expected_answer: str | None = None
    note_id: UUID | None = None
    revision_explanation: str | None = None
    original_note_content: str | None = None


class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    language: str | None = None
    starter_code: str | None = None
    test_code: str | None = None
    expected_answer: str | None = None


class TaskSubmit(BaseModel):
    answer: str


class TaskResponse(BaseModel):
    id: UUID
    tag_id: UUID
    title: str
    description: str
    task_type: str
    status: str
    result: str | None
    language: str | None
    starter_code: str | None
    test_code: str | None
    expected_answer: str | None
    user_answer: str | None
    note_id: UUID | None
    revision_explanation: str | None
    original_note_content: str | None
    evaluation_feedback: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TaskListItem(BaseModel):
    id: UUID
    tag_id: UUID
    title: str
    task_type: str
    status: str
    result: str | None
    note_id: UUID | None = None

    model_config = {"from_attributes": True}


class RevisionSubmit(BaseModel):
    revised_content: str


class TagTaskStats(BaseModel):
    tag_id: UUID
    pending: int
    completed: int
    correct: int
    wrong: int
    skipped: int = 0


class TaskFrequencyConfig(BaseModel):
    frequency: int = 0  # 0 = disabled, 1/2/3 = times per day
    times: list[str] = []  # e.g., ["09:00", "14:00", "19:00"]
    quantity: int = 1  # how many items per notification


class TagSettingsUpdate(BaseModel):
    coding: TaskFrequencyConfig | None = None
    answering: TaskFrequencyConfig | None = None
    revising: TaskFrequencyConfig | None = None


class TagSettingsResponse(BaseModel):
    tag_id: UUID
    coding: TaskFrequencyConfig
    answering: TaskFrequencyConfig
    revising: TaskFrequencyConfig

    model_config = {"from_attributes": True}


class CodeEvaluationRequest(BaseModel):
    code: str


class CodeEvaluationResponse(BaseModel):
    is_correct: bool
    feedback: str
    concept_understanding: str
    comment_quality: str


class AnswerEvaluationRequest(BaseModel):
    answer: str


class AnswerEvaluationResponse(BaseModel):
    is_correct: bool
    feedback: str
