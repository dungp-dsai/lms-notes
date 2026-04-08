from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://lms:lms_secret@localhost:5433/lms"
    upload_dir: Path = Path(__file__).resolve().parent.parent / "uploads"
    allowed_origins: str = "http://localhost:5173,https://urverse.tech,https://frontend-7hgzkq6sl-dungp-dsais-projects.vercel.app"
    telegram_bot_token: str = ""
    telegram_chat_id: str = ""
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_region: str = "us-east-1"
    aws_bucket_name: str = ""
    google_api_key: str = ""
    openai_api_key: str = ""
    openai_model: str = "openai:gpt-4o-mini"
    
    # LangSmith configuration for AI tracing
    langsmith_api_key: str = ""
    langsmith_project: str = "lms-revisions"
    langsmith_endpoint: str = "https://api.smith.langchain.com"
    langsmith_tracing: bool = False
    
    # Timezone for scheduler (e.g., "Asia/Ho_Chi_Minh", "UTC", "America/New_York")
    timezone: str = "Asia/Ho_Chi_Minh"

    model_config = {
        "env_prefix": "LMS_",
        "env_file": Path(__file__).resolve().parent.parent / ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


settings = Settings()
settings.upload_dir.mkdir(parents=True, exist_ok=True)
