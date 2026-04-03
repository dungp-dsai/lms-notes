import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String, Table, Text, Column, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


note_tags = Table(
    "note_tags",
    Base.metadata,
    Column("note_id", UUID(as_uuid=True), ForeignKey("notes.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", UUID(as_uuid=True), ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    color: Mapped[str] = mapped_column(String(20), nullable=False, default="#8b5cf6")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    notes: Mapped[list["Note"]] = relationship(secondary=note_tags, back_populates="tags")
    tasks: Mapped[list["Task"]] = relationship(back_populates="tag", cascade="all, delete-orphan")


class Note(Base):
    __tablename__ = "notes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(500), nullable=False, default="Untitled")
    content: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=lambda: datetime.now(timezone.utc)
    )

    images: Mapped[list["Image"]] = relationship(back_populates="note", cascade="all, delete-orphan")
    outgoing_links: Mapped[list["NoteLink"]] = relationship(
        foreign_keys="NoteLink.source_note_id", back_populates="source", cascade="all, delete-orphan"
    )
    incoming_links: Mapped[list["NoteLink"]] = relationship(
        foreign_keys="NoteLink.target_note_id", back_populates="target", cascade="all, delete-orphan"
    )
    tags: Mapped[list["Tag"]] = relationship(secondary=note_tags, back_populates="notes")


class NoteLink(Base):
    __tablename__ = "note_links"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_note_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("notes.id", ondelete="CASCADE"), nullable=False)
    target_note_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("notes.id", ondelete="CASCADE"), nullable=False)

    source: Mapped["Note"] = relationship(foreign_keys=[source_note_id], back_populates="outgoing_links")
    target: Mapped["Note"] = relationship(foreign_keys=[target_note_id], back_populates="incoming_links")


class Image(Base):
    __tablename__ = "images"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    note_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("notes.id", ondelete="CASCADE"), nullable=True)
    filename: Mapped[str] = mapped_column(String(500), nullable=False)
    original_name: Mapped[str] = mapped_column(String(500), nullable=False, default="pasted_image.png")
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False, default="image/png")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    note: Mapped["Note | None"] = relationship(back_populates="images")


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tag_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tags.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    task_type: Mapped[str] = mapped_column(String(20), nullable=False)  # "coding" or "answering"
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")  # "pending" or "completed"
    result: Mapped[str | None] = mapped_column(String(20), nullable=True)  # "correct", "wrong", or null

    # For coding tasks
    language: Mapped[str | None] = mapped_column(String(50), nullable=True)  # e.g., "python", "javascript"
    starter_code: Mapped[str | None] = mapped_column(Text, nullable=True)
    test_code: Mapped[str | None] = mapped_column(Text, nullable=True)

    # For answering tasks
    expected_answer: Mapped[str | None] = mapped_column(Text, nullable=True)

    # User's submission
    user_answer: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=lambda: datetime.now(timezone.utc)
    )

    tag: Mapped["Tag"] = relationship(back_populates="tasks")
