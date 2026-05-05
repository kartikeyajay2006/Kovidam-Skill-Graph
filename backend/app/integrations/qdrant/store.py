import hashlib
import logging
import os
import re
import uuid
from typing import Any

from app.constants.skills_aliases import SKILL_ALIASES
from app.constants.skills_implications import SKILL_IMPLICATIONS

try:
    from qdrant_client import QdrantClient
    from qdrant_client.http import models as qmodels
except Exception:  # pragma: no cover - optional dependency at runtime
    QdrantClient = None
    qmodels = None

logger = logging.getLogger("kovidam.qdrant")


def _normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", (value or "").strip().lower())


def _canonical_skill(skill: str) -> str:
    norm = _normalize_text(skill)
    return SKILL_ALIASES.get(norm, norm)


def _expand_skill_with_implications(skill: str) -> set[str]:
    expanded = set()
    queue = [_canonical_skill(skill)]
    while queue:
        current = queue.pop()
        if not current or current in expanded:
            continue
        expanded.add(current)
        for implied in SKILL_IMPLICATIONS.get(current, set()):
            canon_implied = _canonical_skill(implied)
            if canon_implied and canon_implied not in expanded:
                queue.append(canon_implied)
    return expanded


def _vectorize_skill_tokens(skill_tokens: list[str], dim: int) -> list[float]:
    # Deterministic sparse hashing vector keeps indexing cheap and model-free.
    vec = [0.0] * dim
    if not skill_tokens:
        return vec

    weight = 1.0 / max(1, len(skill_tokens))
    for token in skill_tokens:
        if not token:
            continue
        key = hashlib.sha1(token.encode("utf-8")).digest()
        idx = int.from_bytes(key[:8], byteorder="big", signed=False) % dim
        vec[idx] += weight
    return vec


def _is_clean_skill_token(token: str) -> bool:
    t = _normalize_text(token)
    if not t:
        return False
    if t.startswith("http://") or t.startswith("https://") or "." in t:
        return False
    if len(t) > 42:
        return False
    if re.search(r"\d{2,}", t):
        return False
    if re.search(r"[~@#$%^&*_=+<>|{}\\]", t):
        return False
    # Keep compact skill-like terms; drop sentence-like fragments.
    if len(t.split()) > 4:
        return False
    return True


def _normalize_score(score: float) -> float:
    # Cosine can be [-1, 1], dot/euclid variants may differ.
    # Keep a stable user-facing 0..1 projection.
    if score < 0.0:
        score = (score + 1.0) / 2.0
    return max(0.0, min(score, 1.0))


class QdrantResumeIndex:
    def __init__(self) -> None:
        self.enabled = os.getenv("QDRANT_ENABLED", "false").lower() == "true"
        self.url = os.getenv("QDRANT_URL", "http://localhost:6333")
        self.api_key = os.getenv("QDRANT_API_KEY", "").strip() or None
        self.collection = os.getenv("QDRANT_COLLECTION", "resumes")
        self.vector_dim = max(64, int(os.getenv("QDRANT_VECTOR_SIZE", "384")))
        self.distance = os.getenv("QDRANT_DISTANCE", "Cosine").lower()
        self.timeout = float(os.getenv("QDRANT_TIMEOUT_SECONDS", "5.0"))
        self._client = None

    def _ensure_client(self):
        if not self.enabled:
            return None
        if QdrantClient is None or qmodels is None:
            logger.warning("qdrant_client_missing", extra={"event": "qdrant_client_missing"})
            return None
        if self._client is None:
            self._client = QdrantClient(url=self.url, api_key=self.api_key, timeout=self.timeout)
        return self._client

    def _distance_model(self):
        if qmodels is None:
            return None
        if self.distance == "dot":
            return qmodels.Distance.DOT
        if self.distance == "euclid":
            return qmodels.Distance.EUCLID
        return qmodels.Distance.COSINE

    def init_collection(self) -> dict[str, Any]:
        client = self._ensure_client()
        if client is None:
            return {"enabled": self.enabled, "ready": False}

        if not client.collection_exists(self.collection):
            client.create_collection(
                collection_name=self.collection,
                vectors_config=qmodels.VectorParams(
                    size=self.vector_dim,
                    distance=self._distance_model(),
                ),
            )
        return {"enabled": True, "ready": True, "collection": self.collection, "vector_dim": self.vector_dim}

    def build_skill_tokens(self, raw_skills: list[str]) -> list[str]:
        normalized: set[str] = set()
        for skill in raw_skills:
            if not _is_clean_skill_token(str(skill)):
                continue
            canon = _canonical_skill(skill)
            if not canon:
                continue
            normalized.update(_expand_skill_with_implications(canon))
        return sorted(normalized)

    def upsert_resume(
        self,
        *,
        point_id: str,
        filename: str,
        role: str,
        raw_skills: list[str],
        payload_extra: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        client = self._ensure_client()
        if client is None:
            return {"enabled": self.enabled, "indexed": False}

        skill_tokens = self.build_skill_tokens(raw_skills)
        vector = _vectorize_skill_tokens(skill_tokens, self.vector_dim)
        payload = {
            "filename": filename,
            "role": role,
            "skills": skill_tokens,
        }
        if payload_extra:
            payload.update(payload_extra)

        qdrant_point_id = self._to_qdrant_point_id(point_id)
        client.upsert(
            collection_name=self.collection,
            wait=False,
            points=[
                qmodels.PointStruct(
                    id=qdrant_point_id,
                    vector=vector,
                    payload=payload,
                )
            ],
        )
        return {
            "enabled": True,
            "indexed": True,
            "skills_indexed": len(skill_tokens),
            "point_id": qdrant_point_id,
        }

    def _to_qdrant_point_id(self, raw_id: str) -> str:
        text = (raw_id or "").strip()
        # If caller already provides a valid UUID, keep it.
        try:
            return str(uuid.UUID(text))
        except Exception:
            pass
        # Deterministically derive a UUID from stable text (e.g. resume hash).
        return str(uuid.uuid5(uuid.NAMESPACE_URL, text))

    def search(
        self,
        *,
        query_skills: list[str],
        top_k: int = 20,
        min_score: float = 0.0,
    ) -> dict[str, Any]:
        client = self._ensure_client()
        if client is None:
            return {"enabled": self.enabled, "ready": False, "hits": []}

        query_tokens = self.build_skill_tokens(query_skills)
        vector = _vectorize_skill_tokens(query_tokens, self.vector_dim)
        qfilter = None
        limit = max(1, min(top_k, 200))
        score_threshold = min_score if min_score > 0 else None
        if hasattr(client, "search"):
            result = client.search(
                collection_name=self.collection,
                query_vector=vector,
                query_filter=qfilter,
                with_payload=True,
                limit=limit,
                score_threshold=score_threshold,
            )
        else:
            # qdrant-client >= 1.10 promotes query_points over search.
            response = client.query_points(
                collection_name=self.collection,
                query=vector,
                query_filter=qfilter,
                with_payload=True,
                limit=limit,
                score_threshold=score_threshold,
            )
            result = getattr(response, "points", response)
        hits = []
        for idx, item in enumerate(result, start=1):
            payload = item.payload or {}
            candidate_skills = [
                s for s in (payload.get("skills", []) or [])
                if _is_clean_skill_token(str(s))
            ]
            candidate_skill_set = set(candidate_skills)
            matched_query_tokens = sorted(set(query_tokens).intersection(candidate_skill_set))
            score_raw = float(item.score)
            score_norm = _normalize_score(score_raw)
            preview = matched_query_tokens + [s for s in candidate_skills if s not in matched_query_tokens]
            hits.append(
                {
                    "rank": idx,
                    "id": str(item.id),
                    "filename": payload.get("filename"),
                    "role": payload.get("role"),
                    "resume_hash": payload.get("resume_hash"),
                    "trace_id": payload.get("trace_id"),
                    "score_raw": round(score_raw, 6),
                    "score_100": round(score_norm * 100.0, 2),
                    "relevance_band": (
                        "high" if score_norm >= 0.75 else
                        "medium" if score_norm >= 0.45 else
                        "low"
                    ),
                    "matched_query_tokens": matched_query_tokens,
                    "matched_query_count": len(matched_query_tokens),
                    "skills_preview": preview[:20],
                    "skills_total": len(candidate_skills),
                }
            )
        return {
            "enabled": True,
            "ready": True,
            "query_tokens": query_tokens,
            "query_tokens_count": len(query_tokens),
            "hits_count": len(hits),
            "hits": hits,
        }
