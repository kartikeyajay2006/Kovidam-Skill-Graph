from typing import Any, Dict

def apply_evidence_amplification_gate(engineering_depth: Dict[str, Any], extracted: Dict[str, Any], role_profile: str) -> float:
    """
    Rewards candidates with deterministic proof, balancing out the penalty-heavy gates.
    DOES NOT PUNISH missing GitHub data for job profiles.
    """
    multiplier = 1.0
    
    github_data_available = extracted.get("github_analysis", {}).get("summary", {}).get("repo_count", 0) > 0
    depth_score = engineering_depth.get("score", 0.0)
    
    if not github_data_available:
        if role_profile.lower() == "job":
            # Neutralizer for experienced devs without public repos
            return 1.0
        else:
            # For internships, no github data might mean we can't verify strong evidence, but we don't penalize here
            return 1.0
            
    # Allow score amplification for very strong verified engineering evidence
    if depth_score >= 0.8:
        multiplier = 1.15
    elif depth_score >= 0.6:
        multiplier = 1.05
        
    return multiplier
