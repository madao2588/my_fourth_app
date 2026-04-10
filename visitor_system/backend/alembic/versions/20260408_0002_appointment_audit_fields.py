"""appointment audit fields

Revision ID: 20260408_0002
Revises: 20260408_0001
Create Date: 2026-04-08 01:00:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260408_0002"
down_revision: Union[str, None] = "20260408_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("appointments", sa.Column("approved_by", sa.String(length=50), nullable=True))
    op.add_column("appointments", sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("appointments", sa.Column("checked_in_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("appointments", sa.Column("expired_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("appointments", "expired_at")
    op.drop_column("appointments", "checked_in_at")
    op.drop_column("appointments", "approved_at")
    op.drop_column("appointments", "approved_by")
