import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import TagSettings


async def get_tag_settings(db: AsyncSession, tag_id: uuid.UUID) -> TagSettings | None:
    result = await db.execute(select(TagSettings).where(TagSettings.tag_id == tag_id))
    return result.scalar_one_or_none()


async def get_or_create_tag_settings(db: AsyncSession, tag_id: uuid.UUID) -> TagSettings:
    settings = await get_tag_settings(db, tag_id)
    if settings is None:
        settings = TagSettings(tag_id=tag_id)
        db.add(settings)
        await db.commit()
        await db.refresh(settings)
    return settings


async def update_tag_settings(
    db: AsyncSession,
    tag_id: uuid.UUID,
    coding_frequency: int | None = None,
    coding_times: list[str] | None = None,
    answering_frequency: int | None = None,
    answering_times: list[str] | None = None,
    revising_frequency: int | None = None,
    revising_times: list[str] | None = None,
) -> TagSettings:
    settings = await get_or_create_tag_settings(db, tag_id)

    if coding_frequency is not None:
        settings.coding_frequency = coding_frequency
    if coding_times is not None:
        settings.coding_times = ",".join(coding_times)

    if answering_frequency is not None:
        settings.answering_frequency = answering_frequency
    if answering_times is not None:
        settings.answering_times = ",".join(answering_times)

    if revising_frequency is not None:
        settings.revising_frequency = revising_frequency
    if revising_times is not None:
        settings.revising_times = ",".join(revising_times)

    await db.commit()
    await db.refresh(settings)
    return settings


async def get_all_tag_settings(db: AsyncSession) -> list[TagSettings]:
    result = await db.execute(select(TagSettings))
    return list(result.scalars().all())
