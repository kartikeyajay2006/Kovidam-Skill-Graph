from datetime import datetime
from typing import Any, Dict

def analyze_temporal_consistency(github_analysis: Dict[str, Any]) -> float:
    """
    Evaluates the candidate's recent commit timeline to distinguish sustained work from sudden spam.
    Returns a consistency score between 0.0 and 1.0.
    """
    repos = github_analysis.get("repositories", [])
    if not repos:
        return 0.0
        
    total_span_days = 0.0
    valid_repos = 0
    
    for r in repos:
        analysis = r.get("analysis", {})
        commits = analysis.get("target_user_recent_commits", [])
        
        if not commits or len(commits) < 2:
            continue
            
        try:
            # Commits are usually sorted newest first, but let's be safe
            dates = []
            for c in commits:
                date_str = c.get("commit", {}).get("author", {}).get("date")
                if date_str:
                    # ISO 8601 parsing
                    date_str = date_str.replace("Z", "+00:00")
                    dt = datetime.fromisoformat(date_str)
                    dates.append(dt)
                    
            if len(dates) >= 2:
                oldest = min(dates)
                newest = max(dates)
                span = (newest - oldest).days
                total_span_days += span
                valid_repos += 1
        except Exception:
            continue
            
    if valid_repos == 0:
        return 0.0
        
    avg_span = total_span_days / valid_repos
    # We cap the expected sustained span at 90 days (3 months)
    return min(1.0, avg_span / 90.0)
