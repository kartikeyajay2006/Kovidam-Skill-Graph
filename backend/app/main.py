import os
import tempfile
import asyncio
import re
import json
import math
import uuid
import time
import logging
from datetime import datetime, timezone
from typing import Literal
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi import Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app.config import load_environment
from app.db.postgres.session import init_db
from app.services.resume_parser import parse_resume_and_enrich, save_extracted_data_to_json
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func

from app.db.postgres.session import SessionLocal
from app.models.schema import (
    Candidate,
    Job,
    CandidateJobScore,
    CandidateScore,
    CandidateSkill,
    PlatformStat,
    CandidateGithubSummary,
    CandidateGithubCommit,
    ShortlistRun,
    OrganizationProfile,
    PaymentTransaction,
)
from app.services.transformer import transform_resume_data
from app.services.db_writer import save_to_db
from app.services.shortlist_notifier import send_shortlist_notifications, extract_candidate_email, extract_candidate_phone
from app.utils.hash_utils import generate_resume_hash
from app.schemas.shortlist_response import ShortlistResponse
from app.integrations.qdrant import QdrantResumeIndex
from app.core.security import AUTH_REQUIRED, AuthContext, authenticate_request
import razorpay


load_environment()
logger = logging.getLogger("kovidam.shortlist")
logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))

RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET")
RAZORPAY_CLIENT: razorpay.Client | None = None


def _initialize_razorpay_client() -> None:
    """Create one shared Razorpay client for the whole process."""
    global RAZORPAY_CLIENT

    if RAZORPAY_CLIENT is not None:
        return

    if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
        logger.warning("razorpay_credentials_missing_on_startup")
        return

    try:
        client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
        if hasattr(client, "enable_retry"):
            client.enable_retry(True)
        else:
            logger.warning("razorpay_retry_not_supported_by_installed_sdk")
        RAZORPAY_CLIENT = client
        logger.info("razorpay_client_initialized")
    except Exception:
        logger.exception("razorpay_client_initialization_failed")


def _log_razorpay_connectivity() -> None:
    """Probe Razorpay once at startup and log whether the API is reachable."""
    if RAZORPAY_CLIENT is None:
        logger.warning("razorpay_connectivity_check_skipped_client_not_initialized")
        return

    try:
        RAZORPAY_CLIENT.order.all({"count": 1})
        logger.info("razorpay_connectivity_check_passed")
    except Exception as exc:
        logger.warning("razorpay_connectivity_check_failed: %s", exc)

# Limit in-process resume parsing concurrency. Default: 2 at a time.
RESUME_CONCURRENCY = max(1, int(os.getenv("RESUME_CONCURRENCY", "2")))
resume_semaphore = asyncio.Semaphore(RESUME_CONCURRENCY)
SHORTLIST_PROGRESS_TTL_SECONDS = max(60, int(os.getenv("SHORTLIST_PROGRESS_TTL_SECONDS", "3600")))
NOTES_AI_TIMEOUT_SECONDS = float(os.getenv("NOTES_AI_TIMEOUT_SECONDS", "1.8"))
API_VERSION = os.getenv("SHORTLIST_API_VERSION", "v1.0.0")
SCORING_VERSION = os.getenv("SHORTLIST_SCORING_VERSION", "v2.1.0")
POLICY_VERSION = os.getenv("SHORTLIST_POLICY_VERSION", "v2.1.0")
SCORE_DECIMALS = max(2, min(6, int(os.getenv("SHORTLIST_SCORE_DECIMALS", "4"))))
SHORTLIST_INCLUDE_LEGACY_KEYS = os.getenv("SHORTLIST_INCLUDE_LEGACY_KEYS", "true").lower() == "true"
SHORTLIST_AUTO_SEND_EMAILS = os.getenv("SHORTLIST_AUTO_SEND_EMAILS", "false").lower() == "true"
shortlist_progress_store: dict[str, dict] = {}
qdrant_index = QdrantResumeIndex()
DEBUG_DIAGNOSTICS = os.getenv("DEBUG_DIAGNOSTICS", "true").lower() == "true"
from app.constants.companies import COMPANY_SIGNAL_TIERS
from app.constants.keywords import (
    EXPERIENCE_KEYWORDS,
    LEADERSHIP_KEYWORDS,
    IMPACT_KEYWORDS,
    OWNERSHIP_KEYWORDS,
    INTERNSHIP_CREDIBILITY_KEYWORDS,
    ACHIEVEMENT_KEYWORDS,
    PROJECT_COMPLEXITY_KEYWORDS,
)
from app.constants.roles_domains import ROLE_FAMILY_KEYWORDS, TARGET_DOMAIN_KEYWORDS
from app.constants.skills_aliases import SKILL_ALIASES
from app.constants.skills_constraints import (
    AMBIGUOUS_SINGLE_CHAR_SKILLS,
    SEMANTIC_GENERIC_TOKENS,
    SKILL_SHORT_TOKEN_ALLOWLIST,
    SKILL_STOPWORDS,
    SKILL_TOKEN_MAX_LEN,
    SKILL_TOKEN_MIN_LEN,
)
from app.constants.skills_implications import SKILL_IMPLICATIONS


@asynccontextmanager
async def _lifespan(_: FastAPI):
    try:
        init_db()
        qdrant_status = qdrant_index.init_collection()
        _json_log("qdrant_init", qdrant_status)
        _initialize_razorpay_client()
        _log_razorpay_connectivity()
    except Exception:
        logger.exception("database_initialization_failed")
        raise
    yield


app = FastAPI(title="Kovidam Skill Graph API", lifespan=_lifespan)

cors_env = os.getenv("CORS_ALLOWED_ORIGINS", "").strip()
if cors_env:
    if cors_env == "*":
        cors_allowed_origins = ["*"]
    else:
        cors_allowed_origins = [origin.strip() for origin in cors_env.split(",") if origin.strip()]
else:
    # Hardcoded allowed origins including local and production custom domains
    cors_allowed_origins = [
        "http://localhost:5173",
        "https://kovidam-skill-graph-1.onrender.com",
        "https://kovidam.co.in",
        "https://www.kovidam.co.in",
        "https://kovidam-skill-graph.vercel.app",
    ]
    # Auto-detect Render URL if available
    render_url = os.getenv("RENDER_EXTERNAL_URL")
    if render_url and render_url not in cors_allowed_origins:
        cors_allowed_origins.append(render_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_allowed_origins,
    allow_credentials=False if cors_allowed_origins == ["*"] else True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PROTECTED_PATH_PREFIXES = (
    "/hiring",
    "/resume",
    "/account",
    "/admin",
    "/api/create-order",
    "/api/verify-payment",
)


def _auth_snapshot(auth: AuthContext | None) -> dict:
    if not auth:
        return {"auth_present": False}
    return {
        "auth_present": True,
        "user_id": auth.user_id,
        "tenant_id": auth.tenant_id,
        "role": auth.role,
    }


def _current_email(auth: AuthContext) -> str:
    return str(auth.claims.get("email") or "").strip().lower()


def _is_admin_auth(auth: AuthContext) -> bool:
    return auth.role in {"admin", "owner"} or _current_email(auth) == "admin@kovidam.co.in"


def _shortlist_progress_cleanup() -> None:
    now = time.time()
    expired = [
        trace_id
        for trace_id, payload in shortlist_progress_store.items()
        if (now - float(payload.get("updated_at_epoch", now))) > SHORTLIST_PROGRESS_TTL_SECONDS
    ]
    for trace_id in expired:
        shortlist_progress_store.pop(trace_id, None)


def _set_shortlist_progress(trace_id: str, patch: dict) -> None:
    _shortlist_progress_cleanup()
    current = shortlist_progress_store.get(trace_id, {})
    current.update(patch)
    current["updated_at_epoch"] = time.time()
    shortlist_progress_store[trace_id] = current


def _persist_shortlist_run(auth: AuthContext, trace_id: str, response_payload: dict) -> None:
    """
    Persist the latest shortlist payload so history pages can restore the exact
    JD and rerun context even after the in-memory progress store expires.
    """
    db = SessionLocal()
    try:
        job_summary = response_payload.get("job_summary") or {}
        existing = (
            db.query(ShortlistRun)
            .filter(
                ShortlistRun.trace_id == trace_id,
                ShortlistRun.tenant_id == auth.tenant_id,
                ShortlistRun.user_id == auth.user_id,
            )
            .first()
        )
        if existing:
            existing.job_summary = job_summary
            existing.response_json = response_payload
        else:
            db.add(
                ShortlistRun(
                    id=str(uuid.uuid4()),
                    tenant_id=auth.tenant_id,
                    user_id=auth.user_id,
                    trace_id=trace_id,
                    job_summary=job_summary,
                    response_json=response_payload,
                )
            )
        db.commit()
    except Exception:
        db.rollback()
        logger.exception(
            "failed_to_persist_shortlist_run",
            extra={"trace_id": trace_id, "tenant_id": auth.tenant_id, "user_id": auth.user_id},
        )
    finally:
        db.close()


def _load_shortlist_run(auth: AuthContext, trace_id: str) -> ShortlistRun | None:
    db = SessionLocal()
    try:
        return (
            db.query(ShortlistRun)
            .filter(
                ShortlistRun.trace_id == trace_id,
                ShortlistRun.tenant_id == auth.tenant_id,
                ShortlistRun.user_id == auth.user_id,
            )
            .first()
        )
    finally:
        db.close()


def _profile_defaults(auth: AuthContext) -> dict:
    email = _current_email(auth)
    full_name = str(auth.claims.get("name") or auth.claims.get("full_name") or "").strip()
    return {
        "full_name": full_name,
        "company_name": "",
        "job_title": "",
        "company_size": "",
        "hiring_volume": "",
        "work_email": email,
    }


def _serialize_profile(profile: OrganizationProfile | None, auth: AuthContext, db = None) -> dict:
    defaults = _profile_defaults(auth)
    has_pending_transactions = False
    if db and profile:
        has_pending_transactions = db.query(PaymentTransaction).filter(
            PaymentTransaction.tenant_id == profile.tenant_id,
            PaymentTransaction.user_id == profile.user_id,
            PaymentTransaction.status == "pending"
        ).first() is not None

    if not profile:
        return {
            "id": None,
            "tenant_id": auth.tenant_id,
            "user_id": auth.user_id,
            "auth_email": defaults["work_email"],
            "status": "active",
            "credits": _default_profile_credits(auth),
            "last_seen_at": None,
            "created_at": None,
            "updated_at": None,
            "has_pending_transactions": has_pending_transactions,
            **defaults,
        }
    return {
        "id": profile.id,
        "tenant_id": profile.tenant_id,
        "user_id": profile.user_id,
        "auth_email": profile.auth_email,
        "full_name": profile.full_name or "",
        "company_name": profile.company_name or "",
        "job_title": profile.job_title or "",
        "company_size": profile.company_size or "",
        "hiring_volume": profile.hiring_volume or "",
        "status": profile.status or "active",
        "credits": getattr(profile, "credits", 10),
        "last_seen_at": profile.last_seen_at.isoformat(timespec="milliseconds") if profile.last_seen_at else None,
        "created_at": profile.created_at.isoformat(timespec="milliseconds") if profile.created_at else None,
        "updated_at": profile.updated_at.isoformat(timespec="milliseconds") if profile.updated_at else None,
        "has_pending_transactions": has_pending_transactions,
    }


def _default_profile_credits(auth: AuthContext) -> int:
    return 10


def _shortlist_count_from_payload(payload: dict) -> int:
    shortlisted = payload.get("shortlisted") or []
    counts = payload.get("counts") or {}
    return int(counts.get("ranked") or len(shortlisted) or 0)


def _build_company_summary(db, profile: OrganizationProfile) -> dict:
    shortlist_rows = (
        db.query(ShortlistRun)
        .filter(
            ShortlistRun.tenant_id == profile.tenant_id,
            ShortlistRun.user_id == profile.user_id,
        )
        .order_by(ShortlistRun.created_at.desc())
        .all()
    )
    candidate_count = (
        db.query(Candidate.id)
        .filter(Candidate.tenant_id == profile.tenant_id, Candidate.user_id == profile.user_id)
        .count()
    )

    total_shortlisted_resumes = 0
    recent_shortlists: list[dict] = []
    last_shortlist_at = None
    latest_role = ""

    for row in shortlist_rows:
        payload = row.response_json if isinstance(row.response_json, dict) else {}
        job_summary = row.job_summary if isinstance(row.job_summary, dict) else {}
        shortlisted_count = _shortlist_count_from_payload(payload)
        total_shortlisted_resumes += shortlisted_count
        if last_shortlist_at is None:
            last_shortlist_at = row.created_at
            latest_role = str(job_summary.get("role") or job_summary.get("position_title") or "").strip()

        recent_shortlists.append(
            {
                "id": row.trace_id,
                "role": job_summary.get("role") or "Unknown Role",
                "company_name": job_summary.get("company_name") or "",
                "position_title": job_summary.get("position_title") or "",
                "date": row.created_at.isoformat(timespec="milliseconds") if row.created_at else None,
                "matches": shortlisted_count,
            }
        )

    last_activity = profile.updated_at or profile.last_seen_at or last_shortlist_at or profile.created_at

    transactions = (
        db.query(PaymentTransaction)
        .filter(
            PaymentTransaction.tenant_id == profile.tenant_id,
            PaymentTransaction.user_id == profile.user_id,
        )
        .all()
    )
    total_spent = sum(t.amount for t in transactions)
    purchased_plans = list(set(t.plan_id for t in transactions))

    return {
        **_serialize_profile(profile, AuthContext(user_id=profile.user_id, tenant_id=profile.tenant_id, role="viewer", claims={"email": profile.auth_email}), db),
        "company_name": profile.company_name or "",
        "work_email": profile.auth_email or "",
        "candidate_count": candidate_count,
        "shortlist_count": len(shortlist_rows),
        "total_shortlisted_resumes": total_shortlisted_resumes,
        "last_shortlist_at": last_shortlist_at.isoformat(timespec="milliseconds") if last_shortlist_at else None,
        "last_activity_at": last_activity.isoformat(timespec="milliseconds") if last_activity else None,
        "latest_role": latest_role,
        "recent_shortlists": recent_shortlists[:5],
        "is_active": bool(last_activity),
        "total_spent": total_spent,
        "purchased_plans": purchased_plans,
    }


def _shortlist_merge_key(candidate: dict) -> str:
    resume_hash = str(candidate.get("resume_hash") or "").strip().lower()
    if resume_hash:
        return resume_hash
    filename = str(candidate.get("filename") or "").strip().lower()
    return filename


def _dedupe_shortlisted_rows(rows: list[dict]) -> list[dict]:
    seen: set[str] = set()
    deduped: list[dict] = []
    for row in rows:
        key = _shortlist_merge_key(row)
        if key and key in seen:
            continue
        if key:
            seen.add(key)
        deduped.append(row)
    return deduped


class AccountProfilePayload(BaseModel):
    full_name: str = Field(default="", max_length=120)
    company_name: str = Field(default="", max_length=160)
    job_title: str = Field(default="", max_length=120)
    company_size: str = Field(default="", max_length=40)
    hiring_volume: str = Field(default="", max_length=40)
    work_email: str = Field(default="", max_length=120)


def _require_admin(auth: AuthContext) -> None:
    if not _is_admin_auth(auth):
        raise HTTPException(status_code=403, detail="Admin access required")


@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    # Let CORS preflight pass through without auth challenge.
    if request.method.upper() == "OPTIONS":
        return await call_next(request)

    if AUTH_REQUIRED and any(request.url.path.startswith(p) for p in PROTECTED_PATH_PREFIXES):
        try:
            auth_ctx = authenticate_request(request)
            request.state.auth = auth_ctx
            if DEBUG_DIAGNOSTICS:
                logger.info(
                    json.dumps(
                        {
                            "event": "auth_ok",
                            "path": request.url.path,
                            "method": request.method,
                            **_auth_snapshot(auth_ctx),
                        }
                    )
                )
        except HTTPException as exc:
            if DEBUG_DIAGNOSTICS:
                logger.warning(
                    json.dumps(
                        {
                            "event": "auth_failed",
                            "path": request.url.path,
                            "method": request.method,
                            "status_code": exc.status_code,
                            "detail": exc.detail,
                            "has_auth_header": bool(request.headers.get("authorization")),
                        }
                    )
                )
            return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
    return await call_next(request)


def _get_auth_context(request: Request) -> AuthContext:
    auth_ctx = getattr(request.state, "auth", None)
    if auth_ctx is None:
        if AUTH_REQUIRED:
            raise HTTPException(status_code=401, detail="Unauthorized")
        return AuthContext(user_id="local-dev", tenant_id="default", role="owner", claims={})
    return auth_ctx


@app.get("/")
async def root():
    return {
        "message": "Welcome to Kovidam Skill Graph API",
        "resume_concurrency": RESUME_CONCURRENCY,
    }


@app.get("/account/profile")
async def get_account_profile(request: Request):
    db = SessionLocal()
    auth = _get_auth_context(request)
    try:
        profile = (
            db.query(OrganizationProfile)
            .filter(
                OrganizationProfile.tenant_id == auth.tenant_id,
                OrganizationProfile.user_id == auth.user_id,
            )
            .first()
        )
        if profile:
            profile.last_seen_at = datetime.now(timezone.utc)
            db.commit()
        return {"profile": _serialize_profile(profile, auth, db)}
    except Exception:
        db.rollback()
        logger.exception("failed_to_fetch_account_profile")
        raise HTTPException(status_code=500, detail="Failed to fetch account profile")
    finally:
        db.close()


@app.put("/account/profile")
async def upsert_account_profile(payload: AccountProfilePayload, request: Request):
    db = SessionLocal()
    auth = _get_auth_context(request)
    try:
        email = str(payload.work_email or _current_email(auth) or "").strip().lower()
        if not email:
            raise HTTPException(status_code=400, detail="Work email is required")

        profile = (
            db.query(OrganizationProfile)
            .filter(
                OrganizationProfile.tenant_id == auth.tenant_id,
                OrganizationProfile.user_id == auth.user_id,
            )
            .first()
        )
        now = datetime.now(timezone.utc)
        if profile:
            profile.full_name = payload.full_name.strip()
            profile.company_name = payload.company_name.strip()
            profile.job_title = payload.job_title.strip()
            profile.company_size = payload.company_size.strip()
            profile.hiring_volume = payload.hiring_volume.strip()
            profile.auth_email = email
            profile.last_seen_at = now
        else:
            profile = OrganizationProfile(
                id=str(uuid.uuid4()),
                tenant_id=auth.tenant_id,
                user_id=auth.user_id,
                auth_email=email,
                full_name=payload.full_name.strip(),
                company_name=payload.company_name.strip(),
                job_title=payload.job_title.strip(),
                company_size=payload.company_size.strip(),
                hiring_volume=payload.hiring_volume.strip(),
                status="active",
                credits=_default_profile_credits(auth),
                last_seen_at=now,
            )
            db.add(profile)

        db.commit()
        db.refresh(profile)
        return {"profile": _serialize_profile(profile, auth, db)}
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        logger.exception("failed_to_upsert_account_profile")
        raise HTTPException(status_code=500, detail="Failed to save account profile")
    finally:
        db.close()


@app.get("/hiring/dashboard-metrics")
async def dashboard_metrics(request: Request):
    db = SessionLocal()
    auth = _get_auth_context(request)
    try:
        total_candidates = db.query(Candidate).filter(Candidate.tenant_id == auth.tenant_id, Candidate.user_id == auth.user_id).count()
        shortlists_completed = db.query(ShortlistRun.id).filter(ShortlistRun.tenant_id == auth.tenant_id, ShortlistRun.user_id == auth.user_id).count()
        
        # In Kovidam, pending reviews isn't tracked in DB explicitly yet
        pending_reviews = 0
        
        recent_query = (
            db.query(
                ShortlistRun.trace_id,
                ShortlistRun.job_summary,
                ShortlistRun.response_json,
                ShortlistRun.created_at,
            )
            .filter(ShortlistRun.tenant_id == auth.tenant_id, ShortlistRun.user_id == auth.user_id)
            .order_by(ShortlistRun.created_at.desc())
            .limit(5)
            .all()
        )
        
        recent_shortlists = []
        for r in recent_query:
            job_summary = r.job_summary if isinstance(r.job_summary, dict) else {}
            payload = r.response_json if isinstance(r.response_json, dict) else {}
            shortlisted = list(payload.get("shortlisted") or [])
            shortlisted.sort(key=lambda x: x.get("fit_score_100") or 0.0, reverse=True)
            for idx, item in enumerate(shortlisted, start=1):
                item["rank"] = idx

            recent_shortlists.append({
                "id": r.trace_id,
                "role": job_summary.get("role") or "Unknown Role",
                "company_name": job_summary.get("company_name") or "",
                "position_title": job_summary.get("position_title") or "",
                "display_title": (
                    f"{(job_summary.get('company_name') or '').strip()} - {(job_summary.get('position_title') or '').strip()}".strip(" -")
                    or (job_summary.get("role") or "Unknown Role")
                ),
                "date": r.created_at.isoformat(timespec='milliseconds') if r.created_at else None,
                "matches": int((payload.get("counts") or {}).get("ranked") or len(shortlisted)),
                "status": "completed",
                "top_candidates": shortlisted[:3],
                "shortlisted": shortlisted,
                "rejected": [],
            })
            
        return {
            "metrics": {
                "total_candidates": total_candidates,
                "shortlists_completed": shortlists_completed,
                "pending_reviews": pending_reviews
            },
            "recent_shortlists": recent_shortlists
        }
    except Exception as e:
        logger.exception("failed_to_fetch_dashboard_metrics")
        return {
            "metrics": {"total_candidates": 0, "shortlists_completed": 0, "pending_reviews": 0},
            "recent_shortlists": []
        }
    finally:
        db.close()


@app.get("/hiring/shortlists")
async def get_all_shortlists(request: Request):
    db = SessionLocal()
    auth = _get_auth_context(request)
    try:
        query = (
            db.query(
                ShortlistRun.trace_id,
                ShortlistRun.job_summary,
                ShortlistRun.response_json,
                ShortlistRun.created_at,
            )
            .filter(ShortlistRun.tenant_id == auth.tenant_id, ShortlistRun.user_id == auth.user_id)
            .order_by(ShortlistRun.created_at.desc())
            .all()
        )
        if DEBUG_DIAGNOSTICS:
            logger.info(
                json.dumps(
                    {
                        "event": "shortlists_query_result",
                        **_auth_snapshot(auth),
                        "rows": len(query),
                    }
                )
            )
        
        shortlists = []
        for r in query:
            job_summary = r.job_summary if isinstance(r.job_summary, dict) else {}
            payload = r.response_json if isinstance(r.response_json, dict) else {}
            shortlists.append({
                "id": r.trace_id,
                "role": job_summary.get("role") or "Unknown Role",
                "company_name": job_summary.get("company_name") or "",
                "position_title": job_summary.get("position_title") or "",
                "display_title": (
                    f"{(job_summary.get('company_name') or '').strip()} - {(job_summary.get('position_title') or '').strip()}".strip(" -")
                    or (job_summary.get("role") or "Unknown Role")
                ),
                "date": r.created_at.isoformat(timespec='milliseconds') if r.created_at else None,
                "matches": int((payload.get("counts") or {}).get("ranked") or len(payload.get("shortlisted") or [])),
                "status": "completed"
            })
            
        return shortlists
    except Exception as e:
        logger.exception("failed_to_fetch_all_shortlists")
        raise HTTPException(status_code=500, detail="Internal server error")
    finally:
        db.close()


@app.delete("/hiring/shortlist/{trace_id}")
async def delete_shortlist(trace_id: str, request: Request):
    db = SessionLocal()
    auth = _get_auth_context(request)
    try:
        jobs_for_trace = (
            db.query(Job.id, Job.candidate_id)
            .filter(Job.trace_id == trace_id, Job.tenant_id == auth.tenant_id, Job.user_id == auth.user_id)
            .all()
        )
        if not jobs_for_trace:
            raise HTTPException(status_code=404, detail="Shortlist not found")

        job_ids = [row.id for row in jobs_for_trace if row.id]
        candidate_ids = sorted({row.candidate_id for row in jobs_for_trace if row.candidate_id})
        deleted_shortlist_runs = (
            db.query(ShortlistRun)
            .filter(ShortlistRun.trace_id == trace_id, ShortlistRun.tenant_id == auth.tenant_id, ShortlistRun.user_id == auth.user_id)
            .delete(synchronize_session=False)
        )

        deleted_candidate_job_scores = 0
        deleted_jobs = 0
        if job_ids:
            deleted_candidate_job_scores = (
                db.query(CandidateJobScore)
                .filter(CandidateJobScore.job_id.in_(job_ids))
                .delete(synchronize_session=False)
            )
            deleted_jobs = (
                db.query(Job)
                .filter(Job.id.in_(job_ids), Job.tenant_id == auth.tenant_id, Job.user_id == auth.user_id)
                .delete(synchronize_session=False)
            )

        # Candidate-level cleanup only when candidate has no remaining jobs in this tenant.
        removed_candidates = 0
        removed_candidate_scores = 0
        removed_candidate_skills = 0
        removed_platform_stats = 0
        removed_github_summary = 0
        removed_github_commits = 0
        for candidate_id in candidate_ids:
            remaining_jobs = (
                db.query(Job.id)
                .filter(Job.candidate_id == candidate_id, Job.tenant_id == auth.tenant_id, Job.user_id == auth.user_id)
                .first()
            )
            if remaining_jobs:
                continue

            removed_candidate_scores += (
                db.query(CandidateScore)
                .filter(CandidateScore.candidate_id == candidate_id)
                .delete(synchronize_session=False)
            )
            removed_candidate_skills += (
                db.query(CandidateSkill)
                .filter(CandidateSkill.candidate_id == candidate_id)
                .delete(synchronize_session=False)
            )
            removed_platform_stats += (
                db.query(PlatformStat)
                .filter(PlatformStat.candidate_id == candidate_id)
                .delete(synchronize_session=False)
            )
            removed_github_summary += (
                db.query(CandidateGithubSummary)
                .filter(CandidateGithubSummary.candidate_id == candidate_id)
                .delete(synchronize_session=False)
            )
            removed_github_commits += (
                db.query(CandidateGithubCommit)
                .filter(CandidateGithubCommit.candidate_id == candidate_id)
                .delete(synchronize_session=False)
            )
            removed_candidates += (
                db.query(Candidate)
                .filter(Candidate.id == candidate_id, Candidate.tenant_id == auth.tenant_id, Candidate.user_id == auth.user_id)
                .delete(synchronize_session=False)
            )

        db.commit()
        return {
            "status": "deleted",
            "trace_id": trace_id,
            "deleted": {
                "shortlist_runs": deleted_shortlist_runs,
                "jobs": deleted_jobs,
                "candidate_job_scores": deleted_candidate_job_scores,
                "candidates": removed_candidates,
                "candidate_scores": removed_candidate_scores,
                "candidate_skills": removed_candidate_skills,
                "platform_stats": removed_platform_stats,
                "candidate_github_summary": removed_github_summary,
                "candidate_github_commits": removed_github_commits,
            },
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        logger.exception("failed_to_delete_shortlist")
        raise HTTPException(status_code=500, detail="Failed to delete shortlist")
    finally:
        db.close()


@app.get("/admin/overview")
async def admin_overview(request: Request):
    db = SessionLocal()
    auth = _get_auth_context(request)
    _require_admin(auth)
    try:
        profiles = db.query(OrganizationProfile).order_by(OrganizationProfile.updated_at.desc()).all()
        companies = [_build_company_summary(db, profile) for profile in profiles]
        total_candidates = sum(company["candidate_count"] for company in companies)
        total_shortlists = sum(company["shortlist_count"] for company in companies)
        total_shortlisted_resumes = sum(company["total_shortlisted_resumes"] for company in companies)
        active_companies = sum(1 for company in companies if company["is_active"])
        total_collections = sum(company.get("total_spent", 0) for company in companies)
        recent_shortlists = []
        for company in companies:
            for shortlist in company.get("recent_shortlists", []):
                recent_shortlists.append(
                    {
                        **shortlist,
                        "company_name": company.get("company_name") or "",
                        "work_email": company.get("work_email") or "",
                        "user_id": company.get("user_id") or "",
                    }
                )
        recent_shortlists.sort(key=lambda item: item.get("date") or "", reverse=True)
        pending_transactions = (
            db.query(PaymentTransaction)
            .filter(PaymentTransaction.status == "pending")
            .order_by(PaymentTransaction.created_at.desc())
            .all()
        )
        pending_txs = [
            {
                "id": tx.id,
                "tenant_id": tx.tenant_id,
                "user_id": tx.user_id,
                "email": tx.email,
                "payment_id": tx.payment_id,
                "order_id": tx.order_id,
                "plan_id": tx.plan_id,
                "amount": tx.amount,
                "credits": tx.credits,
                "created_at": tx.created_at.isoformat() if tx.created_at else None,
                "status": tx.status,
            }
            for tx in pending_transactions
        ]
        return {
            "summary": {
                "total_companies": len(companies),
                "active_companies": active_companies,
                "total_candidates": total_candidates,
                "total_shortlists": total_shortlists,
                "total_shortlisted_resumes": total_shortlisted_resumes,
                "total_collections": total_collections,
            },
            "companies": companies,
            "recent_shortlists": recent_shortlists[:15],
            "pending_transactions": pending_txs,
        }
    except HTTPException:
        raise
    except Exception:
        logger.exception("failed_to_fetch_admin_overview")
        raise HTTPException(status_code=500, detail="Failed to fetch admin overview")
    finally:
        db.close()


@app.get("/admin/companies")
async def admin_companies(request: Request):
    db = SessionLocal()
    auth = _get_auth_context(request)
    _require_admin(auth)
    try:
        profiles = db.query(OrganizationProfile).order_by(OrganizationProfile.updated_at.desc()).all()
        return {"companies": [_build_company_summary(db, profile) for profile in profiles]}
    except Exception:
        logger.exception("failed_to_fetch_admin_companies")
        raise HTTPException(status_code=500, detail="Failed to fetch companies")
    finally:
        db.close()


@app.get("/admin/companies/{user_id}")
async def admin_company_detail(user_id: str, request: Request):
    db = SessionLocal()
    auth = _get_auth_context(request)
    _require_admin(auth)
    try:
        profile = (
            db.query(OrganizationProfile)
            .filter(OrganizationProfile.user_id == user_id)
            .order_by(OrganizationProfile.updated_at.desc())
            .first()
        )
        if not profile:
            raise HTTPException(status_code=404, detail="Company not found")
        return {"company": _build_company_summary(db, profile)}
    except HTTPException:
        raise
    except Exception:
        logger.exception("failed_to_fetch_admin_company_detail")
        raise HTTPException(status_code=500, detail="Failed to fetch company detail")
    finally:
        db.close()


@app.post("/admin/approve-transaction/{tx_id}")
async def approve_transaction(tx_id: str, request: Request):
    db = SessionLocal()
    auth = _get_auth_context(request)
    _require_admin(auth)
    try:
        tx = db.query(PaymentTransaction).filter(PaymentTransaction.id == tx_id).first()
        if not tx:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        if tx.status == "approved":
            return {"success": True, "message": "Transaction already approved"}
            
        tx.status = "approved"
        
        profile = (
            db.query(OrganizationProfile)
            .filter(
                OrganizationProfile.tenant_id == tx.tenant_id,
                OrganizationProfile.user_id == tx.user_id,
            )
            .first()
        )
        if profile:
            profile.credits = getattr(profile, "credits", 10) + tx.credits
        else:
            profile = OrganizationProfile(
                id=str(uuid.uuid4()),
                tenant_id=tx.tenant_id,
                user_id=tx.user_id,
                auth_email=tx.email,
                status="active",
                credits=10 + tx.credits,
            )
            db.add(profile)
            
        db.commit()
        return {"success": True, "message": "Credits approved successfully"}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.exception("failed_to_approve_transaction")
        raise HTTPException(status_code=500, detail=f"Failed to approve transaction: {str(e)}")
    finally:
        db.close()


@app.get("/hiring/shortlist/{trace_id}")
async def get_past_shortlist(trace_id: str, request: Request):
    db = SessionLocal()
    auth = _get_auth_context(request)
    try:
        _shortlist_progress_cleanup()
        progress_payload = shortlist_progress_store.get(trace_id)
        if progress_payload and progress_payload.get("tenant_id") == auth.tenant_id and progress_payload.get("user_id") == auth.user_id:
            cached_result = progress_payload.get("result")
            if isinstance(cached_result, dict) and cached_result.get("shortlisted") is not None:
                return cached_result

        persisted_run = (
            db.query(ShortlistRun)
            .filter(
                ShortlistRun.trace_id == trace_id,
                ShortlistRun.tenant_id == auth.tenant_id,
                ShortlistRun.user_id == auth.user_id,
            )
            .first()
        )
        if persisted_run and isinstance(persisted_run.response_json, dict) and persisted_run.response_json.get("shortlisted") is not None:
            return persisted_run.response_json

        # Fetch candidates matching the trace_id, along with their scores
        query = (
            db.query(Candidate, Job, CandidateJobScore, CandidateScore)
            .join(Job, Candidate.id == Job.candidate_id)
            .outerjoin(CandidateJobScore, Job.id == CandidateJobScore.job_id)
            .outerjoin(CandidateScore, Candidate.id == CandidateScore.candidate_id)
            .filter(Job.trace_id == trace_id, Job.tenant_id == auth.tenant_id, Job.user_id == auth.user_id)
            .all()
        )
        if DEBUG_DIAGNOSTICS:
            logger.info(
                json.dumps(
                    {
                        "event": "shortlist_trace_query_result",
                        **_auth_snapshot(auth),
                        "trace_id": trace_id,
                        "rows": len(query),
                    }
                )
            )
        
        if not query:
            raise HTTPException(status_code=404, detail="Shortlist not found")

        shortlisted = []
        failed = []

        for cand, job, cjs, cs in query:
            fit_score = cjs.fit_score if cjs and cjs.fit_score else 0.0
            
            # Reconstruct candidate metrics
            metrics = {}
            if cs:
                metrics["github_score_100"] = cs.github_score or 0.0
                metrics["skills_match_score_100"] = cs.skills_match_score or 0.0
                metrics["experience_score_100"] = cs.experience_score or 0.0
                metrics["platform_strength_score_100"] = cs.platform_strength_score or 0.0
                metrics["project_evidence_score_100"] = cs.project_evidence_score or 0.0
                metrics["profile_completeness_score_100"] = cs.profile_completeness_score or 0.0
                
            candidate_summary = {
                "filename": cand.filename or "Unknown",
                "rank": 0, # Will sort later
                "eligible": True,
                "fit_score_100": fit_score,
                "rejection_reasons": [],
                "ranking_decision_log": {
                    "role_profile": job.role or "job",
                    "candidate_metrics": metrics
                },
                "experience": {
                    "candidate_years": cand.work_experience_years or 0.0,
                    "meets_min_experience": (cand.work_experience_years or 0.0) >= (job.min_experience_years or 0.0)
                },
                "email": getattr(cand, "email", None),
                "phone": getattr(cand, "phone", None),
            }
            shortlisted.append(candidate_summary)


        # Sort shortlisted by fit score desc
        shortlisted.sort(key=lambda x: x["fit_score_100"], reverse=True)
        for i, c in enumerate(shortlisted, 1):
            c["rank"] = i

        job = query[0][1]
        job_summary = {
            "company_name": job.company_name or "",
            "position_title": job.position_title or "",
            "role": job.role or "job",
            "required_skills": [],
            "must_have_skills": [],
            "job_description": "",
            "job_description_skills": [],
            "semantic_query_skills": [],
            "min_experience_years": float((job.min_experience_years if job.min_experience_years is not None else 0.0) or 0.0),
            "applied_thresholds": _role_thresholds(job.role or "job", float((job.min_experience_years if job.min_experience_years is not None else 0.0) or 0.0)),
            "source": "historical_fallback",
        }
        
        response_payload = {
            "trace_id": trace_id,
            "job_summary": job_summary,
            "counts": {
                "total": len(query),
                "ranked": len(shortlisted),
                "rejected": 0,
                "failed": len(failed)
            },
            "shortlisted": shortlisted,
            "rejected": [],
            "failed": failed
        }
        _persist_shortlist_run(auth, trace_id, response_payload)
        return response_payload
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("failed_to_fetch_past_shortlist")
        raise HTTPException(status_code=500, detail="Internal server error")
    finally:
        db.close()


class ChatRequest(BaseModel):
    message: str = Field(default="", max_length=1200)
    selected_option: str | None = Field(default=None, max_length=120)


class ChatResponse(BaseModel):
    reply: str
    quick_options: list[str] = Field(default_factory=list)
    allow_free_text: bool = True


CHATBOT_QUICK_OPTIONS = [
    "Upload resume help",
    "How shortlist works",
    "Required skills tips",
    "Talk to Kovidm AI",
]

CHATBOT_POST_REPLY_OPTIONS = [
    "I have another doubt",
    "Not solved yet",
    "Solved, thanks",
]

CHATBOT_PRODUCT_CONTEXT = """
Kovidam is an AI-powered technical talent intelligence and automated screening platform.
Core principle: evaluate evidence of engineering competence, not only resume keywords.

What Kovidam does:
- Parses resume data into structured candidate profiles.
- Enriches candidate signals from GitHub, coding platforms, and achievements.
- Builds a multi-signal engineering capability profile.
- Scores candidates with role-aware weighting (job vs internship).
- Supports shortlist ranking with transparent score breakdown.
- Uses semantic matching and must-have skill gates with alias/implication logic.
- Supports AI-assisted interview/evaluation workflows and recruiter-friendly summaries.

Key differentiator:
- Traditional ATS asks: "Does resume contain keywords?"
- Kovidam asks: "Can this person actually build software?"

Signals considered:
- Resume claims and timeline
- GitHub repositories and contribution quality
- Competitive coding performance (e.g., LeetCode/Codeforces/CodeChef/AtCoder)
- Achievements and credibility indicators (e.g., GSoC, hackathons, open source)
- Skills depth, consistency, and role fit

Tone requirement:
- Never describe Kovidam as a generic job board.
- Explain in simple English with practical examples when needed.
"""


def _chat_greeting_reply() -> ChatResponse:
    return ChatResponse(
        reply=(
            "Hello! I am Kovidm AI. I can guide you in simple words. "
            "Pick any option, or type/voice your doubt directly."
        ),
        quick_options=CHATBOT_QUICK_OPTIONS,
        allow_free_text=True,
    )


def _chat_option_reply(selected_option: str) -> ChatResponse:
    option = _normalize_text(selected_option)
    if option == "upload resume help":
        return ChatResponse(
            reply=(
                "Sure. Go to Resume Extract, upload your PDF resume, and wait for analysis. "
                "After that, open shortlist to compare candidates."
            ),
            quick_options=CHATBOT_POST_REPLY_OPTIONS,
        )
    if option == "how shortlist works":
        return ChatResponse(
            reply=(
                "Shortlist checks skills match, required must-have skills, experience, and profile signals. "
                "Then it ranks candidates by fit score."
            ),
            quick_options=CHATBOT_POST_REPLY_OPTIONS,
        )
    if option == "required skills tips":
        return ChatResponse(
            reply=(
                "Add clear, specific skills like 'react', 'python', 'aws', not broad words only. "
                "Include 6 to 12 important skills for best matching."
            ),
            quick_options=CHATBOT_POST_REPLY_OPTIONS,
        )
    if option == "talk to kovidm ai":
        return ChatResponse(
            reply="Perfect. Ask me anything. I will solve your doubt in easy human language.",
            quick_options=["Resume issue", "Shortlist issue", "Skill matching issue"],
            allow_free_text=True,
        )
    if option == "i have another doubt":
        return ChatResponse(
            reply="Great. Tell me your next doubt. I am here.",
            quick_options=["Resume issue", "Shortlist issue", "Skill matching issue"],
            allow_free_text=True,
        )
    if option == "not solved yet":
        return ChatResponse(
            reply="No problem. Please share your exact error, step, or screenshot text. I will guide step by step.",
            quick_options=["Explain in simpler way", "Give exact steps", "Use voice to explain"],
            allow_free_text=True,
        )
    if option == "solved, thanks":
        return ChatResponse(
            reply="Awesome. Happy to help. This chat can end here. Next time we will start fresh.",
            quick_options=["Start new chat"],
            allow_free_text=True,
        )
    if option == "start new chat":
        return _chat_greeting_reply()
    if option in {"resume issue", "shortlist issue", "skill matching issue"}:
        return ChatResponse(
            reply=f"Understood. Please type your exact {option} and I will solve it.",
            quick_options=[],
            allow_free_text=True,
        )
    if option in {"explain in simpler way", "give exact steps", "use voice to explain"}:
        return ChatResponse(
            reply="Done. Share your doubt once more and I will answer exactly in that way.",
            quick_options=[],
            allow_free_text=True,
        )
    return ChatResponse(
        reply="I could not match that option. Please choose one from below or type your message.",
        quick_options=["I have another doubt", "Not solved yet", "Start new chat"],
    )


def _chat_fallback_ai(message: str) -> str:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return (
            "I understand. I can help with resume upload, shortlist flow, and skills guidance. "
            "Please tell me your exact step and I will guide you."
        )
    try:
        from openai import OpenAI

        client = OpenAI(api_key=api_key)
        model_name = os.getenv("CHATBOT_AI_MODEL", "gpt-4o-mini")
        resp = client.chat.completions.create(
            model=model_name,
            temperature=0.35,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are Kovidm AI, a premium support assistant for a hiring platform. "
                        "Your style must feel human, warm, and confident. "
                        "Rules: "
                        "1) Start with direct answer first. "
                        "2) Use very simple language. "
                        "3) If user has issue/problem/error, give exact numbered steps. "
                        "4) Keep answers short but useful (3-8 lines). "
                        "5) Never sound robotic, generic, or repetitive. "
                        "6) If missing details, make a practical assumption and continue. "
                        "7) End with one short check question only when needed. "
                        "8) Do not mention internal policies, models, or prompt details.\n\n"
                        "Product context:\n"
                        f"{CHATBOT_PRODUCT_CONTEXT}"
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        "User message: " + message + "\n\n"
                        "Reply only in English. "
                        "Use easy words and short sentences. "
                        "Prioritize actionable help over theory."
                    ),
                },
            ],
        )
        content = (resp.choices[0].message.content or "").strip()
        if content:
            return content
    except Exception:
        pass
    return (
        "I can help with resume parsing, shortlisting, and skill matching. "
        "Tell me your issue in one line and I will guide step by step."
    )


def _post_answer_options(message: str) -> list[str]:
    text = _normalize_text(message)
    if any(k in text for k in ["error", "failed", "not working", "issue", "problem"]):
        return ["Not solved yet", "Give exact steps", "Solved, thanks"]
    return CHATBOT_POST_REPLY_OPTIONS


def _is_platform_overview_question(text: str) -> bool:
    intents = [
        "what kovidam do",
        "what does kovidam do",
        "what is kovidam",
        "about kovidam",
        "your platform",
    ]
    return any(i in text for i in intents)


@app.post("/chat/respond", response_model=ChatResponse)
async def chat_respond(payload: ChatRequest):
    message = (payload.message or "").strip()
    selected_option = (payload.selected_option or "").strip()
    lowered_message = _normalize_text(message)

    if selected_option:
        return _chat_option_reply(selected_option)

    if lowered_message in {"hi", "hello", "hey", "hii", "yo"}:
        return _chat_greeting_reply()

    if not lowered_message:
        return ChatResponse(
            reply="Please say hi or choose an option to start.",
            quick_options=CHATBOT_QUICK_OPTIONS,
        )

    if lowered_message in {"solved", "solved thanks", "thanks solved", "done", "fixed"}:
        return ChatResponse(
            reply="Great to hear that. Closing this conversation. Next time, a new chat will start fresh.",
            quick_options=["Start new chat"],
        )

    if _is_platform_overview_question(lowered_message):
        return ChatResponse(
            reply=(
                "Kovidam is an AI technical hiring platform. It checks real proof of engineering skill "
                "from resumes, GitHub, coding profiles, and achievements, then gives role-based shortlist scores. "
                "So companies can hire by actual capability, not just resume keywords."
            ),
            quick_options=["How shortlist works", "Skill matching issue", "I have another doubt"],
        )

    ai_reply = await asyncio.to_thread(_chat_fallback_ai, message)
    return ChatResponse(reply=ai_reply, quick_options=_post_answer_options(message))


async def _process_resume_file(
    file: UploadFile, 
    role: str, 
    trace_id: str,
    tenant_id: str,
    user_id: str,
    force_reprocess: bool = False,
    company_name: str = "",
    position_title: str = "",
    min_experience_years: float = 0.0,
    required_skills: list[str] = None,
    must_have_skills: list[str] = None,
    thresholds: dict = None
):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail=f"Only PDF files are supported: {file.filename}")

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        resume_hash = generate_resume_hash(content)

        async with resume_semaphore:
            result = await parse_resume_and_enrich(tmp_path, role=role)

        saved_json_path = save_extracted_data_to_json(result, file.filename)

        # Compute fit before saving to database
        fit = _candidate_company_fit(
            extracted=result,
            required_skills=required_skills or [],
            must_have_skills=must_have_skills or [],
            min_experience_years=min_experience_years,
            role=role,
            company_name=company_name,
            position_title=position_title,
        )
        fit["criteria_used"]["notes"] = await _generate_ai_notes(role, fit, result)
        
        eligible, rejection_reasons, decision_log = _build_eligibility(
            role=role,
            fit=fit,
            must_have_skills=must_have_skills or [],
            thresholds=thresholds or {},
        )
        fit["ranking_decision_log"] = decision_log

        # Persist parsed data to PostgreSQL.
        raw_for_transform = {
            "filename": file.filename,
            "data": result,
            "fit": fit,
            "job": {
                "company_name": company_name,
                "position_title": position_title,
                "min_experience_years": min_experience_years,
                "role": role,
            }
        }
        structured_data = transform_resume_data(raw_for_transform)
        db_result = await asyncio.to_thread(
            save_to_db,
            structured_data,
            trace_id,
            resume_hash,
            tenant_id,
            user_id,
            force_reprocess=force_reprocess,
        )
        db_status = (db_result or {}).get("status") if isinstance(db_result, dict) else None
        _json_log(
            "resume_persist_db_result",
            {
                "filename": file.filename,
                "trace_id": trace_id,
                "resume_hash": resume_hash,
                "tenant_id": tenant_id,
                "user_id": user_id,
                "db_status": db_status,
                "db_result": db_result,
            },
        )
        if db_status not in {"inserted", "duplicate"}:
            raise RuntimeError(
                f"Database persistence failed for {file.filename}: db_result={db_result!r}"
            )
        semantic_raw_skills = _collect_candidate_raw_skills(result)
        
        # Extract github score to store in semantic search payload
        github_summary = result.get("github_analysis", {}).get("summary", {})
        github_score_100 = _to_float(github_summary.get("overall_score_100"), 0.0)
        
        platform_summary = result.get("platform_stats", {}).get("summary", {})
        comp_coding_score_100 = _to_float(platform_summary.get("overall_competitive_coding_score_100"), 0.0)
        
        exp_years = _to_float(result.get("work_experience_years", "0"), 0.0)

        qdrant_result = await asyncio.to_thread(
            qdrant_index.upsert_resume,
            point_id=resume_hash,
            filename=file.filename,
            role=role,
            raw_skills=semantic_raw_skills,
            payload_extra={
                "resume_hash": resume_hash, 
                "trace_id": trace_id,
                "tenant_id": tenant_id,
                "user_id": user_id,
                "github_score_100": github_score_100,
                "comp_coding_score_100": comp_coding_score_100,
                "experience_years": exp_years,
                "skills_match_score_100": _to_float(fit.get("breakdown", {}).get("skills_match_score_100"), 0.0),
                "experience_score_100": _to_float(fit.get("breakdown", {}).get("experience_score_100"), 0.0),
                "platform_strength_score_100": _to_float(fit.get("breakdown", {}).get("platform_strength_score_100"), 0.0),
                "project_evidence_score_100": _to_float(fit.get("breakdown", {}).get("project_evidence_score_100"), 0.0),
                "profile_completeness_score_100": _to_float(fit.get("breakdown", {}).get("profile_completeness_score_100"), 0.0),
                "fit_score_100": _to_float(fit.get("fit_score_100"), 0.0)
            },
        )
        _json_log(
            "resume_persist_qdrant_result",
            {
                "filename": file.filename,
                "trace_id": trace_id,
                "resume_hash": resume_hash,
                "tenant_id": tenant_id,
                "user_id": user_id,
                "qdrant_result": qdrant_result,
            },
        )

        return {
            "filename": file.filename,
            "extracted": result,
            "saved_json_path": saved_json_path,
            "trace_id": trace_id,
            "resume_hash": resume_hash,
            "db_result": db_result,
            "qdrant_result": qdrant_result,
            "fit": fit,
            "eligible": eligible,
            "rejection_reasons": rejection_reasons,
        }
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)


def _to_float(value, default: float = 0.0) -> float:
    try:
        return float(value)
    except Exception:
        return default


def _rscore(value: float) -> float:
    return round(_to_float(value, 0.0), SCORE_DECIMALS)


def _fscore(value: float) -> str:
    return f"{_to_float(value, 0.0):.{SCORE_DECIMALS}f}"


COMPANY_SIGNAL_MAX_CONTRIB = _to_float(os.getenv("COMPANY_SIGNAL_MAX_CONTRIB", "0.15"), 0.15)
LOW_CONFIDENCE_REVIEW_ONLY = os.getenv("LOW_CONFIDENCE_REVIEW_ONLY", "true").lower() == "true"


def _normalize_text(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip().lower())


def _sanitize_skill_token(skill: str) -> str:
    token = _normalize_text(skill)
    if not token:
        return ""
    token = re.sub(r"[_|/]+", " ", token)
    token = re.sub(r"\s+", " ", token).strip(" ,;:.!?\"'`()[]{}")
    if not token:
        return ""
    if token in SKILL_STOPWORDS:
        return ""
    if len(token) < SKILL_TOKEN_MIN_LEN and token not in SKILL_SHORT_TOKEN_ALLOWLIST:
        return ""
    if len(token) > SKILL_TOKEN_MAX_LEN:
        return ""
    return token


def _canonical_skill(skill: str) -> str:
    norm = _sanitize_skill_token(skill)
    if not norm:
        return ""
    return SKILL_ALIASES.get(norm, norm)


def _expand_skill_with_implications(skill: str) -> set[str]:
    expanded = set()
    queue = [_canonical_skill(skill)]
    while queue:
        cur = queue.pop()
        if not cur or cur in expanded:
            continue
        expanded.add(cur)
        for implied in SKILL_IMPLICATIONS.get(cur, set()):
            canon_implied = _canonical_skill(implied)
            if canon_implied not in expanded:
                queue.append(canon_implied)
    return expanded


def _clamp01(value: float) -> float:
    return max(0.0, min(value, 1.0))


def _safe_int(value, default: int = 0) -> int:
    try:
        if isinstance(value, str):
            value = value.replace(",", "").strip()
        return int(float(value))
    except Exception:
        return default


def _inverse_rank_score(rank_value, worst_rank: int = 200000) -> float:
    rank = _safe_int(rank_value, 0)
    if rank <= 0:
        return 0.0
    bounded = max(1, min(rank, worst_rank))
    log_worst = math.log10(float(worst_rank))
    if log_worst <= 0:
        return 0.0
    return _clamp01(1.0 - (math.log10(float(bounded)) / log_worst))


def _skill_token_variants(skill: str) -> set[str]:
    canon = _canonical_skill(skill)
    variants = {canon}
    if canon == "c++":
        variants.update({"cpp", "c plus plus"})
    return {v for v in variants if v}


def _skill_in_text(text: str, skill: str) -> bool:
    for variant in _skill_token_variants(skill):
        if not variant:
            continue
        if variant in AMBIGUOUS_SINGLE_CHAR_SKILLS:
            explicit_pattern = rf"(?<![a-z0-9])({re.escape(variant)}\s+language|{re.escape(variant)}\s+programming|{re.escape(variant)}\s+lang)(?![a-z0-9])"
            if re.search(explicit_pattern, text):
                return True
            continue
        pattern = rf"(?<![a-z0-9]){re.escape(variant)}(?![a-z0-9])"
        if re.search(pattern, text):
            return True
    return False


def _token_contains_any(haystack: str, values: set[str]) -> bool:
    for v in values:
        if not v:
            continue
        pattern = rf"(?<![a-z0-9]){re.escape(v)}(?![a-z0-9])"
        if re.search(pattern, haystack):
            return True
    return False


def _normalize_skills_list(skills: list[str]) -> list[str]:
    seen = set()
    out = []
    for s in skills:
        c = _canonical_skill(s)
        if c and c not in seen:
            seen.add(c)
            out.append(c)
    return out


def _filter_semantic_generic_tokens(skills: list[str]) -> list[str]:
    return [s for s in skills if s and s not in SEMANTIC_GENERIC_TOKENS]


def _collect_candidate_raw_skills(extracted: dict) -> list[str]:
    skills = []
    skills.extend((extracted.get("skills_section", {}) or {}).get("items", []) or [])
    projects = (extracted.get("projects_section", {}) or {}).get("items", []) or []
    for project in projects:
        if not isinstance(project, dict):
            continue
        skills.extend(project.get("tech_stack", []) or [])
    return [str(s) for s in skills if str(s).strip()]


def _job_skill_vocabulary() -> set[str]:
    vocab = set()
    for k, v in SKILL_ALIASES.items():
        if k:
            vocab.add(_normalize_text(k))
        if v:
            vocab.add(_normalize_text(v))
    for k, vals in SKILL_IMPLICATIONS.items():
        if k:
            vocab.add(_normalize_text(k))
        for val in vals:
            vocab.add(_normalize_text(val))
    return {v for v in vocab if v}


def _extract_skills_from_job_description(job_description: str) -> list[str]:
    text = _normalize_text(job_description or "")
    if not text:
        return []
    matches = []
    for token in _job_skill_vocabulary():
        pattern = rf"(?<![a-z0-9]){re.escape(token)}(?![a-z0-9])"
        if re.search(pattern, text):
            matches.append(token)
    return _normalize_skills_list(matches)


async def _qdrant_jd_semantic_map(
    *,
    query_skills: list[str],
    tenant_id: str,
    user_id: str,
    role: str,
    candidates: list[dict],
) -> dict[str, dict]:
    if not query_skills:
        return {}
    candidate_ids = {str(c.get("resume_hash")) for c in candidates if c.get("resume_hash")}
    if not candidate_ids:
        return {}
    # Pull more hits than candidate size to increase recall for small/mid batch shortlist requests.
    top_k = max(20, min(400, len(candidate_ids) * 5))
    result = await asyncio.to_thread(
        qdrant_index.search,
        query_skills=query_skills,
        tenant_id=tenant_id,
        user_id=user_id,
        role=role,
        top_k=top_k,
        min_score=0.0,
    )
    if not result.get("enabled") or not result.get("ready"):
        return {}
    hit_map: dict[str, dict] = {}
    for hit in result.get("hits", []):
        resume_hash = str(hit.get("resume_hash") or "")
        if not resume_hash or resume_hash not in candidate_ids:
            continue
        hit_map[resume_hash] = {
            "score_100": _to_float(hit.get("score_100"), 0.0),
            "matched_query_tokens": hit.get("matched_query_tokens", []),
            "relevance_band": hit.get("relevance_band"),
            "skills_preview": hit.get("skills_preview", []),
        }
    return hit_map


def _extract_candidate_skill_sources(extracted: dict) -> dict:
    repos = extracted.get("github_analysis", {}).get("repositories", []) or []
    github_tokens = set()
    for repo in repos:
        analysis = repo.get("analysis", {}) or {}
        for dep in analysis.get("identified_tech_stack_dependencies", []) or []:
            dep_norm = _canonical_skill(str(dep))
            if dep_norm:
                github_tokens.add(dep_norm)
                github_tokens.update(_expand_skill_with_implications(dep_norm))

    skills_items = (extracted.get("skills_section", {}) or {}).get("items", []) or []
    resume_skill_tokens = set(_normalize_skills_list([str(s) for s in skills_items]))
    for token in list(resume_skill_tokens):
        resume_skill_tokens.update(_expand_skill_with_implications(token))

    projects = (extracted.get("projects_section", {}) or {}).get("items", []) or []
    project_stack_tokens = set()
    project_text_parts = []
    for p in projects:
        if not isinstance(p, dict):
            continue
        for dep in p.get("tech_stack", []) or []:
            dep_norm = _canonical_skill(str(dep))
            if dep_norm:
                project_stack_tokens.add(dep_norm)
                project_stack_tokens.update(_expand_skill_with_implications(dep_norm))
        title = _normalize_text(str(p.get("title") or ""))
        description = _normalize_text(str(p.get("description") or ""))
        highlights = " ".join(_normalize_text(str(h or "")) for h in (p.get("highlights") or []))
        if title:
            project_text_parts.append(title)
        if description:
            project_text_parts.append(description)
        if highlights:
            project_text_parts.append(highlights)

    raw_text = _normalize_text(extracted.get("raw_text_full") or extracted.get("raw_text_preview", ""))
    project_text = _normalize_text(" ".join(project_text_parts))
    return {
        "github_tokens": github_tokens,
        "resume_skill_tokens": resume_skill_tokens,
        "project_stack_tokens": project_stack_tokens,
        "raw_text": raw_text,
        "project_text": project_text,
    }


def _infer_role_context(
    role: str,
    position_title: str,
    company_name: str,
    required_skills: list[str],
    must_have_skills: list[str],
) -> dict:
    role_l = _normalize_text(role)
    title_l = _normalize_text(position_title)
    company_l = _normalize_text(company_name)
    all_skill_tokens = set(_normalize_skills_list(required_skills + must_have_skills))
    role_blob = " ".join([role_l, title_l, company_l, " ".join(all_skill_tokens)])

    families = {}
    for family, keywords in ROLE_FAMILY_KEYWORDS.items():
        hit_count = sum(1 for kw in keywords if kw in role_blob)
        families[family] = _clamp01(hit_count / 4.0)

    target_domain = "general"
    domain_best = 0.0
    for domain, keywords in TARGET_DOMAIN_KEYWORDS.items():
        hits = sum(1 for k in keywords if k in role_blob)
        score = _clamp01(hits / 2.0)
        if score > domain_best:
            domain_best = score
            target_domain = domain

    return {
        "role": role_l,
        "position_title": title_l,
        "company_name": company_l,
        "family_scores": families,
        "target_domain": target_domain,
        "target_domain_score": domain_best,
    }


from app.scoring.cache.repo_cache import get_cached_github_evidence
from app.scoring.collectors.deployment_collector import extract_deployments
from app.scoring.collectors.experience_collector import extract_experience_context
from app.scoring.analyzers.verification_engine import verify_skills
from app.scoring.analyzers.domain_detector import analyze_domains
from app.scoring.github.depth_analysis.depth_aggregator import calculate_engineering_depth
from app.scoring.authenticity.authenticity_engine import calculate_authenticity_factor
from app.scoring.confidence.confidence_engine import calculate_confidence_metrics
from app.scoring.gating.gating_engine import apply_scoring_gates

def _skill_match_score(
    required_skills: list[str],
    extracted: dict,
    must_have_skills: list[str] | None = None,
    role: str = "job",
) -> tuple[float, list[str], list[str], dict]:
    if not required_skills and not must_have_skills:
        return 1.0, [], [], {"skill_meta": {"coverage_required": 1.0, "coverage_must_have": 1.0}}

    must_have_skills = must_have_skills or []
    
    # 1. Collection Phase (Cached where possible)
    github_ev = get_cached_github_evidence(extracted.get("github_analysis", {}))
    deployments = extract_deployments(extracted)
    exp_text = extract_experience_context(extracted)
    
    eval_skills_dict = {}
    for sk in required_skills + must_have_skills:
        if sk not in eval_skills_dict:
            eval_skills_dict[sk] = _canonical_skill(sk)

    # 2. Verification Phase
    claimed_skills = list(eval_skills_dict.keys())
    verified_results = verify_skills(claimed_skills, github_ev, deployments, exp_text, role)
    verified_map = {v.skill: v for v in verified_results}
    
    # 3. Domain Ecosystem Detection
    domain_calibration = analyze_domains(verified_results)

    must_have_norm = {_canonical_skill(s) for s in must_have_skills if _canonical_skill(s)}
    required_norm = [_canonical_skill(s) for s in required_skills if _canonical_skill(s)]

    matched = []
    missing = []
    evidence = {}
    weighted_sum = 0.0
    weight_total = 0.0
    matched_required_norm = set()
    matched_must_have_norm = set()
    
    skill_evidences = []

    for skill, s in eval_skills_dict.items():
        if not s:
            continue
            
        v = verified_map.get(skill)
        
        # Original claim-based logic for base confidence
        sources = _extract_candidate_skill_sources(extracted)
        required_equivalents = _skill_token_variants(s)
        
        matched_by_github = any((req == t or req in t or t in req) for req in required_equivalents for t in sources["github_tokens"])
        matched_by_project_stack = any((req == t or req in t or t in req) for req in required_equivalents for t in sources["project_stack_tokens"])
        matched_by_skill_section = any((req == t or req in t or t in req) for req in required_equivalents for t in sources["resume_skill_tokens"])
        matched_by_project_text = _token_contains_any(sources["project_text"], required_equivalents)
        matched_by_text = any(_skill_in_text(sources["raw_text"], req) for req in required_equivalents)

        base_confidence = (
            (1.0 if matched_by_github else 0.0)
            + (0.9 if matched_by_project_stack else 0.0)
            + (0.7 if matched_by_skill_section else 0.0)
            + (0.45 if matched_by_project_text else 0.0)
            + (0.30 if matched_by_text else 0.0)
        )
        base_score = _clamp01(base_confidence / 1.35)
        
        # Apply VerifiedSkillEvidenceEngine Multipliers
        multiplier = v.multiplier if v else 1.0
        
        if v and v.level == "CONTRADICTORY":
            skill_score = _clamp01(base_score * multiplier)
        elif base_score > 0.0:
            skill_score = _clamp01(base_score * multiplier)
        else:
            skill_score = 0.0

        is_required = skill in required_skills
        is_must_have = s in must_have_norm

        if is_required:
            skill_weight = 1.35 if is_must_have else 1.0
            weighted_sum += skill_score * skill_weight
            weight_total += skill_weight

        evidence[skill] = {
            "matched_by_github": matched_by_github,
            "matched_by_project_stack": matched_by_project_stack,
            "matched_by_skills_section": matched_by_skill_section,
            "matched_by_project_text": matched_by_project_text,
            "matched_by_text": matched_by_text,
            "is_required": is_required,
            "is_must_have": is_must_have,
            "evidence_strength_100": round(skill_score * 100.0, 3),
            "verification_level": v.level if v else "UNKNOWN",
            "verification_multiplier": multiplier,
            "evidence_strength_score": v.strength_score if v else 0.0,
            "verification_sources": v.sources if v else []
        }
        
        if v:
            skill_evidences.append({
                "skill": skill,
                "level": v.level,
                "multiplier": multiplier,
                "strength": v.strength,
                "strength_score": v.strength_score,
                "sources": v.sources
            })

        if skill_score >= 0.40:
            matched.append(skill)
            if is_required:
                matched_required_norm.add(s)
            if is_must_have:
                matched_must_have_norm.add(s)
        else:
            missing.append(skill)

    score = (weighted_sum / weight_total) if weight_total > 0 else 0.0
    must_have_total = len(must_have_norm)
    must_have_matched = len(matched_must_have_norm)
    must_have_coverage = (must_have_matched / must_have_total) if must_have_total > 0 else 1.0
    required_coverage = len(matched_required_norm) / max(1, len(required_norm))

    score = _clamp01((score * 0.82) + (must_have_coverage * 0.18))

    # 4. Engineering Depth
    engineering_depth = calculate_engineering_depth(extracted)
    
    # 5. Authenticity & Penalty Engine
    authenticity_results = calculate_authenticity_factor(extracted, evidence, engineering_depth)
    authenticity_factor = authenticity_results["factor"]
    
    # Apply gradual degradation to final score based on suspicious signals
    score = score * authenticity_factor

    evidence["skill_meta"] = {
        "coverage_required": round(required_coverage, 4),
        "coverage_must_have": round(must_have_coverage, 4),
        "matched_must_have_count": must_have_matched,
        "total_must_have_count": must_have_total,
        "evidence_trace": skill_evidences,
        "signal_calibration": domain_calibration,
        "engineering_depth": engineering_depth,
        "authenticity": authenticity_results
    }
    return score, matched, missing, evidence


def _codeforces_score(cf: dict) -> float:
    rating = _to_float(cf.get("max_rating"), 0.0)
    solved = _to_float(cf.get("problems_solved"), 0.0)
    rating_score = _clamp01((rating - 900.0) / 1400.0)
    solved_score = _clamp01(solved / 900.0)
    return (rating_score * 0.72) + (solved_score * 0.28)


def _leetcode_score(lc: dict) -> float:
    rating = _to_float(lc.get("rating"), 0.0)
    easy = _to_float(lc.get("easy_solved"), 0.0)
    medium = _to_float(lc.get("medium_solved"), 0.0)
    hard = _to_float(lc.get("hard_solved"), 0.0)
    total_solved = _to_float(lc.get("total_solved") or lc.get("problems_solved"), 0.0)
    weighted_solved = (easy * 0.25) + (medium * 1.0) + (hard * 2.5)
    if weighted_solved <= 0 and total_solved > 0:
        weighted_solved = total_solved
    rating_score = _clamp01((rating - 1300.0) / 1300.0)
    solved_score = _clamp01(weighted_solved / 900.0)
    return (rating_score * 0.55) + (solved_score * 0.45)


def _codechef_score(cc: dict) -> float:
    rating = _to_float(cc.get("highest_rating"), 0.0)
    contests = _to_float(cc.get("contests_participated"), 0.0)
    rating_score = _clamp01((rating - 1200.0) / 1300.0)
    consistency_score = _clamp01(contests / 60.0)
    return (rating_score * 0.7) + (consistency_score * 0.3)


def _atcoder_score(ac: dict) -> float:
    rating = _to_float(ac.get("highest_rating"), 0.0)
    contests = _to_float(ac.get("contests_participated"), 0.0)
    rating_score = _clamp01((rating - 600.0) / 1800.0)
    consistency_score = _clamp01(contests / 70.0)
    return (rating_score * 0.7) + (consistency_score * 0.3)


def _kaggle_score(kg: dict) -> float:
    competitions = _to_float(kg.get("competitions") or kg.get("competitions_count"), 0.0)
    notebooks = _to_float(kg.get("notebooks"), 0.0)
    datasets = _to_float(kg.get("datasets"), 0.0)
    medals = kg.get("medals") or {}
    medal_points = (
        (_to_float(medals.get("gold"), 0.0) * 3.0)
        + (_to_float(medals.get("silver"), 0.0) * 2.0)
        + (_to_float(medals.get("bronze"), 0.0) * 1.0)
    )
    rank_score = _inverse_rank_score(kg.get("rank"), worst_rank=200000)
    medal_score = _clamp01(medal_points / 18.0)
    competition_score = _clamp01(competitions / 35.0)
    artifact_score = _clamp01((notebooks + datasets) / 60.0)
    return (
        (rank_score * 0.35)
        + (medal_score * 0.35)
        + (competition_score * 0.2)
        + (artifact_score * 0.1)
    )


def _platform_weight_profile(role_context: dict) -> dict:
    base = {
        "codeforces": 0.24,
        "leetcode": 0.24,
        "codechef": 0.14,
        "atcoder": 0.14,
        "kaggle": 0.24,
    }
    families = role_context.get("family_scores", {}) if isinstance(role_context, dict) else {}
    data_ml = _to_float(families.get("data_ml"), 0.0)
    backend = _to_float(families.get("backend"), 0.0)
    frontend = _to_float(families.get("frontend"), 0.0)
    security = _to_float(families.get("security"), 0.0)

    if data_ml >= 0.4:
        base = {
            "codeforces": 0.18,
            "leetcode": 0.22,
            "codechef": 0.09,
            "atcoder": 0.09,
            "kaggle": 0.42,
        }
    elif backend >= 0.4 or frontend >= 0.4:
        base = {
            "codeforces": 0.26,
            "leetcode": 0.30,
            "codechef": 0.14,
            "atcoder": 0.14,
            "kaggle": 0.16,
        }
    elif security >= 0.4:
        base = {
            "codeforces": 0.22,
            "leetcode": 0.28,
            "codechef": 0.18,
            "atcoder": 0.18,
            "kaggle": 0.14,
        }

    total = sum(base.values()) or 1.0
    return {k: v / total for k, v in base.items()}


def _platform_score_details(platform_stats: dict, role_context: dict) -> dict:
    # Normalize each platform on comparable scales so one rating system cannot dominate.
    platform_scores = {}
    platform_weights = _platform_weight_profile(role_context)

    cf = platform_stats.get("codeforces") or {}
    if isinstance(cf, dict) and cf:
        platform_scores["codeforces"] = _codeforces_score(cf)

    lc = platform_stats.get("leetcode") or {}
    if isinstance(lc, dict) and lc:
        platform_scores["leetcode"] = _leetcode_score(lc)

    cc = platform_stats.get("codechef") or {}
    if isinstance(cc, dict) and cc:
        platform_scores["codechef"] = _codechef_score(cc)

    ac = platform_stats.get("atcoder") or {}
    if isinstance(ac, dict) and ac:
        platform_scores["atcoder"] = _atcoder_score(ac)

    kg = platform_stats.get("kaggle") or {}
    if isinstance(kg, dict) and kg:
        platform_scores["kaggle"] = _kaggle_score(kg)

    if not platform_scores:
        return {
            "score": 0.0,
            "blended_score": 0.0,
            "peak_score": 0.0,
            "coverage_score": 0.0,
            "per_platform_score_100": {},
            "applied_weights": platform_weights,
            "peak_platform": None,
        }

    present_weight_sum = sum(platform_weights[p] for p in platform_scores)
    if present_weight_sum <= 0:
        return {
            "score": 0.0,
            "blended_score": 0.0,
            "peak_score": 0.0,
            "coverage_score": 0.0,
            "per_platform_score_100": {k: round(v * 100.0, 3) for k, v in platform_scores.items()},
            "applied_weights": platform_weights,
            "peak_platform": None,
        }
    blended = sum(platform_scores[p] * platform_weights[p] for p in platform_scores) / present_weight_sum
    peak_platform = max(platform_scores, key=platform_scores.get)
    peak_score = platform_scores[peak_platform]
    coverage_score = len(platform_scores) / 5.0
    score = _clamp01((blended * 0.58) + (peak_score * 0.32) + (coverage_score * 0.10))
    return {
        "score": score,
        "blended_score": _clamp01(blended),
        "peak_score": _clamp01(peak_score),
        "coverage_score": _clamp01(coverage_score),
        "per_platform_score_100": {k: round(v * 100.0, 3) for k, v in platform_scores.items()},
        "applied_weights": platform_weights,
        "peak_platform": peak_platform,
    }


def _platform_achievement_details(platform_stats: dict) -> dict:
    cf = platform_stats.get("codeforces") or {}
    lc = platform_stats.get("leetcode") or {}
    cc = platform_stats.get("codechef") or {}
    ac = platform_stats.get("atcoder") or {}
    kg = platform_stats.get("kaggle") or {}

    points = 0.0
    platform_points = {
        "codeforces": 0.0,
        "leetcode": 0.0,
        "codechef": 0.0,
        "atcoder": 0.0,
        "kaggle": 0.0,
    }
    cf_rating = _to_float(cf.get("max_rating"), 0.0) if isinstance(cf, dict) else 0.0
    lc_rating = _to_float(lc.get("rating"), 0.0) if isinstance(lc, dict) else 0.0
    cc_rating = _to_float(cc.get("highest_rating"), 0.0) if isinstance(cc, dict) else 0.0
    ac_rating = _to_float(ac.get("highest_rating"), 0.0) if isinstance(ac, dict) else 0.0

    if cf_rating >= 2200:
        platform_points["codeforces"] += 1.10
    elif cf_rating >= 2000:
        platform_points["codeforces"] += 0.90
    elif cf_rating >= 1900:
        platform_points["codeforces"] += 0.72
    elif cf_rating >= 1700:
        platform_points["codeforces"] += 0.58

    if lc_rating >= 2400:
        platform_points["leetcode"] += 1.0
    elif lc_rating >= 2200:
        platform_points["leetcode"] += 0.82
    elif lc_rating >= 2000:
        platform_points["leetcode"] += 0.62
    elif lc_rating >= 1850:
        platform_points["leetcode"] += 0.46

    if cc_rating >= 2200:
        platform_points["codechef"] += 0.68
    elif cc_rating >= 2000:
        platform_points["codechef"] += 0.50
    if ac_rating >= 2000:
        platform_points["atcoder"] += 0.68
    elif ac_rating >= 1700:
        platform_points["atcoder"] += 0.50

    if isinstance(kg, dict):
        medals = kg.get("medals") or {}
        gold = _to_float(medals.get("gold"), 0.0)
        silver = _to_float(medals.get("silver"), 0.0)
        bronze = _to_float(medals.get("bronze"), 0.0)
        rank = _safe_int(kg.get("rank"), 0)
        medal_points = min(1.25, (gold * 0.50) + (silver * 0.30) + (bronze * 0.15))
        platform_points["kaggle"] += medal_points
        if rank and rank <= 100:
            platform_points["kaggle"] += 1.20
        elif rank and rank <= 500:
            platform_points["kaggle"] += 1.00
        elif rank and rank <= 2000:
            platform_points["kaggle"] += 0.76
        elif rank and rank <= 10000:
            platform_points["kaggle"] += 0.45

    points = sum(platform_points.values())
    max_points = 5.4
    raw_score = _clamp01(points / max_points)
    peak_platform = max(platform_points, key=platform_points.get) if points > 0 else None
    peak_points = platform_points.get(peak_platform, 0.0) if peak_platform else 0.0
    avg_points = points / max(1, len([v for v in platform_points.values() if v > 0]))
    # "Take highest" achievement while still rewarding multi-platform depth.
    blended = _clamp01((peak_points / 1.8) * 0.58 + (avg_points / 1.3) * 0.25 + raw_score * 0.17)
    return {
        "score": blended,
        "raw_score": raw_score,
        "peak_platform": peak_platform,
        "peak_points": round(peak_points, 3),
        "platform_points": {k: round(v, 3) for k, v in platform_points.items()},
    }


def _profile_completeness_score(extracted: dict) -> float:
    profiles = extracted.get("profiles", {}) or {}
    keys = [
        "github_username",
        "codeforces_username",
        "leetcode_username",
        "codechef_username",
        "atcoder_username",
        "kaggle_username",
    ]
    present = sum(1 for k in keys if profiles.get(k))
    return present / float(len(keys))


def _project_evidence_score(extracted: dict) -> float:
    repos = extracted.get("github_analysis", {}).get("repositories", []) or []
    if not repos:
        return 0.0
    repo_count_score = min(len(repos) / 5.0, 1.0)
    valid_analysis = sum(1 for r in repos if "error" not in (r.get("analysis") or {}))
    quality_score = valid_analysis / float(len(repos))
    return (repo_count_score * 0.6) + (quality_score * 0.4)


def _project_relevance_score(
    extracted: dict,
    required_skills: list[str],
    must_have_skills: list[str],
    role_context: dict,
) -> tuple[float, dict]:
    projects = (extracted.get("projects_section", {}) or {}).get("items", []) or []
    if not projects:
        return 0.0, {"project_count": 0, "top_projects": []}

    target_skills = set(_normalize_skills_list(required_skills + must_have_skills))
    family_keywords = set()
    for family, score in (role_context.get("family_scores", {}) or {}).items():
        if _to_float(score, 0.0) >= 0.25:
            family_keywords.update(ROLE_FAMILY_KEYWORDS.get(family, set()))

    scored = []
    for p in projects:
        if not isinstance(p, dict):
            continue
        title = _normalize_text(str(p.get("title") or ""))
        desc = _normalize_text(str(p.get("description") or ""))
        highlights = [_normalize_text(str(h or "")) for h in (p.get("highlights") or [])]
        merged_text = " ".join([title, desc, *highlights]).strip()
        tech_stack = set(_normalize_skills_list([str(s) for s in (p.get("tech_stack") or [])]))
        combined_skill_evidence = tech_stack.copy()
        for token in list(tech_stack):
            combined_skill_evidence.update(_expand_skill_with_implications(token))

        matched_target = len(target_skills.intersection(combined_skill_evidence))
        skill_relevance = matched_target / max(1, len(target_skills)) if target_skills else 0.0
        family_relevance_hits = sum(1 for kw in family_keywords if kw in merged_text)
        family_relevance = _clamp01(family_relevance_hits / 5.0) if family_keywords else 0.0
        quant_hits = len(re.findall(r"\b\d+(\.\d+)?\s*(%|x|ms|s|sec|seconds|users|req/s|rps)\b", merged_text))
        impact_score = _clamp01(quant_hits / 3.0)
        complexity_hits = sum(1 for kw in PROJECT_COMPLEXITY_KEYWORDS if kw in merged_text)
        complexity_score = _clamp01((complexity_hits / 4.0) + (len(tech_stack) / 14.0))
        ownership_signal = _clamp01(
            len([h for h in highlights if any(k in h for k in ["built", "designed", "owned", "led", "implemented"])]) / 3.0
        )

        final = _clamp01(
            (skill_relevance * 0.42)
            + (family_relevance * 0.18)
            + (impact_score * 0.18)
            + (complexity_score * 0.14)
            + (ownership_signal * 0.08)
        )
        scored.append(
            {
                "title": (p.get("title") or "")[:80],
                "score": final,
                "skill_relevance_100": round(skill_relevance * 100.0, 3),
                "impact_score_100": round(impact_score * 100.0, 3),
                "complexity_score_100": round(complexity_score * 100.0, 3),
            }
        )

    scored.sort(key=lambda item: item["score"], reverse=True)
    top = scored[:3]
    if not top:
        return 0.0, {"project_count": len(projects), "top_projects": []}
    aggregate = sum(item["score"] for item in top) / len(top)
    depth_bonus = _clamp01(len(projects) / 5.0) * 0.08
    final = _clamp01((aggregate * 0.92) + depth_bonus)
    return final, {
        "project_count": len(projects),
        "top_projects": [
            {
                "title": item["title"],
                "score_100": round(item["score"] * 100.0, 3),
                "skill_relevance_100": item["skill_relevance_100"],
                "impact_score_100": item["impact_score_100"],
                "complexity_score_100": item["complexity_score_100"],
            }
            for item in top
        ],
    }


def _target_alignment_score(extracted: dict, role_context: dict) -> tuple[float, dict]:
    raw_text = _normalize_text(extracted.get("raw_text_full") or extracted.get("raw_text_preview", ""))
    skills_items = (extracted.get("skills_section", {}) or {}).get("items", []) or []
    project_items = (extracted.get("projects_section", {}) or {}).get("items", []) or []
    skill_tokens = " ".join(_normalize_text(str(s)) for s in skills_items)
    project_blob = " ".join(
        _normalize_text(" ".join([
            str(p.get("title") or ""),
            str(p.get("description") or ""),
            " ".join(str(h or "") for h in (p.get("highlights") or [])),
        ]))
        for p in project_items if isinstance(p, dict)
    )
    candidate_blob = " ".join([raw_text, skill_tokens, project_blob])

    family_scores = role_context.get("family_scores", {}) or {}
    family_alignment = 0.0
    family_details = {}
    for family, intensity in family_scores.items():
        if intensity <= 0.0:
            continue
        keywords = ROLE_FAMILY_KEYWORDS.get(family, set())
        hits = sum(1 for kw in keywords if kw in candidate_blob)
        fam_score = _clamp01(hits / 8.0)
        family_details[family] = round(fam_score * 100.0, 3)
        family_alignment += fam_score * _clamp01(intensity)

    family_alignment = _clamp01(family_alignment / max(1.0, sum(_clamp01(v) for v in family_scores.values())))
    target_domain = role_context.get("target_domain", "general")
    domain_keywords = TARGET_DOMAIN_KEYWORDS.get(target_domain, set())
    domain_hits = sum(1 for kw in domain_keywords if kw in candidate_blob)
    domain_alignment = _clamp01(domain_hits / 4.0) if domain_keywords else 0.0

    score = _clamp01((family_alignment * 0.72) + (domain_alignment * 0.28))
    return score, {
        "target_domain": target_domain,
        "target_domain_score_100": round(domain_alignment * 100.0, 3),
        "family_alignment_scores_100": family_details,
    }


def _confidence_score(extracted: dict, fit_breakdown: dict) -> tuple[float, dict]:
    skills_count = _safe_int((extracted.get("skills_section", {}) or {}).get("count"), 0)
    projects_count = _safe_int((extracted.get("projects_section", {}) or {}).get("count"), 0)
    parser_meta = extracted.get("parser_meta", {}) or {}
    extraction_meta = extracted.get("structured_extraction_meta", {}) or {}
    parser_used = (parser_meta.get("parsers_used", {}) or {})

    parser_strength = 0.0
    parser_strength += 0.35 if parser_used.get("pymupdf") else 0.0
    parser_strength += 0.25 if parser_used.get("pdfplumber") else 0.0
    parser_strength += 0.20 if parser_used.get("pypdf") else 0.0
    parser_strength += 0.20 if _safe_int(parser_used.get("ocr_pages"), 0) == 0 else 0.08
    parser_strength = _clamp01(parser_strength)

    structured_ok = 1.0 if extraction_meta.get("status") == "ok" else 0.35
    section_completeness = _clamp01((min(skills_count, 20) / 20.0) * 0.55 + (min(projects_count, 4) / 4.0) * 0.45)
    evidence_strength = _clamp01(
        (_to_float(fit_breakdown.get("skills_match_score_100"), 0.0) / 100.0) * 0.5
        + (_to_float(fit_breakdown.get("project_relevance_score_100"), 0.0) / 100.0) * 0.3
        + (_to_float(fit_breakdown.get("platform_strength_score_100"), 0.0) / 100.0) * 0.2
    )
    score = _clamp01(
        (parser_strength * 0.20)
        + (structured_ok * 0.25)
        + (section_completeness * 0.30)
        + (evidence_strength * 0.25)
    )
    return score, {
        "parser_strength_score_100": round(parser_strength * 100.0, 3),
        "structured_extraction_ok_score_100": round(structured_ok * 100.0, 3),
        "section_completeness_score_100": round(section_completeness * 100.0, 3),
        "evidence_strength_score_100": round(evidence_strength * 100.0, 3),
    }


def _achievement_score(extracted: dict, platform_achievement: dict) -> tuple[float, dict]:
    text = _normalize_text(extracted.get("raw_text") or extracted.get("raw_text_preview", ""))
    platform_stats = extracted.get("platform_stats", {}) or {}

    gsoc_signal = 1.0 if ("google summer of code" in text or "gsoc" in text) else 0.0
    achievement_keywords = [
        "icpc", "hackercup", "meta hacker cup", "winner", "finalist", "medal",
        "gold medal", "silver medal", "bronze medal", "global rank", "air",
        "kaggle master", "kaggle grandmaster",
    ]
    keyword_hits = sum(1 for kw in achievement_keywords if kw in text)
    keyword_score = _clamp01(keyword_hits / 5.0)
    rank_signal_hits = len(re.findall(r"\b(global rank|air|rank)\s*(?:[:#]?\s*)\d{1,5}\b", text))
    rank_signal = _clamp01(rank_signal_hits / 3.0)
    
    # Phase 6: Native AI Achievement Scoring
    ai_achievements = extracted.get("achievements_section", {}).get("items", [])
    ai_impact_sum = sum(_to_float(a.get("impact_score_1_to_10"), 0.0) for a in ai_achievements)
    # 20 points of impact maxes out the score (e.g. two 10/10 achievements)
    ai_achievement_score = _clamp01(ai_impact_sum / 20.0)

    cf_rating = _to_float((platform_stats.get("codeforces") or {}).get("max_rating"), 0.0)
    lc_rating = _to_float((platform_stats.get("leetcode") or {}).get("rating"), 0.0)
    cc_rating = _to_float((platform_stats.get("codechef") or {}).get("highest_rating"), 0.0)
    ac_rating = _to_float((platform_stats.get("atcoder") or {}).get("highest_rating"), 0.0)
    elite_platform_points = 0.0
    if cf_rating >= 2200:
        elite_platform_points += 1.0
    elif cf_rating >= 2000:
        elite_platform_points += 0.8
    if lc_rating >= 2400:
        elite_platform_points += 1.0
    elif lc_rating >= 2200:
        elite_platform_points += 0.8
    if cc_rating >= 2200:
        elite_platform_points += 0.6
    if ac_rating >= 2000:
        elite_platform_points += 0.6
    elite_platform_score = _clamp01(elite_platform_points / 2.2)
    platform_achievement_score = _to_float(platform_achievement.get("score"), 0.0)

    score = _clamp01(
        (gsoc_signal * 0.25)
        + (ai_achievement_score * 0.40)
        + (platform_achievement_score * 0.20)
        + (elite_platform_score * 0.10)
        + (_clamp01((keyword_score * 0.6) + (rank_signal * 0.4)) * 0.05)
    )
    return score, {
        "gsoc_signal_score_100": round(gsoc_signal * 100.0, 3),
        "ai_achievement_score_100": round(ai_achievement_score * 100.0, 3),
        "platform_achievement_score_100": round(platform_achievement_score * 100.0, 3),
        "elite_platform_score_100": round(elite_platform_score * 100.0, 3),
        "achievement_keyword_score_100": round(keyword_score * 100.0, 3),
        "rank_signal_score_100": round(rank_signal * 100.0, 3),
    }


def _json_log(event: str, payload: dict) -> None:
    logger.info(json.dumps({"event": event, **payload}, ensure_ascii=False))


def _policy_config(role: str) -> dict:
    role_l = (role or "internship").lower()
    job_min_exp_quality = _to_float(os.getenv("JOB_MIN_EXPERIENCE_QUALITY_SCORE_100", "0"), 0.0)
    if role_l == "internship":
        return {
            "weights": {
                "skills": _to_float(os.getenv("INTERN_WEIGHT_SKILLS", "0.28"), 0.28),
                "github": _to_float(os.getenv("INTERN_WEIGHT_GITHUB", "0.18"), 0.18),
                "experience": _to_float(os.getenv("INTERN_WEIGHT_EXPERIENCE", "0.00"), 0.00),
                "platform": _to_float(os.getenv("INTERN_WEIGHT_PLATFORM", "0.07"), 0.07),
                "projects": _to_float(os.getenv("INTERN_WEIGHT_PROJECTS", "0.24"), 0.24),
                "profile": _to_float(os.getenv("INTERN_WEIGHT_PROFILE", "0.05"), 0.05), # Learning Consistency
                "experience_quality": _to_float(os.getenv("INTERN_WEIGHT_EXPERIENCE_QUALITY", "0.08"), 0.08), # Semantic JD Alignment
                "experience_relevance": _to_float(os.getenv("INTERN_WEIGHT_EXPERIENCE_RELEVANCE", "0.08"), 0.08),
                "achievements": _to_float(os.getenv("INTERN_WEIGHT_ACHIEVEMENTS", "0.02"), 0.02),
            },
            "thresholds": {
                "min_skill_match_pct": _to_float(os.getenv("INTERN_MIN_SKILL_MATCH_PCT", "35"), 35.0),
                "min_github_score_100": 0.0,
                "min_experience_quality_score_100": 0.0,
                "min_confidence_score_100": _to_float(os.getenv("INTERN_MIN_CONFIDENCE_SCORE_100", "45"), 45.0),
            },
        }
    return {
        "weights": {
            "skills": _to_float(os.getenv("JOB_WEIGHT_SKILLS", "0.20"), 0.20),
            "github": _to_float(os.getenv("JOB_WEIGHT_GITHUB", "0.06"), 0.06),
            "experience": _to_float(os.getenv("JOB_WEIGHT_EXPERIENCE", "0.18"), 0.18), # Experience Depth & Complexity
            "platform": _to_float(os.getenv("JOB_WEIGHT_PLATFORM", "0.03"), 0.03),
            "projects": _to_float(os.getenv("JOB_WEIGHT_PROJECTS", "0.10"), 0.10), # Technical Impact Evidence
            "profile": _to_float(os.getenv("JOB_WEIGHT_PROFILE", "0.08"), 0.08), # Career Consistency
            "experience_quality": _to_float(os.getenv("JOB_WEIGHT_EXPERIENCE_QUALITY", "0.11"), 0.11), # Leadership + Semantic JD (5% + 6%)
            "experience_relevance": _to_float(os.getenv("JOB_WEIGHT_EXPERIENCE_RELEVANCE", "0.24"), 0.24),
            "achievements": _to_float(os.getenv("JOB_WEIGHT_ACHIEVEMENTS", "0.00"), 0.00),
        },
        "thresholds": {
            "min_skill_match_pct": _to_float(os.getenv("JOB_MIN_SKILL_MATCH_PCT", "55"), 55.0),
            "min_github_score_100": _to_float(os.getenv("JOB_MIN_GITHUB_SCORE_100", "35"), 35.0),
            "min_experience_quality_score_100": job_min_exp_quality,
            "min_confidence_score_100": _to_float(os.getenv("JOB_MIN_CONFIDENCE_SCORE_100", "50"), 50.0),
        },
    }


def _role_weights(role: str) -> dict:
    return _policy_config(role)["weights"]


def _role_thresholds(role: str, min_experience_years: float) -> dict:
    base = _policy_config(role)["thresholds"]
    if role.lower() == "job":
        return {
            "min_skill_match_pct": base["min_skill_match_pct"],
            "min_github_score_100": base["min_github_score_100"],
            "min_experience_years": min_experience_years,
            "min_experience_quality_score_100": base["min_experience_quality_score_100"],
            "min_confidence_score_100": base.get("min_confidence_score_100", 0.0),
        }
    return {
        "min_skill_match_pct": base["min_skill_match_pct"],
        "min_github_score_100": base["min_github_score_100"],
        "min_experience_years": min_experience_years,
        "min_experience_quality_score_100": base["min_experience_quality_score_100"],
        "min_confidence_score_100": base.get("min_confidence_score_100", 0.0),
    }


def _count_keyword_hits(text: str, keywords: list[str]) -> int:
    return sum(1 for k in keywords if k in text)


def _company_signal(text: str) -> tuple[float, list[str], dict]:
    hits: list[tuple[str, float]] = []
    tier_counts: dict[str, int] = {}
    for tier_score, companies in COMPANY_SIGNAL_TIERS.items():
        label = f"{tier_score:.2f}"
        count = 0
        for company in companies:
            if company in text:
                hits.append((company, tier_score))
                count += 1
        if count:
            tier_counts[label] = count

    if not hits:
        return 0.0, [], {"tier_counts": tier_counts, "max_tier_score": 0.0, "avg_tier_score": 0.0}

    unique_hits = {}
    for name, score in hits:
        # If same company appears, keep highest tier score.
        unique_hits[name] = max(score, unique_hits.get(name, 0.0))

    scores = list(unique_hits.values())
    max_score = max(scores)
    avg_score = sum(scores) / len(scores)
    blended = (max_score * 0.65) + (avg_score * 0.35)
    mentions = sorted(unique_hits.keys())[:12]
    return blended, mentions, {
        "tier_counts": tier_counts,
        "max_tier_score": round(max_score * 100.0, 3),
        "avg_tier_score": round(avg_score * 100.0, 3),
    }


def _experience_quality_score(extracted: dict, role: str) -> tuple[float, dict]:
    text = _normalize_text(extracted.get("raw_text") or extracted.get("raw_text_preview", ""))
    years = _to_float(extracted.get("work_experience_years", "0"), 0.0)
    role_l = (role or "job").lower()

    company_score, _, company_meta = _company_signal(text)
    # Fairness guardrail: brand pedigree should not dominate without delivery evidence.
    company_score = min(company_score, COMPANY_SIGNAL_MAX_CONTRIB)
    keyword_hits = _count_keyword_hits(text, EXPERIENCE_KEYWORDS)
    keyword_score = min(keyword_hits / 5.0, 1.0)

    leadership_hits = _count_keyword_hits(text, LEADERSHIP_KEYWORDS)
    leadership_score = min(leadership_hits / 4.0, 1.0)

    impact_hits = _count_keyword_hits(text, IMPACT_KEYWORDS)
    impact_score = min(impact_hits / 5.0, 1.0)

    ownership_hits = _count_keyword_hits(text, OWNERSHIP_KEYWORDS)
    ownership_score = min(ownership_hits / 5.0, 1.0)

    internship_hits = _count_keyword_hits(text, INTERNSHIP_CREDIBILITY_KEYWORDS)
    internship_score = min(internship_hits / 3.0, 1.0)
    achievement_hits = _count_keyword_hits(text, ACHIEVEMENT_KEYWORDS)
    achievement_score = min(achievement_hits / 4.0, 1.0)
    gsoc_signal = 1.0 if ("google summer of code" in text or "gsoc" in text) else 0.0
    platform_achievement_details = _platform_achievement_details(extracted.get("platform_stats", {}) or {})
    platform_achievement = _to_float(platform_achievement_details.get("score"), 0.0)
    medal_signal = 1.0 if any(
        kw in text for kw in ["medal", "gold medal", "silver medal", "bronze medal", "kaggle master", "kaggle grandmaster"]
    ) else 0.0
    rank_signal_hits = len(re.findall(r"\b(global rank|air|rank)\s*(?:[:#]?\s*)\d{1,5}\b", text))
    rank_signal = _clamp01(rank_signal_hits / 3.0)

    # Detect quantified impact patterns: percentages, x multipliers, and absolute numbers.
    quant_patterns = [
        r"\b\d+(\.\d+)?\s*%",
        r"\b\d+(\.\d+)?x\b",
        r"\b\d{2,}\b",
    ]
    quant_hits = 0
    for p in quant_patterns:
        quant_hits += len(re.findall(p, text))
    quant_score = min(quant_hits / 6.0, 1.0)

    if role_l == "job":
        years_score = min(years / 4.0, 1.0)
        terms = {
            "years": (years_score, 0.20),
            "company": (company_score, 0.10),
            "leadership": (leadership_score, 0.13),
            "impact": (impact_score, 0.15),
            "ownership": (ownership_score, 0.13),
            "quant": (quant_score, 0.10),
            "keyword": (keyword_score, 0.07),
            "achievement": (achievement_score, 0.04),
            "platform_achievement": (platform_achievement, 0.08),
            "gsoc": (gsoc_signal, 0.04),
            "medal": (medal_signal, 0.04),
            "rank": (rank_signal, 0.02),
        }
        denom = sum(w for _, w in terms.values()) or 1.0
        final = sum(v * w for v, w in terms.values()) / denom
    else:
        years_score = min(years / 2.0, 1.0)
        terms = {
            "years": (years_score, 0.12),
            "company": (company_score, 0.10),
            "internship": (internship_score, 0.15),
            "impact": (impact_score, 0.15),
            "ownership": (ownership_score, 0.12),
            "quant": (quant_score, 0.10),
            "keyword": (keyword_score, 0.07),
            "achievement": (achievement_score, 0.08),
            "platform_achievement": (platform_achievement, 0.09),
            "gsoc": (gsoc_signal, 0.04),
            "medal": (medal_signal, 0.03),
            "rank": (rank_signal, 0.05),
        }
        denom = sum(w for _, w in terms.values()) or 1.0
        final = sum(v * w for v, w in terms.values()) / denom

    return final, {
        "role_profile": role_l,
        "years_score_100": round(years_score * 100.0, 3),
        "keyword_score_100": round(keyword_score * 100.0, 3),
        "impact_signal_score_100": round(impact_score * 100.0, 3),
        "ownership_signal_score_100": round(ownership_score * 100.0, 3),
        "quantified_impact_score_100": round(quant_score * 100.0, 3),
        "internship_credibility_score_100": round(internship_score * 100.0, 3),
        "achievement_signal_score_100": round(achievement_score * 100.0, 3),
        "platform_achievement_score_100": round(platform_achievement * 100.0, 3),
        "gsoc_signal_score_100": round(gsoc_signal * 100.0, 3),
        "medal_signal_score_100": round(medal_signal * 100.0, 3),
        "rank_signal_score_100": round(rank_signal * 100.0, 3),
        # Keep aggregate company signal only; hide raw company mentions.
        "company_signal_score_100": round(company_score * 100.0, 3),
        "company_tier_meta": company_meta,
        "platform_achievement_meta": platform_achievement_details,
        "signal_hits": {
            "experience_keywords": keyword_hits,
            "leadership_keywords": leadership_hits,
            "impact_keywords": impact_hits,
            "ownership_keywords": ownership_hits,
            "internship_keywords": internship_hits,
            "achievement_keywords": achievement_hits,
            "quantified_impact_patterns": quant_hits,
            "rank_signals": rank_signal_hits,
        },
    }


def _experience_relevance_score(
    extracted: dict,
    required_skills: list[str],
    must_have_skills: list[str],
    role_context: dict,
) -> tuple[float, dict]:
    exp_items = ((extracted.get("experience_section", {}) or {}).get("items", []) or [])
    if not exp_items:
        return 0.0, {"experience_items": 0, "top_experiences": []}

    target_skills = set(_normalize_skills_list(required_skills + must_have_skills))
    family_keywords = set()
    for family, score in (role_context.get("family_scores", {}) or {}).items():
        if _to_float(score, 0.0) >= 0.2:
            family_keywords.update(ROLE_FAMILY_KEYWORDS.get(family, set()))
    domain_keywords = TARGET_DOMAIN_KEYWORDS.get(role_context.get("target_domain", "general"), set())

    scored = []
    for item in exp_items:
        if not isinstance(item, dict):
            continue
        position = _normalize_text(str(item.get("position") or ""))
        company = _normalize_text(str(item.get("company") or ""))
        duration = _normalize_text(str(item.get("duration") or ""))
        description = _normalize_text(str(item.get("description") or ""))
        tech_stack = set(_normalize_skills_list([str(s) for s in (item.get("tech_stack") or [])]))
        combined_skill_evidence = tech_stack.copy()
        for token in list(tech_stack):
            combined_skill_evidence.update(_expand_skill_with_implications(token))

        text_blob = " ".join([position, company, duration, description])
        matched_target = len(target_skills.intersection(combined_skill_evidence))
        skill_relevance = (matched_target / max(1, len(target_skills))) if target_skills else 0.0
        family_hits = sum(1 for kw in family_keywords if kw in text_blob)
        family_relevance = _clamp01(family_hits / 6.0) if family_keywords else 0.0
        domain_hits = sum(1 for kw in domain_keywords if kw in text_blob)
        domain_relevance = _clamp01(domain_hits / 4.0) if domain_keywords else 0.0
        impact_hits = len(re.findall(r"\b\d+(\.\d+)?\s*(%|x|ms|s|sec|seconds|users|req/s|rps)\b", text_blob))
        impact_signal = _clamp01(impact_hits / 3.0)
        recency_bonus = 1.0 if any(y in duration for y in ["2026", "2025", "2024"]) else 0.75

        item_score = _clamp01(
            (skill_relevance * 0.45)
            + (family_relevance * 0.20)
            + (domain_relevance * 0.17)
            + (impact_signal * 0.10)
            + (recency_bonus * 0.08)
        )
        scored.append(
            {
                "position": (item.get("position") or "")[:80],
                "company": (item.get("company") or "")[:80],
                "score": item_score,
                "skill_relevance_100": _rscore(skill_relevance * 100.0),
                "family_relevance_100": _rscore(family_relevance * 100.0),
                "domain_relevance_100": _rscore(domain_relevance * 100.0),
            }
        )

    if not scored:
        return 0.0, {"experience_items": len(exp_items), "top_experiences": []}
    scored.sort(key=lambda x: x["score"], reverse=True)
    top = scored[:3]
    aggregate = sum(x["score"] for x in top) / len(top)
    depth_bonus = _clamp01(len(scored) / 4.0) * 0.07
    final = _clamp01((aggregate * 0.93) + depth_bonus)
    return final, {
        "experience_items": len(scored),
        "top_experiences": [
            {
                "position": x["position"],
                "company": x["company"],
                "score_100": _rscore(x["score"] * 100.0),
                "skill_relevance_100": x["skill_relevance_100"],
                "family_relevance_100": x["family_relevance_100"],
                "domain_relevance_100": x["domain_relevance_100"],
            }
            for x in top
        ],
    }


def _parse_csv_list(value: str) -> list[str]:
    if not value:
        return []
    parts = re.split(r"[,;\n|]+", value)
    out = []
    seen = set()
    for part in parts:
        canon = _canonical_skill(part)
        if canon and canon not in seen:
            seen.add(canon)
            out.append(canon)
    return out


def _normalize_skill_set(skills: list[str]) -> set[str]:
    return {_normalize_text(s) for s in skills if _normalize_text(s)}


def _build_eligibility(role: str, fit: dict, must_have_skills: list[str], thresholds: dict) -> tuple[bool, list[str], dict]:
    matched_norm = {_canonical_skill(s) for s in fit.get("skills", {}).get("matched", []) if _canonical_skill(s)}
    
    missing_must_have = []
    matched_must_have = []
    for s in must_have_skills:
        sc = _canonical_skill(s)
        if sc and sc not in matched_norm:
            missing_must_have.append(s)
        else:
            matched_must_have.append(s)
            
    rejection_reasons = []

    skill_match_score_100 = _to_float(fit.get("breakdown", {}).get("skills_match_score_100"), 0.0)
    github_score_100 = _to_float(fit.get("breakdown", {}).get("github_score_100"), 0.0)
    experience_years = _to_float(fit.get("experience", {}).get("candidate_years"), 0.0)
    experience_quality_score_100 = _to_float(fit.get("breakdown", {}).get("experience_quality_score_100"), 0.0)
    confidence_score_100 = _to_float(fit.get("breakdown", {}).get("confidence_score_100"), 0.0)

    if missing_must_have:
        rejection_reasons.append(f"Missing must-have skills: {', '.join(missing_must_have)} (failed semantic + alias match)")


    if role == "job":
        if skill_match_score_100 < thresholds["min_skill_match_pct"]:
            rejection_reasons.append(
                f"Skill match {skill_match_score_100:.3f} below minimum {thresholds['min_skill_match_pct']:.3f}"
            )
        min_github = _to_float(thresholds.get("min_github_score_100"), 0.0)
        github_data_available = _to_float(
            fit.get("breakdown", {}).get("github_data_available_score_100"), 0.0
        ) > 0.0
        if min_github > 0.0 and github_data_available and github_score_100 < min_github:
            rejection_reasons.append(
                f"GitHub score {github_score_100:.3f} below minimum {min_github:.3f}"
            )
        if experience_years < thresholds["min_experience_years"]:
            rejection_reasons.append(
                f"Experience {experience_years:.3f} years below minimum {thresholds['min_experience_years']:.3f}"
            )
        min_exp_quality = _to_float(thresholds.get("min_experience_quality_score_100"), 0.0)
        if experience_quality_score_100 < min_exp_quality:
            rejection_reasons.append(
                f"Experience quality score {experience_quality_score_100:.3f} below minimum {min_exp_quality:.3f}"
            )
    min_confidence = _to_float(thresholds.get("min_confidence_score_100"), 0.0)
    confidence_only_review = False
    if min_confidence > 0.0 and confidence_score_100 < min_confidence:
        confidence_reason = f"Confidence score {confidence_score_100:.3f} below minimum {min_confidence:.3f}"
        if LOW_CONFIDENCE_REVIEW_ONLY:
            confidence_only_review = True
            rejection_reasons.append(f"{confidence_reason} (manual review recommended)")
        else:
            rejection_reasons.append(confidence_reason)

    if confidence_only_review:
        non_confidence_reasons = [r for r in rejection_reasons if not r.startswith("Confidence score ")]
        if not non_confidence_reasons:
            rejection_reasons = []

    decision_log = {
        "role_profile": role,
        "manual_review_recommended": confidence_only_review,
        "confidence_gate": {
            "enabled": min_confidence > 0.0,
            "minimum_score_100": min_confidence,
            "candidate_score_100": confidence_score_100,
        },
        "must_have_skills": must_have_skills,
        "missing_must_have_skills": missing_must_have,
        "applied_thresholds": thresholds,
        "candidate_metrics": {
            "skills_match_score_100": skill_match_score_100,
            "must_have_coverage_score_100": _to_float(
                fit.get("breakdown", {}).get("must_have_coverage_score_100"), 0.0
            ),
            "github_score_100": github_score_100,
            "experience_years": experience_years,
            "experience_quality_score_100": _to_float(
                fit.get("breakdown", {}).get("experience_quality_score_100"), 0.0
            ),
            "experience_relevance_score_100": _to_float(
                fit.get("breakdown", {}).get("experience_relevance_score_100"), 0.0
            ),
            "platform_strength_score_100": _to_float(
                fit.get("breakdown", {}).get("platform_strength_score_100"), 0.0
            ),
            "platform_achievement_score_100": _to_float(
                fit.get("breakdown", {}).get("platform_achievement_score_100"), 0.0
            ),
            "project_relevance_score_100": _to_float(
                fit.get("breakdown", {}).get("project_relevance_score_100"), 0.0
            ),
            "target_alignment_score_100": _to_float(
                fit.get("breakdown", {}).get("target_alignment_score_100"), 0.0
            ),
            "confidence_score_100": _to_float(
                fit.get("breakdown", {}).get("confidence_score_100"), 0.0
            ),
            "achievement_score_100": _to_float(
                fit.get("breakdown", {}).get("achievement_score_100"), 0.0
            ),
            "confidence_score_100": confidence_score_100,
        },
    }
    return len(rejection_reasons) == 0, rejection_reasons, decision_log


def _summarize_candidate_for_table(candidate: dict) -> dict:
    fit = candidate.get("fit", {}) or {}
    decision_log = fit.get("ranking_decision_log", {}) or {}
    experience = fit.get("experience", {}) or {}
    extracted = candidate.get("extracted", {}) or {}
    email = extract_candidate_email(extracted) or candidate.get("email")
    phone = extract_candidate_phone(extracted) or candidate.get("phone")
    summary = {
        "filename": candidate.get("filename"),
        "rank": candidate.get("rank"),
        "eligible": bool(candidate.get("eligible")),
        "fit_score_100": fit.get("fit_score_100"),
        "rejection_reasons": candidate.get("rejection_reasons", []),
        "ranking_decision_log": decision_log,
        "experience": {
            "candidate_years": experience.get("candidate_years"),
            "required_min_years": experience.get("required_min_years"),
            "quality_meta": experience.get("quality_meta", {}),
        },
        "email": email,
        "phone": phone,
    }
    return summary



def _top_ranking_insights(shortlisted: list[dict], rejected: list[dict]) -> list[str]:
    eligible_pool = shortlisted
    considered_pool = shortlisted + rejected
    insights = []

    if eligible_pool:
        top = eligible_pool[0]
        top_fit = top.get("fit_score_100", 0.0) or 0.0
        top_file = top.get("filename", "unknown").split('.')[0]
        top_skills = (
            ((top.get("ranking_decision_log", {}) or {}).get("candidate_metrics", {}) or {})
            .get("skills_match_score_100", 0.0)
        )
        insights.append(
            f"The top ranked candidate is {top_file} with a fit score of {top_fit:.1f}% and a skills match of {top_skills:.1f}%."
        )
    else:
        insights.append("No candidate passed eligibility filters, so no ranked shortlist was produced.")

    if considered_pool:
        must_have_failures = 0
        threshold_failures = 0
        for c in considered_pool:
            reasons = c.get("rejection_reasons", []) or []
            if any("Missing must-have skills" in r for r in reasons):
                must_have_failures += 1
            if any("below minimum" in r for r in reasons):
                threshold_failures += 1
        insights.append(
            f"Hard-filter impact: Missing must-have skills caused {must_have_failures} rejections, and failure to meet minimum thresholds caused {threshold_failures} rejections."
        )
    else:
        insights.append("No candidates were processed in this run.")

    if shortlisted:
        avg_fit = sum((c.get("fit_score_100") or 0.0) for c in shortlisted) / len(shortlisted)
        avg_exp = sum((c.get("experience", {}).get("candidate_years") or 0.0) for c in shortlisted) / len(shortlisted)
        insights.append(
            f"The shortlisted cohort averages a fit score of {avg_fit:.1f}% and {avg_exp:.1f} years of experience."
        )
    else:
        insights.append("Shortlisted cohort averages are unavailable because zero candidates were eligible.")

    return insights[:3]


def _fallback_notes(role: str, fit: dict) -> list[str]:
    b = fit.get("breakdown", {})
    skills = b.get("skills_match_score_100", 0.0)
    github = b.get("github_score_100", 0.0)
    exp = b.get("experience_score_100", 0.0)
    if role.lower() == "internship":
        return [
            f"Skills match is {skills:.1f}/100 and is the strongest internship signal.",
            f"GitHub contribution signal is {github:.1f}/100; project depth can improve this.",
            f"Experience readiness is {exp:.1f}/100 and weighted lighter for internship roles.",
        ]
    return [
        f"Skills match is {skills:.1f}/100 and directly impacts job fit.",
        f"GitHub contribution is {github:.1f}/100, reflecting delivery and code ownership.",
        f"Experience alignment is {exp:.1f}/100 and is a major factor for job roles.",
    ]


def _generate_ai_notes_sync(role: str, fit: dict, extracted: dict) -> list[str]:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return _fallback_notes(role, fit)
    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
        payload = {
            "role": role,
            "fit": fit,
            "github_summary": extracted.get("github_analysis", {}).get("summary", {}),
            "experience_years": extracted.get("work_experience_years", "N/A"),
        }
        prompt = (
            "Return strict JSON: {\"notes\":[\"...\",\"...\",\"...\"]}. "
            "Notes must be factual, concise, non-generic, and based only on the provided data. "
            "No praise/buttering. No extra keys. Data: " + json.dumps(payload)
        )
        model_name = os.getenv("NOTES_AI_MODEL", "gpt-4o-mini")
        resp = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": "You are a strict hiring analyst. Output JSON only."},
                {"role": "user", "content": prompt},
            ],
        )
        text = (resp.choices[0].message.content or "").strip()
        start = text.find("{")
        end = text.rfind("}")
        parsed = json.loads(text[start:end+1]) if start != -1 and end != -1 else {}
        notes = parsed.get("notes", [])
        if isinstance(notes, list):
            cleaned = [str(n).strip()[:180] for n in notes if str(n).strip()]
            if cleaned:
                return cleaned[:3]
    except Exception:
        pass
    return _fallback_notes(role, fit)


async def _generate_ai_notes(role: str, fit: dict, extracted: dict) -> list[str]:
    try:
        return await asyncio.wait_for(
            asyncio.to_thread(_generate_ai_notes_sync, role, fit, extracted),
            timeout=NOTES_AI_TIMEOUT_SECONDS,
        )
    except Exception:
        return _fallback_notes(role, fit)


def _candidate_company_fit(
    extracted: dict,
    required_skills: list[str],
    must_have_skills: list[str],
    min_experience_years: float,
    role: str,
    company_name: str,
    position_title: str,
) -> dict:
    exp_str = extracted.get("work_experience_years", "N/A")
    exp = _to_float(exp_str, 0.0)
    
    if exp == 0.0:
        # Fallback to estimating based on experience entries
        items = extracted.get("experience_section", {}).get("items", [])
        if not items:
            from app.services.resume_parser import _extract_experience_from_text_fallback
            raw_text = extracted.get("raw_text_full", "")
            if raw_text:
                items = _extract_experience_from_text_fallback(raw_text)
                
        if len(items) > 0:
            exp = len(items) * 0.5  # Simplistic baseline: 6 months per listed role
    role_context = _infer_role_context(
        role=role,
        position_title=position_title,
        company_name=company_name,
        required_skills=required_skills,
        must_have_skills=must_have_skills,
    )
    # If minimum experience is not specified, still reward real experience
    # instead of giving every candidate full marks.
    if min_experience_years > 0:
        exp_score = 1.0 if exp >= min_experience_years else (exp / min_experience_years)
    else:
        role_l = (role or "internship").lower()
        # Jobs: stronger experience expectation. Internships: gentler scaling.
        neutral_target_years = 2.0 if role_l == "job" else 1.0
        exp_score = min(exp / neutral_target_years, 1.0)

    skill_score, matched_skills, missing_skills, skill_evidence = _skill_match_score(
        required_skills=required_skills,
        extracted=extracted,
        must_have_skills=must_have_skills,
        role=role,
    )
    skill_meta = skill_evidence.get("skill_meta", {}) if isinstance(skill_evidence, dict) else {}
    must_have_coverage = _to_float(skill_meta.get("coverage_must_have"), 1.0)

    github_summary = extracted.get("github_analysis", {}).get("summary", {})
    github_score_100 = _to_float(github_summary.get("overall_score_100"), 0.0)
    github_score = max(0.0, min(github_score_100 / 100.0, 1.0))

    platform_details = _platform_score_details(extracted.get("platform_stats", {}) or {}, role_context)
    platform_score_raw = _to_float(platform_details.get("score"), 0.0)
    platform_achievement_details = _platform_achievement_details(extracted.get("platform_stats", {}) or {})
    platform_achievement_score = _to_float(platform_achievement_details.get("score"), 0.0)
    achievement_score, achievement_meta = _achievement_score(extracted, platform_achievement_details)

    profile_score = _profile_completeness_score(extracted)
    project_evidence_base = _project_evidence_score(extracted)
    project_relevance, project_relevance_meta = _project_relevance_score(
        extracted=extracted,
        required_skills=required_skills,
        must_have_skills=must_have_skills,
        role_context=role_context,
    )
    project_evidence = _clamp01((project_evidence_base * 0.45) + (project_relevance * 0.55))

    target_alignment, target_alignment_meta = _target_alignment_score(extracted, role_context)
    experience_quality, experience_quality_meta = _experience_quality_score(extracted, role)
    experience_relevance, experience_relevance_meta = _experience_relevance_score(
        extracted=extracted,
        required_skills=required_skills,
        must_have_skills=must_have_skills,
        role_context=role_context,
    )
    # Prevent one-dimensional ranking spikes from contest platforms when practical delivery evidence is weak.
    platform_score = _clamp01((platform_score_raw * 0.68) + (platform_achievement_score * 0.32))
    if platform_score >= 0.75 and github_score < 0.45 and project_relevance < 0.45 and experience_quality < 0.45:
        platform_score = platform_score * 0.68
    weights = _role_weights(role)
    github_data_available = _safe_int(github_summary.get("repo_count"), 0) > 0
    availability = {
        "skills": True,
        "github": github_data_available,
        "experience": True,
        "platform": True,
        "projects": True,
        "profile": True,
        "experience_quality": True,
        "experience_relevance": True,
        "achievements": True,
    }
    available_weights = {
        k: _to_float(v, 0.0) for k, v in weights.items() if availability.get(k, True)
    }
    effective_weight_total = sum(available_weights.values()) or 1.0
    eff_weights = {
        k: (_to_float(v, 0.0) / effective_weight_total) if availability.get(k, True) else 0.0
        for k, v in weights.items()
    }
    weight_total = sum(_to_float(v, 0.0) for v in weights.values()) or 1.0
    norm_weights = {k: _to_float(v, 0.0) / weight_total for k, v in weights.items()}

    final = (
        (skill_score * eff_weights.get("skills", 0.0))
        + (github_score * eff_weights.get("github", 0.0))
        + (exp_score * eff_weights.get("experience", 0.0))
        + (platform_score * eff_weights.get("platform", 0.0))
        + (project_evidence * eff_weights.get("projects", 0.0))
        + (profile_score * eff_weights.get("profile", 0.0))
        + (experience_quality * eff_weights.get("experience_quality", 0.0))
        + (experience_relevance * eff_weights.get("experience_relevance", 0.0))
        + (achievement_score * eff_weights.get("achievements", 0.0))
    )
    # Target role/company alignment and must-have depth adjust final fit score.
    target_multiplier = 0.90 + (target_alignment * 0.12)
    must_have_multiplier = 0.86 + (must_have_coverage * 0.20)
    final = _clamp01(final * target_multiplier * must_have_multiplier)

    final_100 = _rscore(final * 100.0)
    confidence, confidence_meta = _confidence_score(
        extracted=extracted,
        fit_breakdown={
            "skills_match_score_100": _rscore(skill_score * 100.0),
            "project_relevance_score_100": _rscore(project_relevance * 100.0),
            "platform_strength_score_100": _rscore(platform_score * 100.0),
        },
    )

    # Phase 4: Native Confidence Engine Metrics
    skill_meta = skill_evidence.get("skill_meta", {}) if isinstance(skill_evidence, dict) else {}
    eng_depth = skill_meta.get("engineering_depth", {})
    confidence_metrics = calculate_confidence_metrics(extracted, skill_meta, eng_depth)

    # Phase 5: Gated Ranking System
    gated_results = apply_scoring_gates(
        score=final, 
        extracted=extracted, 
        skill_meta=skill_meta, 
        confidence_metrics=confidence_metrics,
        role_profile=role,
        target_alignment=target_alignment
    )
    final = gated_results["gated_score"]
    final_100 = _rscore(final * 100.0)
    
    if isinstance(skill_evidence, dict) and "skill_meta" in skill_evidence:
        skill_evidence["skill_meta"]["gating_adjustments"] = gated_results["applied_gates"]

    return {
        "fit_score_100": final_100,
        "fit_score_100_str": _fscore(final_100),
        "confidence_metrics": confidence_metrics,
        "breakdown": {
            "skills_match_score_100": _rscore(skill_score * 100.0),
            "must_have_coverage_score_100": _rscore(must_have_coverage * 100.0),
            "github_score_100": _rscore(github_score * 100.0),
            "experience_score_100": _rscore(exp_score * 100.0),
            "platform_strength_score_100": _rscore(platform_score * 100.0),
            "platform_strength_raw_score_100": _rscore(platform_score_raw * 100.0),
            "platform_peak_score_100": _rscore(_to_float(platform_details.get("peak_score"), 0.0) * 100.0),
            "platform_achievement_score_100": _rscore(platform_achievement_score * 100.0),
            "achievement_score_100": _rscore(achievement_score * 100.0),
            "project_evidence_score_100": _rscore(project_evidence * 100.0),
            "project_relevance_score_100": _rscore(project_relevance * 100.0),
            "profile_completeness_score_100": _rscore(profile_score * 100.0),
            "experience_quality_score_100": _rscore(experience_quality * 100.0),
            "experience_relevance_score_100": _rscore(experience_relevance * 100.0),
            "github_data_available_score_100": 100.0 if github_data_available else 0.0,
            "target_alignment_score_100": _rscore(target_alignment * 100.0),
            "confidence_score_100": _rscore(confidence * 100.0),
        },
        "criteria_used": {
            "role_profile": role.lower(),
            "company_name": company_name,
            "position_title": position_title,
            "weights": norm_weights,
            "effective_weights": eff_weights,
            "weight_redistribution": {
                "github_data_available": github_data_available,
                "redistributed_due_to_missing_signals": not github_data_available,
            },
            "notes": [],
            "role_context": role_context,
        },
        "skills": {
            "required": required_skills,
            "must_have": must_have_skills,
            "matched": matched_skills,
            "missing": missing_skills,
            "match_score_100": _rscore(skill_score * 100.0),
            "evidence": skill_evidence,
        },
        "experience": {
            "required_min_years": min_experience_years,
            "candidate_years": exp,
            "quality_meta": experience_quality_meta,
            "relevance_meta": experience_relevance_meta,
        },
        "platform_meta": {
            "strength": platform_details,
            "achievement": platform_achievement_details,
            "overall_achievements": achievement_meta,
        },
        "project_meta": project_relevance_meta,
        "target_alignment_meta": target_alignment_meta,
        "confidence_meta": confidence_meta,
        "ranking_reason": (
            f"Matched {len(matched_skills)}/{len(required_skills) if required_skills else 0} required skills, "
            f"must-have coverage {round(must_have_coverage * 100.0, 1)}, "
            f"GitHub {round(github_score * 100.0, 1)}, "
            f"Experience {round(exp, 2)} years, "
            f"Platform {round(platform_score * 100.0, 1)}, "
            f"Achievements {round(achievement_score * 100.0, 1)}, "
            f"Target alignment {round(target_alignment * 100.0, 1)}."
        ),
    }


@app.post("/resume/extract")
async def extract_resume(
    request: Request,
    file: UploadFile = File(...),
    role: Literal["job", "internship"] = Form(default="job"),
    force_reprocess: bool = Form(default=False),
):
    try:
        auth = _get_auth_context(request)
        trace_id = str(uuid.uuid4())
        return await _process_resume_file(file, role, trace_id, auth.tenant_id, auth.user_id, force_reprocess=force_reprocess)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/resume/extract/batch")
async def extract_resume_batch(
    request: Request,
    files: list[UploadFile] = File(...),
    role: Literal["job", "internship"] = Form(default="job"),
    force_reprocess: bool = Form(default=False),
):
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")
    auth = _get_auth_context(request)

    trace_id = str(uuid.uuid4())
    tasks = [
        asyncio.create_task(_process_resume_file(file, role, trace_id, auth.tenant_id, auth.user_id, force_reprocess=force_reprocess))
        for file in files
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    response_items = []
    for file, outcome in zip(files, results):
        if isinstance(outcome, Exception):
            response_items.append({
                "filename": file.filename,
                "ok": False,
                "error": str(outcome),
            })
        else:
            response_items.append({
                "filename": file.filename,
                "ok": True,
                "result": outcome,
            })

    return {
        "count": len(files),
        "resume_concurrency": RESUME_CONCURRENCY,
        "items": response_items,
    }


@app.post("/hiring/shortlist", response_model=ShortlistResponse)
async def hiring_shortlist(
    request: Request,
    files: list[UploadFile] = File(...),
    role: Literal["job", "internship"] = Form(default="internship"),
    company_name: str = Form(...),
    position_title: str = Form(...),
    required_skills_csv: str = Form(...),
    must_have_skills_csv: str = Form(default=""),
    job_description: str = Form(default=""),
    min_experience_years: float = Form(default=0.0),
    force_reprocess: bool = Form(default=False),
    send_shortlist_emails: bool = Form(default=False),
    interview_base_url: str = Form(default=""),
    client_trace_id: str = Form(default=""),
    merge_source_trace_id: str = Form(default=""),
):
    started_at = time.time()
    auth = _get_auth_context(request)
    if DEBUG_DIAGNOSTICS:
        logger.info(
            json.dumps(
                {
                    "event": "shortlist_create_start",
                    **_auth_snapshot(auth),
                    "uploaded_files": len(files) if files else 0,
                    "role": role,
                    "company_name": company_name,
                    "position_title": position_title,
                    "client_trace_id": client_trace_id or None,
                }
            )
        )
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")

    # Credit validation and deduction
    db_session = SessionLocal()
    try:
        profile = (
            db_session.query(OrganizationProfile)
            .filter(
                OrganizationProfile.tenant_id == auth.tenant_id,
                OrganizationProfile.user_id == auth.user_id,
            )
            .first()
        )
        is_admin = _is_admin_auth(auth)
        num_files = len(files)
        if not is_admin:
            current_credits = getattr(profile, "credits", 10) if profile else 10
            if num_files > current_credits:
                raise HTTPException(
                    status_code=402,
                    detail=f"Insufficient credits. You are trying to process {num_files} resume(s), but you only have {current_credits} credit(s) left. Please upgrade your plan."
                )
            if profile:
                profile.credits = current_credits - num_files
                db_session.commit()
            else:
                # Create profile with default credits minus consumed credits
                new_profile = OrganizationProfile(
                    id=str(uuid.uuid4()),
                    tenant_id=auth.tenant_id,
                    user_id=auth.user_id,
                    auth_email=auth.claims.get("email") or "unknown@kovidam.co.in",
                    status="active",
                    credits=10 - num_files,
                )
                db_session.add(new_profile)
                db_session.commit()
    except HTTPException:
        db_session.rollback()
        raise
    except Exception as exc:
        db_session.rollback()
        logger.exception("failed_to_deduct_credits")
        raise HTTPException(status_code=500, detail="Database error during credit validation.")
    finally:
        db_session.close()

    required_skills = _parse_csv_list(required_skills_csv)
    must_have_skills = _parse_csv_list(must_have_skills_csv)
    if not required_skills:
        raise HTTPException(
            status_code=400,
            detail="required_skills_csv did not contain any valid normalized skills.",
        )
    jd_skills = _extract_skills_from_job_description(job_description)
    semantic_query_skills = _filter_semantic_generic_tokens(
        _normalize_skills_list(required_skills + must_have_skills + jd_skills)
    )
    thresholds = _role_thresholds(role, min_experience_years)

    previous_run = None
    previous_payload = None
    previous_shortlisted: list[dict] = []
    previous_failed: list[dict] = []
    previous_rejected: list[dict] = []
    previous_merge_keys: set[str] = set()
    merge_source_trace_id = (merge_source_trace_id or "").strip()
    if merge_source_trace_id:
        previous_run = _load_shortlist_run(auth, merge_source_trace_id)
        if previous_run and isinstance(previous_run.response_json, dict):
            previous_payload = previous_run.response_json
            previous_shortlisted = list(previous_payload.get("shortlisted") or [])
            previous_failed = list(previous_payload.get("failed") or [])
            previous_rejected = list(previous_payload.get("rejected") or [])
            previous_merge_keys = {
                key for key in (_shortlist_merge_key(row) for row in previous_shortlisted) if key
            }
                # Include raw ranked rows too when legacy keys are present, so reruns can skip exact repeats.
            for row in previous_payload.get("ranked_candidates") or []:
                key = _shortlist_merge_key(row)
                if key:
                    previous_merge_keys.add(key)

    filtered_files: list[UploadFile] = []
    skipped_duplicate_filenames: list[str] = []
    for file in files:
        file_key = str(file.filename or "").strip().lower()
        if previous_merge_keys and file_key and file_key in previous_merge_keys:
            skipped_duplicate_filenames.append(file.filename or "unknown")
            continue
        filtered_files.append(file)

    if merge_source_trace_id and files and not filtered_files:
        raise HTTPException(
            status_code=400,
            detail="All uploaded resumes already exist in the previous shortlist. Please add new resumes only.",
        )

    files = filtered_files

    trace_id = (client_trace_id or "").strip() or str(uuid.uuid4())
    _set_shortlist_progress(
        trace_id,
        {
            "trace_id": trace_id,
            "tenant_id": auth.tenant_id,
            "user_id": auth.user_id,
            "status": "running",
            "stage": "queued",
            "uploaded": len(files),
            "processed": 0,
            "ranked_so_far": 0,
            "failed_so_far": 0,
            "shortlisted_so_far": [],
            "completed_resumes": [],
            "last_completed_filename": None,
            "error": None,
            "result": None,
            "merge_source_trace_id": merge_source_trace_id or None,
            "skipped_duplicate_filenames": skipped_duplicate_filenames,
        },
    )

    candidates = []
    async def _run_one_shortlist_file(file: UploadFile):
        outcome = await _process_resume_file(
            file,
            role,
            trace_id,
            auth.tenant_id,
            auth.user_id,
            force_reprocess=force_reprocess,
            company_name=company_name,
            position_title=position_title,
            min_experience_years=min_experience_years,
            required_skills=required_skills,
            must_have_skills=must_have_skills,
            thresholds=thresholds,
        )
        return file, outcome

    tasks = [asyncio.create_task(_run_one_shortlist_file(file)) for file in files]

    _set_shortlist_progress(trace_id, {"stage": "processing_resumes"})
    processed = 0
    completed_resumes: list[dict] = []
    for task in asyncio.as_completed(tasks):
        try:
            file, outcome = await task
        except Exception as exc:
            file = None
            outcome = exc

        if isinstance(outcome, Exception):
            completed_resumes.append({
                "filename": file.filename if file else "unknown",
                "ok": False,
                "fit_score_100": 0.0,
            })
            candidates.append({
                "filename": file.filename if file else "unknown",
                "ok": False,
                "error": str(outcome),
            })
        else:
            extracted = outcome.get("extracted", {})
            fit = outcome.get("fit", {})
            completed_resumes.append({
                "filename": outcome.get("filename") or (file.filename if file else "unknown"),
                "ok": True,
                "fit_score_100": _rscore(_to_float((fit or {}).get("fit_score_100"), 0.0)),
            })
            candidates.append({
                "filename": outcome.get("filename") or file.filename,
                "ok": True,
                "saved_json_path": outcome.get("saved_json_path"),
                "resume_hash": outcome.get("resume_hash"),
                "extracted": extracted,
                "eligible": True,
                "rejection_reasons": [],
                "fit": fit,
                "profiles": extracted.get("profiles", {}),
                "github_summary": extracted.get("github_analysis", {}).get("summary", {}),
                "platform_stats": extracted.get("platform_stats", {}),
            })

        processed += 1
        running_ranked = sorted(
            [c for c in candidates if c.get("ok")],
            key=lambda c: (c.get("fit", {}).get("fit_score_100", 0.0) or 0.0),
            reverse=True,
        )
        shortlisted_so_far = [
            {
                "filename": c.get("filename"),
                "fit_score_100": _rscore(_to_float((c.get("fit", {}) or {}).get("fit_score_100"), 0.0)),
            }
            for c in running_ranked[:10]
        ]
        _set_shortlist_progress(
            trace_id,
            {
                "processed": processed,
                "ranked_so_far": len(running_ranked),
                "failed_so_far": len([c for c in candidates if not c.get("ok")]),
                "shortlisted_so_far": shortlisted_so_far,
                "completed_resumes": completed_resumes[-30:],
                "last_completed_filename": file.filename if file else "unknown",
            },
        )

    _set_shortlist_progress(trace_id, {"stage": "semantic_rerank"})
    semantic_map = await _qdrant_jd_semantic_map(
        query_skills=semantic_query_skills,
        tenant_id=auth.tenant_id,
        user_id=auth.user_id,
        role=role,
        candidates=[c for c in candidates if c.get("ok")],
    )
    for candidate in candidates:
        if not candidate.get("ok"):
            continue
        fit = candidate.get("fit", {}) or {}
        breakdown = fit.get("breakdown", {}) or {}
        resume_hash = str(candidate.get("resume_hash") or "")
        semantic = semantic_map.get(resume_hash, {})
        semantic_score_100 = _to_float(semantic.get("score_100"), 0.0)
        base_fit_100 = _to_float(fit.get("fit_score_100"), 0.0)
        # Blend base score with JD semantic proximity from Qdrant.
        semantic_boost_weight = _to_float(os.getenv("SHORTLIST_JD_SEMANTIC_WEIGHT", "0.12"), 0.12)
        semantic_boost_weight = _clamp01(semantic_boost_weight)
        adjusted_fit_100 = _rscore(
            _clamp01(
                ((base_fit_100 / 100.0) * (1.0 - semantic_boost_weight))
                + ((semantic_score_100 / 100.0) * semantic_boost_weight)
            )
            * 100.0
        )
        fit["fit_score_100"] = adjusted_fit_100
        fit["fit_score_100_str"] = _fscore(adjusted_fit_100)
        breakdown["jd_semantic_score_100"] = _rscore(semantic_score_100)
        fit["breakdown"] = breakdown
        fit["jd_semantic_meta"] = {
            "query_skills": semantic_query_skills,
            "job_description_skills": jd_skills,
            "matched_query_tokens": semantic.get("matched_query_tokens", []),
            "relevance_band": semantic.get("relevance_band"),
            "skills_preview": semantic.get("skills_preview", []),
            "semantic_weight": semantic_boost_weight,
        }
        candidate["fit"] = fit

    ranked = sorted(
        [c for c in candidates if c.get("ok")],
        key=lambda c: (
            c.get("fit", {}).get("fit_score_100", 0.0) or 0.0,
            ((c.get("fit", {}).get("breakdown", {}) or {}).get("must_have_coverage_score_100", 0.0) or 0.0),
            ((c.get("fit", {}).get("breakdown", {}) or {}).get("achievement_score_100", 0.0) or 0.0),
            ((c.get("fit", {}).get("breakdown", {}) or {}).get("jd_semantic_score_100", 0.0) or 0.0),
            ((c.get("fit", {}).get("breakdown", {}) or {}).get("target_alignment_score_100", 0.0) or 0.0),
            ((c.get("fit", {}).get("breakdown", {}) or {}).get("confidence_score_100", 0.0) or 0.0),
            ((c.get("fit", {}).get("breakdown", {}) or {}).get("skills_match_score_100", 0.0) or 0.0),
            c.get("filename") or "",
        ),
        reverse=True,
    )

    for idx, candidate in enumerate(ranked, start=1):
        candidate["rank"] = idx

    failed = [c for c in candidates if not c.get("ok")]
    rejected = []
    rejection_reason_counts: dict[str, int] = {}

    shortlisted_table = [_summarize_candidate_for_table(c) for c in ranked]
    rejected_table = []
    failed_table = [
        {
            "filename": c.get("filename"),
            "error": c.get("error"),
        }
        for c in failed
    ]
    top_3_insights = _top_ranking_insights(shortlisted_table, rejected_table)

    if previous_payload:
        combined_shortlisted = _dedupe_shortlisted_rows(previous_shortlisted + shortlisted_table)
        combined_shortlisted.sort(key=lambda x: x.get("fit_score_100") or 0.0, reverse=True)
        for idx, row in enumerate(combined_shortlisted, start=1):
            row["rank"] = idx

        combined_failed = _dedupe_shortlisted_rows(previous_failed + failed_table)
        combined_rejected = _dedupe_shortlisted_rows(previous_rejected + rejected_table)

        shortlisted_table = combined_shortlisted
        failed_table = combined_failed
        rejected_table = combined_rejected
        top_3_insights = _top_ranking_insights(shortlisted_table, rejected_table)

    response_payload = {
        "trace_id": trace_id,
        "api_version": API_VERSION,
        "scoring_version": SCORING_VERSION,
        "policy_version": POLICY_VERSION,
        "job_summary": {
            "company_name": company_name,
            "position_title": position_title,
            "role": role,
            "required_skills": required_skills,
            "must_have_skills": must_have_skills,
            "job_description": job_description,
            "job_description_skills": jd_skills,
            "semantic_query_skills": semantic_query_skills,
            "min_experience_years": min_experience_years,
            "applied_thresholds": thresholds,
            "policy_runtime_flags": {
                "low_confidence_review_only": LOW_CONFIDENCE_REVIEW_ONLY,
                "company_signal_max_contrib": COMPANY_SIGNAL_MAX_CONTRIB,
                "score_decimals": SCORE_DECIMALS,
            },
            "source": "merged_rerun" if previous_payload else "fresh_run",
        },
        "counts": {
            "uploaded": (previous_payload.get("counts", {}).get("uploaded", 0) if previous_payload else 0) + len(files),
            "ranked": len(shortlisted_table),
            "rejected": len(rejected_table),
            "failed": len(failed_table),
        },
        "shortlisted": shortlisted_table,
        "rejected": rejected_table,
        "failed": failed_table,
        "top_3_insights_from_ranking_decision_log": top_3_insights,
        "rejection_reason_counts": rejection_reason_counts,
        "shortlist_notifications": {
            "enabled": False,
            "reason": "Email notifications not requested",
            "sent": 0,
            "failed": 0,
            "results": [],
        },
    }
    if SHORTLIST_INCLUDE_LEGACY_KEYS:
        response_payload["ranked_candidates"] = ranked
        response_payload["rejected_candidates"] = []
        response_payload["failed_candidates"] = failed
    else:
        response_payload["ranked_candidates"] = []
        response_payload["rejected_candidates"] = []
        response_payload["failed_candidates"] = []

    should_send_mail = send_shortlist_emails or SHORTLIST_AUTO_SEND_EMAILS
    _json_log(
        "shortlist_notify_decision",
        {
            "should_send_mail": should_send_mail,
            "send_shortlist_emails_form": send_shortlist_emails,
            "shortlist_auto_send_env": SHORTLIST_AUTO_SEND_EMAILS,
            "shortlisted_count": len(ranked),
        },
    )
    _json_log(
        "shortlist_rejection_audit",
        {
            "role": role,
            "company_name": company_name,
            "position_title": position_title,
            "rejection_reason_counts": {},
        },
    )
    if should_send_mail:
        notify_payload = send_shortlist_notifications(
            shortlisted=ranked,
            role=role,
            company_name=company_name,
            position_title=position_title,
            interview_base_url=interview_base_url or os.getenv("SHORTLIST_INTERVIEW_BASE_URL", ""),
        )
        response_payload["shortlist_notifications"] = notify_payload
        _json_log("shortlist_notify_result", notify_payload)

    _json_log(
        "shortlist_completed",
        {
            "role": role,
            "company_name": company_name,
            "position_title": position_title,
            "uploaded": len(files),
            "ranked": len(shortlisted_table),
            "rejected": len(rejected_table),
            "failed": len(failed_table),
            "merge_source_trace_id": merge_source_trace_id or None,
            "skipped_duplicate_filenames": skipped_duplicate_filenames,
            "duration_ms": round((time.time() - started_at) * 1000.0, 2),
            "api_version": API_VERSION,
            "scoring_version": SCORING_VERSION,
            "policy_version": POLICY_VERSION,
        },
    )
    _set_shortlist_progress(
        trace_id,
        {
            "status": "completed",
            "stage": "completed",
            "processed": len(files),
            "ranked_so_far": len(ranked),
            "failed_so_far": len(failed),
            "shortlisted_so_far": [
                {"filename": c.get("filename"), "fit_score_100": c.get("fit_score_100")}
                for c in shortlisted_table[:10]
            ],
            "completed_resumes": completed_resumes[-30:],
            "result": response_payload,
        },
    )
    _persist_shortlist_run(auth, trace_id, response_payload)
    if DEBUG_DIAGNOSTICS:
        logger.info(
            json.dumps(
                {
                    "event": "shortlist_create_done",
                    **_auth_snapshot(auth),
                    "trace_id": trace_id,
                    "ranked": len(ranked),
                    "failed": len(failed),
                    "elapsed_seconds": round(time.time() - started_at, 3),
                }
            )
        )
    return response_payload


@app.get("/hiring/shortlist/progress/{trace_id}")
async def shortlist_progress(trace_id: str, request: Request):
    auth = _get_auth_context(request)
    payload = shortlist_progress_store.get(trace_id)
    if not payload:
        raise HTTPException(status_code=404, detail="Trace ID not found or expired")
    if payload.get("tenant_id") != auth.tenant_id or payload.get("user_id") != auth.user_id:
        raise HTTPException(status_code=404, detail="Trace ID not found or expired")
    return payload


@app.get("/debug/whoami")
async def debug_whoami(request: Request):
    auth_ctx = getattr(request.state, "auth", None)
    auth_header = request.headers.get("authorization", "")
    return {
        "debug_diagnostics": DEBUG_DIAGNOSTICS,
        "auth_required": AUTH_REQUIRED,
        "path": request.url.path,
        "has_bearer_header": auth_header.lower().startswith("bearer "),
        "auth_context": _auth_snapshot(auth_ctx),
        "fallback_if_missing_auth": {"user_id": "local-dev", "tenant_id": "default"} if not AUTH_REQUIRED else None,
    }


@app.get("/debug/db-summary")
async def debug_db_summary(request: Request):
    db = SessionLocal()
    auth = _get_auth_context(request)
    try:
        trace_ids = [
            row[0]
            for row in (
                db.query(Job.trace_id)
                .filter(Job.tenant_id == auth.tenant_id, Job.user_id == auth.user_id)
                .distinct()
                .order_by(Job.trace_id.asc())
                .limit(50)
                .all()
            )
        ]
        return {
            "auth": _auth_snapshot(auth),
            "counts": {
                "candidates": db.query(Candidate).filter(Candidate.tenant_id == auth.tenant_id, Candidate.user_id == auth.user_id).count(),
                "jobs": db.query(Job).filter(Job.tenant_id == auth.tenant_id, Job.user_id == auth.user_id).count(),
                "candidate_job_scores": db.query(CandidateJobScore).join(Job, CandidateJobScore.job_id == Job.id).filter(Job.tenant_id == auth.tenant_id, Job.user_id == auth.user_id).count(),
                "distinct_trace_ids": len(trace_ids),
            },
            "sample_trace_ids": trace_ids,
        }
    finally:
        db.close()


@app.get("/debug/trace/{trace_id}")
async def debug_trace(trace_id: str, request: Request):
    db = SessionLocal()
    auth = _get_auth_context(request)
    try:
        jobs = (
            db.query(Job)
            .filter(Job.trace_id == trace_id, Job.tenant_id == auth.tenant_id, Job.user_id == auth.user_id)
            .all()
        )
        candidate_ids = [j.candidate_id for j in jobs]
        candidates = (
            db.query(Candidate)
            .filter(Candidate.id.in_(candidate_ids))
            .all()
            if candidate_ids
            else []
        )
        return {
            "auth": _auth_snapshot(auth),
            "trace_id": trace_id,
            "job_rows": len(jobs),
            "candidate_rows": len(candidates),
            "jobs": [
                {
                    "id": j.id,
                    "candidate_id": j.candidate_id,
                    "tenant_id": j.tenant_id,
                    "user_id": j.user_id,
                    "created_at": j.created_at.isoformat() if j.created_at else None,
                    "role": j.role,
                }
                for j in jobs
            ],
        }
    finally:
        db.close()


@app.post("/hiring/semantic-search")
async def hiring_semantic_search(
    request: Request,
    query_skills_csv: str = Form(...),
    top_k: int = Form(default=20),
    min_score: float = Form(default=0.0),
):
    query_skills = _parse_csv_list(query_skills_csv)
    auth = _get_auth_context(request)
    if not query_skills:
        raise HTTPException(status_code=400, detail="query_skills_csv must contain at least one skill")
    result = await asyncio.to_thread(
        qdrant_index.search,
        query_skills=query_skills,
        tenant_id=auth.tenant_id,
        user_id=auth.user_id,
        top_k=top_k,
        min_score=min_score,
    )
    return result


class CreateOrderRequest(BaseModel):
    plan_id: str
    credits: int = 0


class VerifyPaymentRequest(BaseModel):
    razorpay_payment_id: str
    razorpay_order_id: str
    razorpay_signature: str
    plan_id: str
    credits: int = 0


PLAN_PRICES = {
    "starter": {"credits": 100, "price_rs": 1700},
    "growth": {"credits": 250, "price_rs": 3750},
    "business": {"credits": 500, "price_rs": 6250},
    "super_business": {"credits": 1000, "price_rs": 10000},
}


@app.post("/api/create-order")
async def create_razorpay_order(payload: CreateOrderRequest, request: Request):
    auth = _get_auth_context(request)
    if RAZORPAY_CLIENT is None or not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
        raise HTTPException(status_code=500, detail="Razorpay credentials not configured on backend.")
    
    plan_id = payload.plan_id
    credits_to_buy = payload.credits
    
    if plan_id in PLAN_PRICES:
        price_rs = PLAN_PRICES[plan_id]["price_rs"]
        credits_to_buy = PLAN_PRICES[plan_id]["credits"]
    elif plan_id == "individual":
        if credits_to_buy < 5:
            raise HTTPException(status_code=400, detail="Minimum credits to buy individually is 5 (INR 100).")
        price_rs = credits_to_buy * 20
    else:
        raise HTTPException(status_code=400, detail="Invalid plan ID.")
        
    platform_fee = price_rs * 0.02
    total_price_rs = price_rs + platform_fee
    amount_paise = int(round(total_price_rs * 100))
    
    try:
        order_data = {
            "amount": amount_paise,
            "currency": "INR",
            "receipt": f"rcpt_{uuid.uuid4().hex[:12]}",
        }
        order = RAZORPAY_CLIENT.order.create(data=order_data)
        return {
            "order_id": order["id"],
            "amount": order["amount"],
            "currency": order["currency"],
            "credits": credits_to_buy,
            "key_id": RAZORPAY_KEY_ID,
        }
    except Exception as e:
        logger.exception("razorpay_order_creation_failed")
        raise HTTPException(status_code=500, detail=f"Razorpay order creation failed: {str(e)}")


@app.post("/api/verify-payment")
async def verify_razorpay_payment(payload: VerifyPaymentRequest, request: Request):
    auth = _get_auth_context(request)
    key_secret = os.getenv("RAZORPAY_KEY_SECRET")
    if not key_secret:
        raise HTTPException(status_code=500, detail="Razorpay credentials not configured on backend.")
        
    # Verify signature
    import hmac
    import hashlib
    msg = f"{payload.razorpay_order_id}|{payload.razorpay_payment_id}"
    generated = hmac.new(
        key_secret.encode("utf-8"),
        msg.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()
    
    if not hmac.compare_digest(generated, payload.razorpay_signature):
        raise HTTPException(status_code=400, detail="Payment signature verification failed. Mismatch.")
        
    # Calculate credits and price
    plan_id = payload.plan_id
    credits_purchased = payload.credits
    price_rs = 0
    if plan_id in PLAN_PRICES:
        credits_purchased = PLAN_PRICES[plan_id]["credits"]
        price_rs = PLAN_PRICES[plan_id]["price_rs"]
    elif plan_id == "individual":
        if credits_purchased < 5:
            raise HTTPException(status_code=400, detail="Invalid credit purchase amount.")
        price_rs = credits_purchased * 20
    else:
        raise HTTPException(status_code=400, detail="Invalid plan ID.")
        
    platform_fee = price_rs * 0.02
    total_price_rs = price_rs + platform_fee
    
    db_session = SessionLocal()
    try:
        # Create transaction record
        tx = PaymentTransaction(
            id=str(uuid.uuid4()),
            tenant_id=auth.tenant_id,
            user_id=auth.user_id,
            email=auth.claims.get("email") or "unknown@kovidam.co.in",
            payment_id=payload.razorpay_payment_id,
            order_id=payload.razorpay_order_id,
            plan_id=plan_id,
            amount=int(round(total_price_rs)),
            credits=credits_purchased,
            status="pending"
        )
        db_session.add(tx)

        profile = (
            db_session.query(OrganizationProfile)
            .filter(
                OrganizationProfile.tenant_id == auth.tenant_id,
                OrganizationProfile.user_id == auth.user_id,
            )
            .first()
        )
        if not profile:
            profile = OrganizationProfile(
                id=str(uuid.uuid4()),
                tenant_id=auth.tenant_id,
                user_id=auth.user_id,
                auth_email=auth.claims.get("email") or "unknown@kovidam.co.in",
                status="active",
                credits=10,
            )
            db_session.add(profile)
            
        db_session.commit()
        db_session.refresh(profile)
            
        return {
            "success": True,
            "profile": _serialize_profile(profile, auth, db_session)
        }
    except Exception as e:
        db_session.rollback()
        logger.exception("database_update_failed_during_payment_verify")
        raise HTTPException(status_code=500, detail="Failed to credit account after successful verification.")
    finally:
        db_session.close()


if __name__ == "__main__":
    import os
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
