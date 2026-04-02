import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..schemas import BacklinkItem, NoteCreate, NoteDetail, NoteListItem, NoteSearchResult, NoteUpdate
from ..services import note_service

router = APIRouter(tags=["notes"])


@router.get("/notes", response_model=list[NoteListItem])
async def list_notes(
    tag_id: uuid.UUID | None = Query(None, description="Filter by tag ID"),
    db: AsyncSession = Depends(get_db),
):
    return await note_service.list_notes(db, tag_id=tag_id)


@router.post("/notes", response_model=NoteDetail, status_code=201)
async def create_note(body: NoteCreate, db: AsyncSession = Depends(get_db)):
    return await note_service.create_note(db, body.title, body.content, body.tag_ids or None)


@router.get("/notes/search", response_model=list[NoteSearchResult])
async def search_notes(q: str = Query("", min_length=0), db: AsyncSession = Depends(get_db)):
    if not q:
        notes = await note_service.list_notes(db)
        return notes[:20]
    return await note_service.search_notes(db, q)


@router.get("/notes/{note_id}", response_model=NoteDetail)
async def get_note(note_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    note = await note_service.get_note(db, note_id)
    if note is None:
        raise HTTPException(status_code=404, detail="Note not found")
    return note


@router.put("/notes/{note_id}", response_model=NoteDetail)
async def update_note(note_id: uuid.UUID, body: NoteUpdate, db: AsyncSession = Depends(get_db)):
    note = await note_service.update_note(db, note_id, body.title, body.content, body.tag_ids)
    if note is None:
        raise HTTPException(status_code=404, detail="Note not found")
    return note


@router.delete("/notes/{note_id}", status_code=204)
async def delete_note(note_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    deleted = await note_service.delete_note(db, note_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Note not found")


@router.get("/notes/{note_id}/backlinks", response_model=list[BacklinkItem])
async def get_backlinks(note_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await note_service.get_backlinks(db, note_id)
