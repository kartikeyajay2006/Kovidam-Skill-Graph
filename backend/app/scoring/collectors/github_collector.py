import re
from typing import Any, List, Set, Tuple

def extract_from_github(github_analysis: dict[str, Any]) -> dict[str, set[str]]:
    """
    Extract deterministic tech stack signals from GitHub analysis payload.
    Returns categorized evidence sets.
    """
    evidence = {
        "manifests": set(),
        "imports": set(),
        "readme": set(),
        "repo_names": set(),
    }
    
    repos = github_analysis.get("repositories", []) or []
    for r in repos:
        repo = r.get("repository", {}) or {}
        analysis = r.get("analysis", {}) or {}
        
        # Repo names
        name = repo.get("name") or repo.get("url", "")
        if name:
            evidence["repo_names"].add(name.lower())
            
        # Manifests and Imports (from identified tech stack dependencies)
        # Assuming the existing LLM payload returned identified dependencies
        deps = analysis.get("identified_tech_stack_dependencies", []) or []
        for d in deps:
            d_lower = str(d).lower().strip()
            # If the tech stack array has a lot of things, we loosely classify them.
            # In a true manifest parser we would parse package.json natively, 
            # but we are reusing the existing payload to avoid rescanning.
            # We treat explicit tech stack dependencies as manifests/imports.
            evidence["manifests"].add(d_lower)
            evidence["imports"].add(d_lower)
            
        # Readme
        readme = analysis.get("readme_text") or ""
        if readme:
            # We don't tokenize the whole readme here, we'll let the verification engine check substrings
            evidence["readme"].add(readme.lower())
            
    return evidence
