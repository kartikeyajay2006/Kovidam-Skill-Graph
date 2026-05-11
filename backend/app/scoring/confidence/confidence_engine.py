from typing import Any, Dict
from app.scoring.confidence.ambiguity_detector import detect_extraction_ambiguity
from app.scoring.confidence.evidence_confidence import calculate_github_confidence, calculate_skills_confidence, calculate_deployment_confidence

def _get_tier(score: float) -> str:
    if score >= 0.75:
        return "high"
    elif score >= 0.40:
        return "medium"
    return "low"

def calculate_confidence_metrics(extracted: Dict[str, Any], skill_meta: Dict[str, Any], engineering_depth: Dict[str, Any]) -> Dict[str, Any]:
    """
    Computes system confidence across multiple scoring dimensions.
    Returns a dictionary of confidence scores, tiers, and explainable evidence arrays.
    """
    
    # Ambiguity penalties (global base layer)
    ambiguity_penalty, ambiguity_evidence = detect_extraction_ambiguity(extracted)
    
    # Github Confidence
    gh_boost, gh_evidence = calculate_github_confidence(extracted)
    gh_score = max(0.0, min(1.0, 0.5 - ambiguity_penalty + gh_boost))
    
    # Skills Confidence
    sk_boost, sk_evidence = calculate_skills_confidence(extracted, engineering_depth)
    sk_score = max(0.0, min(1.0, 0.5 - ambiguity_penalty + sk_boost))
    
    # Deployment Confidence
    dep_boost, dep_evidence = calculate_deployment_confidence(extracted, skill_meta)
    dep_score = max(0.0, min(1.0, 0.5 - ambiguity_penalty + dep_boost))
    
    # Overall Calculation
    overall_score = round((gh_score + sk_score + dep_score) / 3.0, 3)
    
    overall_evidence = []
    overall_evidence.extend(ambiguity_evidence)
    overall_evidence.extend([e for e in gh_evidence if "Strong" in e or "High" in e])
    overall_evidence.extend([e for e in sk_evidence if "Verified" in e])
    overall_evidence.extend([e for e in dep_evidence if "Verified" in e])
    
    return {
        "overall": {
            "score": overall_score,
            "tier": _get_tier(overall_score),
            "evidence": overall_evidence
        },
        "skills": {
            "score": round(sk_score, 3),
            "tier": _get_tier(sk_score),
            "evidence": sk_evidence
        },
        "github_analysis": {
            "score": round(gh_score, 3),
            "tier": _get_tier(gh_score),
            "evidence": gh_evidence
        },
        "extraction": {
            "score": round(max(0.0, 1.0 - ambiguity_penalty), 3),
            "tier": _get_tier(max(0.0, 1.0 - ambiguity_penalty)),
            "evidence": ambiguity_evidence
        },
        "deployment": {
            "score": round(dep_score, 3),
            "tier": _get_tier(dep_score),
            "evidence": dep_evidence
        }
    }
