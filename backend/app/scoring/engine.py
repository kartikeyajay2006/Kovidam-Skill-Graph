from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

SCORE_VERSION = "v2.0.0"

SKILL_ONTOLOGY = {
    "javascript": {"javascript", "js", "node.js"},
    "nodejs": {"nodejs", "node", "node.js"},
    "fastapi": {"fastapi", "fast api"},
    "python": {"python", "py"},
    "postgresql": {"postgresql", "postgres"},
    "machine learning": {"machine learning", "ml"},
}


def _norm(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip().lower())


def canonical_skill(skill: str) -> str:
    s = _norm(skill)
    for canon, aliases in SKILL_ONTOLOGY.items():
        if s == canon or s in aliases:
            return canon
    return s


def parse_weighted_skills(csv_text: str) -> list[tuple[str, float]]:
    out = []
    for raw in [x.strip() for x in (csv_text or "").split(",") if x.strip()]:
        parts = raw.rsplit(":", 1)
        if len(parts) == 2:
            try:
                wt = max(float(parts[1]), 0.1)
            except Exception:
                wt = 1.0
            out.append((canonical_skill(parts[0]), wt))
        else:
            out.append((canonical_skill(raw), 1.0))
    return out


def _collect_evidence(extracted: dict[str, Any]) -> dict[str, list[str]]:
    text = _norm(extracted.get("raw_text_preview", ""))
    repos = extracted.get("github_analysis", {}).get("repositories", []) or []
    repo_names, readmes, deps, project_desc = [], [], [], []
    for r in repos:
        repo = r.get("repository", {}) or {}
        analysis = r.get("analysis", {}) or {}
        name = repo.get("name") or repo.get("url", "")
        if name:
            repo_names.append(_norm(str(name)))
        desc = repo.get("description") or analysis.get("project_description") or ""
        if desc:
            project_desc.append(_norm(str(desc)))
        readme = analysis.get("readme_text") or ""
        if readme:
            readmes.append(_norm(str(readme)))
        for d in analysis.get("identified_tech_stack_dependencies", []) or []:
            deps.append(_norm(str(d)))
    return {
        "resume_text": [text],
        "repo_name": repo_names,
        "readme": readmes,
        "dependency": deps,
        "project_desc": project_desc,
    }


def _match_skill(skill: str, evidence: dict[str, list[str]]) -> tuple[float, list[dict[str, str]]]:
    traces: list[dict[str, str]] = []
    hits = 0
    diverse_sources = set()
    for source, blobs in evidence.items():
        for blob in blobs:
            if not blob:
                continue
            if skill in blob:
                token = skill
                conf = "explicit" if source in {"dependency", "repo_name"} else "inferred"
                if source == "resume_text":
                    conf = "weak"
                traces.append({"source": source, "matched_token": token, "confidence": conf})
                hits += 1
                diverse_sources.add(source)
                break
    if hits == 0:
        return 0.0, []
    # anti-gaming: diversity required
    diversity_bonus = min(len(diverse_sources) / 3.0, 1.0)
    stuffing_penalty = 0.15 if (hits > 0 and len(diverse_sources) == 1 and "resume_text" in diverse_sources) else 0.0
    score = min(1.0, (0.6 + 0.4 * diversity_bonus) - stuffing_penalty)
    return max(0.0, score), traces


@dataclass
class DecisionResult:
    status: str
    confidence: float
    reasons: list[str]


def decide_status(role: str, skill_pct: float, github_score: float, exp_years: float, min_exp: float, must_missing: list[str], strict: bool, conf: float) -> DecisionResult:
    reasons = []
    hard_violation = False
    if must_missing:
        if strict:
            hard_violation = True
            reasons.append(f"Missing must-have skills: {', '.join(must_missing)}")
        else:
            reasons.append(f"Missing must-have skills but non-strict role: {', '.join(must_missing)}")

    if role == "job":
        if skill_pct < 55:
            reasons.append("Skill match below 55")
        if github_score < 35:
            reasons.append("GitHub score below 35")
        if exp_years < min_exp:
            reasons.append("Experience below minimum")

    if hard_violation:
        return DecisionResult("rejected", conf, reasons)
    if conf < 50:
        return DecisionResult("review_required", conf, reasons or ["Low decision confidence"])
    if 50 <= conf <= 70 and reasons:
        return DecisionResult("review_required", conf, reasons)
    if reasons:
        return DecisionResult("rejected", conf, reasons)
    return DecisionResult("eligible", conf, ["Meets policy"])


def score_candidate_v2(extracted: dict[str, Any], role: str, required_weighted: list[tuple[str, float]], must_have: list[str], min_experience_years: float, strict_must_have: bool) -> dict[str, Any]:
    evidence = _collect_evidence(extracted)
    total_w, hit_w = 0.0, 0.0
    skill_ev = []
    matched = []
    for skill, wt in required_weighted:
        total_w += wt
        s, traces = _match_skill(skill, evidence)
        if s > 0:
            hit_w += wt * s
            matched.append(skill)
        skill_ev.append({"skill": skill, "score": round(s * 100, 3), "evidence": traces})
    skill_pct = (hit_w / total_w * 100.0) if total_w > 0 else 0.0

    gh = float(extracted.get("github_analysis", {}).get("summary", {}).get("overall_score_100", 0.0) or 0.0)
    exp = extracted.get("work_experience_years", "0")
    try:
        expy = float(exp)
    except Exception:
        expy = 0.0

    if role == "internship":
        exp_component = 100.0
    else:
        if expy == 0.0:
            exp_component = 0.0
        elif min_experience_years == 0:
            exp_component = min(300.0, 50.0 + (expy * 20.0))
        else:
            exp_component = min(300.0, (expy / max(min_experience_years, 0.1)) * 100.0)

    conf = min(100.0, 0.45 * skill_pct + 0.35 * gh + 0.20 * exp_component)
    missing_must = [canonical_skill(s) for s in must_have if canonical_skill(s) not in set(matched)]
    decision = decide_status(role, skill_pct, gh, expy, min_experience_years, missing_must, strict_must_have, conf)

    return {
        "score_version": SCORE_VERSION,
        "status": decision.status,
        "decision_confidence": round(decision.confidence, 3),
        "rejection_reasons": decision.reasons if decision.status in {"rejected", "review_required"} else [],
        "fit_score_100": round(0.5 * skill_pct + 0.35 * gh + 0.15 * exp_component, 3),
        "skills": {
            "matched": matched,
            "missing": [s for s, _ in required_weighted if s not in matched],
            "must_have_missing": missing_must,
        },
        "breakdown": {
            "skills_match_score_100": round(skill_pct, 3),
            "github_score_100": round(gh, 3),
            "experience_score_100": round(exp_component, 3),
        },
        "evidence_trace": {"skills": skill_ev},
    }
