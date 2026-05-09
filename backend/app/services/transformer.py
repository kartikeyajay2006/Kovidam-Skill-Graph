import logging
from typing import Any, Dict, List

logger = logging.getLogger(__name__)


def _safe_float(val: Any, default: Any = None) -> Any:
    if val is None:
        return default
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


def _safe_int(val: Any, default: Any = None) -> Any:
    if val is None:
        return default
    try:
        return int(val)
    except (ValueError, TypeError):
        return default


def transform_resume_data(raw_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Transforms raw resume JSON into structured database-ready data.
    Normalizes nested structures and handles missing fields safely.
    """
    try:
        # 1. Job
        job_raw = raw_data.get("job") or {}
        job = {
            "company_name": job_raw.get("company_name") or None,
            "position_title": job_raw.get("position_title") or None,
            # jobs.role is NOT NULL in DB schema; keep a safe fallback.
            "role": (
                job_raw.get("role")
                or raw_data.get("role")
                or raw_data.get("data", {}).get("github_analysis", {}).get("selected_role_profile")
                or "internship"
            ),
            "required_skills": job_raw.get("required_skills") or [],
            "min_experience_years": _safe_float(job_raw.get("min_experience_years")),
        }

        # Extract nested payload if it comes from /resume/extract endpoint
        c_data = raw_data.get("data", raw_data) or {}

        # 2. Candidate
        profiles = c_data.get("profiles") or {}
        
        # Experience parsing
        exp_years = c_data.get("work_experience_years")
        if not exp_years or exp_years == "N/A":
            exp_years = raw_data.get("fit", {}).get("experience", {}).get("candidate_years")

        candidate = {
            "filename": raw_data.get("filename") or raw_data.get("source_filename") or None,
            "work_experience_years": _safe_float(exp_years),
            "github_username": profiles.get("github_username") or None,
            "codeforces_username": profiles.get("codeforces_username") or None,
            "leetcode_username": profiles.get("leetcode_username") or None,
            "codechef_username": profiles.get("codechef_username") or None,
            "atcoder_username": profiles.get("atcoder_username") or None,
            "kaggle_username": profiles.get("kaggle_username") or None,
        }

        # 3. Candidate Scores
        fit = raw_data.get("fit") or {}
        breakdown = fit.get("breakdown") or {}
        candidate_scores = {
            "skills_match_score": _safe_float(breakdown.get("skills_match_score_100")),
            "github_score": _safe_float(breakdown.get("github_score_100")),
            "experience_score": _safe_float(breakdown.get("experience_score_100")),
            "platform_strength_score": _safe_float(breakdown.get("platform_strength_score_100")),
            "project_evidence_score": _safe_float(breakdown.get("project_evidence_score_100")),
            "profile_completeness_score": _safe_float(breakdown.get("profile_completeness_score_100")),
        }

        # 4. Candidate Job Score
        candidate_job_score = {
            "fit_score": _safe_float(fit.get("fit_score_100")),
            "ranking_reason": fit.get("ranking_reason") or None,
            "notes": fit.get("criteria_used", {}).get("notes") or [],
        }

        # 5. Skills & 6. Candidate Skills
        skills_info = fit.get("skills") or {}
        required_skills = skills_info.get("required") or []
        matched_skills = skills_info.get("matched") or []
        missing_skills = skills_info.get("missing") or []

        all_skills = list(set(required_skills + matched_skills + missing_skills))
        
        candidate_skills = []
        for s in all_skills:
            if s in matched_skills:
                status = "matched"
            elif s in missing_skills:
                status = "missing"
            else:
                status = "unknown"
                
            candidate_skills.append({
                "skill_name": s,
                "status": status,
            })

        # 7. Platform Stats
        raw_platform_stats = c_data.get("platform_stats") or {}
        platform_stats_normalized = []
        for platform_name, stats in raw_platform_stats.items():
            if not isinstance(stats, dict):
                continue
            
            # Skip empty stats or if there's only an error key
            if "error" in stats and len(stats) == 1:
                continue

            username = profiles.get(f"{platform_name}_username") or None
            platform_stats_normalized.append({
                "platform": platform_name,
                "username": username,
                "stats": stats,
            })

        # 8. GitHub Summary
        github_summary_raw = raw_data.get("github_summary") or c_data.get("github_analysis", {}).get("summary") or {}
        github_summary = {
            "repo_count": _safe_int(github_summary_raw.get("repo_count")),
            "overall_score": _safe_float(github_summary_raw.get("overall_score_100")),
        }

        # 9. GitHub Commits
        github_commits = []
        repos = c_data.get("github_analysis", {}).get("repositories", [])
        for repo in repos:
            analysis = repo.get("analysis") or {}
            repo_name = repo.get("repo_url", "").split("github.com/")[-1] if repo.get("repo_url") else ""
            if not repo_name or repo_name == "unknown":
                repo_name = analysis.get("full_repo_name") or analysis.get("project_name") or "unknown"
                
            commits = analysis.get("target_user_recent_commits", [])
            if commits:
                repo_commits = []
                for commit in commits:
                    repo_commits.append({
                        "sha": commit.get("sha"),
                        "message": commit.get("message"),
                        "date": commit.get("date"),
                    })
                github_commits.append({
                    "repo_name": repo_name,
                    "commits": repo_commits
                })

        return {
            "candidate": candidate,
            "job": job,
            "candidate_scores": candidate_scores,
            "candidate_job_score": candidate_job_score,
            "skills": all_skills,
            "candidate_skills": candidate_skills,
            "platform_stats": platform_stats_normalized,
            "github_summary": github_summary,
            "github_commits": github_commits,
        }

    except Exception as e:
        logger.error(f"Error transforming resume data: {e}", exc_info=True)
        # Return fallback empty structure to prevent cascading errors downstream
        return {
            "candidate": {},
            "job": {},
            "candidate_scores": {},
            "candidate_job_score": {},
            "skills": [],
            "candidate_skills": [],
            "platform_stats": [],
            "github_summary": {},
            "github_commits": [],
        }
