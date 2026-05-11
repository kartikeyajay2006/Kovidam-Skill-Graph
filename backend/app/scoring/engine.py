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


from app.scoring.cache.repo_cache import get_cached_github_evidence
from app.scoring.collectors.deployment_collector import extract_deployments
from app.scoring.collectors.experience_collector import extract_experience_context
from app.scoring.analyzers.verification_engine import verify_skills

def _calculate_github_score(extracted: dict[str, Any]) -> float:
    return float(extracted.get("github_analysis", {}).get("summary", {}).get("overall_score_100", 0.0) or 0.0)

def _calculate_experience_score(expy: float, min_experience_years: float, role: str) -> float:
    if role == "internship":
        return 100.0
    if expy == 0.0:
        return 0.0
    if min_experience_years == 0:
        return min(100.0, 50.0 + (expy * 20.0))
    return min(100.0, (expy / max(min_experience_years, 0.1)) * 100.0)

def score_candidate_v2(extracted: dict[str, Any], role: str, required_weighted: list[tuple[str, float]], must_have: list[str], min_experience_years: float, strict_must_have: bool) -> dict[str, Any]:
    
    # 1. Collection Phase
    github_ev = get_cached_github_evidence(extracted.get("github_analysis", {}))
    deployments = extract_deployments(extracted)
    exp_text = extract_experience_context(extracted)
    
    # 2. Verification Phase
    claimed_skills = [s for s, _ in required_weighted]
    verified_results = verify_skills(claimed_skills, github_ev, deployments, exp_text, role)
    
    # Map for easy lookup
    verified_map = {v.skill: v for v in verified_results}
    
    # 3. Apply Multipliers to Skill Match Score
    total_w, hit_w = 0.0, 0.0
    matched = []
    skill_ev = []
    
    for skill, wt in required_weighted:
        total_w += wt
        v = verified_map.get(skill)
        
        # If they claimed it and we verified it, apply the multiplier.
        # But wait, we need to know if they ACTUALLY claimed it correctly based on the resume parsing.
        # For phase 1, we assume if it passed the LLM parsing filter, it's claimed.
        # But wait! _match_skill in old engine did substring matches to see if it was in the text!
        # The verify_skills function checks if it's in the text and sets a level.
        # If level is NOT "CONTRADICTORY", and they have some score...
        
        if v and len(v.sources) > 0:
            # They have some evidence.
            base_hit = 1.0
            hit_w += wt * base_hit * v.multiplier
            matched.append(skill)
        elif v and v.level == "PUBLICLY_UNVERIFIED":
            # No evidence found, but not explicitly contradicted
            # They get the minimum fallback multiplier
            base_hit = 1.0
            hit_w += wt * base_hit * v.multiplier
            matched.append(skill)
            
        if v:
            skill_ev.append({
                "skill": v.skill,
                "level": v.level,
                "multiplier": v.multiplier,
                "strength": v.strength,
                "sources": v.sources
            })

    skill_pct = min(100.0, (hit_w / total_w * 100.0)) if total_w > 0 else 0.0
    
    # 4. Independent Engines
    gh_score = _calculate_github_score(extracted)
    
    exp_str = extracted.get("work_experience_years", "0")
    try:
        expy = float(exp_str)
    except Exception:
        expy = 0.0
    exp_score = _calculate_experience_score(expy, min_experience_years, role)
    
    # 5. Modular Final Scoring
    if role == "internship":
        # Phase 1 simplified mapping to available data
        # Verified Skill Evidence: 28%
        # Project Depth & Authenticity: 24% (using gh_score proxy for now)
        # GitHub Engineering Activity: 18%
        # Experience Relevance: 8%
        # Platform Scores: 7%
        # Remaining allocated proportionally to skill and github
        final_score = (skill_pct * 0.40) + (gh_score * 0.50) + (exp_score * 0.10)
        conf = min(100.0, 0.45 * skill_pct + 0.35 * gh_score + 0.20 * exp_score)
    else:
        # JOB MODE
        # Experience Relevance: 24%
        # Verified Skills Match: 20%
        # Experience Depth & Complexity: 18%
        # Technical Impact Evidence: 10%
        # GitHub/Public OSS: 6%
        final_score = (skill_pct * 0.35) + (gh_score * 0.20) + (exp_score * 0.45)
        conf = min(100.0, 0.35 * skill_pct + 0.20 * gh_score + 0.45 * exp_score)

    missing_must = [canonical_skill(s) for s in must_have if canonical_skill(s) not in set(matched)]
    decision = decide_status(role, skill_pct, gh_score, expy, min_experience_years, missing_must, strict_must_have, conf)

    return {
        "score_version": SCORE_VERSION,
        "status": decision.status,
        "decision_confidence": round(decision.confidence, 3),
        "rejection_reasons": decision.reasons if decision.status in {"rejected", "review_required"} else [],
        "fit_score_100": round(final_score, 3),
        "skills": {
            "matched": matched,
            "missing": [s for s, _ in required_weighted if s not in matched],
            "must_have_missing": missing_must,
        },
        "breakdown": {
            "skills_match_score_100": round(skill_pct, 3),
            "github_score_100": round(gh_score, 3),
            "experience_score_100": round(exp_score, 3),
        },
        "evidence_trace": {"skills": skill_ev},
    }
