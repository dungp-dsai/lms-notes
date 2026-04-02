from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://lms:lms_secret@localhost:5433/lms"
    upload_dir: Path = Path(__file__).resolve().parent.parent / "uploads"
    allowed_origins: str = "http://localhost:5173"

    model_config = {"env_prefix": "LMS_"}


settings = Settings()
settings.upload_dir.mkdir(parents=True, exist_ok=True)
