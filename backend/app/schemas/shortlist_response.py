from __future__ import annotations

from typing import Any

from pydantic import BaseModel
from pydantic import Field


class JobSummary(BaseModel):
    company_name: str
    position_title: str
    role: str
    required_skills: list[str]
    must_have_skills: list[str]
    min_experience_years: float
    applied_thresholds: dict[str, Any]


class Counts(BaseModel):
    uploaded: int
    ranked: int
    rejected: int
    failed: int


class CandidateTableRow(BaseModel):
    filename: str | None = None
    rank: int | None = None
    eligible: bool
    fit_score_100: float | None = None
    rejection_reasons: list[str]
    ranking_decision_log: dict[str, Any]
    experience: dict[str, Any]


class FailedRow(BaseModel):
    filename: str | None = None
    error: str | None = None


class ShortlistResponse(BaseModel):
    api_version: str
    scoring_version: str
    policy_version: str
    job_summary: JobSummary
    counts: Counts
    shortlisted: list[CandidateTableRow]
    rejected: list[CandidateTableRow]
    failed: list[FailedRow]
    top_3_insights_from_ranking_decision_log: list[str]
    ranked_candidates: list[dict[str, Any]] = Field(default_factory=list)
    rejected_candidates: list[dict[str, Any]] = Field(default_factory=list)
    failed_candidates: list[dict[str, Any]] = Field(default_factory=list)
