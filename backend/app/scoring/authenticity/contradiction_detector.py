from typing import Any, Dict

def detect_contradictions(extracted: Dict[str, Any], engineering_depth: Dict[str, Any], github_data_available: bool) -> float:
    """
    Detects contradictions between claimed experience and actual evidence.
    Returns a penalty value (e.g., 0.0 means no penalty, 0.15 means -15%).
    """
    penalty = 0.0
    
    # Extract years of experience
    exp_years_str = str(extracted.get("work_experience_years", "")).lower()
    exp_years = 0.0
    try:
        # Simplistic extraction of digits. "N/A" -> 0
        digits = [s for s in exp_years_str.split() if s.isdigit()]
        if digits:
            exp_years = float(digits[0])
        elif "years" in exp_years_str and exp_years_str.split(" ")[0].isdigit():
            exp_years = float(exp_years_str.split(" ")[0])
    except Exception:
        pass
        
    arch_score = float(engineering_depth.get("architecture_score", 0.0))
    api_score = float(engineering_depth.get("api_complexity_score", 0.0))
    
    # Rule 1: Claims >5 years of experience but possesses 0 backend complexity and 0 architecture depth
    if exp_years > 5.0 and arch_score == 0.0 and api_score == 0.0:
        penalty += 0.15
        
    # Rule 2: In a future iteration, we would check if they claim 'Senior/Lead' but have weak evidence_strength.
    # We can approximate this by checking role profile.
    role = extracted.get("github_analysis", {}).get("selected_role_profile", "")
    if "senior" in role.lower() or "lead" in role.lower():
        if arch_score < 0.2 and api_score < 0.2:
            penalty += 0.20
            
    return penalty
