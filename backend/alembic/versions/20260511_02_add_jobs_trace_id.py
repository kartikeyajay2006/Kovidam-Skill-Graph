"""add trace_id to jobs

Revision ID: 20260511_02
Revises: 20260503_01
Create Date: 2026-05-11
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260511_02"
down_revision = "20260503_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("jobs", sa.Column("trace_id", sa.String(), nullable=True))
    op.create_index("ix_jobs_trace_id", "jobs", ["trace_id"], unique=False)

    # Backfill trace_id for existing rows from candidates table.
    op.execute(
        sa.text(
            """
            UPDATE jobs
            SET trace_id = candidates.trace_id
            FROM candidates
            WHERE jobs.candidate_id = candidates.id
              AND jobs.trace_id IS NULL
            """
        )
    )


def downgrade() -> None:
    op.drop_index("ix_jobs_trace_id", table_name="jobs")
    op.drop_column("jobs", "trace_id")
