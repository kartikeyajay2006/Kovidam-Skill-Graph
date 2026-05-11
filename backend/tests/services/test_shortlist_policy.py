from app import main


def test_job_thresholds_include_experience_quality_gate(monkeypatch):
    monkeypatch.setenv("JOB_MIN_EXPERIENCE_QUALITY_SCORE_100", "42")
    thresholds = main._role_thresholds("job", 1.0)
    assert thresholds["min_experience_quality_score_100"] == 42.0


def test_internship_thresholds_keep_quality_gate_zero(monkeypatch):
    monkeypatch.setenv("JOB_MIN_EXPERIENCE_QUALITY_SCORE_100", "99")
    thresholds = main._role_thresholds("internship", 0.0)
    assert thresholds["min_experience_quality_score_100"] == 0.0


def test_build_eligibility_rejects_job_low_experience_quality():
    fit = {
        "breakdown": {
            "skills_match_score_100": 80.0,
            "github_score_100": 70.0,
            "experience_quality_score_100": 10.0,
        },
        "skills": {"matched": ["python"]},
        "experience": {"candidate_years": 2.0},
    }
    thresholds = {
        "min_skill_match_pct": 55.0,
        "min_github_score_100": 35.0,
        "min_experience_years": 1.0,
        "min_experience_quality_score_100": 25.0,
    }
    eligible, reasons, _ = main._build_eligibility(
        role="job",
        fit=fit,
        must_have_skills=[],
        thresholds=thresholds,
    )
    assert eligible is False
    assert any("Experience quality score" in r for r in reasons)


def test_experience_relevance_score_rewards_role_relevant_experience():
    role_context = {
        "family_scores": {"backend": 0.9},
        "target_domain": "ai",
    }
    required = ["python", "fastapi", "redis"]
    must_have = ["python"]
    extracted_relevant = {
        "experience_section": {
            "items": [
                {
                    "position": "Backend Engineer",
                    "company": "AI Labs",
                    "duration": "2025",
                    "description": "Built llm microservices with fastapi, redis and async workers for production.",
                    "tech_stack": ["python", "fastapi", "redis"],
                }
            ]
        }
    }
    extracted_irrelevant = {
        "experience_section": {
            "items": [
                {
                    "position": "Content Writer",
                    "company": "Media Co",
                    "duration": "2021",
                    "description": "Created blogs and newsletters.",
                    "tech_stack": ["word", "excel"],
                }
            ]
        }
    }
    relevant_score, _ = main._experience_relevance_score(extracted_relevant, required, must_have, role_context)
    irrelevant_score, _ = main._experience_relevance_score(extracted_irrelevant, required, must_have, role_context)
    assert relevant_score > irrelevant_score


def test_candidate_fit_breakdown_includes_experience_relevance():
    extracted = {
        "work_experience_years": "2",
        "skills_section": {"items": ["python", "fastapi"], "count": 2},
        "projects_section": {"items": [], "count": 0},
        "experience_section": {
            "items": [
                {
                    "position": "Software Engineer",
                    "company": "Example",
                    "duration": "2025",
                    "description": "Built backend APIs using fastapi and redis with 20% latency improvement.",
                    "tech_stack": ["python", "fastapi", "redis"],
                }
            ]
        },
        "github_analysis": {"summary": {"overall_score_100": 70, "repo_count": 1}, "repositories": []},
        "platform_stats": {},
        "profiles": {},
        "raw_text_preview": "Built backend APIs with FastAPI and Redis.",
        "structured_extraction_meta": {"status": "ok"},
        "parser_meta": {"parsers_used": {"pymupdf": True, "ocr_pages": 0}},
    }
    fit = main._candidate_company_fit(
        extracted=extracted,
        required_skills=["python", "fastapi"],
        must_have_skills=["python"],
        min_experience_years=1.0,
        role="job",
        company_name="Acme",
        position_title="Backend Engineer",
    )
    assert "experience_relevance_score_100" in fit["breakdown"]
