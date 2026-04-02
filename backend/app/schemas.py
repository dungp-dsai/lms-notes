from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class NoteCreate(BaseModel):
    title: str = "Untitled"
    content: str = ""


class NoteUpdate(BaseModel):
    title: str | None = None
    content: str | None = None


class NoteListItem(BaseModel):
    id: UUID
    title: str
    updated_at: datetime

    model_config = {"from_attributes": True}


class NoteDetail(BaseModel):
    id: UUID
    title: str
    content: str
    created_at: datetime
    updated_at: datetime

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
