"""add persisted shortlist runs

Revision ID: 20260603_01
Revises: 20260527_01
Create Date: 2026-06-03
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260603_01"
down_revision = "20260527_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "shortlist_runs",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("tenant_id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("trace_id", sa.String(), nullable=False),
        sa.Column("job_summary", sa.JSON(), nullable=False, server_default=sa.text("'{}'::json")),
        sa.Column("response_json", sa.JSON(), nullable=False, server_default=sa.text("'{}'::json")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("tenant_id", "user_id", "trace_id", name="uq_shortlist_runs_tenant_user_trace"),
    )
    op.create_index("ix_shortlist_runs_tenant_id", "shortlist_runs", ["tenant_id"], unique=False)
    op.create_index("ix_shortlist_runs_user_id", "shortlist_runs", ["user_id"], unique=False)
    op.create_index("ix_shortlist_runs_trace_id", "shortlist_runs", ["trace_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_shortlist_runs_trace_id", table_name="shortlist_runs")
    op.drop_index("ix_shortlist_runs_user_id", table_name="shortlist_runs")
    op.drop_index("ix_shortlist_runs_tenant_id", table_name="shortlist_runs")
    op.drop_table("shortlist_runs")
