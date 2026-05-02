from pydantic import BaseModel
from typing import Any


class ArtifactRef(BaseModel):
    artifact_id: str
    relative_path: str


class CandidateV2(BaseModel):
    filename: str
    status: str
    decision_confidence: float | None = None
    fit_score_100: float | None = None
    score_version: str | None = None
    evidence_trace: dict[str, Any] | None = None
    artifact: ArtifactRef | None = None
