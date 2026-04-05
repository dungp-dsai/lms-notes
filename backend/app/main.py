import os
import sys
from contextlib import asynccontextmanager

# Set up LangSmith env vars BEFORE any other imports
# This must happen before langchain is imported anywhere
from .config import settings

if settings.openai_api_key:
    os.environ["OPENAI_API_KEY"] = settings.openai_api_key

if settings.langsmith_api_key:
    os.environ["LANGSMITH_TRACING"] = "true" if settings.langsmith_tracing else "false"
    os.environ["LANGSMITH_API_KEY"] = settings.langsmith_api_key
    os.environ["LANGSMITH_PROJECT"] = settings.langsmith_project
    os.environ["LANGSMITH_ENDPOINT"] = settings.langsmith_endpoint
    sys.stderr.write(f"INFO:     LangSmith configured: project={settings.langsmith_project}, tracing={settings.langsmith_tracing}\n")
    sys.stderr.flush()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .routers import images, notes, tags, tasks, settings as settings_router, scheduler
from .services.scheduler_service import start_scheduler, stop_scheduler, sync_jobs_from_settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduler()
    await sync_jobs_from_settings()
    yield
    stop_scheduler()


app = FastAPI(title="LMS Notes API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.allowed_origins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(notes.router, prefix="/api")
app.include_router(images.router, prefix="/api")
app.include_router(tags.router, prefix="/api")
app.include_router(tasks.router, prefix="/api")
app.include_router(settings_router.router, prefix="/api")
app.include_router(scheduler.router, prefix="/api")

app.mount("/uploads", StaticFiles(directory=str(settings.upload_dir)), name="uploads")


@app.get("/api/health")
async def health():
    return {"status": "ok"}
