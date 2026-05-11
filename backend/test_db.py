from app.main import SessionLocal, _to_float, _role_thresholds
from app.models.schema import Candidate, Job, CandidateJobScore, CandidateScore

db = SessionLocal()
trace_id = "7009188d-df96-4047-bd50-4b848efd7c7b"
query = (
    db.query(Candidate, Job, CandidateJobScore, CandidateScore)
    .join(Job, Candidate.id == Job.candidate_id)
    .outerjoin(CandidateJobScore, Job.id == CandidateJobScore.job_id)
    .outerjoin(CandidateScore, Candidate.id == CandidateScore.candidate_id)
    .filter(Job.trace_id == trace_id)
    .all()
)
shortlisted = []
rejected = []
for cand, job, cjs, cs in query:
    fit_score = cjs.fit_score if cjs and cjs.fit_score else 0.0
    reasons = []
    
    thresholds = _role_thresholds(job.role, job.min_experience_years)
    skill_match_score_100 = float(cs.skills_match_score) if cs and cs.skills_match_score is not None else 0.0
    github_score_100 = float(cs.github_score) if cs and cs.github_score is not None else 0.0
    experience_years = float(cand.work_experience_years) if cand and cand.work_experience_years is not None else 0.0
    
    if cjs and isinstance(cjs.notes, list):
        for note in cjs.notes:
            if isinstance(note, str) and ("missing" in note.lower() or "below" in note.lower()):
                reasons.append(note)

    if job.role == "job":
        if skill_match_score_100 < thresholds["min_skill_match_pct"]:
            reasons.append(f"Skill match {skill_match_score_100:.1f} below minimum")
        min_github = _to_float(thresholds.get("min_github_score_100"), 0.0)
        if min_github > 0.0 and github_score_100 < min_github:
            reasons.append(f"GitHub score {github_score_100:.1f} below minimum")
        if experience_years < thresholds["min_experience_years"]:
            reasons.append(f"Experience {experience_years:.1f} years below minimum")
    else:
        if skill_match_score_100 < thresholds["min_skill_match_pct"]:
            reasons.append(f"Skill match {skill_match_score_100:.1f} below minimum")

    eligible = len(reasons) == 0

    candidate_summary = {
        "filename": cand.filename or "Unknown",
        "eligible": eligible,
        "fit_score_100": fit_score,
        "rejection_reasons": reasons,
    }

    if eligible:
        shortlisted.append(candidate_summary)
    else:
        rejected.append(candidate_summary)

print("Shortlisted:", shortlisted)
print("Rejected:", rejected)
