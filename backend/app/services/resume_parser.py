import asyncio
import json
import os
import re
from datetime import datetime, timezone
from typing import Any, Dict, List

from pypdf import PdfReader

from app.config import EXTRACTED_RESUMES_DIR, load_environment
from app.integrations.coding_platforms import fetch_all_platform_stats
from app.integrations.github.scanner import scan_resume_for_github
from app.integrations.github.analyzer_core import analyze_github_repo_by_url
from app.integrations.github.scorer import score_repository

load_environment()


URL_PATTERN = re.compile(r"https?://[^\s)>,]+")
YEARS_PATTERN = re.compile(r"(\d+(?:\.\d+)?)\s*\+?\s*(?:years|yrs)", re.IGNORECASE)
GITHUB_REPO_CONCURRENCY = max(1, int(os.getenv("GITHUB_REPO_CONCURRENCY", "3")))


def extract_text_from_pdf(file_path: str) -> str:
    reader = PdfReader(file_path)
    pages_text: List[str] = []
    for page in reader.pages:
        text = page.extract_text() or ""
        if '/Annots' in page:
            for annot in page['/Annots']:
                try:
                    obj = annot.get_object()
                    if '/A' in obj and '/URI' in obj['/A']:
                        text += "\n" + str(obj['/A']['/URI'])
                except Exception:
                    pass
        pages_text.append(text)
    return "\n".join(pages_text)


def _extract_urls(text: str) -> List[str]:
    return sorted(set(URL_PATTERN.findall(text)))


def _extract_handles_and_urls(text: str) -> Dict[str, Any]:
    urls = _extract_urls(text)

    found = {
        "github_url": None,
        "github_username": None,
        "codeforces_url": None,
        "codeforces_username": None,
        "leetcode_url": None,
        "leetcode_username": None,
        "codechef_url": None,
        "codechef_username": None,
        "atcoder_url": None,
        "atcoder_username": None,
        "kaggle_url": None,
        "kaggle_username": None,
    }

    patterns = {
        "codeforces": re.compile(r"https?://(?:www\.)?codeforces\.com/profile/([A-Za-z0-9_.-]+)", re.IGNORECASE),
        "leetcode": re.compile(r"https?://(?:www\.)?leetcode\.com/(?:u/)?([A-Za-z0-9_-]+)/?", re.IGNORECASE),
        "codechef": re.compile(r"https?://(?:www\.)?codechef\.com/users/([A-Za-z0-9_-]+)", re.IGNORECASE),
        "atcoder": re.compile(r"https?://(?:www\.)?atcoder\.jp/users/([A-Za-z0-9_-]+)", re.IGNORECASE),
        "kaggle": re.compile(r"https?://(?:www\.)?kaggle\.com/([A-Za-z0-9_-]+)", re.IGNORECASE),
    }

    for url in urls:
        github_profile_match = re.fullmatch(
            r"https?://(?:www\.)?github\.com/([A-Za-z0-9-]+)/?",
            url,
            re.IGNORECASE,
        )
        if github_profile_match:
            found["github_url"] = url
            found["github_username"] = github_profile_match.group(1)

        for platform, regex in patterns.items():
            match = regex.search(url)
            if not match:
                continue
            username = match.group(1)
            found[f"{platform}_url"] = url
            found[f"{platform}_username"] = username

    return {"urls": urls, **found}


def _extract_work_experience_years(text: str) -> str:
    matches = YEARS_PATTERN.findall(text)
    if not matches:
        return "N/A"
    max_years = max(float(x) for x in matches)
    if max_years.is_integer():
        return str(int(max_years))
    return str(max_years)


async def parse_resume_and_enrich(
    file_path: str,
    role: str = "job",
) -> Dict[str, Any]:
    text = await asyncio.to_thread(extract_text_from_pdf, file_path)
    profile_data = _extract_handles_and_urls(text)

    handles = {
        "codeforces": profile_data.get("codeforces_username"),
        "leetcode": profile_data.get("leetcode_username"),
        "codechef": profile_data.get("codechef_username"),
        "atcoder": profile_data.get("atcoder_username"),
        "kaggle": profile_data.get("kaggle_username"),
    }

    platform_stats = await fetch_all_platform_stats(handles)

    github_scan_result = scan_resume_for_github(
        text,
        force_username=profile_data.get("github_username"),
    )

    github_repos_data = []
    inferred_username = github_scan_result.get("inferred_username")
    repo_scores_selected: List[float] = []

    async def analyze_one_repo(repo: Dict[str, Any], username: str, semaphore: asyncio.Semaphore):
        url = repo.get("url")
        async with semaphore:
            analysis = await asyncio.to_thread(analyze_github_repo_by_url, url, username)
            if "error" in analysis:
                return {
                    "repository": repo,
                    "analysis": analysis,
                    "error": analysis["error"],
                }, None

            selected_score = await asyncio.to_thread(score_repository, analysis, role)
            analysis["scoring"] = {
                "selected_role_profile": role,
                "selected": selected_score,
            }
            score_value = float(selected_score.get("overall_contribution_score_100", 0.0))
            return {
                "repository": repo,
                "analysis": analysis,
            }, score_value

    if inferred_username:
        repos = github_scan_result.get("repositories", [])
        repo_semaphore = asyncio.Semaphore(GITHUB_REPO_CONCURRENCY)
        tasks = [analyze_one_repo(repo, inferred_username, repo_semaphore) for repo in repos]
        analyzed = await asyncio.gather(*tasks, return_exceptions=True)

        for repo, result in zip(repos, analyzed):
            if isinstance(result, Exception):
                github_repos_data.append({
                    "repository": repo,
                    "analysis": {"error": str(result)},
                    "error": str(result),
                })
                continue

            payload, maybe_score = result
            github_repos_data.append(payload)
            if maybe_score is not None:
                repo_scores_selected.append(maybe_score)

    repo_count = len(github_repos_data)
    active_role_score = round(sum(repo_scores_selected) / len(repo_scores_selected), 3) if repo_scores_selected else 0.0

    return {
        "work_experience_years": _extract_work_experience_years(text),
        "profiles": profile_data,
        "platform_stats": platform_stats,
        "github_analysis": {
            "inferred_username": inferred_username,
            "selected_role_profile": role,
            "repositories": github_repos_data,
            "summary": {
                "repo_count": repo_count,
                "overall_score_100": active_role_score,
                "overall_score_100_str": f"{active_role_score:.3f}",
            },
        },
        "raw_text_full": text,
        "raw_text_preview": text[:1500],
    }


def save_extracted_data_to_json(data: Dict[str, Any], source_filename: str) -> str:
    EXTRACTED_RESUMES_DIR.mkdir(parents=True, exist_ok=True)

    safe_name = re.sub(r"[^A-Za-z0-9_.-]", "_", source_filename) if source_filename else "resume"
    now_utc = datetime.now(timezone.utc)
    timestamp = now_utc.strftime("%Y%m%d_%H%M%S")
    output_file = EXTRACTED_RESUMES_DIR / f"{safe_name}_{timestamp}.json"

    payload = {
        "source_filename": source_filename,
        "saved_at_utc": now_utc.isoformat().replace("+00:00", "Z"),
        "data": data,
    }

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    return str(output_file)
