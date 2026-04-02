import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..schemas import TagCreate, TagResponse
from ..services import tag_service

router = APIRouter(tags=["tags"])


@router.get("/tags", response_model=list[TagResponse])
async def list_tags(db: AsyncSession = Depends(get_db)):
    return await tag_service.list_tags(db)


@router.post("/tags", response_model=TagResponse, status_code=201)
async def create_tag(body: TagCreate, db: AsyncSession = Depends(get_db)):
    existing = await tag_service.get_tag_by_name(db, body.name)
    if existing:
        raise HTTPException(status_code=409, detail="Tag with this name already exists")
    return await tag_service.create_tag(db, body.name, body.color)


@router.get("/tags/{tag_id}", response_model=TagResponse)
async def get_tag(tag_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    tag = await tag_service.get_tag(db, tag_id)
    if tag is None:
        raise HTTPException(status_code=404, detail="Tag not found")
    return tag


@router.put("/tags/{tag_id}", response_model=TagResponse)
async def update_tag(
    tag_id: uuid.UUID,
    body: TagCreate,
    db: AsyncSession = Depends(get_db),
):
    tag = await tag_service.update_tag(db, tag_id, body.name, body.color)
    if tag is None:
        raise HTTPException(status_code=404, detail="Tag not found")
    return tag


@router.delete("/tags/{tag_id}", status_code=204)
async def delete_tag(tag_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    deleted = await tag_service.delete_tag(db, tag_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Tag not found")
