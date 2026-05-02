"""Simple regression-style comparison for false reject rate.
Usage: python scripts/eval_v2.py
"""
from app.scoring.engine import parse_weighted_skills, score_candidate_v2

fixtures = [
    {"name": "strong", "text": "python fastapi nodejs", "gh": 70, "years": "1", "expected_good": True},
    {"name": "weak", "text": "", "gh": 10, "years": "0", "expected_good": False},
]

req = parse_weighted_skills("python,fastapi")
false_rejects = 0
for f in fixtures:
    extracted = {
        "raw_text_preview": f["text"],
        "work_experience_years": f["years"],
        "github_analysis": {"summary": {"overall_score_100": f["gh"]}, "repositories": []},
    }
    out = score_candidate_v2(extracted, "internship", req, [], 0, False)
    rejected = out["status"] == "rejected"
    if f["expected_good"] and rejected:
        false_rejects += 1
    print(f["name"], out["status"], out["fit_score_100"])
print("false_reject_rate", false_rejects / max(1, sum(1 for x in fixtures if x["expected_good"])))
