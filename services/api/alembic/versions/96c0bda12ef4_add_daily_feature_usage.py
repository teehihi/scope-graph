"""add daily feature usage metering

Revision ID: 96c0bda12ef4
Revises: 8c3a21f7b904
Create Date: 2026-11-03

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "96c0bda12ef4"
down_revision: Union[str, Sequence[str], None] = "8c3a21f7b904"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "feature_usage",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("owner_key", sa.String(length=255), nullable=False),
        sa.Column("feature", sa.String(length=30), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_feature_usage_owner_key", "feature_usage", ["owner_key"])
    op.create_index("ix_feature_usage_feature", "feature_usage", ["feature"])
    op.create_index("ix_feature_usage_created_at", "feature_usage", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_feature_usage_created_at", table_name="feature_usage")
    op.drop_index("ix_feature_usage_feature", table_name="feature_usage")
    op.drop_index("ix_feature_usage_owner_key", table_name="feature_usage")
    op.drop_table("feature_usage")
