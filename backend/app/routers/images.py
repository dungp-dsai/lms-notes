import uuid

import aiofiles
from fastapi import APIRouter, Depends, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..database import get_db
from ..models import Image
from ..schemas import ImageUploadResponse

router = APIRouter(tags=["images"])


@router.post("/images/upload", response_model=ImageUploadResponse, status_code=201)
async def upload_image(
    file: UploadFile,
    note_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
):
    ext = (file.filename or "image.png").rsplit(".", 1)[-1] if file.filename else "png"
    image_id = uuid.uuid4()
    filename = f"{image_id}.{ext}"

    dest = settings.upload_dir / filename
    async with aiofiles.open(dest, "wb") as f:
        while chunk := await file.read(1024 * 256):
            await f.write(chunk)

    image = Image(
        id=image_id,
        note_id=note_id,
        filename=filename,
        original_name=file.filename or "pasted_image.png",
        mime_type=file.content_type or "image/png",
    )
    db.add(image)
    await db.commit()

    return ImageUploadResponse(
        id=image_id,
        url=f"/uploads/{filename}",
        filename=filename,
    )
