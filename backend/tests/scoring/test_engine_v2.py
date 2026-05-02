from app.scoring.engine import parse_weighted_skills, score_candidate_v2


def _sample_extracted(text="python fast api nodejs", gh=62.0, years="1"):
    return {
        "raw_text_preview": text,
        "work_experience_years": years,
        "github_analysis": {
            "summary": {"overall_score_100": gh, "repo_count": 2},
            "repositories": [
                {
                    "repository": {"name": "nodejs-service", "description": "fastapi"},
                    "analysis": {"identified_tech_stack_dependencies": ["fastapi", "postgres"]},
                }
            ],
        },
    }


def test_skill_synonym_matching():
    required = parse_weighted_skills("node.js,fast api")
    result = score_candidate_v2(_sample_extracted(), "job", required, [], 0, False)
    assert result["breakdown"]["skills_match_score_100"] > 50


def test_must_have_strict_vs_non_strict():
    req = parse_weighted_skills("python")
    strict = score_candidate_v2(_sample_extracted(text="python"), "job", req, ["java"], 0, True)
    soft = score_candidate_v2(_sample_extracted(text="python"), "job", req, ["java"], 0, False)
    assert strict["status"] == "rejected"
    assert soft["status"] in {"review_required", "rejected"}


def test_confidence_gating_low_confidence():
    req = parse_weighted_skills("rust")
    r = score_candidate_v2(_sample_extracted(text="", gh=10, years="0"), "internship", req, [], 0, False)
    assert r["status"] == "review_required"


def test_min_experience_zero_not_auto_100():
    req = parse_weighted_skills("python")
    r = score_candidate_v2(_sample_extracted(years="0"), "internship", req, [], 0, False)
    assert r["breakdown"]["experience_score_100"] == 50.0


def test_output_schema_v2_fields_present():
    req = parse_weighted_skills("python")
    r = score_candidate_v2(_sample_extracted(), "job", req, [], 1, False)
    for k in ["status", "decision_confidence", "evidence_trace", "score_version"]:
        assert k in r
