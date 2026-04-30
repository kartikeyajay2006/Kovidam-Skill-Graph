# Kovidam Skill Graph Backend

This backend parses PDF resumes, enriches coding-profile data, audits GitHub repositories, and produces role-aware contribution scoring (`job` and `internship`).

## Implemented Modules (File-by-File)

### API Layer
- `backend/app/main.py`
Purpose: FastAPI entrypoint and resume extraction endpoints.
What it does: accepts PDF(s) + `role`, runs extraction pipeline, returns JSON, saves output file.

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

## API

### `POST /resume/extract`
Form fields:
- `file` (PDF, required)
- `role` (`job` or `internship`, optional; default `job`)

### `POST /resume/extract/batch`
Form fields:
- `files` (multiple PDFs, required)
- `role` (`job` or `internship`, optional; default `job`)

Behavior:
- all files are accepted in one request,
- processing is asynchronous,
- in-process concurrency is capped by `RESUME_CONCURRENCY` (default: `2`).

Output includes:
- `profiles`
- `platform_stats`
- `github_analysis.repositories[].analysis.scoring`
- `github_analysis.summary`

## Setup

```bash
cd /home/kartikeyayadav/Desktop/kovidam-skill-graph/backend
rm -rf venv
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
playwright install chromium
export RESUME_CONCURRENCY=2
export GITHUB_REPO_CONCURRENCY=2
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Docs UI:
- `http://localhost:8000/docs`

## Quick Test (Batch)

```bash
curl -X POST "http://localhost:8000/resume/extract/batch" \
  -F "role=job" \
  -F "files=@/absolute/path/resume1.pdf" \
  -F "files=@/absolute/path/resume2.pdf" \
  -F "files=@/absolute/path/resume3.pdf"
```

## Environment Variables

Create `backend/.env` with:
- `GITHUB_PAT`
- `OPENAI_API_KEY`
- `RESUME_CONCURRENCY` (optional, default `2`)
- `GITHUB_REPO_CONCURRENCY` (optional, default `3`)

## Output Storage

- Extracted responses: `backend/data/extracted_resumes/`
