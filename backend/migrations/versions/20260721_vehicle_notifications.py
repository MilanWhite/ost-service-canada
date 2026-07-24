"""Add vehicle notification preferences and attempts.

Revision ID: 20260721_vehicle_notifications
Revises: 20260623_unique_vehicle_vin
Create Date: 2026-07-21
"""

from alembic import op
import sqlalchemy as sa


revision = "20260721_vehicle_notifications"
down_revision = "20260623_unique_vehicle_vin"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "users",
        sa.Column("email_notifications_enabled", sa.Boolean(), server_default=sa.true(), nullable=False),
    )
    op.add_column(
        "users",
        sa.Column("notification_language", sa.String(length=2), server_default="en", nullable=False),
    )
    op.create_check_constraint(
        "ck_users_notification_language",
        "users",
        "notification_language IN ('en', 'ru', 'uk')",
    )
    op.add_column("vehicles", sa.Column("has_keys", sa.Boolean(), nullable=True))
    op.create_table(
        "vehicle_notification_attempts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("vehicle_id", sa.Integer(), nullable=False),
        sa.Column("request_id", sa.String(length=64), nullable=False),
        sa.Column("event_type", sa.String(length=40), nullable=False),
        sa.Column("recipient_email", sa.String(length=255), nullable=False),
        sa.Column("language", sa.String(length=2), server_default="en", nullable=False),
        sa.Column("status", sa.String(length=20), server_default="claimed", nullable=False),
        sa.Column("provider_message_id", sa.String(length=255), nullable=True),
        sa.Column("error_summary", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.CheckConstraint(
            "event_type IN ('delivery', 'bill_of_lading', 'delivery_and_bill_of_lading')",
            name="ck_vehicle_notification_attempts_event_type",
        ),
        sa.CheckConstraint(
            "status IN ('claimed', 'sent', 'failed')",
            name="ck_vehicle_notification_attempts_status",
        ),
        sa.ForeignKeyConstraint(["vehicle_id"], ["vehicles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("request_id"),
    )
    op.create_index(
        "ix_vehicle_notification_attempts_vehicle_id",
        "vehicle_notification_attempts",
        ["vehicle_id"],
    )


def downgrade():
    op.drop_index("ix_vehicle_notification_attempts_vehicle_id", table_name="vehicle_notification_attempts")
    op.drop_table("vehicle_notification_attempts")
    op.drop_column("vehicles", "has_keys")
    op.drop_constraint("ck_users_notification_language", "users", type_="check")
    op.drop_column("users", "notification_language")
    op.drop_column("users", "email_notifications_enabled")
