import os
import sys
import json
import base64
import requests
import time
import tempfile
import subprocess
from urllib.parse import urlparse

from app.config import load_environment


load_environment()

def get_tech_stack(full_repo_path: str, headers: dict, default_branch: str = "main") -> list:
    """Attempts to identify the tech stack recursively looking through Monorepos for package.json, requirements.txt, pom.xml, build.gradle, go.mod, Cargo.toml, and Gemfile."""
    tech_stack = []
    
    # Check tree recursively
    tree_url = f"https://api.github.com/repos/{full_repo_path}/git/trees/{default_branch}?recursive=1"
    tree_res = requests.get(tree_url, headers=headers)
    
    target_files = []
    if tree_res.status_code == 200:
        tree = tree_res.json().get("tree", [])
        for item in tree:
            if item.get("type") != "blob":
                continue
            path = item.get("path", "")
            
            # Exclusion rules
            if any(excluded in path for excluded in ['node_modules/', '.venv/', 'venv/', 'vendor/', 'target/', '.git/']):
                continue
                
            if path.endswith(('package.json', 'requirements.txt', 'pom.xml', 'build.gradle', 'go.mod', 'Cargo.toml', 'Gemfile')):
                target_files.append(path)
                
    # Fallback to root search if tree parsing fails or finds nothing, though tree should work
    if not target_files:
        target_files = ['package.json', 'requirements.txt', 'pom.xml', 'build.gradle', 'go.mod', 'Cargo.toml', 'Gemfile']
        
    def fetch_file(filename):
        url = f"https://api.github.com/repos/{full_repo_path}/contents/{filename}"
        res = requests.get(url, headers=headers)
        if res.status_code == 200:
            content = res.json().get("content", "")
            if content:
                try:
                    return base64.b64decode(content).decode('utf-8')
                except Exception:
                    pass
        return None

    import re

    for file_path in target_files:
        content = fetch_file(file_path)
        if not content:
            continue
            
        if file_path.endswith('package.json'):
            try:
                pkg_json = json.loads(content)
                deps = list(pkg_json.get("dependencies", {}).keys())
                dev_deps = list(pkg_json.get("devDependencies", {}).keys())
                tech_stack.extend(deps + dev_deps)
            except Exception:
                pass
                
        elif file_path.endswith('requirements.txt'):
            for line in content.splitlines():
                line = line.strip()
                if line and not line.startswith('#'):
                    pkg = re.split(r'==|>=|<=|~=|!=', line)[0].strip()
                    if pkg: tech_stack.append(pkg)
                    
        elif file_path.endswith('pom.xml'):
            matches = re.findall(r'<artifactId>([^<]+)</artifactId>', content)
            tech_stack.extend([m for m in matches if 'plugin' not in m.lower()])
            
        elif file_path.endswith('build.gradle'):
            matches = re.findall(r'(?:implementation|compile|api)\s+[\'"](?:[^:]+:)?([^\'":]+)', content)
            tech_stack.extend(matches)
            
        elif file_path.endswith('go.mod'):
            matches = re.findall(r'require\s+(?:\(\s*)?([^\s()]+)', content)
            tech_stack.extend(matches)
            
        elif file_path.endswith('Cargo.toml'):
            matches = re.findall(r'^([a-zA-Z0-9_\-]+)\s*=', content, re.MULTILINE)
            tech_stack.extend([m for m in matches if m not in ['name', 'version', 'authors', 'edition']])
            
        elif file_path.endswith('Gemfile'):
            matches = re.findall(r'gem\s+[\'"]([^\'"]+)[\'"]', content)
            tech_stack.extend(matches)
                
    return sorted(list(set(tech_stack)))

def get_language_percentages(full_repo_path: str, headers: dict) -> dict:
    url = f"https://api.github.com/repos/{full_repo_path}/languages"
    res = requests.get(url, headers=headers)
    languages = {}
    if res.status_code == 200:
        data = res.json()
        total_bytes = sum(data.values())
        if total_bytes > 0:
            for lang, bytes_count in data.items():
                pct = (bytes_count / total_bytes) * 100
                languages[lang] = f"{round(pct, 2)}%"
    return languages

def get_surviving_code_stats(repo_url: str, full_repo_path: str, target_username: str, headers: dict) -> dict:
    """
    Clones the repository locally and uses git blame to calculate EXACTLY 
    how many lines currently alive in the repository were authored by the target user.
    """
    # Safety Check: Do not clone massive repositories over 500 MB
    repo_res = requests.get(f"https://api.github.com/repos/{full_repo_path}", headers=headers)
    if repo_res.status_code == 200:
        size_kb = repo_res.json().get("size", 0)
        if size_kb > 500000:
            return {"error": f"Repository is {size_kb} KB. Too large to securely clone and process git blame."}
            
    # Step 1: Identify all git commits made by the target user to fish out their literal email identities
    commits_url = f"https://api.github.com/repos/{full_repo_path}/commits?author={target_username}&per_page=100"
    res = requests.get(commits_url, headers=headers)
    
    known_emails = set()
    if res.status_code == 200:
        for c in res.json():
            email = c.get("commit", {}).get("author", {}).get("email")
            if email:
                known_emails.add(email.lower())
                
    if not known_emails:
        return {
            "target_user_surviving_lines": 0,
            "total_repo_lines": 0,
            "surviving_percentage": "0.00%",
            "note": "Could not identify target user's git email or they have no commits."
        }

    # Step 2: Clone repository to temp directory and execute local git blame analysis
    with tempfile.TemporaryDirectory() as temp_dir:
        try:
            # Silence git output so it doesn't break the JSON response stream
            subprocess.run(
                ["git", "clone", repo_url, temp_dir],
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True
            )
            
            # List all project files tracked by git
            files_output = subprocess.check_output(
                ["git", "ls-files"], cwd=temp_dir, text=True, stderr=subprocess.DEVNULL
            )
            files = [f for f in files_output.splitlines() if f]
        except Exception as e:
            return {
                "error": f"Failed to clone repository or run ls-files: {str(e)}",
                "target_user_surviving_lines": 0,
                "total_project_lines": 0,
                "surviving_percentage": "0.00%"
            }
            
        target_lines = 0
        total_lines = 0
        
        for f in files:
            file_path = os.path.join(temp_dir, f)
            if not os.path.isfile(file_path):
                continue
                
            try:
                # Use --line-porcelain to read exactly which email wrote which line natively via git
                blame_out = subprocess.check_output(
                    ["git", "blame", "--line-porcelain", f],
                    cwd=temp_dir, stderr=subprocess.DEVNULL, text=True
                )
                
                for line in blame_out.splitlines():
                    if line.startswith("author-mail "):
                        email = line.split("author-mail ")[1].strip("<>")
                        if email.lower() in known_emails:
                            target_lines += 1
                        total_lines += 1
            except Exception:
                # If the file is binary (images, icons) git blame fails, safely skip.
                pass
                
        pct = 0.0
        if total_lines > 0:
            pct = (target_lines / total_lines) * 100
            
        return {
            "target_user_surviving_lines": target_lines,
            "total_project_lines": total_lines,
            "tracked_user_emails": list(known_emails),
            "surviving_percentage": f"{round(pct, 2)}%"
        }

def get_target_user_commits(full_repo_path: str, target_username: str, headers: dict, limit: int = 100) -> list:
    """Fetches the commit history and individual statistics specifically for the target user."""
    import re
    commits_info = []
    commits_url = f"https://api.github.com/repos/{full_repo_path}/commits?author={target_username}&per_page={limit}"
    
    res = requests.get(commits_url, headers=headers)
    if res.status_code != 200:
        return commits_info
        
    page1_commits = res.json()
    link_header = res.headers.get("Link", "")
    last_page = 1
    
    if link_header:
        match = re.search(r'[&?]page=(\d+)[^>]*>; rel="last"', link_header)
        if match:
            last_page = int(match.group(1))
            
    collected_commits = []
    
    if last_page == 1:
        collected_commits = page1_commits[::-1]
    else:
        last_page_url = f"{commits_url}&page={last_page}"
        last_page_res = requests.get(last_page_url, headers=headers)
        if last_page_res.status_code == 200:
            collected_commits.extend(last_page_res.json()[::-1])
            
        if len(collected_commits) < limit and last_page > 1:
            second_last_page = last_page - 1
            if second_last_page == 1:
                collected_commits.extend(page1_commits[::-1])
            else:
                second_last_url = f"{commits_url}&page={second_last_page}"
                second_last_res = requests.get(second_last_url, headers=headers)
                if second_last_res.status_code == 200:
                    collected_commits.extend(second_last_res.json()[::-1])
                    
    commits_to_process = collected_commits[:limit]
    
    for commit in commits_to_process:
        sha = commit.get("sha")
        message = commit.get("commit", {}).get("message", "")
        date = commit.get("commit", {}).get("author", {}).get("date", "")
        
        detail_url = f"https://api.github.com/repos/{full_repo_path}/commits/{sha}"
        detail_res = requests.get(detail_url, headers=headers)
        
        additions = 0
        deletions = 0
        if detail_res.status_code == 200:
            stats = detail_res.json().get("stats", {})
            additions = stats.get("additions", 0)
            deletions = stats.get("deletions", 0)
            
        commits_info.append({
            "sha": sha[:7],
            "message": message.split('\n')[0],
            "date": date,
            "lines_added": additions,
            "lines_deleted": deletions,
            "net_churn": additions - deletions,
            "total_lines_changed": additions + deletions
        })
            
    return commits_info

def get_target_user_prs(full_repo_path: str, target_username: str, headers: dict) -> dict:
    """Fetches merged PRs authored by the target user using the Search API."""
    import urllib.parse
    query = f"repo:{full_repo_path} author:{target_username} type:pr is:merged"
    encoded_query = urllib.parse.quote(query)
    search_url = f"https://api.github.com/search/issues?q={encoded_query}&per_page=100"
    
    pr_stats = {
        "total_merged_prs": 0,
        "prs": []
    }
    
    res = requests.get(search_url, headers=headers)
    if res.status_code == 200:
        data = res.json()
        pr_stats["total_merged_prs"] = data.get("total_count", 0)
        items = data.get("items", [])
        
        for item in items[:10]: # Cap detailed fetching at 10 to avoid excessive API calls
            pr_number = item.get("number")
            pr_title = item.get("title")
            
            pr_detail_url = f"https://api.github.com/repos/{full_repo_path}/pulls/{pr_number}"
            pr_res = requests.get(pr_detail_url, headers=headers)
            
            additions = 0
            deletions = 0
            changed_files = 0
            
            if pr_res.status_code == 200:
                pr_data = pr_res.json()
                additions = pr_data.get("additions", 0)
                deletions = pr_data.get("deletions", 0)
                changed_files = pr_data.get("changed_files", 0)
                
            pr_stats["prs"].append({
                "number": pr_number,
                "title": pr_title,
                "additions": additions,
                "deletions": deletions,
                "changed_files": changed_files
            })
            
    return pr_stats

def analyze_github_repo_by_url(repo_url: str, target_username: str) -> dict:
    try:
        path = urlparse(repo_url).path.strip('/')
        parts = path.split('/')
        if len(parts) < 2:
            return {"error": "Invalid GitHub repository URL"}
        
        repo_owner = parts[0]
        repo_name = parts[1]
        
        if repo_name.endswith('.git'):
            repo_name = repo_name[:-4]
            
        full_repo_path = f"{repo_owner}/{repo_name}"
        
        token = os.environ.get("GITHUB_PAT")
        if not token:
            return {"error": "GITHUB_PAT environment variable is not set."}
            
        headers = {
            "Accept": "application/vnd.github.v3+json",
            "Authorization": f"Bearer {token}",
            "X-GitHub-Api-Version": "2022-11-28"
        }
        
        # Test Authorization
        user_resp = requests.get("https://api.github.com/user", headers=headers)
        if user_resp.status_code != 200:
            return {"error": f"Failed to authenticate. Check GITHUB_PAT. Status: {user_resp.status_code}"}
        
        # 1. Fetch Repository Info
        repo_url_api = f"https://api.github.com/repos/{full_repo_path}"
        repo_response = requests.get(repo_url_api, headers=headers)
        
        if repo_response.status_code != 200:
            return {
                "error": "Failed to fetch repository information",
                "status_code": repo_response.status_code,
                "details": repo_response.text
            }
            
        repo_data = repo_response.json()
        project_name = repo_data.get("name", repo_name)
        primary_lang = repo_data.get("language", "Unknown")
        repo_desc = repo_data.get("description", "No description provided.")
        actual_owner = repo_data.get("owner", {}).get("login", "")
        default_branch = repo_data.get("default_branch", "main")
        
        # 2. Determine target user's role 
        target_role = "Viewer / No Direct Role"
        if actual_owner.lower() == target_username.lower():
            target_role = "Owner"
        else:
            collab_url = f"https://api.github.com/repos/{full_repo_path}/collaborators/{target_username}"
            collab_resp = requests.get(collab_url, headers=headers)
            if collab_resp.status_code == 204:
                target_role = "Direct Collaborator"
            else:
                commits_url = f"https://api.github.com/repos/{full_repo_path}/commits?author={target_username}&per_page=1"
                commits_resp = requests.get(commits_url, headers=headers)
                if commits_resp.status_code == 200 and len(commits_resp.json()) > 0:
                    target_role = "External Open-Source Contributor"

        # 3. Fetch Tech Stack
        tech_stack = get_tech_stack(full_repo_path, headers, default_branch)
        
        # 3.5. Fetch Languages Breakdown
        languages_pct = get_language_percentages(full_repo_path, headers)
        
        # 4. Fetch Exact Surviving Lines Percentages via Git Blame (Replaces Unreliable API Stats)
        surviving_code = get_surviving_code_stats(repo_url, full_repo_path, target_username, headers)
        
        # 5. Fetch Recent Commits specifically for Target User
        target_user_commits = get_target_user_commits(full_repo_path, target_username, headers, limit=100)
        
        # 6. Fetch Target User PRs
        target_user_prs = get_target_user_prs(full_repo_path, target_username, headers)

        return {
            "repository_url": repo_url,
            "project_name": project_name,
            "full_repo_name": full_repo_path,
            "primary_language": primary_lang,
            "languages_breakdown": languages_pct,
            "repository_description": repo_desc,
            "identified_tech_stack_dependencies": tech_stack,
            "target_username": target_username,
            "target_user_role": target_role,
            "target_user_code_retention_audit": surviving_code,
            "target_user_recent_commits": target_user_commits,
            "target_user_pr_stats": target_user_prs
        }
    except Exception as e:
        return {"error": f"An unexpected error occurred: {str(e)}"}

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({
            "error": "Please provide both a GitHub repository URL and a Target Username as arguments.",
            "usage": "python github_analyzer.py <repository_url> <target_username>"
        }, indent=4))
        sys.exit(1)
        
    url = sys.argv[1]
    target_user = sys.argv[2]
    
    # Check if git is installed
    try:
        subprocess.run(["git", "--version"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    except FileNotFoundError:
        print(json.dumps({"error": "'git' is not installed locally. Please install git to run line survivability audits."}, indent=4))
        sys.exit(1)
        
    result = analyze_github_repo_by_url(url, target_user)
    
    print(json.dumps(result, indent=4))
