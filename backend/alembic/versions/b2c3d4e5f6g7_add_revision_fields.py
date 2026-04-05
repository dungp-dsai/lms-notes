"""add revision fields to notes and tasks

Revision ID: b2c3d4e5f6g7
Revises: a1b2c3d4e5f6
Create Date: 2026-04-05 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6g7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add revision_count to notes table
    op.add_column('notes', sa.Column('revision_count', sa.Integer(), nullable=False, server_default='0'))
    
    # Add revising task fields to tasks table
    op.add_column('tasks', sa.Column('note_id', sa.UUID(), nullable=True))
    op.add_column('tasks', sa.Column('revision_explanation', sa.Text(), nullable=True))
    op.add_column('tasks', sa.Column('original_note_content', sa.Text(), nullable=True))
    
    # Add foreign key constraint
    op.create_foreign_key(
        'fk_tasks_note_id',
        'tasks', 'notes',
        ['note_id'], ['id'],
        ondelete='CASCADE'
    )


def downgrade() -> None:
    op.drop_constraint('fk_tasks_note_id', 'tasks', type_='foreignkey')
    op.drop_column('tasks', 'original_note_content')
    op.drop_column('tasks', 'revision_explanation')
    op.drop_column('tasks', 'note_id')
    op.drop_column('notes', 'revision_count')
