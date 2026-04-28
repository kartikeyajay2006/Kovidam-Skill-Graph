import os
import re
import requests
from collections import Counter

from app.config import load_environment


load_environment()

def extract_project_sections(text: str) -> str:
    import re
    lines = text.split("\n")
    
    project_keywords = ['project', 'open source', 'opensource', 'contribution']
    stop_keywords = ['experience', 'employment', 'work history', 'education', 'skills', 'technologies', 'certifications', 'achievements', 'awards', 'languages', 'interests', 'summary', 'profile']
    
    in_project_section = False
    project_text = []
    
    for line in lines:
        cleaned = line.strip().lower()
        cleaned_words = [w for w in re.split(r'\W+', cleaned) if w]
        
        # Check for section headers (usually short lines)
        if 0 < len(cleaned_words) <= 5:
            if any(k in cleaned for k in project_keywords):
                in_project_section = True
            elif any(k in cleaned for k in stop_keywords):
                in_project_section = False
                
        if in_project_section:
            project_text.append(line)
            
    extracted = "\n".join(project_text)
    # Give back full text if the parse completely fails to identify distinct target areas organically
    return extracted if len(extracted.strip()) > 30 else text

def fallback_repo_discovery(text: str, username: str, existing_repos: list) -> list:
    """
    Queries the user's explicit GitHub repos, but only cross-references their 
    titles specifically against the 'Projects' or 'Open Source' sections of the resume to prevent generic word matches.
    """
    token = os.environ.get("GITHUB_PAT")
    headers = {"Accept": "application/vnd.github.v3+json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
        
    url = f"https://api.github.com/users/{username}/repos?per_page=100&type=owner"
    try:
        res = requests.get(url, headers=headers)
    except Exception:
        return existing_repos
        
    discovered_repos = list(existing_repos)
    existing_full_names = set([f"{r['owner'].lower()}/{r['name'].lower()}" for r in existing_repos])
    
    if res.status_code == 200:
        repos = res.json()
        if not isinstance(repos, list):
            return existing_repos
            
        # Extract targeted reading zones to prevent false positives from Skills or Education
        targeted_text = extract_project_sections(text).lower()
        
        for repo in repos:
            repo_name = repo.get("name", "")
            repo_owner = repo.get("owner", {}).get("login", "")
            if not repo_name or not repo_owner:
                continue
                
            full_name = f"{repo_owner}/{repo_name}".lower()
            
            if full_name in existing_full_names:
                continue
                
            # Filter out profile repositories (username == repo_name) resolving false positives natively
            if repo_name.lower() == repo_owner.lower():
                continue
                
            repo_url = f"https://github.com/{repo_owner}/{repo_name}"
            
            # Require minimum length internally to avoid matching highly common short words natively
            if len(repo_name) <= 3:
                continue
                
            exact_match_pattern = r'\b' + re.escape(repo_name.lower()) + r'\b'
            exact_match = bool(re.search(exact_match_pattern, targeted_text))
            
            normalized_name = repo_name.lower().replace("-", " ").replace("_", " ")
            normalized_match = False
            if normalized_name != repo_name.lower():
                norm_match_pattern = r'\b' + re.escape(normalized_name) + r'\b'
                normalized_match = bool(re.search(norm_match_pattern, targeted_text))
            
            if exact_match or normalized_match:
                existing_full_names.add(full_name)
                discovered_repos.append({
                    "url": repo_url,
                    "owner": repo_owner,
                    "name": repo_name,
                    "matched_by_title": True
                })
                
    return discovered_repos

def scan_resume_for_github(text: str, force_username: str = None):
    # Extract explicit repository links
    repo_pattern = re.compile(r'(?:https?://)?(?:www\.)?github\.com/([A-Za-z0-9_\-]+)/([A-Za-z0-9_\-]+)/?')
    repo_matches = repo_pattern.findall(text)
    
    unique_repos = []
    seen = set()
    possible_usernames = []
    
    for owner, repo in repo_matches:
        full_repo = f"{owner}/{repo}"
        url = f"https://github.com/{full_repo}"
        if full_repo.lower() not in seen:
            seen.add(full_repo.lower())
            unique_repos.append({
                "url": url, 
                "owner": owner, 
                "name": repo,
                "matched_by_title": False
            })
        possible_usernames.append(owner)

    # Extract explicit profile links
    profile_pattern = re.compile(r'(?:https?://)?(?:www\.)?github\.com/([A-Za-z0-9_\-]+)/?(?:\s|$)')
    profile_matches = profile_pattern.findall(text)
    for profile in profile_matches:
        if profile.lower() != "com":
             possible_usernames.append(profile)

    # Resolve inferred user dynamically
    inferred_user = None
    if force_username:
        inferred_user = force_username
    elif possible_usernames:
        inferred_user_lower = Counter([u.lower() for u in possible_usernames]).most_common(1)[0][0]
        # Maintain exact casing
        for u in possible_usernames:
            if u.lower() == inferred_user_lower:
                inferred_user = u
                break
                
    # Cross-reference API to catch any projects mentioned via name alone
    if inferred_user:
        unique_repos = fallback_repo_discovery(text, inferred_user, unique_repos)
                
    return {
        "inferred_username": inferred_user,
        "repositories": unique_repos
    }
