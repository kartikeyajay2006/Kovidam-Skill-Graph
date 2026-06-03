from app.schemas.shortlist_response import ShortlistResponse


def test_shortlist_response_keeps_jd_context_fields():
    payload = {
        "api_version": "v1.0.0",
        "scoring_version": "v2.1.0",
        "policy_version": "v2.1.0",
        "job_summary": {
            "company_name": "Kovidam",
            "position_title": "Software Engineer",
            "role": "job",
            "required_skills": ["python", "react"],
            "must_have_skills": ["python"],
            "job_description": "Build and ship hiring workflows.",
            "job_description_skills": ["build", "ship", "workflows"],
            "semantic_query_skills": ["python", "react", "hiring workflows"],
            "min_experience_years": 1.0,
            "applied_thresholds": {"min_skill_match_pct": 55.0},
            "policy_runtime_flags": {"score_decimals": 4},
            "source": "persisted_run",
        },
        "counts": {"uploaded": 2, "ranked": 2, "rejected": 0, "failed": 0},
        "shortlisted": [],
        "rejected": [],
        "failed": [],
        "top_3_insights_from_ranking_decision_log": [],
    }

    response = ShortlistResponse.model_validate(payload)

    assert response.job_summary.job_description == "Build and ship hiring workflows."
    assert response.job_summary.job_description_skills == ["build", "ship", "workflows"]
    assert response.job_summary.semantic_query_skills == ["python", "react", "hiring workflows"]
    assert response.job_summary.policy_runtime_flags == {"score_decimals": 4}
    assert response.job_summary.source == "persisted_run"
