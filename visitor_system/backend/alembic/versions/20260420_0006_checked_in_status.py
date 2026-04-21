"""migrate checked-in appointments to explicit status

Revision ID: 20260420_0006
Revises: 20260420_0005
Create Date: 2026-04-20 14:20:00
"""

from typing import Sequence, Union

from alembic import op


revision: str = "20260420_0006"
down_revision: Union[str, None] = "20260420_0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE appointments
        SET status = 'checked_in'
        WHERE status = 'approved' AND checked_in_at IS NOT NULL
        """
    )


def downgrade() -> None:
    op.execute(
        """
        UPDATE appointments
        SET status = 'approved'
        WHERE status = 'checked_in' AND checked_in_at IS NOT NULL
        """
    )
