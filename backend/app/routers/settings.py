import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..schemas import TagSettingsUpdate, TagSettingsResponse, TaskFrequencyConfig
from ..services import settings_service

router = APIRouter(tags=["settings"])


def _settings_to_response(settings) -> TagSettingsResponse:
    return TagSettingsResponse(
        tag_id=settings.tag_id,
        coding=TaskFrequencyConfig(
            frequency=settings.coding_frequency,
            times=settings.coding_times.split(",") if settings.coding_times else [],
            quantity=settings.coding_quantity,
        ),
        answering=TaskFrequencyConfig(
            frequency=settings.answering_frequency,
            times=settings.answering_times.split(",") if settings.answering_times else [],
            quantity=settings.answering_quantity,
        ),
        revising=TaskFrequencyConfig(
            frequency=settings.revising_frequency,
            times=settings.revising_times.split(",") if settings.revising_times else [],
            quantity=settings.revising_quantity,
        ),
    )


@router.get("/settings", response_model=list[TagSettingsResponse])
async def list_all_settings(db: AsyncSession = Depends(get_db)):
    all_settings = await settings_service.get_all_tag_settings(db)
    return [_settings_to_response(s) for s in all_settings]


@router.get("/settings/{tag_id}", response_model=TagSettingsResponse)
async def get_settings(tag_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    settings = await settings_service.get_or_create_tag_settings(db, tag_id)
    return _settings_to_response(settings)


@router.put("/settings/{tag_id}", response_model=TagSettingsResponse)
async def update_settings(
    tag_id: uuid.UUID,
    body: TagSettingsUpdate,
    db: AsyncSession = Depends(get_db),
):
    settings = await settings_service.update_tag_settings(
        db,
        tag_id,
        coding_frequency=body.coding.frequency if body.coding else None,
        coding_times=body.coding.times if body.coding else None,
        coding_quantity=body.coding.quantity if body.coding else None,
        answering_frequency=body.answering.frequency if body.answering else None,
        answering_times=body.answering.times if body.answering else None,
        answering_quantity=body.answering.quantity if body.answering else None,
        revising_frequency=body.revising.frequency if body.revising else None,
        revising_times=body.revising.times if body.revising else None,
        revising_quantity=body.revising.quantity if body.revising else None,
    )
    return _settings_to_response(settings)
