from app.main import SessionLocal
from app.models.schema import CandidateScore

db = SessionLocal()
for cs in db.query(CandidateScore).all():
    print(cs.candidate_id)
    print("Skills Match:", cs.skills_match_score)
    print("Github:", cs.github_score)
    print("Experience:", cs.experience_score)
    print("Platform:", cs.platform_strength_score)
    print("Project Evidence:", cs.project_evidence_score)
    print("Profile:", cs.profile_completeness_score)
    print("----")
