"""add madao user roles

Revision ID: 20260420_0005
Revises: 20260410_0004
Create Date: 2026-04-20 09:20:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260420_0005"
down_revision: Union[str, None] = "20260410_0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("users")}

    if "role" not in columns:
        op.add_column(
            "users",
            sa.Column("role", sa.String(length=20), nullable=False, server_default="madao1"),
        )
        op.create_index("ix_users_role", "users", ["role"], unique=False)

    op.execute("UPDATE users SET username = 'madao1' WHERE username = 'admin'")
    op.execute("UPDATE users SET role = 'madao1' WHERE role IS NULL OR role = ''")


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("users")}

    op.execute("UPDATE users SET username = 'admin' WHERE username = 'madao1'")
    if "role" in columns:
        op.drop_index("ix_users_role", table_name="users")
        op.drop_column("users", "role")
