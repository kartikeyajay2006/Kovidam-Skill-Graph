import os
import tempfile
import asyncio
import re
import json
from typing import Literal

from fastapi import FastAPI, File, Form, HTTPException, UploadFile

from app.config import load_environment
from app.services.resume_parser import parse_resume_and_enrich, save_extracted_data_to_json

load_environment()

app = FastAPI(title="Kovidam Skill Graph API")

# Limit in-process resume parsing concurrency. Default: 2 at a time.
RESUME_CONCURRENCY = max(1, int(os.getenv("RESUME_CONCURRENCY", "2")))
resume_semaphore = asyncio.Semaphore(RESUME_CONCURRENCY)
NOTES_AI_TIMEOUT_SECONDS = float(os.getenv("NOTES_AI_TIMEOUT_SECONDS", "1.8"))
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
COMPANY_HINTS = [
    "google", "microsoft", "amazon", "meta", "apple", "netflix", "adobe", "oracle",
    "salesforce", "uber", "airbnb", "atlassian", "ibm", "intel", "nvidia", "sap",
    "goldman sachs", "jpmorgan", "deutsche bank", "flipkart", "swiggy", "zomato",
    "razorpay", "phonepe", "paytm", "infosys", "tcs", "wipro", "hcl", "accenture",
]


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

        async with resume_semaphore:
            result = await parse_resume_and_enrich(tmp_path, role=role)

        saved_json_path = save_extracted_data_to_json(result, file.filename)
        return {
            "filename": file.filename,
            "extracted": result,
            "saved_json_path": saved_json_path,
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

    text = _normalize_text(extracted.get("raw_text_preview", ""))
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
        in_text = s in text
        in_tech = any(s == t or s in t or t in s for t in tech_tokens)
        if in_text or in_tech:
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


def _role_weights(role: str) -> dict:
    if role.lower() == "internship":
        return {
            "skills": 0.35,
            "github": 0.22,
            "experience": 0.10,
            "platform": 0.15,
            "projects": 0.07,
            "profile": 0.03,
            "experience_quality": 0.08,
        }
    return {
        "skills": 0.30,
        "github": 0.25,
        "experience": 0.18,
        "platform": 0.08,
        "projects": 0.05,
        "profile": 0.02,
        "experience_quality": 0.12,
    }


def _role_thresholds(role: str, min_experience_years: float) -> dict:
    if role.lower() == "job":
        return {
            "min_skill_match_pct": 55.0,
            "min_github_score_100": 35.0,
            "min_experience_years": min_experience_years,
        }
    return {
        "min_skill_match_pct": 0.0,
        "min_github_score_100": 0.0,
        "min_experience_years": min_experience_years,
    }


def _experience_quality_score(extracted: dict) -> tuple[float, dict]:
    text = _normalize_text(extracted.get("raw_text_preview", ""))
    years = _to_float(extracted.get("work_experience_years", "0"), 0.0)
    keyword_hits = sum(1 for k in EXPERIENCE_KEYWORDS if k in text)
    keyword_score = min(keyword_hits / 4.0, 1.0)
    company_hits = [name for name in COMPANY_HINTS if name in text]
    company_score = min(len(company_hits) / 2.0, 1.0)
    years_score = min(years / 2.0, 1.0)
    final = (years_score * 0.45) + (keyword_score * 0.35) + (company_score * 0.20)
    return final, {
        "years_score_100": round(years_score * 100.0, 3),
        "keyword_score_100": round(keyword_score * 100.0, 3),
        "company_signal_score_100": round(company_score * 100.0, 3),
        "company_mentions": company_hits[:8],
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
    min_experience_years: float,
    role: str,
) -> dict:
    exp_str = extracted.get("work_experience_years", "N/A")
    exp = _to_float(exp_str, 0.0)
    exp_score = 1.0 if exp >= min_experience_years else (exp / min_experience_years if min_experience_years > 0 else 1.0)

    skill_score, matched_skills, missing_skills = _skill_match_score(required_skills, extracted)

    github_summary = extracted.get("github_analysis", {}).get("summary", {})
    github_score_100 = _to_float(github_summary.get("overall_score_100"), 0.0)
    github_score = max(0.0, min(github_score_100 / 100.0, 1.0))

    platform_score = _platform_strength_score(extracted.get("platform_stats", {}) or {})
    profile_score = _profile_completeness_score(extracted)
    project_evidence = _project_evidence_score(extracted)
    experience_quality, experience_quality_meta = _experience_quality_score(extracted)
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


@app.post("/hiring/shortlist")
async def hiring_shortlist(
    files: list[UploadFile] = File(...),
    role: Literal["job", "internship"] = Form(default="internship"),
    company_name: str = Form(...),
    position_title: str = Form(...),
    required_skills_csv: str = Form(...),
    must_have_skills_csv: str = Form(default=""),
    min_experience_years: float = Form(default=0.0),
):
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
        key=lambda c: c.get("fit", {}).get("fit_score_100", 0.0),
        reverse=True,
    )

    for idx, candidate in enumerate(ranked, start=1):
        candidate["rank"] = idx

    failed = [c for c in candidates if not c.get("ok")]
    rejected = [c for c in candidates if c.get("ok") and not c.get("eligible")]

    return {
        "job": {
            "company_name": company_name,
            "position_title": position_title,
            "role": role,
            "required_skills": required_skills,
            "must_have_skills": must_have_skills,
            "min_experience_years": min_experience_years,
            "applied_thresholds": thresholds,
        },
        "count_uploaded": len(files),
        "count_ranked": len(ranked),
        "count_rejected": len(rejected),
        "count_failed": len(failed),
        "ranked_candidates": ranked,
        "rejected_candidates": rejected,
        "failed_candidates": failed,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
