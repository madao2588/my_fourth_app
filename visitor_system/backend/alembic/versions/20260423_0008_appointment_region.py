"""add appointment region field

Revision ID: 20260423_0008
Revises: 20260421_0007
Create Date: 2026-04-23 16:15:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260423_0008"
down_revision: Union[str, None] = "20260421_0007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("appointments")}

    if "region" not in columns:
        op.add_column(
            "appointments",
            sa.Column("region", sa.String(length=50), nullable=False, server_default=""),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("appointments")}

    if "region" in columns:
        op.drop_column("appointments", "region")
