"""store appointment_time as datetime

Revision ID: 20260410_0004
Revises: 20260408_0003
Create Date: 2026-04-10 00:00:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260410_0004"
down_revision: Union[str, None] = "20260408_0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    dialect_name = bind.dialect.name

    if dialect_name == "postgresql":
        op.execute(
            """
            ALTER TABLE appointments
            ALTER COLUMN appointment_time TYPE TIMESTAMP WITH TIME ZONE
            USING appointment_time::timestamptz
            """
        )
        op.create_index(
            "ix_appointments_appointment_time",
            "appointments",
            ["appointment_time"],
            unique=False,
        )
        return

    with op.batch_alter_table("appointments") as batch_op:
        batch_op.alter_column(
            "appointment_time",
            existing_type=sa.String(length=50),
            type_=sa.DateTime(timezone=True),
            existing_nullable=False,
        )
        batch_op.create_index("ix_appointments_appointment_time", ["appointment_time"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    dialect_name = bind.dialect.name

    if dialect_name == "postgresql":
        op.drop_index("ix_appointments_appointment_time", table_name="appointments")
        op.execute(
            """
            ALTER TABLE appointments
            ALTER COLUMN appointment_time TYPE VARCHAR(50)
            USING to_char(appointment_time AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SSOF')
            """
        )
        return

    with op.batch_alter_table("appointments") as batch_op:
        batch_op.drop_index("ix_appointments_appointment_time")
        batch_op.alter_column(
            "appointment_time",
            existing_type=sa.DateTime(timezone=True),
            type_=sa.String(length=50),
            existing_nullable=False,
        )
