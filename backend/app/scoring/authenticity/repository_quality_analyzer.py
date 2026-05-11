from typing import Any, Dict

def analyze_repository_quality(extracted: Dict[str, Any], github_data_available: bool) -> float:
    """
    Detects low-effort GitHub profiles.
    Only run if github_data_available is True to prevent punishing non-public devs.
    """
    if not github_data_available:
        return 0.0
        
    penalty = 0.0
    github_analysis = extracted.get("github_analysis", {})
    repos = github_analysis.get("repositories", [])
    
    if not repos:
        return 0.0
        
    fork_only_count = 0
    empty_repo_count = 0
    
    for r in repos:
        analysis = r.get("analysis", {})
        retention = analysis.get("target_user_code_retention_audit", {})
        
        # Rule 1: Fork-Only. Surviving lines == 0, but total lines > 0
        if "error" not in retention:
            target_lines = retention.get("target_user_surviving_lines", 0)
            total_lines = retention.get("total_project_lines", 0)
            
            if total_lines > 100 and target_lines == 0:
                fork_only_count += 1
                
            # Rule 2: Empty Repo with inflated stack
            tech = analysis.get("identified_tech_stack_dependencies") or []
            if total_lines < 50 and len(tech) >= 10:
                empty_repo_count += 1
                
    if fork_only_count >= max(1, len(repos) // 2):
        penalty += 0.10
        
    if empty_repo_count > 0:
        penalty += 0.10
        
    return penalty
