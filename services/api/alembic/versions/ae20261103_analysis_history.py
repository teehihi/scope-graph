"""Persist analysis ownership for personal history."""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "ae20261103"
down_revision: Union[str, Sequence[str], None] = "96c0bda12ef4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("session_token_hash", sa.String(length=64), nullable=True))
    op.create_index("ix_users_session_token_hash", "users", ["session_token_hash"])
    op.add_column("users", sa.Column("session_expires_at", sa.DateTime(), nullable=True))
    op.add_column("analysis_runs", sa.Column("requested_by_email", sa.String(length=255), nullable=True))
    op.create_index("ix_analysis_runs_requested_by_email", "analysis_runs", ["requested_by_email"])
    op.add_column("analysis_runs", sa.Column("target_language", sa.String(length=8), nullable=False, server_default="en"))


def downgrade() -> None:
    op.drop_column("analysis_runs", "target_language")
    op.drop_index("ix_analysis_runs_requested_by_email", table_name="analysis_runs")
    op.drop_column("analysis_runs", "requested_by_email")
    op.drop_index("ix_users_session_token_hash", table_name="users")
    op.drop_column("users", "session_expires_at")
    op.drop_column("users", "session_token_hash")
