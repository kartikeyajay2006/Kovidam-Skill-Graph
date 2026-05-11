from typing import Any, Dict

def detect_spam_inflation(extracted: Dict[str, Any], github_data_available: bool) -> float:
    """
    Identifies keyword stuffing and fake evidence.
    Returns a penalty value.
    """
    penalty = 0.0
    
    skills = extracted.get("skills_section", {}).get("items", [])
    projects = extracted.get("projects_section", {}).get("items", [])
    github_analysis = extracted.get("github_analysis", {})
    repos = github_analysis.get("repositories", [])
    
    # Rule 1: Buzzword Inflation. >40 skills, <2 projects, 0 repos
    if len(skills) > 40 and len(projects) < 2 and len(repos) == 0:
        penalty += 0.10
        
    # Rule 2: README Spam. Repository description is massive but no identified tech stack.
    # Only run this rule if GitHub data is actually available, to avoid false positives.
    if github_data_available and len(repos) > 0:
        for r in repos:
            analysis = r.get("analysis", {})
            desc = str(analysis.get("repository_description") or "")
            tech = analysis.get("identified_tech_stack_dependencies") or []
            
            if len(desc) > 1500 and len(tech) == 0:
                penalty += 0.15
                break # Only apply once
                
    return penalty
