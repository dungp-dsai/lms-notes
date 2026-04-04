from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://lms:lms_secret@localhost:5433/lms"
    upload_dir: Path = Path(__file__).resolve().parent.parent / "uploads"
    allowed_origins: str = "http://localhost:5173"
    telegram_bot_token: str = ""
    telegram_chat_id: str = ""
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_region: str = "us-east-1"
    aws_bucket_name: str = ""

    model_config = {
        "env_prefix": "LMS_",
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


settings = Settings()
settings.upload_dir.mkdir(parents=True, exist_ok=True)
