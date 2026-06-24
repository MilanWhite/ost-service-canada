"""Require vehicle VINs to be unique.

Revision ID: 20260623_unique_vehicle_vin
Revises: 20260621_base_schema
Create Date: 2026-06-23
"""

from alembic import op


revision = "20260623_unique_vehicle_vin"
down_revision = "20260621_base_schema"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        """
        DELETE FROM vehicles duplicate
        USING vehicles original
        WHERE duplicate.vin = original.vin
          AND duplicate.id > original.id
        """
    )
    op.create_unique_constraint(
        "uq_vehicles_vin",
        "vehicles",
        ["vin"],
    )


def downgrade():
    op.drop_constraint(
        "uq_vehicles_vin",
        "vehicles",
        type_="unique",
    )
