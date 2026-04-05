"""add_quantity_to_tag_settings

Revision ID: a1b2c3d4e5f6
Revises: 733b302355c5
Create Date: 2026-04-05 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '733b302355c5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('tag_settings', sa.Column('coding_quantity', sa.Integer(), nullable=False, server_default='1'))
    op.add_column('tag_settings', sa.Column('answering_quantity', sa.Integer(), nullable=False, server_default='1'))
    op.add_column('tag_settings', sa.Column('revising_quantity', sa.Integer(), nullable=False, server_default='3'))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('tag_settings', 'revising_quantity')
    op.drop_column('tag_settings', 'answering_quantity')
    op.drop_column('tag_settings', 'coding_quantity')
