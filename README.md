# LMS Notes

An Obsidian-like note-taking web app with a React frontend, FastAPI backend, and PostgreSQL database.

## Features

- **Rich Markdown Editor** — TipTap-based editor with formatting toolbar, headings, lists, task lists, blockquotes, code blocks
- **Image Paste** — Paste screenshots directly from the clipboard (Ctrl/Cmd+V); images upload automatically
- **Wiki Links** — Type `[[` to search and link to other notes; click links to navigate
- **Backlinks** — See which notes link to the current note
- **Auto-save** — Content saves automatically 500ms after you stop typing
- **Search** — Filter notes by title from the sidebar

## Prerequisites

- Node.js 18+
- Python 3.11+
- Docker (for PostgreSQL)

## Quick Start

### 1. Start PostgreSQL

```bash
docker compose up -d db
```

### 2. Start the Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

### 3. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

## Project Structure

```
lms/
├── frontend/          # React + Vite + TypeScript
│   └── src/
│       ├── components/
│       │   ├── editor/    # TipTap editor, toolbar, wiki-link extension
│       │   ├── layout/    # Sidebar, AppLayout
│       │   └── ui/        # shadcn-style components
│       ├── hooks/         # TanStack Query hooks
│       └── lib/           # API client, utils
├── backend/           # FastAPI + SQLAlchemy
│   ├── app/
│   │   ├── routers/   # notes, images endpoints
│   │   ├── services/  # business logic, link parser
│   │   └── models.py  # SQLAlchemy models
│   ├── alembic/       # database migrations
│   └── uploads/       # stored images
└── docker-compose.yml # PostgreSQL
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `LMS_DATABASE_URL` | `postgresql+asyncpg://lms:lms_secret@localhost:5433/lms` | Database connection URL |
| `LMS_UPLOAD_DIR` | `backend/uploads` | Image upload directory |
