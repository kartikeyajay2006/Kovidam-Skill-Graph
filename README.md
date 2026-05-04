# Kovidam Skill Graph Backend

This backend parses PDF resumes, enriches coding-profile data, audits GitHub repositories, and produces role-aware contribution scoring (`job` and `internship`).

## Architecture Documentary
- Full technical documentary: [docs/PROJECT_DOCUMENTARY.md](docs/PROJECT_DOCUMENTARY.md)

## Implemented Modules (File-by-File)

### API Layer
- `backend/app/main.py`
Purpose: FastAPI entrypoint and resume extraction endpoints.
What it does: accepts PDF(s) + `role`, runs extraction pipeline, returns JSON, saves output file.
New:
- explicit DB initialization through FastAPI lifespan startup,
- optional `force_reprocess` flag for bypassing duplicate-hash short-circuit.

### Configuration
- `backend/app/config.py`
Purpose: environment loading and path constants.
What it does: loads `backend/.env`, defines extracted-resume output directory.

### Resume Orchestration
- `backend/app/services/resume_parser.py`
Purpose: end-to-end orchestration for resume processing.
What it does:
- extracts PDF text + embedded links,
- detects profile usernames/URLs,
- calls coding-platform integrations,
- runs GitHub scan + analysis,
- computes `job` and `internship` scoring,
- builds final output payload.

### Platform Aggregation
- `backend/app/integrations/coding_platforms.py`
Purpose: single orchestrator for coding platform fetchers.
What it does: concurrently executes platform clients and returns normalized `platform_stats` + per-platform errors.

### Individual Platform Clients
- `backend/app/integrations/codeforces/client.py`
Purpose: Codeforces stats extraction via official API endpoints.

- `backend/app/integrations/leetcode/client.py`
Purpose: LeetCode stats extraction via GraphQL.

- `backend/app/integrations/codechef/client.py`
Purpose: CodeChef profile scraping for rating + contests.

- `backend/app/integrations/atcoder/client.py`
Purpose: AtCoder profile scraping for highest rating + rated matches.

- `backend/app/integrations/kaggle/client.py`
Purpose: Kaggle profile extraction using Playwright.
What it does: collects rank/competitions/notebooks/datasets/medals with robust fallbacks.

- `backend/app/integrations/kaggle/save_session.py`
Purpose: optional helper to save Kaggle authenticated browser session (`kaggle_session.json`).

### GitHub Intelligence
- `backend/app/integrations/github/scanner.py`
Purpose: discover candidate-related repositories from resume text and GitHub profile inference.

- `backend/app/integrations/github/analyzer_core.py`
Purpose: deep repository analysis.
What it does:
- repo metadata + language composition,
- dependency/tech-stack detection,
- user role detection,
- commit/PR stats,
- surviving-line ownership (`git blame`) audit.

- `backend/app/integrations/github/scorer.py`
Purpose: role-aware scoring engine with AI judgement.
What it does:
- deterministic metric scoring,
- OpenAI-based bounded adjustment,
- outputs normalized + out-of-100 (`xx.xxx`) scores.

### Database & Migrations
- `backend/app/db/postgres/session.py`
Purpose: SQLAlchemy engine/session factory and explicit DB bootstrap.
What it does:
- avoids import-time DB side effects,
- initializes schema on app startup via `init_db()`.

- `backend/app/models/schema.py`
Purpose: ORM schema definitions.
What it does:
- production-grade constraints/indexes,
- timestamp columns (`created_at`, `updated_at` where relevant),
- backward-compatible aliases for existing imports.

- `backend/alembic.ini`, `backend/alembic/`
Purpose: migration framework.
What it does:
- in-place schema migration support for existing databases.

## API

### `POST /resume/extract`
Form fields:
- `file` (PDF, required)
- `role` (`job` or `internship`, optional; default `job`)
- `force_reprocess` (`true`/`false`, optional; default `false`)

### `POST /resume/extract/batch`
Form fields:
- `files` (multiple PDFs, required)
- `role` (`job` or `internship`, optional; default `job`)
- `force_reprocess` (`true`/`false`, optional; default `false`)

Behavior:
- all files are accepted in one request,
- processing is asynchronous,
- in-process concurrency is capped by `RESUME_CONCURRENCY` (default: `2`).


### `POST /hiring/shortlist`
Form fields:
- `files` (multiple PDFs, required)
- `company_name` (required)
- `position_title` (required)
- `role` (`job` or `internship`, optional; default `internship`)
- `required_skills_csv` (required, comma-separated; e.g. `python,fastapi,sql,git`)
- `min_experience_years` (optional; default `0.0`)
- `force_reprocess` (`true`/`false`, optional; default `false`)

Behavior:
- extracts all resumes,
- computes deterministic fit score per candidate,
- sorts candidates by fit score descending,
- returns ranked shortlist with transparent score breakdown.

Output includes:
- `profiles`
- `platform_stats`
- `github_analysis.repositories[].analysis.scoring`
- `github_analysis.summary`

## Setup

### 1. Database Configuration
Use Docker (`ankane/pgvector`) for PostgreSQL + pgvector.
For first time only:
```bash
docker run -d \
  --name kovidam-db \
  -p 5434:5432 \
  -e POSTGRES_PASSWORD=postgres \
  ankane/pgvector
```

Then start it when needed:
```bash 
docker start kovidam-db
```

Create the database once:
```bash
docker exec -it kovidam-db psql -U postgres -c "CREATE DATABASE kovidam;"
```

Check DB connection:
```bash
docker exec -it kovidam-db psql -U postgres
```

### 2. Environment Variables
Create `backend/.env` and configure:

```env
# Core keys
GITHUB_PAT=your_github_pat
OPENAI_API_KEY=your_openai_api_key
DATABASE_URL=postgresql://postgres:postgres@localhost:5434/kovidam

# Concurrency
RESUME_CONCURRENCY=2
GITHUB_REPO_CONCURRENCY=3

# Structured extraction runtime tuning
RESUME_STRUCTURED_MODEL=gpt-5-mini
RESUME_STRUCTURED_TIMEOUT_SECONDS=0
RESUME_STRUCTURED_CHUNK_TIMEOUT_SECONDS=18
RESUME_STRUCTURED_MAX_CHUNKS=3
RESUME_STRUCTURED_RETRIES=0
RESUME_STRUCTURED_MAX_CHUNK_CHARS=6000
RESUME_OCR_MIN_ALPHA_CHARS_PER_PAGE=50
RESUME_PARSER_MIN_ALPHA_CHARS=120

# API/Scoring/Policy version tags
SHORTLIST_API_VERSION=v1.0.0
SHORTLIST_SCORING_VERSION=v1.1.0
SHORTLIST_POLICY_VERSION=v1.1.0

# Response shape
SHORTLIST_INCLUDE_LEGACY_KEYS=true

# AI models/config
EXPERIENCE_AI_MODEL=gpt-4o-mini
NOTES_AI_MODEL=gpt-4o-mini
EXPERIENCE_AI_TIMEOUT_SECONDS=2.2
EXPERIENCE_AI_BLEND_WEIGHT=0.55
NOTES_AI_TIMEOUT_SECONDS=1.8

# Job thresholds
JOB_MIN_SKILL_MATCH_PCT=55
JOB_MIN_GITHUB_SCORE_100=35
JOB_MIN_EXPERIENCE_QUALITY_SCORE_100=0

# Internship weights
INTERN_WEIGHT_SKILLS=0.34
INTERN_WEIGHT_GITHUB=0.21
INTERN_WEIGHT_EXPERIENCE=0.09
INTERN_WEIGHT_PLATFORM=0.14
INTERN_WEIGHT_PROJECTS=0.08
INTERN_WEIGHT_PROFILE=0.02
INTERN_WEIGHT_EXPERIENCE_QUALITY=0.12

# Job weights
JOB_WEIGHT_SKILLS=0.27
JOB_WEIGHT_GITHUB=0.20
JOB_WEIGHT_EXPERIENCE=0.19
JOB_WEIGHT_PLATFORM=0.08
JOB_WEIGHT_PROJECTS=0.04
JOB_WEIGHT_PROFILE=0.02
JOB_WEIGHT_EXPERIENCE_QUALITY=0.20

# Logging
LOG_LEVEL=INFO
```

### 3. Installation & Run
Open a terminal and navigate to the backend directory:
```bash
cd backend
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
playwright install chromium
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Single command (safe startup: reuses existing DB container, creates DB if missing, starts backend):
```bash
cd /home/kartikeyayadav/Desktop/Kovidam-Skill-Graph && (docker start kovidam-db >/dev/null 2>&1 || docker run -d --name kovidam-db -p 5432:5432 -e POSTGRES_PASSWORD=postgres ankane/pgvector >/dev/null) && (docker exec kovidam-db psql -U postgres -d postgres -tc "SELECT 1 FROM pg_database WHERE datname='kovidam'" | grep -q 1 || docker exec kovidam-db psql -U postgres -d postgres -c "CREATE DATABASE kovidam;") && cd backend && ([ -d venv ] || python3 -m venv venv) && source venv/bin/activate && python -m pip install --upgrade pip && python -m pip install -r requirements.txt && python -m playwright install chromium && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Docs UI:
- `http://localhost:8000/docs`

### 4. Structured Extraction Reliability Notes
- The parser first attempts OpenAI-based structured extraction (`skills`, `projects`) in chunks.
- If one or more chunk calls fail, partial successful chunks are still merged.
- If OpenAI extraction times out/errors completely, deterministic text fallback extracts projects and skills from raw resume text.
- This ensures `skills_section` and `projects_section` are not empty in common failure scenarios.
- `RESUME_STRUCTURED_TIMEOUT_SECONDS=0` disables outer cancellation and avoids premature timeout cutoffs.
- Latency control knobs:
  - lower `RESUME_STRUCTURED_MAX_CHUNKS` for fewer OpenAI calls,
  - keep `RESUME_STRUCTURED_RETRIES=0` for minimum delay,
  - adjust `RESUME_STRUCTURED_CHUNK_TIMEOUT_SECONDS` based on network stability.

## Quick Test (Batch)

```bash
curl -X POST "http://localhost:8000/resume/extract/batch" \
  -F "role=job" \
  -F "files=@/absolute/path/resume1.pdf" \
  -F "files=@/absolute/path/resume2.pdf" \
  -F "files=@/absolute/path/resume3.pdf"
```


## Quick Test (Hiring Shortlist)

```bash
curl -X POST "http://localhost:8000/hiring/shortlist" \
  -F "company_name=Acme Labs" \
  -F "position_title=Backend Intern" \
  -F "role=internship" \
  -F "required_skills_csv=python,fastapi,sql,git,github" \
  -F "min_experience_years=0.5" \
  -F "files=@/absolute/path/resume1.pdf" \
  -F "files=@/absolute/path/resume2.pdf" \
  -F "files=@/absolute/path/resume3.pdf" \
  -F "files=@/absolute/path/resume4.pdf"
```

## Output Storage

- Extracted responses: `backend/data/extracted_resumes/`

## Migration Commands

From `backend/`:
```bash
source venv/bin/activate
alembic upgrade head
```
