from typing import Any, Dict
from app.scoring.gating.relevance_gate import apply_relevance_gate
from app.scoring.gating.authenticity_gate import apply_authenticity_gate
from app.scoring.gating.evidence_gate import apply_evidence_amplification_gate

def _clamp01(val: float) -> float:
    return max(0.0, min(1.0, val))

def apply_scoring_gates(
    score: float, 
    extracted: Dict[str, Any], 
    skill_meta: Dict[str, Any], 
    confidence_metrics: Dict[str, Any],
    role_profile: str,
    target_alignment: float
) -> Dict[str, Any]:
    """
    Applies soft gated scoring. Dynamically adjusts score ceilings and multipliers 
    based on systemic trust and verified capability.
    """
    
    # 1. Relevance Gate
    domain_calibration = skill_meta.get("signal_calibration", {})
    relevance_mult = apply_relevance_gate(target_alignment, domain_calibration)
    
    # 2. Authenticity Gate
    auth_factor = skill_meta.get("authenticity", {}).get("factor", 1.0)
    auth_results = apply_authenticity_gate(auth_factor)
    auth_mult = auth_results["multiplier"]
    
    # 3. Evidence Gate
    eng_depth = skill_meta.get("engineering_depth", {})
    evidence_mult = apply_evidence_amplification_gate(eng_depth, extracted, role_profile)
    
    # Apply multipliers
    gated_score = score * relevance_mult * auth_mult * evidence_mult
    
    # Clamp to ensure it never exceeds 1.0 (100%)
    final_score = _clamp01(gated_score)
    
    # If authenticity is extremely weak, force ranking confidence to Low
    if auth_results.get("forces_low_confidence"):
        if "overall" in confidence_metrics:
            confidence_metrics["overall"]["tier"] = "low"
            confidence_metrics["overall"]["evidence"].append(
                "Gate Enforced: Confidence dropped to Low due to severe authenticity warnings."
            )
            
    return {
        "original_score": round(score, 3),
        "gated_score": round(final_score, 3),
        "applied_gates": {
            "relevance_multiplier": relevance_mult,
            "authenticity_multiplier": auth_mult,
            "evidence_multiplier": evidence_mult
        }
    }
