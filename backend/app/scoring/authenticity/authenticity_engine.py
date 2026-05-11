from typing import Any, Dict
from app.scoring.authenticity.contradiction_detector import detect_contradictions
from app.scoring.authenticity.spam_detector import detect_spam_inflation
from app.scoring.authenticity.repository_quality_analyzer import analyze_repository_quality
from app.scoring.authenticity.timeline_analyzer import analyze_timeline_authenticity

def calculate_authenticity_factor(extracted: Dict[str, Any], evidence: Dict[str, Any], engineering_depth: Dict[str, Any]) -> Dict[str, Any]:
    """
    Calculates the final authenticity factor multiplier for the candidate's score.
    Applies a gradual degradation for suspicious profiles but guards against false positives
    for engineers lacking public github data.
    """
    
    # False Positive Prevention Check
    # If the user has no GitHub data, we only run pure-resume contradiction/inflation checks.
    github_data_available = extracted.get("github_analysis", {}).get("summary", {}).get("repo_count", 0) > 0
    
    contradiction_penalty = detect_contradictions(extracted, engineering_depth, github_data_available)
    spam_penalty = detect_spam_inflation(extracted, github_data_available)
    repo_quality_penalty = analyze_repository_quality(extracted, github_data_available)
    timeline_penalty = analyze_timeline_authenticity(extracted, github_data_available)
    
    total_penalty = contradiction_penalty + spam_penalty + repo_quality_penalty + timeline_penalty
    
    # Base Authenticity is 1.0, and it drops based on penalties. Floor at 0.4.
    factor = max(0.4, 1.0 - total_penalty)
    
    return {
        "factor": round(factor, 3),
        "total_penalty": round(total_penalty, 3),
        "contradiction_penalty": round(contradiction_penalty, 3),
        "spam_penalty": round(spam_penalty, 3),
        "repo_quality_penalty": round(repo_quality_penalty, 3),
        "timeline_penalty": round(timeline_penalty, 3),
        "github_data_available": github_data_available
    }
