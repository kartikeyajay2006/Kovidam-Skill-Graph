import os
import tempfile
import asyncio
import re
import json
import math
import uuid
import time
import logging
from typing import Literal
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, Form, HTTPException, UploadFile

from app.config import load_environment
from app.db.postgres.session import init_db
from app.services.resume_parser import parse_resume_and_enrich, save_extracted_data_to_json
from app.services.transformer import transform_resume_data
from app.services.db_writer import save_to_db
from app.utils.hash_utils import generate_resume_hash
from app.schemas.shortlist_response import ShortlistResponse

load_environment()
logger = logging.getLogger("kovidam.shortlist")
logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))

# Limit in-process resume parsing concurrency. Default: 2 at a time.
RESUME_CONCURRENCY = max(1, int(os.getenv("RESUME_CONCURRENCY", "2")))
resume_semaphore = asyncio.Semaphore(RESUME_CONCURRENCY)
NOTES_AI_TIMEOUT_SECONDS = float(os.getenv("NOTES_AI_TIMEOUT_SECONDS", "1.8"))
API_VERSION = os.getenv("SHORTLIST_API_VERSION", "v1.0.0")
SCORING_VERSION = os.getenv("SHORTLIST_SCORING_VERSION", "v1.2.0")
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
COMPANY_SIGNAL_TIERS = {
    # Tier-1 global product and high bar engineering orgs
    1.00: [
        "google", "microsoft", "amazon", "meta", "apple", "netflix", "nvidia", "openai",
        "deepmind", "anthropic", "stripe", "databricks", "snowflake", "airbnb", "uber",
    ],
    # Tier-2 globally respected tech/product or strong platform orgs
    0.78: [
        "adobe", "oracle", "salesforce", "atlassian", "palantir", "twilio", "intuit",
        "servicenow", "cloudflare", "shopify", "ibm", "intel", "sap", "linkedin",
    ],
    # Tier-3 strong regional or scaled engineering companies
    0.62: [
        "flipkart", "swiggy", "zomato", "razorpay", "phonepe", "paytm", "cred", "meesho",
        "oyo", "freshworks", "zoho", "upstox", "groww", "postman",
    ],
    # Tier-4 large service-heavy orgs (still relevant, lower signal for product depth)
    0.45: [
        "infosys", "tcs", "wipro", "hcl", "accenture", "cognizant", "capgemini", "tech mahindra",
    ],
}
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
ACHIEVEMENT_KEYWORDS = [
    "google summer of code",
    "gsoc",
    "icpc",
    "ieeextreme",
    "hackathon winner",
    "global rank",
    "air ",
    "kaggle master",
    "kaggle grandmaster",
    "open source program",
]
ROLE_FAMILY_KEYWORDS = {
    "backend": {
        "backend", "api", "microservice", "microservices", "distributed", "database", "sql",
        "postgresql", "mysql", "fastapi", "django", "flask", "spring", "spring boot", "nodejs",
    },
    "frontend": {
        "frontend", "ui", "ux", "react", "nextjs", "angular", "vue", "typescript", "javascript",
        "web", "css", "html",
    },
    "data_ml": {
        "ml", "machine learning", "deep learning", "llm", "nlp", "computer vision", "kaggle",
        "tensorflow", "pytorch", "scikit", "xgboost", "rag", "genai", "ai",
    },
    "devops": {
        "devops", "infra", "infrastructure", "kubernetes", "docker", "aws", "gcp", "azure",
        "ci/cd", "terraform", "observability", "sre", "cloud",
    },
    "security": {
        "security", "cyber", "threat", "vulnerability", "pentest", "soc", "incident",
        "forensics", "iam", "siem",
    },
}
PROJECT_COMPLEXITY_KEYWORDS = [
    "scalable", "scale", "distributed", "multi-tenant", "multi agent", "orchestration",
    "real-time", "streaming", "pipeline", "microservice", "microservices", "kubernetes",
    "event-driven", "concurrency", "optimization", "low latency", "high throughput",
]
TARGET_DOMAIN_KEYWORDS = {
    "fintech": {"payment", "payments", "banking", "risk", "trading", "fintech"},
    "ai": {"ai", "ml", "llm", "genai", "rag", "machine learning"},
    "data": {"data", "analytics", "pipeline", "warehouse", "bi"},
    "security": {"security", "cyber", "threat", "vulnerability"},
    "cloud": {"cloud", "aws", "gcp", "azure", "distributed"},
}
SKILL_ALIASES = {
    "js": "javascript",
    "node": "nodejs",
    "node.js": "nodejs",
    "express.js": "express",
    "next.js": "nextjs",
    "postgres": "postgresql",
    "py": "python",
    "tf": "tensorflow",
}
SKILL_IMPLICATIONS = {
    "react": {"javascript"},
    "reactjs": {"javascript"},
    "nextjs": {"javascript", "react"},
    "vue": {"javascript"},
    "angular": {"javascript", "typescript"},
    "nodejs": {"javascript"},
    "express": {"javascript", "nodejs"},
    "fastapi": {"python"},
    "django": {"python"},
    "flask": {"python"},
    "pandas": {"python"},
    "numpy": {"python"},
    "pytorch": {"python"},
    "tensorflow": {"python"},
    "spring boot": {"java"},
    "postgresql": {"sql"},
    "mysql": {"sql"},
    "mongodb": {"nosql"},
    "redis": {"nosql"},
}


@asynccontextmanager
async def _lifespan(_: FastAPI):
    try:
        init_db()
    except Exception:
        logger.exception("database_initialization_failed")
        raise
    yield


app = FastAPI(title="Kovidam Skill Graph API", lifespan=_lifespan)


@app.get("/")
async def root():
    return {
        "message": "Welcome to Kovidam Skill Graph API",
        "resume_concurrency": RESUME_CONCURRENCY,
    }


async def _process_resume_file(file: UploadFile, role: str, force_reprocess: bool = False):
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

        # Persist parsed data to PostgreSQL.
        raw_for_transform = {
            "filename": file.filename,
            "data": result,
        }
        structured_data = transform_resume_data(raw_for_transform)
        db_result = await asyncio.to_thread(
            save_to_db,
            structured_data,
            trace_id,
            resume_hash,
            force_reprocess=force_reprocess,
        )

        return {
            "filename": file.filename,
            "extracted": result,
            "saved_json_path": saved_json_path,
            "trace_id": trace_id,
            "resume_hash": resume_hash,
            "db_result": db_result,
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


def _canonical_skill(skill: str) -> str:
    norm = _normalize_text(skill)
    return SKILL_ALIASES.get(norm, norm)


def _expand_skill_with_implications(skill: str) -> set[str]:
    expanded = set()
    queue = [_canonical_skill(skill)]
    while queue:
        cur = queue.pop()
        if not cur or cur in expanded:
            continue
        expanded.add(cur)
        for implied in SKILL_IMPLICATIONS.get(cur, set()):
            canon_implied = _canonical_skill(implied)
            if canon_implied not in expanded:
                queue.append(canon_implied)
    return expanded


def _clamp01(value: float) -> float:
    return max(0.0, min(value, 1.0))


def _safe_int(value, default: int = 0) -> int:
    try:
        if isinstance(value, str):
            value = value.replace(",", "").strip()
        return int(float(value))
    except Exception:
        return default


def _inverse_rank_score(rank_value, worst_rank: int = 200000) -> float:
    rank = _safe_int(rank_value, 0)
    if rank <= 0:
        return 0.0
    bounded = max(1, min(rank, worst_rank))
    log_worst = math.log10(float(worst_rank))
    if log_worst <= 0:
        return 0.0
    return _clamp01(1.0 - (math.log10(float(bounded)) / log_worst))


def _skill_token_variants(skill: str) -> set[str]:
    canon = _canonical_skill(skill)
    variants = {canon}
    if canon == "c++":
        variants.update({"cpp", "c plus plus"})
    return {v for v in variants if v}


def _skill_in_text(text: str, skill: str) -> bool:
    for variant in _skill_token_variants(skill):
        if not variant:
            continue
        pattern = rf"(?<![a-z0-9]){re.escape(variant)}(?![a-z0-9])"
        if re.search(pattern, text):
            return True
    return False


def _token_contains_any(haystack: str, values: set[str]) -> bool:
    for v in values:
        if not v:
            continue
        pattern = rf"(?<![a-z0-9]){re.escape(v)}(?![a-z0-9])"
        if re.search(pattern, haystack):
            return True
    return False


def _normalize_skills_list(skills: list[str]) -> list[str]:
    seen = set()
    out = []
    for s in skills:
        c = _canonical_skill(s)
        if c and c not in seen:
            seen.add(c)
            out.append(c)
    return out


def _extract_candidate_skill_sources(extracted: dict) -> dict:
    repos = extracted.get("github_analysis", {}).get("repositories", []) or []
    github_tokens = set()
    for repo in repos:
        analysis = repo.get("analysis", {}) or {}
        for dep in analysis.get("identified_tech_stack_dependencies", []) or []:
            dep_norm = _canonical_skill(str(dep))
            if dep_norm:
                github_tokens.add(dep_norm)
                github_tokens.update(_expand_skill_with_implications(dep_norm))

    skills_items = (extracted.get("skills_section", {}) or {}).get("items", []) or []
    resume_skill_tokens = set(_normalize_skills_list([str(s) for s in skills_items]))
    for token in list(resume_skill_tokens):
        resume_skill_tokens.update(_expand_skill_with_implications(token))

    projects = (extracted.get("projects_section", {}) or {}).get("items", []) or []
    project_stack_tokens = set()
    project_text_parts = []
    for p in projects:
        if not isinstance(p, dict):
            continue
        for dep in p.get("tech_stack", []) or []:
            dep_norm = _canonical_skill(str(dep))
            if dep_norm:
                project_stack_tokens.add(dep_norm)
                project_stack_tokens.update(_expand_skill_with_implications(dep_norm))
        title = _normalize_text(str(p.get("title") or ""))
        description = _normalize_text(str(p.get("description") or ""))
        highlights = " ".join(_normalize_text(str(h or "")) for h in (p.get("highlights") or []))
        if title:
            project_text_parts.append(title)
        if description:
            project_text_parts.append(description)
        if highlights:
            project_text_parts.append(highlights)

    raw_text = _normalize_text(extracted.get("raw_text_full") or extracted.get("raw_text_preview", ""))
    project_text = _normalize_text(" ".join(project_text_parts))
    return {
        "github_tokens": github_tokens,
        "resume_skill_tokens": resume_skill_tokens,
        "project_stack_tokens": project_stack_tokens,
        "raw_text": raw_text,
        "project_text": project_text,
    }


def _infer_role_context(
    role: str,
    position_title: str,
    company_name: str,
    required_skills: list[str],
    must_have_skills: list[str],
) -> dict:
    role_l = _normalize_text(role)
    title_l = _normalize_text(position_title)
    company_l = _normalize_text(company_name)
    all_skill_tokens = set(_normalize_skills_list(required_skills + must_have_skills))
    role_blob = " ".join([role_l, title_l, company_l, " ".join(all_skill_tokens)])

    families = {}
    for family, keywords in ROLE_FAMILY_KEYWORDS.items():
        hit_count = sum(1 for kw in keywords if kw in role_blob)
        families[family] = _clamp01(hit_count / 4.0)

    target_domain = "general"
    domain_best = 0.0
    for domain, keywords in TARGET_DOMAIN_KEYWORDS.items():
        hits = sum(1 for k in keywords if k in role_blob)
        score = _clamp01(hits / 2.0)
        if score > domain_best:
            domain_best = score
            target_domain = domain

    return {
        "role": role_l,
        "position_title": title_l,
        "company_name": company_l,
        "family_scores": families,
        "target_domain": target_domain,
        "target_domain_score": domain_best,
    }


def _skill_match_score(
    required_skills: list[str],
    extracted: dict,
    must_have_skills: list[str] | None = None,
) -> tuple[float, list[str], list[str], dict]:
    if not required_skills:
        return 1.0, [], [], {"skill_meta": {"coverage_required": 1.0, "coverage_must_have": 1.0}}

    must_have_skills = must_have_skills or []
    sources = _extract_candidate_skill_sources(extracted)
    github_tokens = sources["github_tokens"]
    resume_skill_tokens = sources["resume_skill_tokens"]
    project_stack_tokens = sources["project_stack_tokens"]
    raw_text = sources["raw_text"]
    project_text = sources["project_text"]

    must_have_norm = {_canonical_skill(s) for s in must_have_skills if _canonical_skill(s)}
    required_norm = [_canonical_skill(s) for s in required_skills if _canonical_skill(s)]

    matched = []
    missing = []
    evidence = {}
    weighted_sum = 0.0
    weight_total = 0.0
    matched_required_norm = set()

    for skill in required_skills:
        s = _canonical_skill(skill)
        if not s:
            continue
        required_equivalents = _expand_skill_with_implications(s)
        matched_by_github = any(
            (req == t or req in t or t in req)
            for req in required_equivalents
            for t in github_tokens
        )
        matched_by_project_stack = any(
            (req == t or req in t or t in req)
            for req in required_equivalents
            for t in project_stack_tokens
        )
        matched_by_skill_section = any(
            (req == t or req in t or t in req)
            for req in required_equivalents
            for t in resume_skill_tokens
        )
        matched_by_project_text = _token_contains_any(project_text, required_equivalents)
        matched_by_text = any(_skill_in_text(raw_text, req) for req in required_equivalents)

        # Evidence confidence is intentionally source-weighted:
        # GitHub deps > project stack > explicit skills section > project text > raw text.
        confidence = (
            (1.0 if matched_by_github else 0.0)
            + (0.9 if matched_by_project_stack else 0.0)
            + (0.7 if matched_by_skill_section else 0.0)
            + (0.45 if matched_by_project_text else 0.0)
            + (0.30 if matched_by_text else 0.0)
        )
        skill_score = _clamp01(confidence / 1.35)
        skill_weight = 1.35 if s in must_have_norm else 1.0
        weighted_sum += skill_score * skill_weight
        weight_total += skill_weight

        evidence[skill] = {
            "matched_by_github": matched_by_github,
            "matched_by_project_stack": matched_by_project_stack,
            "matched_by_skills_section": matched_by_skill_section,
            "matched_by_project_text": matched_by_project_text,
            "matched_by_text": matched_by_text,
            "evidence_strength_100": round(skill_score * 100.0, 3),
        }
        if skill_score >= 0.40:
            matched.append(skill)
            matched_required_norm.add(s)
        else:
            missing.append(skill)

    score = (weighted_sum / weight_total) if weight_total > 0 else 0.0
    must_have_total = len(must_have_norm)
    must_have_matched = len(must_have_norm.intersection(matched_required_norm))
    must_have_coverage = (must_have_matched / must_have_total) if must_have_total > 0 else 1.0
    required_coverage = len(matched_required_norm) / max(1, len(required_norm))

    # Must-have is a hard hiring signal. Soft-adjust score even before eligibility filtering.
    score = _clamp01((score * 0.82) + (must_have_coverage * 0.18))

    evidence["skill_meta"] = {
        "coverage_required": round(required_coverage, 4),
        "coverage_must_have": round(must_have_coverage, 4),
        "matched_must_have_count": must_have_matched,
        "total_must_have_count": must_have_total,
        "source_counts": {
            "github_tokens": len(github_tokens),
            "project_stack_tokens": len(project_stack_tokens),
            "skills_section_tokens": len(resume_skill_tokens),
        },
    }
    return score, matched, missing, evidence


def _codeforces_score(cf: dict) -> float:
    rating = _to_float(cf.get("max_rating"), 0.0)
    solved = _to_float(cf.get("problems_solved"), 0.0)
    rating_score = _clamp01((rating - 900.0) / 1400.0)
    solved_score = _clamp01(solved / 900.0)
    return (rating_score * 0.72) + (solved_score * 0.28)


def _leetcode_score(lc: dict) -> float:
    rating = _to_float(lc.get("rating"), 0.0)
    easy = _to_float(lc.get("easy_solved"), 0.0)
    medium = _to_float(lc.get("medium_solved"), 0.0)
    hard = _to_float(lc.get("hard_solved"), 0.0)
    total_solved = _to_float(lc.get("total_solved") or lc.get("problems_solved"), 0.0)
    weighted_solved = (easy * 0.25) + (medium * 1.0) + (hard * 2.5)
    if weighted_solved <= 0 and total_solved > 0:
        weighted_solved = total_solved
    rating_score = _clamp01((rating - 1300.0) / 1300.0)
    solved_score = _clamp01(weighted_solved / 900.0)
    return (rating_score * 0.55) + (solved_score * 0.45)


def _codechef_score(cc: dict) -> float:
    rating = _to_float(cc.get("highest_rating"), 0.0)
    contests = _to_float(cc.get("contests_participated"), 0.0)
    rating_score = _clamp01((rating - 1200.0) / 1300.0)
    consistency_score = _clamp01(contests / 60.0)
    return (rating_score * 0.7) + (consistency_score * 0.3)


def _atcoder_score(ac: dict) -> float:
    rating = _to_float(ac.get("highest_rating"), 0.0)
    contests = _to_float(ac.get("contests_participated"), 0.0)
    rating_score = _clamp01((rating - 600.0) / 1800.0)
    consistency_score = _clamp01(contests / 70.0)
    return (rating_score * 0.7) + (consistency_score * 0.3)


def _kaggle_score(kg: dict) -> float:
    competitions = _to_float(kg.get("competitions") or kg.get("competitions_count"), 0.0)
    notebooks = _to_float(kg.get("notebooks"), 0.0)
    datasets = _to_float(kg.get("datasets"), 0.0)
    medals = kg.get("medals") or {}
    medal_points = (
        (_to_float(medals.get("gold"), 0.0) * 3.0)
        + (_to_float(medals.get("silver"), 0.0) * 2.0)
        + (_to_float(medals.get("bronze"), 0.0) * 1.0)
    )
    rank_score = _inverse_rank_score(kg.get("rank"), worst_rank=200000)
    medal_score = _clamp01(medal_points / 18.0)
    competition_score = _clamp01(competitions / 35.0)
    artifact_score = _clamp01((notebooks + datasets) / 60.0)
    return (
        (rank_score * 0.35)
        + (medal_score * 0.35)
        + (competition_score * 0.2)
        + (artifact_score * 0.1)
    )


def _platform_weight_profile(role_context: dict) -> dict:
    base = {
        "codeforces": 0.24,
        "leetcode": 0.24,
        "codechef": 0.14,
        "atcoder": 0.14,
        "kaggle": 0.24,
    }
    families = role_context.get("family_scores", {}) if isinstance(role_context, dict) else {}
    data_ml = _to_float(families.get("data_ml"), 0.0)
    backend = _to_float(families.get("backend"), 0.0)
    frontend = _to_float(families.get("frontend"), 0.0)
    security = _to_float(families.get("security"), 0.0)

    if data_ml >= 0.4:
        base = {
            "codeforces": 0.18,
            "leetcode": 0.22,
            "codechef": 0.09,
            "atcoder": 0.09,
            "kaggle": 0.42,
        }
    elif backend >= 0.4 or frontend >= 0.4:
        base = {
            "codeforces": 0.26,
            "leetcode": 0.30,
            "codechef": 0.14,
            "atcoder": 0.14,
            "kaggle": 0.16,
        }
    elif security >= 0.4:
        base = {
            "codeforces": 0.22,
            "leetcode": 0.28,
            "codechef": 0.18,
            "atcoder": 0.18,
            "kaggle": 0.14,
        }

    total = sum(base.values()) or 1.0
    return {k: v / total for k, v in base.items()}


def _platform_score_details(platform_stats: dict, role_context: dict) -> dict:
    # Normalize each platform on comparable scales so one rating system cannot dominate.
    platform_scores = {}
    platform_weights = _platform_weight_profile(role_context)

    cf = platform_stats.get("codeforces") or {}
    if isinstance(cf, dict) and cf:
        platform_scores["codeforces"] = _codeforces_score(cf)

    lc = platform_stats.get("leetcode") or {}
    if isinstance(lc, dict) and lc:
        platform_scores["leetcode"] = _leetcode_score(lc)

    cc = platform_stats.get("codechef") or {}
    if isinstance(cc, dict) and cc:
        platform_scores["codechef"] = _codechef_score(cc)

    ac = platform_stats.get("atcoder") or {}
    if isinstance(ac, dict) and ac:
        platform_scores["atcoder"] = _atcoder_score(ac)

    kg = platform_stats.get("kaggle") or {}
    if isinstance(kg, dict) and kg:
        platform_scores["kaggle"] = _kaggle_score(kg)

    if not platform_scores:
        return {
            "score": 0.0,
            "blended_score": 0.0,
            "peak_score": 0.0,
            "coverage_score": 0.0,
            "per_platform_score_100": {},
            "applied_weights": platform_weights,
            "peak_platform": None,
        }

    present_weight_sum = sum(platform_weights[p] for p in platform_scores)
    if present_weight_sum <= 0:
        return {
            "score": 0.0,
            "blended_score": 0.0,
            "peak_score": 0.0,
            "coverage_score": 0.0,
            "per_platform_score_100": {k: round(v * 100.0, 3) for k, v in platform_scores.items()},
            "applied_weights": platform_weights,
            "peak_platform": None,
        }
    blended = sum(platform_scores[p] * platform_weights[p] for p in platform_scores) / present_weight_sum
    peak_platform = max(platform_scores, key=platform_scores.get)
    peak_score = platform_scores[peak_platform]
    coverage_score = len(platform_scores) / 5.0
    score = _clamp01((blended * 0.58) + (peak_score * 0.32) + (coverage_score * 0.10))
    return {
        "score": score,
        "blended_score": _clamp01(blended),
        "peak_score": _clamp01(peak_score),
        "coverage_score": _clamp01(coverage_score),
        "per_platform_score_100": {k: round(v * 100.0, 3) for k, v in platform_scores.items()},
        "applied_weights": platform_weights,
        "peak_platform": peak_platform,
    }


def _platform_achievement_details(platform_stats: dict) -> dict:
    cf = platform_stats.get("codeforces") or {}
    lc = platform_stats.get("leetcode") or {}
    cc = platform_stats.get("codechef") or {}
    ac = platform_stats.get("atcoder") or {}
    kg = platform_stats.get("kaggle") or {}

    points = 0.0
    platform_points = {
        "codeforces": 0.0,
        "leetcode": 0.0,
        "codechef": 0.0,
        "atcoder": 0.0,
        "kaggle": 0.0,
    }
    cf_rating = _to_float(cf.get("max_rating"), 0.0) if isinstance(cf, dict) else 0.0
    lc_rating = _to_float(lc.get("rating"), 0.0) if isinstance(lc, dict) else 0.0
    cc_rating = _to_float(cc.get("highest_rating"), 0.0) if isinstance(cc, dict) else 0.0
    ac_rating = _to_float(ac.get("highest_rating"), 0.0) if isinstance(ac, dict) else 0.0

    if cf_rating >= 2200:
        platform_points["codeforces"] += 1.10
    elif cf_rating >= 2000:
        platform_points["codeforces"] += 0.90
    elif cf_rating >= 1900:
        platform_points["codeforces"] += 0.72
    elif cf_rating >= 1700:
        platform_points["codeforces"] += 0.58

    if lc_rating >= 2400:
        platform_points["leetcode"] += 1.0
    elif lc_rating >= 2200:
        platform_points["leetcode"] += 0.82
    elif lc_rating >= 2000:
        platform_points["leetcode"] += 0.62
    elif lc_rating >= 1850:
        platform_points["leetcode"] += 0.46

    if cc_rating >= 2200:
        platform_points["codechef"] += 0.68
    elif cc_rating >= 2000:
        platform_points["codechef"] += 0.50
    if ac_rating >= 2000:
        platform_points["atcoder"] += 0.68
    elif ac_rating >= 1700:
        platform_points["atcoder"] += 0.50

    if isinstance(kg, dict):
        medals = kg.get("medals") or {}
        gold = _to_float(medals.get("gold"), 0.0)
        silver = _to_float(medals.get("silver"), 0.0)
        bronze = _to_float(medals.get("bronze"), 0.0)
        rank = _safe_int(kg.get("rank"), 0)
        medal_points = min(1.25, (gold * 0.50) + (silver * 0.30) + (bronze * 0.15))
        platform_points["kaggle"] += medal_points
        if rank and rank <= 100:
            platform_points["kaggle"] += 1.20
        elif rank and rank <= 500:
            platform_points["kaggle"] += 1.00
        elif rank and rank <= 2000:
            platform_points["kaggle"] += 0.76
        elif rank and rank <= 10000:
            platform_points["kaggle"] += 0.45

    points = sum(platform_points.values())
    max_points = 5.4
    raw_score = _clamp01(points / max_points)
    peak_platform = max(platform_points, key=platform_points.get) if points > 0 else None
    peak_points = platform_points.get(peak_platform, 0.0) if peak_platform else 0.0
    avg_points = points / max(1, len([v for v in platform_points.values() if v > 0]))
    # "Take highest" achievement while still rewarding multi-platform depth.
    blended = _clamp01((peak_points / 1.8) * 0.58 + (avg_points / 1.3) * 0.25 + raw_score * 0.17)
    return {
        "score": blended,
        "raw_score": raw_score,
        "peak_platform": peak_platform,
        "peak_points": round(peak_points, 3),
        "platform_points": {k: round(v, 3) for k, v in platform_points.items()},
    }


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


def _project_relevance_score(
    extracted: dict,
    required_skills: list[str],
    must_have_skills: list[str],
    role_context: dict,
) -> tuple[float, dict]:
    projects = (extracted.get("projects_section", {}) or {}).get("items", []) or []
    if not projects:
        return 0.0, {"project_count": 0, "top_projects": []}

    target_skills = set(_normalize_skills_list(required_skills + must_have_skills))
    family_keywords = set()
    for family, score in (role_context.get("family_scores", {}) or {}).items():
        if _to_float(score, 0.0) >= 0.25:
            family_keywords.update(ROLE_FAMILY_KEYWORDS.get(family, set()))

    scored = []
    for p in projects:
        if not isinstance(p, dict):
            continue
        title = _normalize_text(str(p.get("title") or ""))
        desc = _normalize_text(str(p.get("description") or ""))
        highlights = [_normalize_text(str(h or "")) for h in (p.get("highlights") or [])]
        merged_text = " ".join([title, desc, *highlights]).strip()
        tech_stack = set(_normalize_skills_list([str(s) for s in (p.get("tech_stack") or [])]))
        combined_skill_evidence = tech_stack.copy()
        for token in list(tech_stack):
            combined_skill_evidence.update(_expand_skill_with_implications(token))

        matched_target = len(target_skills.intersection(combined_skill_evidence))
        skill_relevance = matched_target / max(1, len(target_skills)) if target_skills else 0.0
        family_relevance_hits = sum(1 for kw in family_keywords if kw in merged_text)
        family_relevance = _clamp01(family_relevance_hits / 5.0) if family_keywords else 0.0
        quant_hits = len(re.findall(r"\b\d+(\.\d+)?\s*(%|x|ms|s|sec|seconds|users|req/s|rps)\b", merged_text))
        impact_score = _clamp01(quant_hits / 3.0)
        complexity_hits = sum(1 for kw in PROJECT_COMPLEXITY_KEYWORDS if kw in merged_text)
        complexity_score = _clamp01((complexity_hits / 4.0) + (len(tech_stack) / 14.0))
        ownership_signal = _clamp01(
            len([h for h in highlights if any(k in h for k in ["built", "designed", "owned", "led", "implemented"])]) / 3.0
        )

        final = _clamp01(
            (skill_relevance * 0.42)
            + (family_relevance * 0.18)
            + (impact_score * 0.18)
            + (complexity_score * 0.14)
            + (ownership_signal * 0.08)
        )
        scored.append(
            {
                "title": (p.get("title") or "")[:80],
                "score": final,
                "skill_relevance_100": round(skill_relevance * 100.0, 3),
                "impact_score_100": round(impact_score * 100.0, 3),
                "complexity_score_100": round(complexity_score * 100.0, 3),
            }
        )

    scored.sort(key=lambda item: item["score"], reverse=True)
    top = scored[:3]
    if not top:
        return 0.0, {"project_count": len(projects), "top_projects": []}
    aggregate = sum(item["score"] for item in top) / len(top)
    depth_bonus = _clamp01(len(projects) / 5.0) * 0.08
    final = _clamp01((aggregate * 0.92) + depth_bonus)
    return final, {
        "project_count": len(projects),
        "top_projects": [
            {
                "title": item["title"],
                "score_100": round(item["score"] * 100.0, 3),
                "skill_relevance_100": item["skill_relevance_100"],
                "impact_score_100": item["impact_score_100"],
                "complexity_score_100": item["complexity_score_100"],
            }
            for item in top
        ],
    }


def _target_alignment_score(extracted: dict, role_context: dict) -> tuple[float, dict]:
    raw_text = _normalize_text(extracted.get("raw_text_full") or extracted.get("raw_text_preview", ""))
    skills_items = (extracted.get("skills_section", {}) or {}).get("items", []) or []
    project_items = (extracted.get("projects_section", {}) or {}).get("items", []) or []
    skill_tokens = " ".join(_normalize_text(str(s)) for s in skills_items)
    project_blob = " ".join(
        _normalize_text(" ".join([
            str(p.get("title") or ""),
            str(p.get("description") or ""),
            " ".join(str(h or "") for h in (p.get("highlights") or [])),
        ]))
        for p in project_items if isinstance(p, dict)
    )
    candidate_blob = " ".join([raw_text, skill_tokens, project_blob])

    family_scores = role_context.get("family_scores", {}) or {}
    family_alignment = 0.0
    family_details = {}
    for family, intensity in family_scores.items():
        if intensity <= 0.0:
            continue
        keywords = ROLE_FAMILY_KEYWORDS.get(family, set())
        hits = sum(1 for kw in keywords if kw in candidate_blob)
        fam_score = _clamp01(hits / 8.0)
        family_details[family] = round(fam_score * 100.0, 3)
        family_alignment += fam_score * _clamp01(intensity)

    family_alignment = _clamp01(family_alignment / max(1.0, sum(_clamp01(v) for v in family_scores.values())))
    target_domain = role_context.get("target_domain", "general")
    domain_keywords = TARGET_DOMAIN_KEYWORDS.get(target_domain, set())
    domain_hits = sum(1 for kw in domain_keywords if kw in candidate_blob)
    domain_alignment = _clamp01(domain_hits / 4.0) if domain_keywords else 0.0

    score = _clamp01((family_alignment * 0.72) + (domain_alignment * 0.28))
    return score, {
        "target_domain": target_domain,
        "target_domain_score_100": round(domain_alignment * 100.0, 3),
        "family_alignment_scores_100": family_details,
    }


def _confidence_score(extracted: dict, fit_breakdown: dict) -> tuple[float, dict]:
    skills_count = _safe_int((extracted.get("skills_section", {}) or {}).get("count"), 0)
    projects_count = _safe_int((extracted.get("projects_section", {}) or {}).get("count"), 0)
    parser_meta = extracted.get("parser_meta", {}) or {}
    extraction_meta = extracted.get("structured_extraction_meta", {}) or {}
    parser_used = (parser_meta.get("parsers_used", {}) or {})

    parser_strength = 0.0
    parser_strength += 0.35 if parser_used.get("pymupdf") else 0.0
    parser_strength += 0.25 if parser_used.get("pdfplumber") else 0.0
    parser_strength += 0.20 if parser_used.get("pypdf") else 0.0
    parser_strength += 0.20 if _safe_int(parser_used.get("ocr_pages"), 0) == 0 else 0.08
    parser_strength = _clamp01(parser_strength)

    structured_ok = 1.0 if extraction_meta.get("status") == "ok" else 0.35
    section_completeness = _clamp01((min(skills_count, 20) / 20.0) * 0.55 + (min(projects_count, 4) / 4.0) * 0.45)
    evidence_strength = _clamp01(
        (_to_float(fit_breakdown.get("skills_match_score_100"), 0.0) / 100.0) * 0.5
        + (_to_float(fit_breakdown.get("project_relevance_score_100"), 0.0) / 100.0) * 0.3
        + (_to_float(fit_breakdown.get("platform_strength_score_100"), 0.0) / 100.0) * 0.2
    )
    score = _clamp01(
        (parser_strength * 0.20)
        + (structured_ok * 0.25)
        + (section_completeness * 0.30)
        + (evidence_strength * 0.25)
    )
    return score, {
        "parser_strength_score_100": round(parser_strength * 100.0, 3),
        "structured_extraction_ok_score_100": round(structured_ok * 100.0, 3),
        "section_completeness_score_100": round(section_completeness * 100.0, 3),
        "evidence_strength_score_100": round(evidence_strength * 100.0, 3),
    }


def _json_log(event: str, payload: dict) -> None:
    logger.info(json.dumps({"event": event, **payload}, ensure_ascii=False))


def _policy_config(role: str) -> dict:
    role_l = (role or "internship").lower()
    job_min_exp_quality = _to_float(os.getenv("JOB_MIN_EXPERIENCE_QUALITY_SCORE_100", "0"), 0.0)
    if role_l == "internship":
        return {
            "weights": {
                "skills": _to_float(os.getenv("INTERN_WEIGHT_SKILLS", "0.30"), 0.30),
                "github": _to_float(os.getenv("INTERN_WEIGHT_GITHUB", "0.22"), 0.22),
                "experience": _to_float(os.getenv("INTERN_WEIGHT_EXPERIENCE", "0.10"), 0.10),
                "platform": _to_float(os.getenv("INTERN_WEIGHT_PLATFORM", "0.13"), 0.13),
                "projects": _to_float(os.getenv("INTERN_WEIGHT_PROJECTS", "0.09"), 0.09),
                "profile": _to_float(os.getenv("INTERN_WEIGHT_PROFILE", "0.02"), 0.02),
                "experience_quality": _to_float(os.getenv("INTERN_WEIGHT_EXPERIENCE_QUALITY", "0.14"), 0.14),
            },
            "thresholds": {
                "min_skill_match_pct": 0.0,
                "min_github_score_100": 0.0,
                "min_experience_quality_score_100": 0.0,
            },
        }
    return {
        "weights": {
            "skills": _to_float(os.getenv("JOB_WEIGHT_SKILLS", "0.20"), 0.20),
            "github": _to_float(os.getenv("JOB_WEIGHT_GITHUB", "0.18"), 0.18),
            "experience": _to_float(os.getenv("JOB_WEIGHT_EXPERIENCE", "0.22"), 0.22),
            "platform": _to_float(os.getenv("JOB_WEIGHT_PLATFORM", "0.07"), 0.07),
            "projects": _to_float(os.getenv("JOB_WEIGHT_PROJECTS", "0.07"), 0.07),
            "profile": _to_float(os.getenv("JOB_WEIGHT_PROFILE", "0.01"), 0.01),
            "experience_quality": _to_float(os.getenv("JOB_WEIGHT_EXPERIENCE_QUALITY", "0.25"), 0.25),
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


def _company_signal(text: str) -> tuple[float, list[str], dict]:
    hits: list[tuple[str, float]] = []
    tier_counts: dict[str, int] = {}
    for tier_score, companies in COMPANY_SIGNAL_TIERS.items():
        label = f"{tier_score:.2f}"
        count = 0
        for company in companies:
            if company in text:
                hits.append((company, tier_score))
                count += 1
        if count:
            tier_counts[label] = count

    if not hits:
        return 0.0, [], {"tier_counts": tier_counts, "max_tier_score": 0.0, "avg_tier_score": 0.0}

    unique_hits = {}
    for name, score in hits:
        # If same company appears, keep highest tier score.
        unique_hits[name] = max(score, unique_hits.get(name, 0.0))

    scores = list(unique_hits.values())
    max_score = max(scores)
    avg_score = sum(scores) / len(scores)
    blended = (max_score * 0.65) + (avg_score * 0.35)
    mentions = sorted(unique_hits.keys())[:12]
    return blended, mentions, {
        "tier_counts": tier_counts,
        "max_tier_score": round(max_score * 100.0, 3),
        "avg_tier_score": round(avg_score * 100.0, 3),
    }


def _experience_quality_score(extracted: dict, role: str) -> tuple[float, dict]:
    text = _normalize_text(extracted.get("raw_text") or extracted.get("raw_text_preview", ""))
    years = _to_float(extracted.get("work_experience_years", "0"), 0.0)
    role_l = (role or "job").lower()

    company_score, _, company_meta = _company_signal(text)
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
    achievement_hits = _count_keyword_hits(text, ACHIEVEMENT_KEYWORDS)
    achievement_score = min(achievement_hits / 4.0, 1.0)
    gsoc_signal = 1.0 if ("google summer of code" in text or "gsoc" in text) else 0.0
    platform_achievement_details = _platform_achievement_details(extracted.get("platform_stats", {}) or {})
    platform_achievement = _to_float(platform_achievement_details.get("score"), 0.0)
    medal_signal = 1.0 if any(
        kw in text for kw in ["medal", "gold medal", "silver medal", "bronze medal", "kaggle master", "kaggle grandmaster"]
    ) else 0.0
    rank_signal_hits = len(re.findall(r"\b(global rank|air|rank)\s*(?:[:#]?\s*)\d{1,5}\b", text))
    rank_signal = _clamp01(rank_signal_hits / 3.0)

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
        terms = {
            "years": (years_score, 0.20),
            "company": (company_score, 0.25),
            "leadership": (leadership_score, 0.10),
            "impact": (impact_score, 0.12),
            "ownership": (ownership_score, 0.10),
            "quant": (quant_score, 0.08),
            "keyword": (keyword_score, 0.05),
            "achievement": (achievement_score, 0.04),
            "platform_achievement": (platform_achievement, 0.08),
            "gsoc": (gsoc_signal, 0.04),
            "medal": (medal_signal, 0.04),
            "rank": (rank_signal, 0.03),
        }
        denom = sum(w for _, w in terms.values()) or 1.0
        final = sum(v * w for v, w in terms.values()) / denom
    else:
        years_score = min(years / 2.0, 1.0)
        terms = {
            "years": (years_score, 0.12),
            "company": (company_score, 0.18),
            "internship": (internship_score, 0.15),
            "impact": (impact_score, 0.12),
            "ownership": (ownership_score, 0.10),
            "quant": (quant_score, 0.09),
            "keyword": (keyword_score, 0.07),
            "achievement": (achievement_score, 0.08),
            "platform_achievement": (platform_achievement, 0.09),
            "gsoc": (gsoc_signal, 0.04),
            "medal": (medal_signal, 0.03),
            "rank": (rank_signal, 0.03),
        }
        denom = sum(w for _, w in terms.values()) or 1.0
        final = sum(v * w for v, w in terms.values()) / denom

    return final, {
        "role_profile": role_l,
        "years_score_100": round(years_score * 100.0, 3),
        "keyword_score_100": round(keyword_score * 100.0, 3),
        "impact_signal_score_100": round(impact_score * 100.0, 3),
        "ownership_signal_score_100": round(ownership_score * 100.0, 3),
        "quantified_impact_score_100": round(quant_score * 100.0, 3),
        "internship_credibility_score_100": round(internship_score * 100.0, 3),
        "achievement_signal_score_100": round(achievement_score * 100.0, 3),
        "platform_achievement_score_100": round(platform_achievement * 100.0, 3),
        "gsoc_signal_score_100": round(gsoc_signal * 100.0, 3),
        "medal_signal_score_100": round(medal_signal * 100.0, 3),
        "rank_signal_score_100": round(rank_signal * 100.0, 3),
        # Keep aggregate company signal only; hide raw company mentions.
        "company_signal_score_100": round(company_score * 100.0, 3),
        "company_tier_meta": company_meta,
        "platform_achievement_meta": platform_achievement_details,
        "signal_hits": {
            "experience_keywords": keyword_hits,
            "leadership_keywords": leadership_hits,
            "impact_keywords": impact_hits,
            "ownership_keywords": ownership_hits,
            "internship_keywords": internship_hits,
            "achievement_keywords": achievement_hits,
            "quantified_impact_patterns": quant_hits,
            "rank_signals": rank_signal_hits,
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
            "must_have_coverage_score_100": _to_float(
                fit.get("breakdown", {}).get("must_have_coverage_score_100"), 0.0
            ),
            "github_score_100": github_score_100,
            "experience_years": experience_years,
            "experience_quality_score_100": _to_float(
                fit.get("breakdown", {}).get("experience_quality_score_100"), 0.0
            ),
            "platform_strength_score_100": _to_float(
                fit.get("breakdown", {}).get("platform_strength_score_100"), 0.0
            ),
            "platform_achievement_score_100": _to_float(
                fit.get("breakdown", {}).get("platform_achievement_score_100"), 0.0
            ),
            "project_relevance_score_100": _to_float(
                fit.get("breakdown", {}).get("project_relevance_score_100"), 0.0
            ),
            "target_alignment_score_100": _to_float(
                fit.get("breakdown", {}).get("target_alignment_score_100"), 0.0
            ),
            "confidence_score_100": _to_float(
                fit.get("breakdown", {}).get("confidence_score_100"), 0.0
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
            model="gpt-5-mini",
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
    must_have_skills: list[str],
    min_experience_years: float,
    role: str,
    company_name: str,
    position_title: str,
) -> dict:
    exp_str = extracted.get("work_experience_years", "N/A")
    exp = _to_float(exp_str, 0.0)
    role_context = _infer_role_context(
        role=role,
        position_title=position_title,
        company_name=company_name,
        required_skills=required_skills,
        must_have_skills=must_have_skills,
    )
    # If minimum experience is not specified, still reward real experience
    # instead of giving every candidate full marks.
    if min_experience_years > 0:
        exp_score = 1.0 if exp >= min_experience_years else (exp / min_experience_years)
    else:
        role_l = (role or "internship").lower()
        # Jobs: stronger experience expectation. Internships: gentler scaling.
        neutral_target_years = 2.0 if role_l == "job" else 1.0
        exp_score = min(exp / neutral_target_years, 1.0)

    skill_score, matched_skills, missing_skills, skill_evidence = _skill_match_score(
        required_skills=required_skills,
        extracted=extracted,
        must_have_skills=must_have_skills,
    )
    skill_meta = skill_evidence.get("skill_meta", {}) if isinstance(skill_evidence, dict) else {}
    must_have_coverage = _to_float(skill_meta.get("coverage_must_have"), 1.0)

    github_summary = extracted.get("github_analysis", {}).get("summary", {})
    github_score_100 = _to_float(github_summary.get("overall_score_100"), 0.0)
    github_score = max(0.0, min(github_score_100 / 100.0, 1.0))

    platform_details = _platform_score_details(extracted.get("platform_stats", {}) or {}, role_context)
    platform_score_raw = _to_float(platform_details.get("score"), 0.0)
    platform_achievement_details = _platform_achievement_details(extracted.get("platform_stats", {}) or {})
    platform_achievement_score = _to_float(platform_achievement_details.get("score"), 0.0)

    profile_score = _profile_completeness_score(extracted)
    project_evidence_base = _project_evidence_score(extracted)
    project_relevance, project_relevance_meta = _project_relevance_score(
        extracted=extracted,
        required_skills=required_skills,
        must_have_skills=must_have_skills,
        role_context=role_context,
    )
    project_evidence = _clamp01((project_evidence_base * 0.45) + (project_relevance * 0.55))

    target_alignment, target_alignment_meta = _target_alignment_score(extracted, role_context)
    experience_quality, experience_quality_meta = _experience_quality_score(extracted, role)
    # Prevent one-dimensional ranking spikes from contest platforms when practical delivery evidence is weak.
    platform_score = _clamp01((platform_score_raw * 0.68) + (platform_achievement_score * 0.32))
    if platform_score >= 0.75 and github_score < 0.45 and project_relevance < 0.45 and experience_quality < 0.45:
        platform_score = platform_score * 0.68
    weights = _role_weights(role)
    weight_total = sum(_to_float(v, 0.0) for v in weights.values()) or 1.0
    norm_weights = {k: _to_float(v, 0.0) / weight_total for k, v in weights.items()}

    final = (
        (skill_score * norm_weights["skills"])
        + (github_score * norm_weights["github"])
        + (exp_score * norm_weights["experience"])
        + (platform_score * norm_weights["platform"])
        + (project_evidence * norm_weights["projects"])
        + (profile_score * norm_weights["profile"])
        + (experience_quality * norm_weights["experience_quality"])
    )
    # Target role/company alignment and must-have depth adjust final fit score.
    target_multiplier = 0.90 + (target_alignment * 0.12)
    must_have_multiplier = 0.86 + (must_have_coverage * 0.20)
    final = _clamp01(final * target_multiplier * must_have_multiplier)

    final_100 = round(final * 100.0, 3)
    confidence, confidence_meta = _confidence_score(
        extracted=extracted,
        fit_breakdown={
            "skills_match_score_100": round(skill_score * 100.0, 3),
            "project_relevance_score_100": round(project_relevance * 100.0, 3),
            "platform_strength_score_100": round(platform_score * 100.0, 3),
        },
    )

    return {
        "fit_score_100": final_100,
        "fit_score_100_str": f"{final_100:.3f}",
        "breakdown": {
            "skills_match_score_100": round(skill_score * 100.0, 3),
            "must_have_coverage_score_100": round(must_have_coverage * 100.0, 3),
            "github_score_100": round(github_score * 100.0, 3),
            "experience_score_100": round(exp_score * 100.0, 3),
            "platform_strength_score_100": round(platform_score * 100.0, 3),
            "platform_strength_raw_score_100": round(platform_score_raw * 100.0, 3),
            "platform_peak_score_100": round(_to_float(platform_details.get("peak_score"), 0.0) * 100.0, 3),
            "platform_achievement_score_100": round(platform_achievement_score * 100.0, 3),
            "project_evidence_score_100": round(project_evidence * 100.0, 3),
            "project_relevance_score_100": round(project_relevance * 100.0, 3),
            "profile_completeness_score_100": round(profile_score * 100.0, 3),
            "experience_quality_score_100": round(experience_quality * 100.0, 3),
            "target_alignment_score_100": round(target_alignment * 100.0, 3),
            "confidence_score_100": round(confidence * 100.0, 3),
        },
        "criteria_used": {
            "role_profile": role.lower(),
            "company_name": company_name,
            "position_title": position_title,
            "weights": norm_weights,
            "notes": [],
            "role_context": role_context,
        },
        "skills": {
            "required": required_skills,
            "must_have": must_have_skills,
            "matched": matched_skills,
            "missing": missing_skills,
            "match_score_100": round(skill_score * 100.0, 3),
            "evidence": skill_evidence,
        },
        "experience": {
            "required_min_years": min_experience_years,
            "candidate_years": exp,
            "quality_meta": experience_quality_meta,
        },
        "platform_meta": {
            "strength": platform_details,
            "achievement": platform_achievement_details,
        },
        "project_meta": project_relevance_meta,
        "target_alignment_meta": target_alignment_meta,
        "confidence_meta": confidence_meta,
        "ranking_reason": (
            f"Matched {len(matched_skills)}/{len(required_skills) if required_skills else 0} required skills, "
            f"must-have coverage {round(must_have_coverage * 100.0, 1)}, "
            f"GitHub {round(github_score * 100.0, 1)}, "
            f"Experience {round(exp, 2)} years, "
            f"Platform {round(platform_score * 100.0, 1)}, "
            f"Target alignment {round(target_alignment * 100.0, 1)}."
        ),
    }


@app.post("/resume/extract")
async def extract_resume(
    file: UploadFile = File(...),
    role: Literal["job", "internship"] = Form(default="job"),
    force_reprocess: bool = Form(default=False),
):
    try:
        return await _process_resume_file(file, role, force_reprocess=force_reprocess)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/resume/extract/batch")
async def extract_resume_batch(
    files: list[UploadFile] = File(...),
    role: Literal["job", "internship"] = Form(default="job"),
    force_reprocess: bool = Form(default=False),
):
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")

    tasks = [
        asyncio.create_task(_process_resume_file(file, role, force_reprocess=force_reprocess))
        for file in files
    ]
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
    force_reprocess: bool = Form(default=False),
):
    started_at = time.time()
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")

    required_skills = _parse_csv_list(required_skills_csv)
    must_have_skills = _parse_csv_list(must_have_skills_csv)
    thresholds = _role_thresholds(role, min_experience_years)

    tasks = [
        asyncio.create_task(_process_resume_file(file, role, force_reprocess=force_reprocess))
        for file in files
    ]
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
        fit = _candidate_company_fit(
            extracted=extracted,
            required_skills=required_skills,
            must_have_skills=must_have_skills,
            min_experience_years=min_experience_years,
            role=role,
            company_name=company_name,
            position_title=position_title,
        )
        fit["criteria_used"]["notes"] = await _generate_ai_notes(role, fit, extracted)
        eligible, rejection_reasons, decision_log = _build_eligibility(
            role=role,
            fit=fit,
            must_have_skills=must_have_skills,
            thresholds=thresholds,
        )
        fit["ranking_decision_log"] = decision_log

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
        })

    ranked = sorted(
        [c for c in candidates if c.get("ok") and c.get("eligible")],
        key=lambda c: (
            c.get("fit", {}).get("fit_score_100", 0.0) or 0.0,
            ((c.get("fit", {}).get("breakdown", {}) or {}).get("must_have_coverage_score_100", 0.0) or 0.0),
            ((c.get("fit", {}).get("breakdown", {}) or {}).get("target_alignment_score_100", 0.0) or 0.0),
            ((c.get("fit", {}).get("breakdown", {}) or {}).get("confidence_score_100", 0.0) or 0.0),
            ((c.get("fit", {}).get("breakdown", {}) or {}).get("skills_match_score_100", 0.0) or 0.0),
        ),
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
