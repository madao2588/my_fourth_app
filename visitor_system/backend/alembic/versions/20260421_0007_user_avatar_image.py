"""add persisted admin avatar image

Revision ID: 20260421_0007
Revises: 20260420_0006
Create Date: 2026-04-21 16:20:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260421_0007"
down_revision: Union[str, None] = "20260420_0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("users")}

    if "avatar_image" not in columns:
        op.add_column("users", sa.Column("avatar_image", sa.Text(), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("users")}

    if "avatar_image" in columns:
        op.drop_column("users", "avatar_image")
