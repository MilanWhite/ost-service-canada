"""Create the baseline application schema.

Revision ID: 20260621_base_schema
Revises:
Create Date: 2026-06-21
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260621_base_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "users",
        sa.Column("cognito_sub", sa.String(length=255), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("phone_number", sa.String(length=20), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("cognito_sub"),
        sa.UniqueConstraint("email"),
    )
    op.create_index(
        "ix_users_created_at",
        "users",
        ["created_at"],
        unique=False,
    )

    op.create_table(
        "vehicles",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column(
            "vehicle_name",
            sa.String(length=350),
            sa.Computed(
                "trim(coalesce(model_year, '') || ' ' || coalesce(make, '') || ' ' || coalesce(model, '') || ' ' || vin)",
                persisted=True,
            ),
            nullable=True,
        ),
        sa.Column("lot_number", sa.String(length=50), nullable=True),
        sa.Column("auction_name", sa.String(length=100), nullable=True),
        sa.Column("location", sa.String(length=100), nullable=True),
        sa.Column(
            "shipping_status",
            sa.String(length=20),
            server_default=sa.text("'Not delivered'"),
            nullable=False,
        ),
        sa.Column("price_delivery", sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column("price_shipping", sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column("vin", sa.CHAR(length=17), nullable=False),
        sa.Column("model_year", sa.String(length=10), nullable=True),
        sa.Column("make", sa.String(length=100), nullable=True),
        sa.Column("powertrain", sa.String(length=50), nullable=True),
        sa.Column("model", sa.String(length=100), nullable=True),
        sa.Column("color", sa.String(length=30), nullable=True),
        sa.Column("cognito_sub", sa.String(length=255), nullable=False),
        sa.Column("user_email", sa.String(length=100), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("container_number", sa.String(length=20), nullable=True),
        sa.Column("port_of_origin", sa.String(length=100), nullable=True),
        sa.Column("port_of_destination", sa.String(length=100), nullable=True),
        sa.Column("destination", sa.String(length=100), nullable=True),
        sa.Column("etd", sa.Date(), nullable=True),
        sa.Column("eta", sa.Date(), nullable=True),
        sa.Column("delivery_address", sa.Text(), nullable=True),
        sa.Column("receiver_id", sa.String(length=255), nullable=True),
        sa.Column(
            "image_order",
            postgresql.ARRAY(sa.TEXT()),
            nullable=False,
        ),
        sa.CheckConstraint(
            "shipping_status IN ('Delivered', 'Not delivered')",
            name="ck_vehicles_shipping_status",
        ),
        sa.ForeignKeyConstraint(
            ["cognito_sub"],
            ["users.cognito_sub"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_vehicles_cognito_sub_created_at",
        "vehicles",
        ["cognito_sub", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_vehicles_cognito_sub_shipping_status_created_at",
        "vehicles",
        ["cognito_sub", "shipping_status", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_vehicles_created_at",
        "vehicles",
        ["created_at"],
        unique=False,
    )

    op.create_table(
        "vehicle_images",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("vehicle_id", sa.Integer(), nullable=False),
        sa.Column("original_filename", sa.String(length=255), nullable=False),
        sa.Column(
            "sort_order",
            sa.Integer(),
            server_default=sa.text("0"),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(
            ["vehicle_id"],
            ["vehicles.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_vehicle_images_vehicle_id",
        "vehicle_images",
        ["vehicle_id"],
        unique=False,
    )

    op.create_table(
        "vehicle_image_variants",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("vehicle_image_id", sa.Integer(), nullable=False),
        sa.Column("variant", sa.String(length=20), nullable=False),
        sa.Column("s3_key", sa.Text(), nullable=False),
        sa.Column("width", sa.Integer(), nullable=True),
        sa.Column("height", sa.Integer(), nullable=True),
        sa.Column("content_type", sa.String(length=100), nullable=True),
        sa.Column("size_bytes", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(
            ["vehicle_image_id"],
            ["vehicle_images.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("s3_key"),
        sa.UniqueConstraint(
            "vehicle_image_id",
            "variant",
            name="uq_vehicle_image_variants_image_variant",
        ),
    )

    op.create_table(
        "vehicle_media",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("vehicle_id", sa.Integer(), nullable=False),
        sa.Column("media_type", sa.String(length=20), nullable=False),
        sa.Column("s3_key", sa.Text(), nullable=False),
        sa.Column("original_filename", sa.String(length=255), nullable=True),
        sa.Column("document_type", sa.String(length=80), nullable=True),
        sa.Column("variant", sa.String(length=20), nullable=True),
        sa.Column("content_type", sa.String(length=100), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(
            ["vehicle_id"],
            ["vehicles.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("s3_key"),
    )
    op.create_index(
        "ix_vehicle_media_vehicle_id",
        "vehicle_media",
        ["vehicle_id"],
        unique=False,
    )


def downgrade():
    op.drop_index(
        "ix_vehicle_media_vehicle_id",
        table_name="vehicle_media",
    )
    op.drop_table("vehicle_media")

    op.drop_table("vehicle_image_variants")

    op.drop_index(
        "ix_vehicle_images_vehicle_id",
        table_name="vehicle_images",
    )
    op.drop_table("vehicle_images")

    op.drop_index("ix_vehicles_created_at", table_name="vehicles")
    op.drop_index(
        "ix_vehicles_cognito_sub_shipping_status_created_at",
        table_name="vehicles",
    )
    op.drop_index(
        "ix_vehicles_cognito_sub_created_at",
        table_name="vehicles",
    )
    op.drop_table("vehicles")

    op.drop_index("ix_users_created_at", table_name="users")
    op.drop_table("users")
