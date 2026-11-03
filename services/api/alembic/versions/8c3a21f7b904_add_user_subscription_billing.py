"""add user subscription billing state

Revision ID: 8c3a21f7b904
Revises: e63079c32f95
Create Date: 2026-11-03

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "8c3a21f7b904"
down_revision: Union[str, Sequence[str], None] = "e63079c32f95"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_subscriptions",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("plan", sa.String(length=20), nullable=False, server_default="free"),
        sa.Column("stripe_customer_id", sa.String(length=255), nullable=True),
        sa.Column("stripe_subscription_id", sa.String(length=255), nullable=True),
        sa.Column("subscription_status", sa.String(length=50), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_user_subscriptions_email", "user_subscriptions", ["email"], unique=True)
    op.create_index("ix_user_subscriptions_stripe_customer_id", "user_subscriptions", ["stripe_customer_id"])
    op.create_index("ix_user_subscriptions_stripe_subscription_id", "user_subscriptions", ["stripe_subscription_id"])


def downgrade() -> None:
    op.drop_index("ix_user_subscriptions_stripe_subscription_id", table_name="user_subscriptions")
    op.drop_index("ix_user_subscriptions_stripe_customer_id", table_name="user_subscriptions")
    op.drop_index("ix_user_subscriptions_email", table_name="user_subscriptions")
    op.drop_table("user_subscriptions")
