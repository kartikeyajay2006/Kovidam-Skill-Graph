import os
import tempfile
import asyncio
import re
import json
import uuid
import time
import logging
from typing import Literal

from fastapi import FastAPI, File, Form, HTTPException, UploadFile

from app.config import load_environment
from app.services.resume_parser import parse_resume_and_enrich, save_extracted_data_to_json
from app.services.transformer import transform_resume_data
from app.services.db_writer import save_to_db
from app.utils.hash_utils import generate_resume_hash
from app.schemas.shortlist_response import ShortlistResponse

load_environment()

app = FastAPI(title="Kovidam Skill Graph API")
logger = logging.getLogger("kovidam.shortlist")
logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logging.getLogger("pypdf._reader").setLevel(logging.ERROR)

# Limit in-process resume parsing concurrency. Default: 2 at a time.
RESUME_CONCURRENCY = max(1, int(os.getenv("RESUME_CONCURRENCY", "2")))
resume_semaphore = asyncio.Semaphore(RESUME_CONCURRENCY)
NOTES_AI_TIMEOUT_SECONDS = float(os.getenv("NOTES_AI_TIMEOUT_SECONDS", "1.8"))
API_VERSION = os.getenv("SHORTLIST_API_VERSION", "v1.0.0")
SCORING_VERSION = os.getenv("SHORTLIST_SCORING_VERSION", "v1.1.0")
POLICY_VERSION = os.getenv("SHORTLIST_POLICY_VERSION", "v1.1.0")
SHORTLIST_INCLUDE_LEGACY_KEYS = os.getenv("SHORTLIST_INCLUDE_LEGACY_KEYS", "true").lower() == "true"
EXPERIENCE_KEYWORDS = [
    "intern",
    "internship",
    "software engineer",
    "developer",
    "full stack",
    "backend",
    "frontend",
    "sde",
    "work experience",
    "employment",
]
LEADERSHIP_KEYWORDS = [
    "led", "owned", "mentored", "managed", "architected", "drove", "spearheaded",
    "designed end-to-end", "initiated", "coordinated",
]
IMPACT_KEYWORDS = [
    "reduced", "improved", "increased", "optimized", "scaled", "decreased",
    "latency", "throughput", "uptime", "reliability", "performance", "cost",
]
OWNERSHIP_KEYWORDS = [
    "production", "deployed", "on-call", "sla", "slo", "microservices",
    "ci/cd", "kubernetes", "distributed system", "monitoring", "observability",
]
INTERNSHIP_CREDIBILITY_KEYWORDS = [
    "internship", "intern", "research intern", "summer intern", "winter intern",
    "ppo", "pre-placement offer", "return offer",
]
EXPERIENCE_AI_TIMEOUT_SECONDS = float(os.getenv("EXPERIENCE_AI_TIMEOUT_SECONDS", "2.2"))
EXPERIENCE_AI_BLEND_WEIGHT = max(0.0, min(1.0, float(os.getenv("EXPERIENCE_AI_BLEND_WEIGHT", "0.55"))))


@app.get("/")
async def root():
    return {
        "message": "Welcome to Kovidam Skill Graph API",
        "resume_concurrency": RESUME_CONCURRENCY,
    }


async def _process_resume_file(file: UploadFile, role: str):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail=f"Only PDF files are supported: {file.filename}")

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        resume_hash = generate_resume_hash(content)
        trace_id = str(uuid.uuid4())

        async with resume_semaphore:
            result = await parse_resume_and_enrich(tmp_path, role=role)

        saved_json_path = save_extracted_data_to_json(result, file.filename)

        return {
            "filename": file.filename,
            "extracted": result,
            "saved_json_path": saved_json_path,
            "trace_id": trace_id,
            "resume_hash": resume_hash,
        }
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)


def _to_float(value, default: float = 0.0) -> float:
    try:
        return float(value)
    except Exception:
        return default


def _normalize_text(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip().lower())


def _skill_match_score(required_skills: list[str], extracted: dict) -> tuple[float, list[str], list[str]]:
    if not required_skills:
        return 1.0, [], []

    # Anti-gaming policy:
    # Do not trust plain resume text for required skill matching.
    # Use stronger evidence from GitHub repo analysis only.
    repos = extracted.get("github_analysis", {}).get("repositories", [])
    tech_tokens = set()
    for repo in repos:
        analysis = repo.get("analysis", {})
        for dep in analysis.get("identified_tech_stack_dependencies", []) or []:
            dep_norm = _normalize_text(str(dep))
            if dep_norm:
                tech_tokens.add(dep_norm)

    matched = []
    missing = []
    for skill in required_skills:
        s = _normalize_text(skill)
        if not s:
            continue
        in_tech = any(s == t or s in t or t in s for t in tech_tokens)
        if in_tech:
            matched.append(skill)
        else:
            missing.append(skill)

    denominator = max(1, len([s for s in required_skills if _normalize_text(s)]))
    return len(matched) / denominator, matched, missing


def _platform_strength_score(platform_stats: dict) -> float:
    # Conservative deterministic score from available platforms only.
    signals = []

    cf = platform_stats.get("codeforces") or {}
    if isinstance(cf, dict) and cf.get("max_rating") is not None:
        signals.append(min(_to_float(cf.get("max_rating")) / 2200.0, 1.0))

    lc = platform_stats.get("leetcode") or {}
    if isinstance(lc, dict):
        solved = _to_float(lc.get("total_solved") or lc.get("problems_solved") or 0)
        if solved > 0:
            signals.append(min(solved / 800.0, 1.0))

    cc = platform_stats.get("codechef") or {}
    if isinstance(cc, dict) and cc.get("highest_rating") is not None:
        signals.append(min(_to_float(cc.get("highest_rating")) / 2500.0, 1.0))

    ac = platform_stats.get("atcoder") or {}
    if isinstance(ac, dict) and ac.get("highest_rating") is not None:
        signals.append(min(_to_float(ac.get("highest_rating")) / 2400.0, 1.0))

    kg = platform_stats.get("kaggle") or {}
    if isinstance(kg, dict):
        comps = _to_float(kg.get("competitions") or kg.get("competitions_count") or 0)
        if comps > 0:
            signals.append(min(comps / 20.0, 1.0))

    if not signals:
        return 0.0
    return sum(signals) / len(signals)


def _profile_completeness_score(extracted: dict) -> float:
    profiles = extracted.get("profiles", {}) or {}
    keys = [
        "github_username",
        "codeforces_username",
        "leetcode_username",
        "codechef_username",
        "atcoder_username",
        "kaggle_username",
    ]
    present = sum(1 for k in keys if profiles.get(k))
    return present / float(len(keys))


def _project_evidence_score(extracted: dict) -> float:
    repos = extracted.get("github_analysis", {}).get("repositories", []) or []
    if not repos:
        return 0.0
    repo_count_score = min(len(repos) / 5.0, 1.0)
    valid_analysis = sum(1 for r in repos if "error" not in (r.get("analysis") or {}))
    quality_score = valid_analysis / float(len(repos))
    return (repo_count_score * 0.6) + (quality_score * 0.4)


def _json_log(event: str, payload: dict) -> None:
    logger.info(json.dumps({"event": event, **payload}, ensure_ascii=False))


def _policy_config(role: str) -> dict:
    role_l = (role or "internship").lower()
    job_min_exp_quality = _to_float(os.getenv("JOB_MIN_EXPERIENCE_QUALITY_SCORE_100", "0"), 0.0)
    if role_l == "internship":
        return {
            "weights": {
                "skills": _to_float(os.getenv("INTERN_WEIGHT_SKILLS", "0.34"), 0.34),
                "github": _to_float(os.getenv("INTERN_WEIGHT_GITHUB", "0.21"), 0.21),
                "experience": _to_float(os.getenv("INTERN_WEIGHT_EXPERIENCE", "0.09"), 0.09),
                "platform": _to_float(os.getenv("INTERN_WEIGHT_PLATFORM", "0.14"), 0.14),
                "projects": _to_float(os.getenv("INTERN_WEIGHT_PROJECTS", "0.08"), 0.08),
                "profile": _to_float(os.getenv("INTERN_WEIGHT_PROFILE", "0.02"), 0.02),
                "experience_quality": _to_float(os.getenv("INTERN_WEIGHT_EXPERIENCE_QUALITY", "0.12"), 0.12),
            },
            "thresholds": {
                "min_skill_match_pct": 0.0,
                "min_github_score_100": 0.0,
                "min_experience_quality_score_100": 0.0,
            },
        }
    return {
        "weights": {
            "skills": _to_float(os.getenv("JOB_WEIGHT_SKILLS", "0.27"), 0.27),
            "github": _to_float(os.getenv("JOB_WEIGHT_GITHUB", "0.20"), 0.20),
            "experience": _to_float(os.getenv("JOB_WEIGHT_EXPERIENCE", "0.19"), 0.19),
            "platform": _to_float(os.getenv("JOB_WEIGHT_PLATFORM", "0.08"), 0.08),
            "projects": _to_float(os.getenv("JOB_WEIGHT_PROJECTS", "0.04"), 0.04),
            "profile": _to_float(os.getenv("JOB_WEIGHT_PROFILE", "0.02"), 0.02),
            "experience_quality": _to_float(os.getenv("JOB_WEIGHT_EXPERIENCE_QUALITY", "0.20"), 0.20),
        },
        "thresholds": {
            "min_skill_match_pct": _to_float(os.getenv("JOB_MIN_SKILL_MATCH_PCT", "55"), 55.0),
            "min_github_score_100": _to_float(os.getenv("JOB_MIN_GITHUB_SCORE_100", "35"), 35.0),
            "min_experience_quality_score_100": job_min_exp_quality,
        },
    }


def _role_weights(role: str) -> dict:
    return _policy_config(role)["weights"]


def _role_thresholds(role: str, min_experience_years: float) -> dict:
    base = _policy_config(role)["thresholds"]
    if role.lower() == "job":
        return {
            "min_skill_match_pct": base["min_skill_match_pct"],
            "min_github_score_100": base["min_github_score_100"],
            "min_experience_years": min_experience_years,
            "min_experience_quality_score_100": base["min_experience_quality_score_100"],
        }
    return {
        "min_skill_match_pct": base["min_skill_match_pct"],
        "min_github_score_100": base["min_github_score_100"],
        "min_experience_years": min_experience_years,
        "min_experience_quality_score_100": base["min_experience_quality_score_100"],
    }


def _count_keyword_hits(text: str, keywords: list[str]) -> int:
    return sum(1 for k in keywords if k in text)


def _ai_experience_quality_score(text: str, role_l: str) -> tuple[float | None, dict]:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None, {"ai_used": False, "ai_reason": "missing_openai_api_key"}

    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key, timeout=EXPERIENCE_AI_TIMEOUT_SECONDS)
        prompt_payload = {
            "role_profile": role_l,
            "resume_excerpt": text[:3500],
            "task": (
                "Score candidate experience quality from 0 to 100 only from evidence in text. "
                "Prioritize ownership, impact, complexity, reliability signals, team collaboration, and progression. "
                "Do not use hardcoded company prestige lists. Unknown companies are neutral."
            ),
            "required_json_schema": {
                "experience_quality_score_100": "number",
                "confidence_100": "number",
                "reasoning": "string<=220",
            },
        }
        resp = client.chat.completions.create(
            model=os.getenv("EXPERIENCE_AI_MODEL", "gpt-4o-mini"),
            temperature=0,
            messages=[
                {
                    "role": "system",
                    "content": "You are a strict ATS evaluator. Return JSON only with required keys.",
                },
                {"role": "user", "content": json.dumps(prompt_payload)},
            ],
        )
        content = (resp.choices[0].message.content or "").strip()
        start, end = content.find("{"), content.rfind("}")
        parsed = json.loads(content[start:end + 1]) if start != -1 and end != -1 else {}
        score_100 = _to_float(parsed.get("experience_quality_score_100"), -1.0)
        confidence_100 = _to_float(parsed.get("confidence_100"), 0.0)
        reasoning = str(parsed.get("reasoning") or "").strip()[:220]
        if score_100 < 0:
            return None, {"ai_used": False, "ai_reason": "invalid_model_output"}
        return max(0.0, min(1.0, score_100 / 100.0)), {
            "ai_used": True,
            "ai_confidence_100": round(max(0.0, min(100.0, confidence_100)), 3),
            "ai_reasoning": reasoning,
        }
    except Exception as exc:
        return None, {"ai_used": False, "ai_reason": f"ai_error:{type(exc).__name__}"}


def _experience_quality_score(extracted: dict, role: str) -> tuple[float, dict]:
    text = _normalize_text(extracted.get("raw_text_preview", ""))
    years = _to_float(extracted.get("work_experience_years", "0"), 0.0)
    role_l = (role or "job").lower()

    keyword_hits = _count_keyword_hits(text, EXPERIENCE_KEYWORDS)
    keyword_score = min(keyword_hits / 5.0, 1.0)

    leadership_hits = _count_keyword_hits(text, LEADERSHIP_KEYWORDS)
    leadership_score = min(leadership_hits / 4.0, 1.0)

    impact_hits = _count_keyword_hits(text, IMPACT_KEYWORDS)
    impact_score = min(impact_hits / 5.0, 1.0)

    ownership_hits = _count_keyword_hits(text, OWNERSHIP_KEYWORDS)
    ownership_score = min(ownership_hits / 5.0, 1.0)

    internship_hits = _count_keyword_hits(text, INTERNSHIP_CREDIBILITY_KEYWORDS)
    internship_score = min(internship_hits / 3.0, 1.0)

    # Detect quantified impact patterns: percentages, x multipliers, and absolute numbers.
    quant_patterns = [
        r"\b\d+(\.\d+)?\s*%",
        r"\b\d+(\.\d+)?x\b",
        r"\b\d{2,}\b",
    ]
    quant_hits = 0
    for p in quant_patterns:
        quant_hits += len(re.findall(p, text))
    quant_score = min(quant_hits / 6.0, 1.0)

    if role_l == "job":
        years_score = min(years / 4.0, 1.0)
        deterministic = (
            (years_score * 0.23)
            + (leadership_score * 0.20)
            + (impact_score * 0.21)
            + (ownership_score * 0.21)
            + (quant_score * 0.10)
            + (keyword_score * 0.05)
        )
    else:
        years_score = min(years / 2.0, 1.0)
        deterministic = (
            (years_score * 0.16)
            + (internship_score * 0.20)
            + (impact_score * 0.24)
            + (ownership_score * 0.19)
            + (quant_score * 0.10)
            + (keyword_score * 0.11)
        )

    ai_score, ai_meta = _ai_experience_quality_score(text, role_l)
    if ai_score is None:
        final = deterministic
    else:
        final = ((1.0 - EXPERIENCE_AI_BLEND_WEIGHT) * deterministic) + (EXPERIENCE_AI_BLEND_WEIGHT * ai_score)

    return final, {
        "role_profile": role_l,
        "scoring_mode": "ai_blended_experience_intelligence",
        "years_score_100": round(years_score * 100.0, 3),
        "keyword_score_100": round(keyword_score * 100.0, 3),
        "impact_signal_score_100": round(impact_score * 100.0, 3),
        "ownership_signal_score_100": round(ownership_score * 100.0, 3),
        "quantified_impact_score_100": round(quant_score * 100.0, 3),
        "internship_credibility_score_100": round(internship_score * 100.0, 3),
        "deterministic_experience_quality_score_100": round(deterministic * 100.0, 3),
        "ai_experience_quality_score_100": None if ai_score is None else round(ai_score * 100.0, 3),
        "ai_blend_weight": EXPERIENCE_AI_BLEND_WEIGHT,
        "ai_meta": ai_meta,
        "signal_hits": {
            "experience_keywords": keyword_hits,
            "leadership_keywords": leadership_hits,
            "impact_keywords": impact_hits,
            "ownership_keywords": ownership_hits,
            "internship_keywords": internship_hits,
            "quantified_impact_patterns": quant_hits,
        },
    }


def _parse_csv_list(value: str) -> list[str]:
    return [s.strip() for s in (value or "").split(",") if s.strip()]


def _normalize_skill_set(skills: list[str]) -> set[str]:
    return {_normalize_text(s) for s in skills if _normalize_text(s)}


def _build_eligibility(role: str, fit: dict, must_have_skills: list[str], thresholds: dict) -> tuple[bool, list[str], dict]:
    matched_norm = _normalize_skill_set(fit.get("skills", {}).get("matched", []))
    missing_must_have = [s for s in must_have_skills if _normalize_text(s) not in matched_norm]
    rejection_reasons = []

    skill_match_score_100 = _to_float(fit.get("breakdown", {}).get("skills_match_score_100"), 0.0)
    github_score_100 = _to_float(fit.get("breakdown", {}).get("github_score_100"), 0.0)
    experience_years = _to_float(fit.get("experience", {}).get("candidate_years"), 0.0)
    experience_quality_score_100 = _to_float(fit.get("breakdown", {}).get("experience_quality_score_100"), 0.0)

    if missing_must_have:
        rejection_reasons.append(f"Missing must-have skills: {', '.join(missing_must_have)}")

    if role == "job":
        if skill_match_score_100 < thresholds["min_skill_match_pct"]:
            rejection_reasons.append(
                f"Skill match {skill_match_score_100:.3f} below minimum {thresholds['min_skill_match_pct']:.3f}"
            )
        if github_score_100 < thresholds["min_github_score_100"]:
            rejection_reasons.append(
                f"GitHub score {github_score_100:.3f} below minimum {thresholds['min_github_score_100']:.3f}"
            )
        if experience_years < thresholds["min_experience_years"]:
            rejection_reasons.append(
                f"Experience {experience_years:.3f} years below minimum {thresholds['min_experience_years']:.3f}"
            )
        min_exp_quality = _to_float(thresholds.get("min_experience_quality_score_100"), 0.0)
        if experience_quality_score_100 < min_exp_quality:
            rejection_reasons.append(
                f"Experience quality score {experience_quality_score_100:.3f} below minimum {min_exp_quality:.3f}"
            )

    decision_log = {
        "role_profile": role,
        "must_have_skills": must_have_skills,
        "missing_must_have_skills": missing_must_have,
        "applied_thresholds": thresholds,
        "candidate_metrics": {
            "skills_match_score_100": skill_match_score_100,
            "github_score_100": github_score_100,
            "experience_years": experience_years,
            "experience_quality_score_100": _to_float(
                fit.get("breakdown", {}).get("experience_quality_score_100"), 0.0
            ),
        },
    }
    return len(rejection_reasons) == 0, rejection_reasons, decision_log


def _summarize_candidate_for_table(candidate: dict) -> dict:
    fit = candidate.get("fit", {}) or {}
    decision_log = fit.get("ranking_decision_log", {}) or {}
    experience = fit.get("experience", {}) or {}
    summary = {
        "filename": candidate.get("filename"),
        "rank": candidate.get("rank"),
        "eligible": bool(candidate.get("eligible")),
        "fit_score_100": fit.get("fit_score_100"),
        "rejection_reasons": candidate.get("rejection_reasons", []),
        "ranking_decision_log": decision_log,
        "experience": {
            "candidate_years": experience.get("candidate_years"),
            "required_min_years": experience.get("required_min_years"),
            "quality_meta": experience.get("quality_meta", {}),
        },
    }
    return summary


def _top_ranking_insights(shortlisted: list[dict], rejected: list[dict]) -> list[str]:
    eligible_pool = shortlisted
    considered_pool = shortlisted + rejected
    insights = []

    if eligible_pool:
        top = eligible_pool[0]
        top_fit = top.get("fit_score_100", 0.0) or 0.0
        top_file = top.get("filename", "unknown")
        top_skills = (
            ((top.get("ranking_decision_log", {}) or {}).get("candidate_metrics", {}) or {})
            .get("skills_match_score_100", 0.0)
        )
        insights.append(
            f"Top ranked candidate is {top_file} with fit_score_100={top_fit:.3f} and skills_match_score_100={top_skills:.3f}."
        )
    else:
        insights.append("No candidate passed eligibility filters, so no ranked shortlist was produced.")

    if considered_pool:
        must_have_failures = 0
        threshold_failures = 0
        for c in considered_pool:
            reasons = c.get("rejection_reasons", []) or []
            if any("Missing must-have skills" in r for r in reasons):
                must_have_failures += 1
            if any("below minimum" in r for r in reasons):
                threshold_failures += 1
        insights.append(
            f"Hard-filter impact: must-have skill mismatches caused {must_have_failures} rejections; threshold checks caused {threshold_failures} rejections."
        )
    else:
        insights.append("No candidates were processed in this run.")

    if shortlisted:
        avg_fit = sum((c.get("fit_score_100") or 0.0) for c in shortlisted) / len(shortlisted)
        avg_exp = sum((c.get("experience", {}).get("candidate_years") or 0.0) for c in shortlisted) / len(shortlisted)
        insights.append(
            f"Shortlisted cohort averages: fit_score_100={avg_fit:.3f}, experience_years={avg_exp:.3f}."
        )
    else:
        insights.append("Shortlisted cohort averages are unavailable because zero candidates were eligible.")

    return insights[:3]


def _fallback_notes(role: str, fit: dict) -> list[str]:
    b = fit.get("breakdown", {})
    skills = b.get("skills_match_score_100", 0.0)
    github = b.get("github_score_100", 0.0)
    exp = b.get("experience_score_100", 0.0)
    if role.lower() == "internship":
        return [
            f"Skills match is {skills:.1f}/100 and is the strongest internship signal.",
            f"GitHub contribution signal is {github:.1f}/100; project depth can improve this.",
            f"Experience readiness is {exp:.1f}/100 and weighted lighter for internship roles.",
        ]
    return [
        f"Skills match is {skills:.1f}/100 and directly impacts job fit.",
        f"GitHub contribution is {github:.1f}/100, reflecting delivery and code ownership.",
        f"Experience alignment is {exp:.1f}/100 and is a major factor for job roles.",
    ]


def _generate_ai_notes_sync(role: str, fit: dict, extracted: dict) -> list[str]:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return _fallback_notes(role, fit)
    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
        payload = {
            "role": role,
            "fit": fit,
            "github_summary": extracted.get("github_analysis", {}).get("summary", {}),
            "experience_years": extracted.get("work_experience_years", "N/A"),
        }
        prompt = (
            "Return strict JSON: {\"notes\":[\"...\",\"...\",\"...\"]}. "
            "Notes must be factual, concise, non-generic, and based only on the provided data. "
            "No praise/buttering. No extra keys. Data: " + json.dumps(payload)
        )
        resp = client.chat.completions.create(
            model=os.getenv("NOTES_AI_MODEL", "gpt-4o-mini"),
            messages=[
                {"role": "system", "content": "You are a strict hiring analyst. Output JSON only."},
                {"role": "user", "content": prompt},
            ],
        )
        text = (resp.choices[0].message.content or "").strip()
        start = text.find("{")
        end = text.rfind("}")
        parsed = json.loads(text[start:end+1]) if start != -1 and end != -1 else {}
        notes = parsed.get("notes", [])
        if isinstance(notes, list):
            cleaned = [str(n).strip()[:180] for n in notes if str(n).strip()]
            if cleaned:
                return cleaned[:3]
    except Exception:
        pass
    return _fallback_notes(role, fit)


async def _generate_ai_notes(role: str, fit: dict, extracted: dict) -> list[str]:
    try:
        return await asyncio.wait_for(
            asyncio.to_thread(_generate_ai_notes_sync, role, fit, extracted),
            timeout=NOTES_AI_TIMEOUT_SECONDS,
        )
    except Exception:
        return _fallback_notes(role, fit)


def _candidate_company_fit(
    extracted: dict,
    required_skills: list[str],
    min_experience_years: float,
    role: str,
) -> dict:
    exp_str = extracted.get("work_experience_years", "N/A")
    exp = _to_float(exp_str, 0.0)
    # If minimum experience is not specified, still reward real experience
    # instead of giving every candidate full marks.
    if min_experience_years > 0:
        exp_score = 1.0 if exp >= min_experience_years else (exp / min_experience_years)
    else:
        role_l = (role or "internship").lower()
        # Jobs: stronger experience expectation. Internships: gentler scaling.
        neutral_target_years = 2.0 if role_l == "job" else 1.0
        exp_score = min(exp / neutral_target_years, 1.0)

    skill_score, matched_skills, missing_skills = _skill_match_score(required_skills, extracted)

    github_summary = extracted.get("github_analysis", {}).get("summary", {})
    github_score_100 = _to_float(github_summary.get("overall_score_100"), 0.0)
    github_score = max(0.0, min(github_score_100 / 100.0, 1.0))

    platform_score = _platform_strength_score(extracted.get("platform_stats", {}) or {})
    profile_score = _profile_completeness_score(extracted)
    project_evidence = _project_evidence_score(extracted)
    experience_quality, experience_quality_meta = _experience_quality_score(extracted, role)
    weights = _role_weights(role)

    final = (
        (skill_score * weights["skills"])
        + (github_score * weights["github"])
        + (exp_score * weights["experience"])
        + (platform_score * weights["platform"])
        + (project_evidence * weights["projects"])
        + (profile_score * weights["profile"])
        + (experience_quality * weights["experience_quality"])
    )

    final_100 = round(final * 100.0, 3)

    return {
        "fit_score_100": final_100,
        "fit_score_100_str": f"{final_100:.3f}",
        "breakdown": {
            "skills_match_score_100": round(skill_score * 100.0, 3),
            "github_score_100": round(github_score * 100.0, 3),
            "experience_score_100": round(exp_score * 100.0, 3),
            "platform_strength_score_100": round(platform_score * 100.0, 3),
            "project_evidence_score_100": round(project_evidence * 100.0, 3),
            "profile_completeness_score_100": round(profile_score * 100.0, 3),
            "experience_quality_score_100": round(experience_quality * 100.0, 3),
        },
        "criteria_used": {
            "role_profile": role.lower(),
            "weights": weights,
            "notes": [],
        },
        "skills": {
            "required": required_skills,
            "matched": matched_skills,
            "missing": missing_skills,
        },
        "experience": {
            "required_min_years": min_experience_years,
            "candidate_years": exp,
            "quality_meta": experience_quality_meta,
        },
        "ranking_reason": (
            f"Matched {len(matched_skills)}/{len(required_skills) if required_skills else 0} required skills, "
            f"GitHub {round(github_score * 100.0, 1)}, "
            f"Experience {round(exp, 2)} years, "
            f"Platform {round(platform_score * 100.0, 1)}."
        ),
    }


@app.post("/resume/extract")
async def extract_resume(
    file: UploadFile = File(...),
    role: Literal["job", "internship"] = Form(default="job"),
):
    try:
        return await _process_resume_file(file, role)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/resume/extract/batch")
async def extract_resume_batch(
    files: list[UploadFile] = File(...),
    role: Literal["job", "internship"] = Form(default="job"),
):
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")

    tasks = [asyncio.create_task(_process_resume_file(file, role)) for file in files]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    response_items = []
    for file, outcome in zip(files, results):
        if isinstance(outcome, Exception):
            response_items.append({
                "filename": file.filename,
                "ok": False,
                "error": str(outcome),
            })
        else:
            response_items.append({
                "filename": file.filename,
                "ok": True,
                "result": outcome,
            })

    return {
        "count": len(files),
        "resume_concurrency": RESUME_CONCURRENCY,
        "items": response_items,
    }


@app.post("/hiring/shortlist", response_model=ShortlistResponse)
async def hiring_shortlist(
    files: list[UploadFile] = File(...),
    role: Literal["job", "internship"] = Form(default="internship"),
    company_name: str = Form(...),
    position_title: str = Form(...),
    required_skills_csv: str = Form(...),
    must_have_skills_csv: str = Form(default=""),
    min_experience_years: float = Form(default=0.0),
):
    started_at = time.time()
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")

    required_skills = _parse_csv_list(required_skills_csv)
    must_have_skills = _parse_csv_list(must_have_skills_csv)
    thresholds = _role_thresholds(role, min_experience_years)

    tasks = [asyncio.create_task(_process_resume_file(file, role)) for file in files]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    candidates = []
    for file, outcome in zip(files, results):
        if isinstance(outcome, Exception):
            candidates.append({
                "filename": file.filename,
                "ok": False,
                "error": str(outcome),
            })
            continue

        extracted = outcome.get("extracted", {})
        fit = _candidate_company_fit(extracted, required_skills, min_experience_years, role)
        fit["criteria_used"]["notes"] = await _generate_ai_notes(role, fit, extracted)
        eligible, rejection_reasons, decision_log = _build_eligibility(
            role=role,
            fit=fit,
            must_have_skills=must_have_skills,
            thresholds=thresholds,
        )
        fit["ranking_decision_log"] = decision_log

        raw_for_transform = {
            "filename": outcome.get("filename") or file.filename,
            "data": extracted,
            "job": {
                "company_name": company_name,
                "position_title": position_title,
                "role": role,
                "required_skills": required_skills,
                "min_experience_years": min_experience_years,
            },
            "fit": fit,
        }
        structured_data = transform_resume_data(raw_for_transform)
        trace_id = outcome.get("trace_id")
        resume_hash = outcome.get("resume_hash")
        
        # Persist parsed data to PostgreSQL now that we have job and fit context
        db_result = await asyncio.to_thread(save_to_db, structured_data, trace_id, resume_hash)

        candidates.append({
            "filename": outcome.get("filename") or file.filename,
            "ok": True,
            "saved_json_path": outcome.get("saved_json_path"),
            "eligible": eligible,
            "rejection_reasons": rejection_reasons,
            "fit": fit,
            "profiles": extracted.get("profiles", {}),
            "github_summary": extracted.get("github_analysis", {}).get("summary", {}),
            "platform_stats": extracted.get("platform_stats", {}),
            "db_result": db_result,
        })

    ranked = sorted(
        [c for c in candidates if c.get("ok") and c.get("eligible")],
        key=lambda c: c.get("fit", {}).get("fit_score_100", 0.0),
        reverse=True,
    )

    for idx, candidate in enumerate(ranked, start=1):
        candidate["rank"] = idx

    failed = [c for c in candidates if not c.get("ok")]
    rejected = [c for c in candidates if c.get("ok") and not c.get("eligible")]

    shortlisted_table = [_summarize_candidate_for_table(c) for c in ranked]
    rejected_table = [_summarize_candidate_for_table(c) for c in rejected]
    failed_table = [
        {
            "filename": c.get("filename"),
            "error": c.get("error"),
        }
        for c in failed
    ]
    top_3_insights = _top_ranking_insights(shortlisted_table, rejected_table)

    response_payload = {
        "api_version": API_VERSION,
        "scoring_version": SCORING_VERSION,
        "policy_version": POLICY_VERSION,
        "job_summary": {
            "company_name": company_name,
            "position_title": position_title,
            "role": role,
            "required_skills": required_skills,
            "must_have_skills": must_have_skills,
            "min_experience_years": min_experience_years,
            "applied_thresholds": thresholds,
        },
        "counts": {
            "uploaded": len(files),
            "ranked": len(ranked),
            "rejected": len(rejected),
            "failed": len(failed),
        },
        "shortlisted": shortlisted_table,
        "rejected": rejected_table,
        "failed": failed_table,
        "top_3_insights_from_ranking_decision_log": top_3_insights,
    }
    if SHORTLIST_INCLUDE_LEGACY_KEYS:
        response_payload["ranked_candidates"] = ranked
        response_payload["rejected_candidates"] = rejected
        response_payload["failed_candidates"] = failed
    else:
        response_payload["ranked_candidates"] = []
        response_payload["rejected_candidates"] = []
        response_payload["failed_candidates"] = []

    _json_log(
        "shortlist_completed",
        {
            "role": role,
            "company_name": company_name,
            "position_title": position_title,
            "uploaded": len(files),
            "ranked": len(ranked),
            "rejected": len(rejected),
            "failed": len(failed),
            "duration_ms": round((time.time() - started_at) * 1000.0, 2),
            "api_version": API_VERSION,
            "scoring_version": SCORING_VERSION,
            "policy_version": POLICY_VERSION,
        },
    )
    return response_payload


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)