from datetime import datetime
from typing import Any, Dict

def analyze_timeline_authenticity(extracted: Dict[str, Any], github_data_available: bool) -> float:
    """
    Detects artificial commit farming (Burst Spam).
    Only run if github_data_available is True.
    """
    if not github_data_available:
        return 0.0
        
    penalty = 0.0
    github_analysis = extracted.get("github_analysis", {})
    repos = github_analysis.get("repositories", [])
    
    if not repos:
        return 0.0
        
    burst_spam_repos = 0
    
    for r in repos:
        analysis = r.get("analysis", {})
        commits = analysis.get("target_user_recent_commits", [])
        
        # Rule 1: Burst Spam. 50+ commits, but span is < 24 hours.
        if len(commits) >= 50:
            try:
                dates = []
                for c in commits:
                    date_str = c.get("commit", {}).get("author", {}).get("date")
                    if date_str:
                        date_str = date_str.replace("Z", "+00:00")
                        dt = datetime.fromisoformat(date_str)
                        dates.append(dt)
                        
                if len(dates) >= 2:
                    oldest = min(dates)
                    newest = max(dates)
                    span_hours = (newest - oldest).total_seconds() / 3600.0
                    
                    if span_hours < 24.0:
                        burst_spam_repos += 1
            except Exception:
                continue
                
    if burst_spam_repos > 0:
        penalty += 0.10
        
    return penalty
