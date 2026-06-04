"""add organization profiles for admin dashboard

Revision ID: 20260603_02
Revises: 20260603_01
Create Date: 2026-06-03
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260603_02"
down_revision = "20260603_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "organization_profiles",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("tenant_id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("auth_email", sa.String(), nullable=False),
        sa.Column("full_name", sa.String(), nullable=True),
        sa.Column("company_name", sa.String(), nullable=True),
        sa.Column("job_title", sa.String(), nullable=True),
        sa.Column("company_size", sa.String(), nullable=True),
        sa.Column("hiring_volume", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default=sa.text("'active'")),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("tenant_id", "user_id", name="uq_organization_profiles_tenant_user"),
    )
    op.create_index("ix_organization_profiles_tenant_id", "organization_profiles", ["tenant_id"], unique=False)
    op.create_index("ix_organization_profiles_user_id", "organization_profiles", ["user_id"], unique=False)
    op.create_index("ix_organization_profiles_company_name", "organization_profiles", ["company_name"], unique=False)
    op.create_index("ix_organization_profiles_auth_email", "organization_profiles", ["auth_email"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_organization_profiles_auth_email", table_name="organization_profiles")
    op.drop_index("ix_organization_profiles_company_name", table_name="organization_profiles")
    op.drop_index("ix_organization_profiles_user_id", table_name="organization_profiles")
    op.drop_index("ix_organization_profiles_tenant_id", table_name="organization_profiles")
    op.drop_table("organization_profiles")
