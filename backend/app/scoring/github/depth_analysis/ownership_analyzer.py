from typing import Any, Dict

def analyze_ownership_quality(github_analysis: Dict[str, Any]) -> float:
    """
    Evaluates line survivability and code ownership to distinguish 
    copy-pasted tutorials from authored production code.
    """
    repos = github_analysis.get("repositories", [])
    if not repos:
        return 0.0
        
    total_ownership = 0.0
    valid_repos = 0
    
    for r in repos:
        analysis = r.get("analysis", {})
        retention = analysis.get("target_user_code_retention_audit", {})
        
        # If retention has an error (e.g. repo too big to clone), we give a default 0.5 score
        # to avoid penalizing enterprise developers.
        if "error" in retention:
            total_ownership += 0.5
            valid_repos += 1
            continue
            
        pct_str = retention.get("surviving_percentage", "0.0%")
        try:
            pct = float(pct_str.strip("%")) / 100.0
            total_ownership += pct
            valid_repos += 1
        except ValueError:
            continue
            
    if valid_repos == 0:
        return 0.0
        
    return min(1.0, total_ownership / valid_repos)
