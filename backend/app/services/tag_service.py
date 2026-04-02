import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Tag


async def list_tags(db: AsyncSession) -> list[Tag]:
    result = await db.execute(select(Tag).order_by(Tag.name))
    return list(result.scalars().all())


async def get_tag(db: AsyncSession, tag_id: uuid.UUID) -> Tag | None:
    return await db.get(Tag, tag_id)


async def get_tag_by_name(db: AsyncSession, name: str) -> Tag | None:
    result = await db.execute(select(Tag).where(Tag.name == name))
    return result.scalar_one_or_none()


async def create_tag(db: AsyncSession, name: str, color: str = "#8b5cf6") -> Tag:
    tag = Tag(name=name, color=color)
    db.add(tag)
    await db.commit()
    await db.refresh(tag)
    return tag


async def update_tag(
    db: AsyncSession, tag_id: uuid.UUID, name: str | None, color: str | None
) -> Tag | None:
    tag = await db.get(Tag, tag_id)
    if tag is None:
        return None
    if name is not None:
        tag.name = name
    if color is not None:
        tag.color = color
    await db.commit()
    await db.refresh(tag)
    return tag


async def delete_tag(db: AsyncSession, tag_id: uuid.UUID) -> bool:
    tag = await db.get(Tag, tag_id)
    if tag is None:
        return False
    await db.delete(tag)
    await db.commit()
    return True
