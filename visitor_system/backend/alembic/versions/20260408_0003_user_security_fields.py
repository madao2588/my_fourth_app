"""user security fields

Revision ID: 20260408_0003
Revises: 20260408_0002
Create Date: 2026-04-08 02:30:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260408_0003"
down_revision: Union[str, None] = "20260408_0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("users")}

    if "force_password_change" not in columns:
        op.add_column(
            "users",
            sa.Column(
                "force_password_change",
                sa.Boolean(),
                nullable=False,
                server_default=sa.false(),
            ),
        )
    op.execute("UPDATE users SET force_password_change = 1")


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("users")}
    if "force_password_change" in columns:
        op.drop_column("users", "force_password_change")
