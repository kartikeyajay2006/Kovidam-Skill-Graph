# Kovidam Skill Graph Backend

Detailed technical documentary of the implemented backend as of current code.

## Documentary Format Note

This document is intentionally written in a technical documentary style:
- architecture narrative first,
- then evidence-level inventory of folders and files,
- then runtime, policy, and operations behavior.

The goal is to make it usable for:
- founders,
- backend developers,
- QA,
- DevOps,
- integration teams.

## Repository Documentary Inventory

### A. Root-level Backend Layout (`backend/`)

```text
backend/
├── app/                    # Main FastAPI application source
├── data/                   # Runtime output artifacts (JSON extractions)
├── docker/                 # Docker-related resources (project-local)
├── scripts/                # Utility and helper scripts
├── tests/                  # Automated tests
├── requirements.txt        # Python dependency lock list (project-level)
├── venv/                   # Project virtual environment (local machine)
└── .venv/                  # Alternate virtual environment (if created)
```

### B. Application Source Inventory (`backend/app/`)

#### Core files
- `app/main.py`
  - Primary API surface and shortlist logic.
  - Implements:
    - `/resume/extract`
    - `/resume/extract/batch`
    - `/hiring/shortlist`
  - Contains:
    - scoring orchestration,
    - policy gates,
    - response shaping,
    - shortlist audit logs.

- `app/config.py`
  - Environment loader and path anchors.
  - Defines where extracted JSON artifacts are saved.

#### Database layer
- `app/db/postgres/session.py`
  - SQLAlchemy engine/session bootstrap.
  - Uses `DATABASE_URL` from environment.

- `app/models/schema.py`
  - SQLAlchemy ORM table classes:
    - `candidates`
    - `jobs`
    - `candidate_scores`
    - `candidate_job_scores`
    - `candidate_skills`
    - `skills`
    - `platform_stats`
    - `candidate_github_summary`
    - `candidate_github_commits`

- `app/models/__init__.py`
  - Exports ORM models for service imports.

#### Service layer
- `app/services/resume_parser.py`
  - PDF text extraction and enrichment orchestrator.
  - Pulls platform profiles and GitHub evidence.

- `app/services/transformer.py`
  - Converts raw extracted payload to DB-ready structured shape.

- `app/services/db_writer.py`
  - Transactional DB persistence engine.
  - Performs duplicate checks via `resume_hash`.

- `app/services/json_logger.py`
  - Artifact writing helpers for raw JSON traces.

#### Integrations layer
- `app/integrations/coding_platforms.py`
  - Unified async aggregator for coding profile clients.

- `app/integrations/codeforces/client.py`
  - Codeforces profile stats fetcher.

- `app/integrations/leetcode/client.py`
  - LeetCode stats fetcher.

- `app/integrations/codechef/client.py`
  - CodeChef scraper/fetcher.

- `app/integrations/atcoder/client.py`
  - AtCoder scraper/fetcher.

- `app/integrations/kaggle/client.py`
  - Kaggle profile collector.

- `app/integrations/kaggle/save_session.py`
  - Session utility for Kaggle workflows.

#### GitHub intelligence
- `app/integrations/github/scanner.py`
  - GitHub URL/username/repository discovery from resume context.

- `app/integrations/github/analyzer_core.py`
  - Repository analysis engine (dependencies, commits, contribution patterns).

- `app/integrations/github/scorer.py`
  - GitHub contribution scoring strategy.

#### Scoring and schemas
- `app/scoring/engine.py`
  - Secondary scoring engine module used in tests and v2 scoring paths.

- `app/schemas/shortlist_response.py`
  - Pydantic response contract for `/hiring/shortlist`.
  - Guarantees stable output shape and typed top-level contract.

- `app/schemas/shortlist_v2.py`
  - Candidate response schema utilities for alternate scoring pipeline variants.

#### Utilities
- `app/utils/hash_utils.py`
  - Generates deterministic resume hash used for duplicate detection.

#### Reserved architectural folders (future extension scaffolds)
- `app/api/`, `app/core/`, `app/repositories/`, `app/pipelines/`, `app/workers/`, `app/agents/`
  - Present as structure scaffolds for future modularization.
  - Current implementation is mostly centralized in `main.py` + services/integrations.

### C. Runtime Output Inventory

- `backend/data/extracted_resumes/`
  - Stores extraction artifacts:
    - `<filename>_<timestamp>.json`
  - Useful for:
    - audits,
    - replay/debug,
    - candidate evidence traceability.

- `backend/backend/data/extracted_resumes/`
  - Duplicate nested output path may appear due to historic working-directory runs.
  - Recommended: standardize to `backend/data/extracted_resumes/`.

### D. Test Inventory (`backend/tests/`)

- `tests/conftest.py`
  - Test import path setup.

- `tests/services/test_resume_parser.py`
  - Parser/service-level behavior checks.

- `tests/services/test_shortlist_policy.py`
  - Policy and eligibility gate tests:
    - job experience-quality threshold,
    - internship threshold behavior,
    - reject-on-low-experience-quality for jobs.

- `tests/scoring/test_engine_v2.py`
  - Scoring engine behavior checks for `app/scoring/engine.py`.

## 1. Product Purpose

Kovidam Skill Graph is a resume intelligence backend for hiring teams.  
It supports:
- resume extraction and enrichment,
- DB persistence for candidate signals,
- ATS-style shortlisting with hard filters,
- role-aware (`job` vs `internship`) scoring,
- transparent audit logs for ranking decisions.

Primary objective:
- rank candidates deterministically and explain every accept/reject decision.

## 2. Implemented Endpoints

### `GET /`
- Health-style root endpoint.
- Returns welcome message and concurrency config.

### `POST /resume/extract`
Input:
- `multipart/form-data`
- `file`: PDF only
- `role`: `job | internship` (default: `job`)

Behavior:
1. Saves upload to temp file.
2. Parses PDF text and embedded links.
3. Enriches profile links + coding platforms + GitHub.
4. Saves extracted JSON artifact.
5. Persists structured data to PostgreSQL (via `save_to_db`).
6. Returns extraction payload + DB write result.

Response includes:
- `filename`
- `extracted`
- `saved_json_path`
- `trace_id`
- `resume_hash`
- `db_result` (`inserted` or `duplicate`)

### `POST /resume/extract/batch`
- Same parse/extract flow over multiple files.
- Returns per-file success/error.

### `POST /hiring/shortlist`
Input (`multipart/form-data`):
- `company_name`
- `position_title`
- `role`: `internship | job`
- `required_skills_csv`
- `must_have_skills_csv`
- `min_experience_years`
- `files` (multiple PDFs)

Behavior:
1. Runs extraction pipeline per resume.
2. Computes candidate-company fit with role-aware scoring.
3. Applies hard filters and threshold policy.
4. Ranks only eligible candidates.
5. Returns audit-ready structured response.

## 3. Current Response Contract (`/hiring/shortlist`)

Schema defined in:
- `backend/app/schemas/shortlist_response.py`

Top-level fields:
- `api_version`
- `scoring_version`
- `policy_version`
- `job_summary`
- `counts`
- `shortlisted`
- `rejected`
- `failed`
- `top_3_insights_from_ranking_decision_log`
- `ranked_candidates`
- `rejected_candidates`
- `failed_candidates`

Notes:
- Legacy keys (`ranked_candidates`, `rejected_candidates`, `failed_candidates`) are always visible and are arrays (never `null`).
- `shortlisted/rejected/failed` are the primary product-facing sections.

## 4. Scoring and Eligibility System

Implemented in:
- `backend/app/main.py`

### 4.1 Skill Match
- Uses `required_skills_csv`.
- Matches against:
  - resume text preview,
  - GitHub tech dependencies.
- Produces:
  - matched skills,
  - missing skills,
  - `skills_match_score_100`.

### 4.2 Must-Have Hard Filter
- `must_have_skills_csv` is strict reject.
- If any must-have is missing:
  - candidate is rejected with exact reason:
    - `Missing must-have skills: ...`

### 4.3 Platform Strength
Signals from:
- Codeforces max rating,
- LeetCode solved count,
- CodeChef rating,
- AtCoder rating,
- Kaggle competitions.

### 4.4 GitHub Signal
- Uses enriched GitHub summary score:
  - `github_analysis.summary.overall_score_100`.

### 4.5 Experience Score (Important update)
When `min_experience_years > 0`:
- score compares candidate years to requested minimum.

When `min_experience_years == 0`:
- experience still contributes (not auto-100 for everyone).
- role-aware neutral target:
  - `job`: scales with 2.0 years target.
  - `internship`: scales with 1.0 year target.

This ensures real past experience gets meaningful points even when recruiter did not specify minimum years.

### 4.6 Experience Quality Intelligence

Role-aware deep experience analyzer computes:
- company signal tiers,
- impact language signals,
- ownership/production signals,
- quantified impact patterns,
- internship credibility signals,
- general experience keyword signals.

Output available in:
- `experience.quality_meta`

### 4.7 Job Knockout Thresholds
For `role="job"`:
- minimum skill match threshold,
- minimum GitHub score threshold,
- minimum years threshold,
- optional minimum experience-quality threshold.

Any failed threshold appends a rejection reason in audit log.

For `role="internship"`:
- no mandatory skill/GitHub/experience quality threshold by default,
- but must-have skills remain strict.

### 4.8 Ranking
- Only eligible candidates are ranked.
- Ranked descending by `fit_score_100`.

## 5. Policy and Versioning Controls

Implemented environment controls:

Version fields:
- `SHORTLIST_API_VERSION` (default: `v1.0.0`)
- `SHORTLIST_SCORING_VERSION` (default: `v1.1.0`)
- `SHORTLIST_POLICY_VERSION` (default: `v1.1.0`)

Legacy output switch:
- `SHORTLIST_INCLUDE_LEGACY_KEYS` (default: `true`)

Job thresholds:
- `JOB_MIN_SKILL_MATCH_PCT` (default: `55`)
- `JOB_MIN_GITHUB_SCORE_100` (default: `35`)
- `JOB_MIN_EXPERIENCE_QUALITY_SCORE_100` (default: `0`)

Job weights:
- `JOB_WEIGHT_SKILLS`
- `JOB_WEIGHT_GITHUB`
- `JOB_WEIGHT_EXPERIENCE`
- `JOB_WEIGHT_PLATFORM`
- `JOB_WEIGHT_PROJECTS`
- `JOB_WEIGHT_PROFILE`
- `JOB_WEIGHT_EXPERIENCE_QUALITY`

Internship weights:
- `INTERN_WEIGHT_SKILLS`
- `INTERN_WEIGHT_GITHUB`
- `INTERN_WEIGHT_EXPERIENCE`
- `INTERN_WEIGHT_PLATFORM`
- `INTERN_WEIGHT_PROJECTS`
- `INTERN_WEIGHT_PROFILE`
- `INTERN_WEIGHT_EXPERIENCE_QUALITY`

## 6. Database Persistence

### 6.1 Persistence Flow
`/resume/extract` now persists to DB by:
1. computing `resume_hash`,
2. generating `trace_id`,
3. transforming extraction payload to DB shape,
4. invoking `save_to_db()`.

### 6.2 Duplicate Handling
- Candidate dedupe is by `resume_hash`.
- If same resume re-submitted, response returns duplicate status.

### 6.3 Target Tables
Persistence layer writes to:
- `candidates`
- `jobs`
- `candidate_scores`
- `candidate_job_scores`
- `candidate_skills`
- `candidate_github_summary`
- `candidate_github_commits`
- `skills`
- `platform_stats`

## 7. Audit Transparency

Every candidate record in shortlist outputs:
- `fit_score_100`
- `rejection_reasons`
- `ranking_decision_log`
- `experience.quality_meta`

`ranking_decision_log` includes:
- applied role profile,
- must-have skill misses,
- thresholds applied,
- candidate metric values at decision time.

Response also includes:
- `top_3_insights_from_ranking_decision_log`

## 8. Logging and Observability

Structured JSON log emitted on shortlist completion:
- event name: `shortlist_completed`
- role/company/position
- uploaded/ranked/rejected/failed counts
- duration in ms
- API/scoring/policy versions

## 9. Runtime Setup (Fedora + Docker + PostgreSQL)

### 9.1 PostgreSQL (pgvector) container
Example:
```bash
docker run -d \
  --name kovidam-pg \
  -e POSTGRES_DB=kovidam \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5433:5432 \
  ankane/pgvector:latest
```

If container exists:
```bash
docker start kovidam-pg
```

Verify:
```bash
PGPASSWORD='postgres' psql -h localhost -p 5433 -U postgres -d kovidam -c "SELECT 1;"
```

### 9.2 Backend startup
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL='postgresql://postgres:postgres@localhost:5433/kovidam'
python -m uvicorn app.main:app --reload --port 8001
```

Swagger:
- `http://127.0.0.1:8001/docs`

## 10. Practical Troubleshooting

### Docker permission denied (`/var/run/docker.sock`)
```bash
sudo usermod -aG docker $USER
newgrp docker
sudo systemctl restart docker
docker ps
```

### Container-name conflict
If `/kovidam-pg` already exists, use:
```bash
docker start kovidam-pg
```
not another `docker run` with same name.

### `ModuleNotFoundError: app`
- Start uvicorn from `backend` directory where `app/` exists.

### `ModuleNotFoundError: pypdf`
- Activate project `venv` and install requirements.

### VS Code terminal cannot find `docker`/`psql`
- This occurs in some Flatpak-sandboxed VS Code setups.
- Use host terminal for Docker/psql or switch to native VS Code package.

## 11. Verification Commands

List tables:
```bash
PGPASSWORD='postgres' psql -h localhost -p 5433 -U postgres -d kovidam -c "\dt public.*"
```

Counts:
```bash
PGPASSWORD='postgres' psql -h localhost -p 5433 -U postgres -d kovidam -c "
SELECT 'candidates' AS table_name, count(*) FROM candidates
UNION ALL SELECT 'jobs', count(*) FROM jobs
UNION ALL SELECT 'candidate_scores', count(*) FROM candidate_scores
UNION ALL SELECT 'candidate_job_scores', count(*) FROM candidate_job_scores
UNION ALL SELECT 'candidate_skills', count(*) FROM candidate_skills
UNION ALL SELECT 'skills', count(*) FROM skills
UNION ALL SELECT 'platform_stats', count(*) FROM platform_stats
UNION ALL SELECT 'candidate_github_summary', count(*) FROM candidate_github_summary
UNION ALL SELECT 'candidate_github_commits', count(*) FROM candidate_github_commits
ORDER BY table_name;
"
```

## 12. Testing Status

Added policy-focused tests:
- `backend/tests/services/test_shortlist_policy.py`

These cover:
- job threshold experience-quality gate,
- internship threshold behavior,
- eligibility rejection on low experience-quality for jobs.

## 13. Current Limitations

- Experience quality is keyword/signal based and not full semantic chronology extraction yet.
- Parsing accuracy depends on resume formatting quality.
- Some integrations (example: Kaggle scraping) can be fragile if upstream page structure changes.
- Python 3.14 may emit compatibility warnings for certain dependencies (non-blocking but monitor).

---

This document now reflects the current implemented backend behavior, shortlist policy, and production-oriented response model.
