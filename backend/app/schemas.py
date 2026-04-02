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
    tag_ids: list[UUID] = []


class NoteUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
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
