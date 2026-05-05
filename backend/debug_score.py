from app.main import _skill_match_score, _build_eligibility, _extract_candidate_skill_sources
from tests.test_must_have_semantic import _sample_extracted

extracted = _sample_extracted(["react"])
sources = _extract_candidate_skill_sources(extracted)
print("SOURCES:", sources)

score, matched, missing, evidence = _skill_match_score(
    required_skills=[],
    extracted=extracted,
    must_have_skills=["javascript"]
)
print("MATCHED:", matched)
print("MISSING:", missing)
print("EVIDENCE:", evidence)

fit = {"skills": {"matched": matched}, "breakdown": {"skills_match_score_100": 80.0, "github_score_100": 80.0, "experience_quality_score_100": 80.0}, "experience": {"candidate_years": 2.0}}
elig, reasons, diff = _build_eligibility("job", fit, ["javascript"], {
    "min_skill_match_pct": 0, "min_github_score_100": 0, "min_experience_years": 0.0, "min_experience_quality_score_100": 0.0
})
print("ELIGIBLE:", elig)
print("REASONS:", reasons)
