"""add tenant isolation columns and constraints

Revision ID: 20260511_03
Revises: 20260511_02
Create Date: 2026-05-11
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260511_03"
down_revision = "20260511_02"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("candidates", sa.Column("tenant_id", sa.String(), nullable=True))
    op.add_column("jobs", sa.Column("tenant_id", sa.String(), nullable=True))

    # Backfill existing rows into a default tenant for backward compatibility.
    op.execute(sa.text("UPDATE candidates SET tenant_id = 'default' WHERE tenant_id IS NULL"))
    op.execute(
        sa.text(
            """
            UPDATE jobs
            SET tenant_id = candidates.tenant_id
            FROM candidates
            WHERE jobs.candidate_id = candidates.id
              AND jobs.tenant_id IS NULL
            """
        )
    )
    op.execute(sa.text("UPDATE jobs SET tenant_id = 'default' WHERE tenant_id IS NULL"))

    op.alter_column("candidates", "tenant_id", nullable=False)
    op.alter_column("jobs", "tenant_id", nullable=False)

    # Replace global resume_hash uniqueness with tenant-scoped uniqueness.
    op.drop_constraint("candidates_resume_hash_key", "candidates", type_="unique")
    op.create_unique_constraint(
        "uq_candidates_tenant_resume_hash",
        "candidates",
        ["tenant_id", "resume_hash"],
    )

    op.create_index("ix_candidates_tenant_id", "candidates", ["tenant_id"], unique=False)
    op.create_index("ix_jobs_tenant_id", "jobs", ["tenant_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_jobs_tenant_id", table_name="jobs")
    op.drop_index("ix_candidates_tenant_id", table_name="candidates")
    op.drop_constraint("uq_candidates_tenant_resume_hash", "candidates", type_="unique")
    op.create_unique_constraint("candidates_resume_hash_key", "candidates", ["resume_hash"])
    op.drop_column("jobs", "tenant_id")
    op.drop_column("candidates", "tenant_id")
