import json
import os
from collections import defaultdict
from datetime import datetime
from typing import Dict, Tuple
import math

GITHUB_AI_ADJUSTMENT_ENABLED = os.getenv("GITHUB_AI_ADJUSTMENT_ENABLED", "false").lower() == "true"


def _r3(value: float) -> float:
    return round(float(value), 3)


def _weights(role: str) -> Dict[str, float]:
    if role.lower() == "internship":
        return {"code_ownership": 0.40, "pr_depth": 0.10, "repo_quality": 0.15, "reality": 0.25, "collaborator": 0.10}
    return {"code_ownership": 0.30, "pr_depth": 0.30, "repo_quality": 0.20, "reality": 0.20, "collaborator": 0.10}


def _core_metric_scores(analysis_data: dict) -> Dict[str, float]:
    retention_audit = analysis_data.get("target_user_code_retention_audit", {})
    code_ownership = 0.0
    pct_str = str(retention_audit.get("surviving_percentage", "0")).replace("%", "")
    try:
        code_ownership = float(pct_str) / 100.0
    except ValueError:
        pass

    pr_stats = analysis_data.get("target_user_pr_stats", {})
    total_prs = pr_stats.get("total_merged_prs", 0)
    prs = pr_stats.get("prs", [])
    pr_depth = 0.0
    if total_prs > 0:
        total_lines = sum(pr.get("additions", 0) + pr.get("deletions", 0) for pr in prs)
        avg_lines = total_lines / len(prs) if prs else 0
        volume_score = min(total_prs / 5.0, 1.0)
        size_score = min(avg_lines / 200.0, 1.0)
        pr_depth = (volume_score * 0.6) + (size_score * 0.4)

    tech_stack = analysis_data.get("identified_tech_stack_dependencies", [])
    total_repo_lines = retention_audit.get("total_project_lines", 0)
    tech_score = min(len(tech_stack) / 10.0, 1.0)
    size_score = min(total_repo_lines / 5000.0, 1.0)
    repo_quality = (tech_score * 0.5) + (size_score * 0.5)

    commits = analysis_data.get("target_user_recent_commits", [])
    reality = 0.0
    if commits:
        commits_by_day = defaultdict(int)
        for c in commits:
            date_str = c.get("date", "")
            if date_str:
                commits_by_day[date_str.split("T")[0]] += 1
        num_commits = len(commits)
        active_days = len(commits_by_day)
        if active_days > 0 and num_commits > 0:
            if active_days == 1:
                entropy_score = 0.0
            else:
                probs = [count / num_commits for count in commits_by_day.values()]
                raw_h = -sum(p * math.log2(p) for p in probs if p > 0)
                entropy_score = raw_h / math.log2(active_days)
            sorted_days = sorted(commits_by_day.keys())
            try:
                first = datetime.strptime(sorted_days[0], "%Y-%m-%d")
                last = datetime.strptime(sorted_days[-1], "%Y-%m-%d")
                lifespan_days = (last - first).days
            except ValueError:
                lifespan_days = 0
            lifespan_score = min(lifespan_days / 30.0, 1.0)
            burst_factor = 1.0 - (max(commits_by_day.values()) / num_commits)
            reality = (entropy_score * 0.4) + (lifespan_score * 0.4) + (burst_factor * 0.2)

    role = analysis_data.get("target_user_role", "")
    collaborator = 0.1
    if role == "Owner":
        collaborator = 1.0
    elif role == "Direct Collaborator":
        collaborator = 0.8
    elif role == "External Open-Source Contributor":
        collaborator = 0.9

    return {
        "code_ownership": max(0.0, min(code_ownership, 1.0)),
        "pr_depth": max(0.0, min(pr_depth, 1.0)),
        "repo_quality": max(0.0, min(repo_quality, 1.0)),
        "reality": max(0.0, min(reality, 1.0)),
        "collaborator": max(0.0, min(collaborator, 1.0)),
    }


def _deterministic_score(metrics: Dict[str, float], role: str) -> Tuple[float, Dict[str, float]]:
    weights = _weights(role)
    score = sum(metrics[k] * weights[k] for k in weights)
    return min(score, 1.0), weights


def _ai_adjustment(analysis_data: dict, role: str) -> Dict[str, object]:
    if not GITHUB_AI_ADJUSTMENT_ENABLED:
        return {"enabled": False, "reason": "GITHUB_AI_ADJUSTMENT_ENABLED is false", "adjustment": 0.0}

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return {"enabled": False, "reason": "OPENAI_API_KEY not set", "adjustment": 0.0}

    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
        compact = {
            "project_name": analysis_data.get("project_name"),
            "primary_language": analysis_data.get("primary_language"),
            "languages_breakdown": analysis_data.get("languages_breakdown", {}),
            "target_user_role": analysis_data.get("target_user_role"),
            "deps_count": len(analysis_data.get("identified_tech_stack_dependencies", [])),
            "retention": analysis_data.get("target_user_code_retention_audit", {}),
            "commits_count": len(analysis_data.get("target_user_recent_commits", [])),
            "pr_stats": analysis_data.get("target_user_pr_stats", {}),
        }
        prompt = (
            "You are scoring a GitHub repo contribution for hiring. "
            "Return strict JSON with keys: adjustment (number between -0.08 and 0.08), "
            "confidence (0..1), rationale (short string). "
            f"Role profile: {role}. Data: {json.dumps(compact)}"
        )
        text = ""
        model_name = os.getenv("GITHUB_AI_MODEL", "gpt-4o-mini")
        # Newer SDK path
        if hasattr(client, "responses"):
            resp = client.responses.create(
                model=model_name,
                input=prompt,
            )
            text = getattr(resp, "output_text", "") or ""
        # Backward-compatible path for openai==1.13.x
        else:
            completion = client.chat.completions.create(
                model=model_name,
                messages=[
                    {
                        "role": "system",
                        "content": "Return strict JSON only.",
                    },
                    {
                        "role": "user",
                        "content": prompt,
                    },
                ],
            )
            text = (completion.choices[0].message.content or "").strip()
        start = text.find("{")
        end = text.rfind("}")
        parsed = json.loads(text[start:end+1]) if start != -1 and end != -1 else {}
        adj = float(parsed.get("adjustment", 0.0))
        adj = max(-0.08, min(0.08, adj))
        return {
            "enabled": True,
            "reason": "ok",
            "adjustment": adj,
            "confidence": float(parsed.get("confidence", 0.0)),
            "rationale": str(parsed.get("rationale", ""))[:240],
            "model": model_name,
        }
    except Exception as exc:
        return {"enabled": False, "reason": f"ai_error: {exc}", "adjustment": 0.0}


def score_repository(analysis_data: dict, role: str = "job") -> dict:
    role = role.lower()
    metrics = _core_metric_scores(analysis_data)
    deterministic, weights = _deterministic_score(metrics, role)
    ai = _ai_adjustment(analysis_data, role)
    final_norm = max(0.0, min(1.0, deterministic + float(ai.get("adjustment", 0.0))))
    final_100 = final_norm * 100.0

    return {
        "overall_contribution_score": _r3(final_norm),
        "overall_contribution_score_100": _r3(final_100),
        "overall_contribution_score_100_str": f"{final_100:.3f}",
        "evaluation_role_profile": role,
        "score_breakdown_normalized": {k: _r3(v) for k, v in metrics.items()},
        "score_breakdown_out_of_100": {k: _r3(v * 100.0) for k, v in metrics.items()},
        "applied_weights": weights,
        "ai_judgement": ai,
    }
