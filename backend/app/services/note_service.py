import uuid

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Note, NoteLink
from .link_parser import extract_link_titles


async def list_notes(db: AsyncSession) -> list[Note]:
    result = await db.execute(select(Note).order_by(Note.updated_at.desc()))
    return list(result.scalars().all())


async def get_note(db: AsyncSession, note_id: uuid.UUID) -> Note | None:
    return await db.get(Note, note_id)


async def create_note(db: AsyncSession, title: str, content: str) -> Note:
    note = Note(title=title, content=content)
    db.add(note)
    await db.flush()
    await _sync_links(db, note)
    await db.commit()
    await db.refresh(note)
    return note


async def update_note(
    db: AsyncSession, note_id: uuid.UUID, title: str | None, content: str | None
) -> Note | None:
    note = await db.get(Note, note_id)
    if note is None:
        return None
    if title is not None:
        note.title = title
    if content is not None:
        note.content = content
    await db.flush()
    await _sync_links(db, note)
    await db.commit()
    await db.refresh(note)
    return note


async def delete_note(db: AsyncSession, note_id: uuid.UUID) -> bool:
    note = await db.get(Note, note_id)
    if note is None:
        return False
    await db.delete(note)
    await db.commit()
    return True


async def search_notes(db: AsyncSession, query: str) -> list[Note]:
    result = await db.execute(
        select(Note).where(Note.title.ilike(f"%{query}%")).order_by(Note.title).limit(20)
    )
    return list(result.scalars().all())


async def get_backlinks(db: AsyncSession, note_id: uuid.UUID) -> list[Note]:
    result = await db.execute(
        select(Note)
        .join(NoteLink, NoteLink.source_note_id == Note.id)
        .where(NoteLink.target_note_id == note_id)
    )
    return list(result.scalars().all())


async def _sync_links(db: AsyncSession, note: Note) -> None:
    await db.execute(delete(NoteLink).where(NoteLink.source_note_id == note.id))

    titles = extract_link_titles(note.content)
    if not titles:
        return

    for title in set(titles):
        result = await db.execute(select(Note).where(Note.title == title))
        target = result.scalar_one_or_none()
        if target and target.id != note.id:
            db.add(NoteLink(source_note_id=note.id, target_note_id=target.id))
