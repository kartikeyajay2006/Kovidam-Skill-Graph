import pytest
from app.main import _skill_match_score, _build_eligibility, _expand_skill_with_implications


def _sample_extracted(tokens):
    return {
        "raw_text_preview": " ".join(tokens),
        "raw_text_full": "",
        "work_experience_years": "2",
        "github_analysis": {"repositories": []},
        "skills_section": {"items": tokens},
        "projects_section": {"items": [{"tech_stack": tokens}]},
    }

def test_must_have_javascript_via_react():
    # must_have=javascript, resume has react => PASS
    extracted = _sample_extracted(["react"])
    # 1. Provide javascript as must-have
    score, matched, missing, evidence = _skill_match_score(
        required_skills=[],
        extracted=extracted,
        must_have_skills=["javascript"]
    )
    
    # Check that javascript is in matched
    assert "javascript" in matched
    assert "javascript" not in missing
    
    # 2. Check eligibility
    fit = {"skills": {"matched": matched}, "breakdown": {"skills_match_score_100": 80.0, "github_score_100": 80.0, "experience_quality_score_100": 80.0}, "experience": {"candidate_years": 2.0}}
    elig, reasons, diff = _build_eligibility("job", fit, ["javascript"], {
        "min_skill_match_pct": 0, "min_github_score_100": 0, "min_experience_years": 0.0, "min_experience_quality_score_100": 0.0
    })
    
    assert elig is True

def test_must_have_javascript_via_nodejs():
    # must_have=javascript, resume has nodejs => PASS
    extracted = _sample_extracted(["nodejs"])
    score, matched, missing, evidence = _skill_match_score(
        required_skills=[],
        extracted=extracted,
        must_have_skills=["javascript"]
    )
    
    fit = {"skills": {"matched": matched}, "breakdown": {"skills_match_score_100": 80.0, "github_score_100": 80.0, "experience_quality_score_100": 80.0}, "experience": {"candidate_years": 2.0}}
    elig, reasons, diff = _build_eligibility("job", fit, ["javascript"], {
        "min_skill_match_pct": 0, "min_github_score_100": 0, "min_experience_years": 0.0, "min_experience_quality_score_100": 0.0
    })
    assert elig is True

def test_must_have_java_via_spring_boot():
    # must_have=java, resume has spring boot => PASS
    extracted = _sample_extracted(["spring boot"])
    score, matched, missing, evidence = _skill_match_score(
        required_skills=[],
        extracted=extracted,
        must_have_skills=["java"]
    )
    
    fit = {"skills": {"matched": matched}, "breakdown": {"skills_match_score_100": 80.0, "github_score_100": 80.0, "experience_quality_score_100": 80.0}, "experience": {"candidate_years": 2.0}}
    elig, reasons, diff = _build_eligibility("job", fit, ["java"], {
        "min_skill_match_pct": 0, "min_github_score_100": 0, "min_experience_years": 0.0, "min_experience_quality_score_100": 0.0
    })
    assert elig is True

def test_must_have_python_via_fastapi():
    # must_have=python, resume has fastapi => PASS
    extracted = _sample_extracted(["fastapi"])
    score, matched, missing, evidence = _skill_match_score(
        required_skills=[],
        extracted=extracted,
        must_have_skills=["python"]
    )
    
    fit = {"skills": {"matched": matched}, "breakdown": {"skills_match_score_100": 80.0, "github_score_100": 80.0, "experience_quality_score_100": 80.0}, "experience": {"candidate_years": 2.0}}
    elig, reasons, diff = _build_eligibility("job", fit, ["python"], {
        "min_skill_match_pct": 0, "min_github_score_100": 0, "min_experience_years": 0.0, "min_experience_quality_score_100": 0.0
    })
    assert elig is True

def test_negative_must_have_react_via_javascript():
    # Negative case: must_have=react, resume only has javascript => FAIL
    # Directionality: react implies javascript, but javascript doesn't imply react
    extracted = _sample_extracted(["javascript"])
    score, matched, missing, evidence = _skill_match_score(
        required_skills=[],
        extracted=extracted,
        must_have_skills=["react"]
    )
    
    fit = {"skills": {"matched": matched}, "breakdown": {"skills_match_score_100": 80.0, "github_score_100": 80.0, "experience_quality_score_100": 80.0}, "experience": {"candidate_years": 2.0}}
    elig, reasons, diff = _build_eligibility("job", fit, ["react"], {
        "min_skill_match_pct": 0, "min_github_score_100": 0, "min_experience_years": 0.0, "min_experience_quality_score_100": 0.0
    })
    assert elig is False
    assert any("Missing must-have skills" in r for r in reasons)

def test_must_have_not_in_required():
    # Case where must-have is not in required but still should pass via implication.
    extracted = _sample_extracted(["nextjs", "postgresql"])
    score, matched, missing, evidence = _skill_match_score(
        required_skills=["sql"],
        extracted=extracted,
        must_have_skills=["javascript"]
    )
    
    assert "sql" in matched
    assert "javascript" in matched
    
    fit = {"skills": {"matched": matched}, "breakdown": {"skills_match_score_100": 80.0, "github_score_100": 80.0, "experience_quality_score_100": 80.0}, "experience": {"candidate_years": 2.0}}
    elig, reasons, diff = _build_eligibility("job", fit, ["javascript"], {
        "min_skill_match_pct": 0, "min_github_score_100": 0, "min_experience_years": 0.0, "min_experience_quality_score_100": 0.0
    })
    assert elig is True


def test_no_false_positive_golang_from_natural_language_go():
    # "go" as a verb in prose must not be treated as Golang skill evidence.
    extracted = _sample_extracted(["i love to go to hackathon events"])
    score, matched, missing, evidence = _skill_match_score(
        required_skills=[],
        extracted=extracted,
        must_have_skills=["golang"]
    )
    fit = {"skills": {"matched": matched}, "breakdown": {"skills_match_score_100": 80.0, "github_score_100": 80.0, "experience_quality_score_100": 80.0}, "experience": {"candidate_years": 2.0}}
    elig, reasons, diff = _build_eligibility("job", fit, ["golang"], {
        "min_skill_match_pct": 0, "min_github_score_100": 0, "min_experience_years": 0.0, "min_experience_quality_score_100": 0.0
    })
    assert elig is False
    assert any("Missing must-have skills" in r for r in reasons)


def test_golang_detected_from_explicit_go_lang_phrase():
    extracted = _sample_extracted(["go lang", "distributed systems"])
    score, matched, missing, evidence = _skill_match_score(
        required_skills=[],
        extracted=extracted,
        must_have_skills=["golang"]
    )
    fit = {"skills": {"matched": matched}, "breakdown": {"skills_match_score_100": 80.0, "github_score_100": 80.0, "experience_quality_score_100": 80.0}, "experience": {"candidate_years": 2.0}}
    elig, reasons, diff = _build_eligibility("job", fit, ["golang"], {
        "min_skill_match_pct": 0, "min_github_score_100": 0, "min_experience_years": 0.0, "min_experience_quality_score_100": 0.0
    })
    assert elig is True


def test_no_false_positive_c_from_plain_sentence():
    extracted = {
        "raw_text_preview": "i got selected in c block hostel",
        "raw_text_full": "",
        "work_experience_years": "0",
        "github_analysis": {"repositories": []},
        "skills_section": {"items": []},
        "projects_section": {"items": []},
    }
    score, matched, missing, evidence = _skill_match_score(
        required_skills=[],
        extracted=extracted,
        must_have_skills=["c"]
    )
    fit = {"skills": {"matched": matched}, "breakdown": {"skills_match_score_100": 80.0, "github_score_100": 80.0, "experience_quality_score_100": 80.0}, "experience": {"candidate_years": 2.0}}
    elig, reasons, diff = _build_eligibility("job", fit, ["c"], {
        "min_skill_match_pct": 0, "min_github_score_100": 0, "min_experience_years": 0.0, "min_experience_quality_score_100": 0.0
    })
    assert elig is False


def test_c_detected_from_explicit_c_language_phrase():
    extracted = _sample_extracted(["c language", "memory management"])
    score, matched, missing, evidence = _skill_match_score(
        required_skills=[],
        extracted=extracted,
        must_have_skills=["c"]
    )
    fit = {"skills": {"matched": matched}, "breakdown": {"skills_match_score_100": 80.0, "github_score_100": 80.0, "experience_quality_score_100": 80.0}, "experience": {"candidate_years": 2.0}}
    elig, reasons, diff = _build_eligibility("job", fit, ["c"], {
        "min_skill_match_pct": 0, "min_github_score_100": 0, "min_experience_years": 0.0, "min_experience_quality_score_100": 0.0
    })
    assert elig is True
