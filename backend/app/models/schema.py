from sqlalchemy import Column, String, Float, JSON, ForeignKey, Integer, DateTime, UniqueConstraint, Index
from sqlalchemy.orm import declarative_base
from sqlalchemy.sql import func

Base = declarative_base()


class Candidate(Base):
    __tablename__ = "candidates"
    __table_args__ = (
        UniqueConstraint("tenant_id", "user_id", "resume_hash", name="uq_candidates_tenant_user_resume_hash"),
        Index("ix_candidates_tenant_id", "tenant_id"),
        Index("ix_candidates_user_id", "user_id"),
        Index("ix_candidates_trace_id", "trace_id"),
        Index("ix_candidates_github_username", "github_username"),
    )

    id = Column(String, primary_key=True)
    tenant_id = Column(String, nullable=False)
    user_id = Column(String, nullable=False)
    trace_id = Column(String, nullable=False)
    filename = Column(String, nullable=False)
    resume_hash = Column(String, nullable=False, index=True)
    work_experience_years = Column(Float)
    github_username = Column(String)
    codeforces_username = Column(String)
    leetcode_username = Column(String)
    codechef_username = Column(String)
    atcoder_username = Column(String)
    kaggle_username = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class Job(Base):
    __tablename__ = "jobs"
    __table_args__ = (
        Index("ix_jobs_tenant_id", "tenant_id"),
        Index("ix_jobs_user_id", "user_id"),
        Index("ix_jobs_candidate_id", "candidate_id"),
        Index("ix_jobs_trace_id", "trace_id"),
    )

    id = Column(String, primary_key=True)
    tenant_id = Column(String, nullable=False)
    user_id = Column(String, nullable=False)
    candidate_id = Column(String, ForeignKey("candidates.id"), nullable=False)
    trace_id = Column(String, index=True)
    company_name = Column(String)
    position_title = Column(String)
    role = Column(String, nullable=False)
    min_experience_years = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class CandidateJobScore(Base):
    __tablename__ = "candidate_job_scores"
    __table_args__ = (
        UniqueConstraint("candidate_id", "job_id", name="uq_candidate_job_scores_candidate_job"),
        Index("ix_candidate_job_scores_candidate_id", "candidate_id"),
        Index("ix_candidate_job_scores_job_id", "job_id"),
    )

    id = Column(String, primary_key=True)
    candidate_id = Column(String, ForeignKey("candidates.id"), nullable=False)
    job_id = Column(String, ForeignKey("jobs.id"), nullable=False)
    fit_score = Column(Float)
    ranking_reason = Column(String)
    notes = Column(JSON, nullable=False, default=list)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class CandidateScore(Base):
    __tablename__ = "candidate_scores"
    __table_args__ = (
        UniqueConstraint("candidate_id", name="uq_candidate_scores_candidate_id"),
        Index("ix_candidate_scores_candidate_id", "candidate_id"),
    )

    id = Column(String, primary_key=True)
    candidate_id = Column(String, ForeignKey("candidates.id"), nullable=False)
    skills_match_score = Column(Float)
    github_score = Column(Float)
    experience_score = Column(Float)
    platform_strength_score = Column(Float)
    project_evidence_score = Column(Float)
    profile_completeness_score = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Skill(Base):
    __tablename__ = "skills"

    id = Column(String, primary_key=True)
    name = Column(String, unique=True, nullable=False, index=True)


class CandidateSkill(Base):
    __tablename__ = "candidate_skills"
    __table_args__ = (
        UniqueConstraint("candidate_id", "skill_id", name="uq_candidate_skills_candidate_skill"),
        Index("ix_candidate_skills_candidate_id", "candidate_id"),
        Index("ix_candidate_skills_skill_id", "skill_id"),
    )

    id = Column(String, primary_key=True)
    candidate_id = Column(String, ForeignKey("candidates.id"), nullable=False)
    skill_id = Column(String, ForeignKey("skills.id"), nullable=False)
    status = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class PlatformStat(Base):
    __tablename__ = "platform_stats"
    __table_args__ = (
        UniqueConstraint("candidate_id", "platform", name="uq_platform_stats_candidate_platform"),
        Index("ix_platform_stats_candidate_id", "candidate_id"),
    )

    id = Column(String, primary_key=True)
    candidate_id = Column(String, ForeignKey("candidates.id"), nullable=False)
    platform = Column(String, nullable=False)
    username = Column(String)
    stats = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class CandidateGithubSummary(Base):
    __tablename__ = "candidate_github_summary"
    __table_args__ = (
        UniqueConstraint("candidate_id", name="uq_candidate_github_summary_candidate_id"),
        Index("ix_candidate_github_summary_candidate_id", "candidate_id"),
    )

    id = Column(String, primary_key=True)
    candidate_id = Column(String, ForeignKey("candidates.id"), nullable=False)
    repo_count = Column(Integer)
    overall_score = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class CandidateGithubCommit(Base):
    __tablename__ = "candidate_github_commits"
    __table_args__ = (
        UniqueConstraint("candidate_id", "repo_name", name="uq_candidate_github_commits_candidate_repo"),
        Index("ix_candidate_github_commits_candidate_id", "candidate_id"),
    )

    id = Column(String, primary_key=True)
    candidate_id = Column(String, ForeignKey("candidates.id"), nullable=False)
    repo_name = Column(String, nullable=False)
    commits = Column(JSON, nullable=False, default=list)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class ShortlistRun(Base):
    __tablename__ = "shortlist_runs"
    __table_args__ = (
        UniqueConstraint("tenant_id", "user_id", "trace_id", name="uq_shortlist_runs_tenant_user_trace"),
        Index("ix_shortlist_runs_tenant_id", "tenant_id"),
        Index("ix_shortlist_runs_user_id", "user_id"),
        Index("ix_shortlist_runs_trace_id", "trace_id"),
    )

    id = Column(String, primary_key=True)
    tenant_id = Column(String, nullable=False)
    user_id = Column(String, nullable=False)
    trace_id = Column(String, nullable=False)
    job_summary = Column(JSON, nullable=False, default=dict)
    response_json = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class OrganizationProfile(Base):
    __tablename__ = "organization_profiles"
    __table_args__ = (
        UniqueConstraint("tenant_id", "user_id", name="uq_organization_profiles_tenant_user"),
        Index("ix_organization_profiles_tenant_id", "tenant_id"),
        Index("ix_organization_profiles_user_id", "user_id"),
        Index("ix_organization_profiles_company_name", "company_name"),
    )

    id = Column(String, primary_key=True)
    tenant_id = Column(String, nullable=False)
    user_id = Column(String, nullable=False)
    auth_email = Column(String, nullable=False, index=True)
    full_name = Column(String)
    company_name = Column(String)
    job_title = Column(String)
    company_size = Column(String)
    hiring_volume = Column(String)
    status = Column(String, nullable=False, default="active")
    credits = Column(Integer, nullable=False, default=10, server_default="10")
    last_seen_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


# Backward-compatible aliases for existing imports.
candidates = Candidate
jobs = Job
candidate_job_scores = CandidateJobScore
candidate_scores = CandidateScore
skills = Skill
candidate_skills = CandidateSkill
platform_stats = PlatformStat
candidate_github_summary = CandidateGithubSummary
candidate_github_commits = CandidateGithubCommit
shortlist_runs = ShortlistRun
organization_profiles = OrganizationProfile


class PaymentTransaction(Base):
    __tablename__ = "payment_transactions"

    id = Column(String, primary_key=True)
    tenant_id = Column(String, nullable=False)
    user_id = Column(String, nullable=False)
    email = Column(String, nullable=False)
    payment_id = Column(String, nullable=False)
    order_id = Column(String, nullable=False)
    plan_id = Column(String, nullable=False)
    amount = Column(Integer, nullable=False) # Rupees
    credits = Column(Integer, nullable=False)
    status = Column(String, default="pending", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

payment_transactions = PaymentTransaction

