import uuid

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..models import Note, NoteLink, Tag
from .link_parser import extract_link_titles, update_wiki_link_title


async def list_notes(
    db: AsyncSession, tag_id: uuid.UUID | None = None, untagged: bool = False
) -> list[Note]:
    query = select(Note).options(selectinload(Note.tags)).order_by(Note.updated_at.desc())
    if tag_id:
        query = query.join(Note.tags).where(Tag.id == tag_id)
    elif untagged:
        from sqlalchemy import not_, exists
        from ..models import note_tags
        subq = select(note_tags.c.note_id).where(note_tags.c.note_id == Note.id)
        query = query.where(not_(exists(subq)))
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_note(db: AsyncSession, note_id: uuid.UUID) -> Note | None:
    result = await db.execute(
        select(Note).options(selectinload(Note.tags)).where(Note.id == note_id)
    )
    return result.scalar_one_or_none()


async def create_note(
    db: AsyncSession,
    title: str,
    content: str,
    original_text: str = "",
    tag_ids: list[uuid.UUID] | None = None,
) -> Note:
    note = Note(title=title, content=content, original_text=original_text)
    if tag_ids:
        tags_result = await db.execute(select(Tag).where(Tag.id.in_(tag_ids)))
        note.tags = list(tags_result.scalars().all())
    db.add(note)
    await db.flush()
    await _sync_links(db, note)
    await db.commit()
    await db.refresh(note, ["tags"])
    return note


async def update_note(
    db: AsyncSession,
    note_id: uuid.UUID,
    title: str | None,
    content: str | None,
    original_text: str | None = None,
    tag_ids: list[uuid.UUID] | None = None,
) -> Note | None:
    result = await db.execute(
        select(Note).options(selectinload(Note.tags)).where(Note.id == note_id)
    )
    note = result.scalar_one_or_none()
    if note is None:
        return None
    
    old_title = note.title
    title_changed = title is not None and title != old_title
    
    if title is not None:
        note.title = title
    if content is not None:
        note.content = content
    if original_text is not None:
        note.original_text = original_text
    if tag_ids is not None:
        tags_result = await db.execute(select(Tag).where(Tag.id.in_(tag_ids)))
        note.tags = list(tags_result.scalars().all())
    await db.flush()
    await _sync_links(db, note)
    
    # If title changed, update wiki-links in all notes that link to this note
    if title_changed:
        await _update_incoming_link_titles(db, note_id, old_title, title)
    
    await db.commit()
    await db.refresh(note, ["tags"])
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


async def _update_incoming_link_titles(
    db: AsyncSession, note_id: uuid.UUID, old_title: str, new_title: str
) -> None:
    """Update wiki-link titles in all notes that link to this note."""
    # Find all notes that have links pointing to this note
    result = await db.execute(
        select(Note)
        .join(NoteLink, NoteLink.source_note_id == Note.id)
        .where(NoteLink.target_note_id == note_id)
    )
    linking_notes = list(result.scalars().all())
    
    note_id_str = str(note_id)
    for linking_note in linking_notes:
        updated_content = update_wiki_link_title(
            linking_note.content, note_id_str, old_title, new_title
        )
        if updated_content != linking_note.content:
            linking_note.content = updated_content
