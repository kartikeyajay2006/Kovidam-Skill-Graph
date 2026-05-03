"""baseline schema

Revision ID: 20260503_01
Revises: 
Create Date: 2026-05-03
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260503_01"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "candidates",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("trace_id", sa.String(), nullable=False),
        sa.Column("filename", sa.String(), nullable=False),
        sa.Column("resume_hash", sa.String(), nullable=False, unique=True),
        sa.Column("work_experience_years", sa.Float()),
        sa.Column("github_username", sa.String()),
        sa.Column("codeforces_username", sa.String()),
        sa.Column("leetcode_username", sa.String()),
        sa.Column("codechef_username", sa.String()),
        sa.Column("atcoder_username", sa.String()),
        sa.Column("kaggle_username", sa.String()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_candidates_resume_hash", "candidates", ["resume_hash"], unique=False)
    op.create_index("ix_candidates_trace_id", "candidates", ["trace_id"], unique=False)
    op.create_index("ix_candidates_github_username", "candidates", ["github_username"], unique=False)

    op.create_table(
        "skills",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False, unique=True),
    )
    op.create_index("ix_skills_name", "skills", ["name"], unique=False)

    op.create_table(
        "jobs",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("candidate_id", sa.String(), sa.ForeignKey("candidates.id"), nullable=False),
        sa.Column("company_name", sa.String()),
        sa.Column("position_title", sa.String()),
        sa.Column("role", sa.String(), nullable=False),
        sa.Column("min_experience_years", sa.Float()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_jobs_candidate_id", "jobs", ["candidate_id"], unique=False)

    op.create_table(
        "candidate_scores",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("candidate_id", sa.String(), sa.ForeignKey("candidates.id"), nullable=False),
        sa.Column("skills_match_score", sa.Float()),
        sa.Column("github_score", sa.Float()),
        sa.Column("experience_score", sa.Float()),
        sa.Column("platform_strength_score", sa.Float()),
        sa.Column("project_evidence_score", sa.Float()),
        sa.Column("profile_completeness_score", sa.Float()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("candidate_id", name="uq_candidate_scores_candidate_id"),
    )
    op.create_index("ix_candidate_scores_candidate_id", "candidate_scores", ["candidate_id"], unique=False)

    op.create_table(
        "candidate_job_scores",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("candidate_id", sa.String(), sa.ForeignKey("candidates.id"), nullable=False),
        sa.Column("job_id", sa.String(), sa.ForeignKey("jobs.id"), nullable=False),
        sa.Column("fit_score", sa.Float()),
        sa.Column("ranking_reason", sa.String()),
        sa.Column("notes", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("candidate_id", "job_id", name="uq_candidate_job_scores_candidate_job"),
    )
    op.create_index("ix_candidate_job_scores_candidate_id", "candidate_job_scores", ["candidate_id"], unique=False)
    op.create_index("ix_candidate_job_scores_job_id", "candidate_job_scores", ["job_id"], unique=False)

    op.create_table(
        "candidate_skills",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("candidate_id", sa.String(), sa.ForeignKey("candidates.id"), nullable=False),
        sa.Column("skill_id", sa.String(), sa.ForeignKey("skills.id"), nullable=False),
        sa.Column("status", sa.String()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("candidate_id", "skill_id", name="uq_candidate_skills_candidate_skill"),
    )
    op.create_index("ix_candidate_skills_candidate_id", "candidate_skills", ["candidate_id"], unique=False)
    op.create_index("ix_candidate_skills_skill_id", "candidate_skills", ["skill_id"], unique=False)

    op.create_table(
        "platform_stats",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("candidate_id", sa.String(), sa.ForeignKey("candidates.id"), nullable=False),
        sa.Column("platform", sa.String(), nullable=False),
        sa.Column("username", sa.String()),
        sa.Column("stats", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("candidate_id", "platform", name="uq_platform_stats_candidate_platform"),
    )
    op.create_index("ix_platform_stats_candidate_id", "platform_stats", ["candidate_id"], unique=False)

    op.create_table(
        "candidate_github_summary",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("candidate_id", sa.String(), sa.ForeignKey("candidates.id"), nullable=False),
        sa.Column("repo_count", sa.Integer()),
        sa.Column("overall_score", sa.Float()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("candidate_id", name="uq_candidate_github_summary_candidate_id"),
    )
    op.create_index("ix_candidate_github_summary_candidate_id", "candidate_github_summary", ["candidate_id"], unique=False)

    op.create_table(
        "candidate_github_commits",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("candidate_id", sa.String(), sa.ForeignKey("candidates.id"), nullable=False),
        sa.Column("repo_name", sa.String(), nullable=False),
        sa.Column("commits", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("candidate_id", "repo_name", name="uq_candidate_github_commits_candidate_repo"),
    )
    op.create_index("ix_candidate_github_commits_candidate_id", "candidate_github_commits", ["candidate_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_candidate_github_commits_candidate_id", table_name="candidate_github_commits")
    op.drop_table("candidate_github_commits")
    op.drop_index("ix_candidate_github_summary_candidate_id", table_name="candidate_github_summary")
    op.drop_table("candidate_github_summary")
    op.drop_index("ix_platform_stats_candidate_id", table_name="platform_stats")
    op.drop_table("platform_stats")
    op.drop_index("ix_candidate_skills_skill_id", table_name="candidate_skills")
    op.drop_index("ix_candidate_skills_candidate_id", table_name="candidate_skills")
    op.drop_table("candidate_skills")
    op.drop_index("ix_candidate_job_scores_job_id", table_name="candidate_job_scores")
    op.drop_index("ix_candidate_job_scores_candidate_id", table_name="candidate_job_scores")
    op.drop_table("candidate_job_scores")
    op.drop_index("ix_candidate_scores_candidate_id", table_name="candidate_scores")
    op.drop_table("candidate_scores")
    op.drop_index("ix_jobs_candidate_id", table_name="jobs")
    op.drop_table("jobs")
    op.drop_index("ix_skills_name", table_name="skills")
    op.drop_table("skills")
    op.drop_index("ix_candidates_github_username", table_name="candidates")
    op.drop_index("ix_candidates_trace_id", table_name="candidates")
    op.drop_index("ix_candidates_resume_hash", table_name="candidates")
    op.drop_table("candidates")
