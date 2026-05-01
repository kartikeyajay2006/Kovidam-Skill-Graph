from sqlalchemy import Column, String, Float, JSON, ForeignKey, Integer
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class candidates(Base):
    __tablename__ = "candidates"
    id = Column(String, primary_key=True)
    trace_id = Column(String)
    filename = Column(String)
    resume_hash = Column(String, unique=True)
    work_experience_years = Column(Float)
    github_username = Column(String)
    codeforces_username = Column(String)
    leetcode_username = Column(String)
    codechef_username = Column(String)
    atcoder_username = Column(String)
    kaggle_username = Column(String)

class jobs(Base):
    __tablename__ = "jobs"
    id = Column(String, primary_key=True)
    company_name = Column(String)
    position_title = Column(String)
    role = Column(String)
    min_experience_years = Column(Float)

class candidate_job_scores(Base):
    __tablename__ = "candidate_job_scores"
    id = Column(String, primary_key=True)
    candidate_id = Column(String, ForeignKey("candidates.id"))
    job_id = Column(String, ForeignKey("jobs.id"))
    fit_score = Column(Float)
    ranking_reason = Column(String)
    notes = Column(JSON)

class candidate_scores(Base):
    __tablename__ = "candidate_scores"
    id = Column(String, primary_key=True)
    candidate_id = Column(String, ForeignKey("candidates.id"))
    skills_match_score = Column(Float)
    github_score = Column(Float)
    experience_score = Column(Float)
    platform_strength_score = Column(Float)
    project_evidence_score = Column(Float)
    profile_completeness_score = Column(Float)

class skills(Base):
    __tablename__ = "skills"
    id = Column(String, primary_key=True)
    name = Column(String, unique=True)

class candidate_skills(Base):
    __tablename__ = "candidate_skills"
    id = Column(String, primary_key=True)
    candidate_id = Column(String, ForeignKey("candidates.id"))
    skill_id = Column(String, ForeignKey("skills.id"))
    status = Column(String)

class platform_stats(Base):
    __tablename__ = "platform_stats"
    id = Column(String, primary_key=True)
    candidate_id = Column(String, ForeignKey("candidates.id"))
    platform = Column(String)
    username = Column(String)
    stats = Column(JSON)

class candidate_github_summary(Base):
    __tablename__ = "candidate_github_summary"
    id = Column(String, primary_key=True)
    candidate_id = Column(String, ForeignKey("candidates.id"))
    repo_count = Column(Integer)
    overall_score = Column(Float)

class candidate_github_commits(Base):
    __tablename__ = "candidate_github_commits"
    id = Column(String, primary_key=True)
    candidate_id = Column(String, ForeignKey("candidates.id"))
    repo_name = Column(String)
    commits = Column(JSON)
