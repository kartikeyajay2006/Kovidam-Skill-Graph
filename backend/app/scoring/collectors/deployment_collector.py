import re
from typing import Any

DEPLOYMENT_REGEX = re.compile(r"(https?://(?:www\.)?(?:[a-zA-Z0-9-]+\.)*(vercel\.app|netlify\.app|onrender\.com|herokuapp\.com|aws\.amazon\.com|gcp\.com|firebaseapp\.com|github\.io|railway\.app)[^\s]*)", re.IGNORECASE)

def extract_deployments(extracted_resume: dict[str, Any]) -> set[str]:
    """
    Extract deployment URLs and platforms from resume text and github data.
    """
    deployments = set()
    
    # Check raw text
    text = str(extracted_resume.get("raw_text_preview", ""))
    for match in DEPLOYMENT_REGEX.finditer(text):
        deployments.add(match.group(2).lower()) # Add platform name
        
    # Check github readmes and urls
    repos = extracted_resume.get("github_analysis", {}).get("repositories", []) or []
    for r in repos:
        repo = r.get("repository", {}) or {}
        analysis = r.get("analysis", {}) or {}
        
        readme = str(analysis.get("readme_text", ""))
        for match in DEPLOYMENT_REGEX.finditer(readme):
            deployments.add(match.group(2).lower())
            
        desc = str(repo.get("description", ""))
        for match in DEPLOYMENT_REGEX.finditer(desc):
            deployments.add(match.group(2).lower())
            
        url = str(repo.get("homepage", ""))
        for match in DEPLOYMENT_REGEX.finditer(url):
            deployments.add(match.group(2).lower())

    return deployments
