import uuid

import aiofiles
from fastapi import APIRouter, Depends, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..database import get_db
from ..models import Image
from ..schemas import ImageUploadResponse
from ..services.s3_service import is_s3_configured, upload_to_s3

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
    content_type = file.content_type or "image/png"

    file_data = await file.read()

    if is_s3_configured():
        url = await upload_to_s3(file_data, filename, content_type)
    else:
        dest = settings.upload_dir / filename
        async with aiofiles.open(dest, "wb") as f:
            await f.write(file_data)
        url = f"/uploads/{filename}"

    image = Image(
        id=image_id,
        note_id=note_id,
        filename=filename,
        original_name=file.filename or "pasted_image.png",
        mime_type=content_type,
        url=url,
    )
    db.add(image)
    await db.commit()

    return ImageUploadResponse(
        id=image_id,
        url=url,
        filename=filename,
    )
