"""add user isolation columns and constraints

Revision ID: 20260527_01
Revises: 20260511_03
Create Date: 2026-05-27
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260527_01"
down_revision = "20260511_03"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    candidate_columns = {col["name"] for col in inspector.get_columns("candidates")}
    job_columns = {col["name"] for col in inspector.get_columns("jobs")}

    if "user_id" not in candidate_columns:
        op.add_column("candidates", sa.Column("user_id", sa.String(), nullable=True))
    if "user_id" not in job_columns:
        op.add_column("jobs", sa.Column("user_id", sa.String(), nullable=True))

    # Backfill existing rows to a legacy owner bucket.
    op.execute(sa.text("UPDATE candidates SET user_id = 'legacy-user' WHERE user_id IS NULL"))
    op.execute(
        sa.text(
            """
            UPDATE jobs
            SET user_id = candidates.user_id
            FROM candidates
            WHERE jobs.candidate_id = candidates.id
              AND jobs.user_id IS NULL
            """
        )
    )
    op.execute(sa.text("UPDATE jobs SET user_id = 'legacy-user' WHERE user_id IS NULL"))

    op.alter_column("candidates", "user_id", nullable=False)
    op.alter_column("jobs", "user_id", nullable=False)

    candidate_indexes = {idx["name"] for idx in inspector.get_indexes("candidates")}
    job_indexes = {idx["name"] for idx in inspector.get_indexes("jobs")}
    candidate_unique_constraints = {uq["name"] for uq in inspector.get_unique_constraints("candidates")}

    if "uq_candidates_tenant_resume_hash" in candidate_unique_constraints:
        op.drop_constraint("uq_candidates_tenant_resume_hash", "candidates", type_="unique")
    if "uq_candidates_tenant_user_resume_hash" not in candidate_unique_constraints:
        op.create_unique_constraint(
            "uq_candidates_tenant_user_resume_hash",
            "candidates",
            ["tenant_id", "user_id", "resume_hash"],
        )

    if "ix_candidates_user_id" not in candidate_indexes:
        op.create_index("ix_candidates_user_id", "candidates", ["user_id"], unique=False)
    if "ix_jobs_user_id" not in job_indexes:
        op.create_index("ix_jobs_user_id", "jobs", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_jobs_user_id", table_name="jobs")
    op.drop_index("ix_candidates_user_id", table_name="candidates")
    op.drop_constraint("uq_candidates_tenant_user_resume_hash", "candidates", type_="unique")
    op.create_unique_constraint(
        "uq_candidates_tenant_resume_hash",
        "candidates",
        ["tenant_id", "resume_hash"],
    )
    op.drop_column("jobs", "user_id")
    op.drop_column("candidates", "user_id")
