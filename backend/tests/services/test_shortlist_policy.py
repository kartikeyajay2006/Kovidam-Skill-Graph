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
