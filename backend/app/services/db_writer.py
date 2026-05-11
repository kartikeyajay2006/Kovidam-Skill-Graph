import logging
import uuid
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

# Ensure SessionLocal is correctly imported as requested
from app.db.postgres.session import SessionLocal

# Map exactly to requested table class names
try:
    from app.models import (
        candidates,
        candidate_github_summary,
        candidate_github_commits,
        candidate_job_scores,
        candidate_scores,
        candidate_skills,
        jobs,
        platform_stats,
        skills,
    )
except ImportError:
    candidates = candidate_github_summary = candidate_github_commits = candidate_job_scores = candidate_scores = candidate_skills = jobs = platform_stats = skills = None

logger = logging.getLogger(__name__)


def _get_or_create_skill(session: Session, skill_name: str):
    """
    Fetches an existing skill by name, or creates a new one safely.
    """
    skill = session.query(skills).filter(skills.name == skill_name).first()
    if not skill:
        skill = skills(id=str(uuid.uuid4()), name=skill_name)
        session.add(skill)
        session.flush()  # Flush to ensure the object has an ID
    return skill


def save_to_db(
    structured_data: Dict[str, Any],
    trace_id: str,
    resume_hash: str,
    tenant_id: str,
    *,
    force_reprocess: bool = False,
) -> Optional[Dict[str, str]]:
    """
    Inserts structured resume data into PostgreSQL using SQLAlchemy.
    Uses a transaction to ensure all inserts succeed together.
    """
    if SessionLocal is None:
        raise Exception("SessionLocal is not initialized")

    if any(m is None for m in [candidates, jobs, candidate_job_scores, candidate_scores, candidate_skills, platform_stats, candidate_github_summary, candidate_github_commits, skills]):
        logger.error("db_models_not_loaded")
        return None

    db = SessionLocal()
    logger.info("db_session_created")

    logger.info("db_duplicate_check_start")
    try:
        existing = (
            db.query(candidates)
            .filter(candidates.resume_hash == resume_hash, candidates.tenant_id == tenant_id)
            .first()
        )
        if existing and not force_reprocess:
            logger.info("db_duplicate_resume_detected_updating_job_only")
            candidate_id = existing.id
            is_new_candidate = False
        else:
            candidate_id = str(uuid.uuid4())
            is_new_candidate = True
    except Exception as e:
        logger.exception("db_duplicate_check_failed")
        db.rollback()
        return None

    logger.info("db_insert_start", extra={"trace_id": trace_id, "candidate_id": candidate_id, "is_new_candidate": is_new_candidate})

    try:
        if is_new_candidate:
            # 1. candidates
            cand_data = structured_data.get("candidate") or {}
            candidate_record = candidates(
                id=candidate_id,
                tenant_id=tenant_id,
                trace_id=trace_id,
                resume_hash=resume_hash,
                filename=cand_data.get("filename") or None,
                work_experience_years=cand_data.get("work_experience_years") or None,
                github_username=cand_data.get("github_username") or None,
                codeforces_username=cand_data.get("codeforces_username") or None,
                leetcode_username=cand_data.get("leetcode_username") or None,
                codechef_username=cand_data.get("codechef_username") or None,
                atcoder_username=cand_data.get("atcoder_username") or None,
                kaggle_username=cand_data.get("kaggle_username") or None,
            )
            db.add(candidate_record)

        # 2. jobs (ALWAYS INSERTED for new evaluations)
        job_data = structured_data.get("job") or {}
        job_id = str(uuid.uuid4())
        job_record = jobs(
            id=job_id,
            tenant_id=tenant_id,
            candidate_id=candidate_id,
            trace_id=trace_id,
            company_name=job_data.get("company_name") or None,
            position_title=job_data.get("position_title") or None,
            role=job_data.get("role") or None,
            min_experience_years=job_data.get("min_experience_years") if job_data.get("min_experience_years") is not None else None,
        )
        db.add(job_record)

        # Flush primary records before dependent inserts
        db.flush()
        logger.info("db_primary_records_flushed", extra={"candidate_id": candidate_id})

        # 3. candidate_job_scores (ALWAYS INSERTED)
        cjs_data = structured_data.get("candidate_job_score") or {}
        candidate_job_score_record = candidate_job_scores(
            id=str(uuid.uuid4()),
            candidate_id=candidate_id,
            job_id=job_id,
            fit_score=cjs_data.get("fit_score") or None,
            ranking_reason=cjs_data.get("ranking_reason") or None,
            notes=cjs_data.get("notes") or [],
        )
        db.add(candidate_job_score_record)

        # 4. candidate_scores (UPSERT)
        cs_data = structured_data.get("candidate_scores") or {}
        existing_cs = db.query(candidate_scores).filter(candidate_scores.candidate_id == candidate_id).first()
        
        if existing_cs:
            if cs_data.get("skills_match_score") is not None: existing_cs.skills_match_score = cs_data.get("skills_match_score")
            if cs_data.get("github_score") is not None: existing_cs.github_score = cs_data.get("github_score")
            if cs_data.get("experience_score") is not None: existing_cs.experience_score = cs_data.get("experience_score")
            if cs_data.get("platform_strength_score") is not None: existing_cs.platform_strength_score = cs_data.get("platform_strength_score")
            if cs_data.get("project_evidence_score") is not None: existing_cs.project_evidence_score = cs_data.get("project_evidence_score")
            if cs_data.get("profile_completeness_score") is not None: existing_cs.profile_completeness_score = cs_data.get("profile_completeness_score")
        else:
            candidate_score_record = candidate_scores(
                id=str(uuid.uuid4()),
                candidate_id=candidate_id,
                skills_match_score=cs_data.get("skills_match_score"),
                github_score=cs_data.get("github_score"),
                experience_score=cs_data.get("experience_score"),
                platform_strength_score=cs_data.get("platform_strength_score"),
                project_evidence_score=cs_data.get("project_evidence_score"),
                profile_completeness_score=cs_data.get("profile_completeness_score"),
            )
            db.add(candidate_score_record)

        if is_new_candidate:
            # 5 & 6. skills and candidate_skills
            for cs_data in structured_data.get("candidate_skills", []):
                skill_name = cs_data.get("skill_name")
                status = cs_data.get("status") or None
    
                if not skill_name:
                    continue
    
                skill_obj = _get_or_create_skill(db, skill_name)
    
                candidate_skill_record = candidate_skills(
                    id=str(uuid.uuid4()),
                    candidate_id=candidate_id,
                    skill_id=skill_obj.id,
                    status=status,
                )
                db.add(candidate_skill_record)
    
            # 7. platform_stats
            for ps_data in structured_data.get("platform_stats", []):
                platform_stat_record = platform_stats(
                    id=str(uuid.uuid4()),
                    candidate_id=candidate_id,
                    platform=ps_data.get("platform") or None,
                    username=ps_data.get("username") or None,
                    stats=ps_data.get("stats") or {},
                )
                db.add(platform_stat_record)
    
            # 8. candidate_github_summary
            gh_data = structured_data.get("github_summary") or {}
            candidate_github_summary_record = candidate_github_summary(
                id=str(uuid.uuid4()),
                candidate_id=candidate_id,
                repo_count=gh_data.get("repo_count") or None,
                overall_score=gh_data.get("overall_score") or None,
            )
            db.add(candidate_github_summary_record)
    
            # 9. candidate_github_commits
            for repo_data in structured_data.get("github_commits", []):
                commit_record = candidate_github_commits(
                    id=str(uuid.uuid4()),
                    candidate_id=candidate_id,
                    repo_name=repo_data.get("repo_name"),
                    commits=repo_data.get("commits", [])
                )
                db.add(commit_record)

        # Commit the transaction safely
        db.commit()
        logger.info("db_commit_success", extra={"candidate_id": candidate_id})
        return {
            "status": "inserted",
            "candidate_id": candidate_id
        }

    except IntegrityError as e:
        db.rollback()
        try:
            existing = (
                db.query(candidates)
                .filter(candidates.resume_hash == resume_hash, candidates.tenant_id == tenant_id)
                .first()
            )
            if existing:
                logger.info("db_duplicate_via_constraint")
                return {
                    "status": "duplicate",
                    "candidate_id": existing.id
                }
        except Exception:
            pass
        logger.exception("db_integrity_error")
        return None

    except Exception as e:
        db.rollback()
        logger.exception("db_insert_failed")
        return None
        
    finally:
        db.close()
