"""add job history table

Revision ID: c3d4e5f6g7h8
Revises: b2c3d4e5f6g7
Create Date: 2026-04-05 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c3d4e5f6g7h8'
down_revision: Union[str, None] = 'b2c3d4e5f6g7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'job_history',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('job_id', sa.String(200), nullable=False),
        sa.Column('job_name', sa.String(200), nullable=False),
        sa.Column('tag_name', sa.String(100), nullable=False),
        sa.Column('task_type', sa.String(20), nullable=False),
        sa.Column('status', sa.String(20), nullable=False),
        sa.Column('message', sa.Text(), nullable=False, server_default=''),
        sa.Column('tasks_created', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('executed_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_job_history_executed_at', 'job_history', ['executed_at'])


def downgrade() -> None:
    op.drop_index('ix_job_history_executed_at', 'job_history')
    op.drop_table('job_history')
