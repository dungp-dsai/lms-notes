"""Add coding_count and answering_count to notes

Revision ID: d4e5f6g7h8i9
Revises: c3d4e5f6g7h8
Create Date: 2026-04-06

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd4e5f6g7h8i9'
down_revision: Union[str, None] = 'c3d4e5f6g7h8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('notes', sa.Column('coding_count', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('notes', sa.Column('answering_count', sa.Integer(), nullable=False, server_default='0'))


def downgrade() -> None:
    op.drop_column('notes', 'answering_count')
    op.drop_column('notes', 'coding_count')
