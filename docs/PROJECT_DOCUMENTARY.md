# Kovidam Skill Graph Backend

Technical documentary for the currently implemented backend.

## Table of Contents

1. System Purpose
2. End-to-End Flow
3. Implemented File Responsibilities
4. API Contract
5. Output Contract
6. Scoring Model
7. Configuration and Secrets
8. Runtime and Operations
9. Failure Behavior and Fallbacks
10. Current Boundaries

## 1) System Purpose

This backend converts a PDF resume into structured evaluation signals by combining:
- profile extraction,
- coding platform enrichment,
- GitHub repository auditing,
- role-specific scoring for `job` and `internship`.

It is designed for recruiter-facing interpretation with auditable fields and deterministic + AI-assisted scoring.

## 2) End-to-End Flow

```text
POST /resume/extract
  -> Validate file + role
  -> Parse PDF text + embedded links
  -> Extract platform usernames/URLs
  -> Fetch platform stats concurrently
  -> Discover candidate GitHub repositories
  -> Analyze each repository (metadata + commits + PRs + blame retention)
  -> Score each repo for job + internship
  -> Select active role profile
  -> Compute overall summary
  -> Persist JSON
  -> Return response + saved_json_path
```

## 3) Implemented File Responsibilities

### Core Entry and Config

- `backend/app/main.py`
  - API entrypoint.
  - Exposes `POST /resume/extract` and returns extraction output.

- `backend/app/config.py`
  - Loads `.env`.
  - Defines backend root and extracted JSON output directory.

### Orchestration

- `backend/app/services/resume_parser.py`
  - Pipeline orchestrator.
  - Extracts resume links/handles.
  - Calls integrations.
  - Runs GitHub discovery/analyze/score.
  - Produces final response schema.

### Platform Aggregation + Clients

- `backend/app/integrations/coding_platforms.py`
  - Unified async aggregator for all coding platform clients.

- `backend/app/integrations/codeforces/client.py`
  - Codeforces API fetcher.

- `backend/app/integrations/leetcode/client.py`
  - LeetCode GraphQL fetcher.

- `backend/app/integrations/codechef/client.py`
  - CodeChef profile scraper.

- `backend/app/integrations/atcoder/client.py`
  - AtCoder profile scraper.

- `backend/app/integrations/kaggle/client.py`
  - Kaggle profile extractor via Playwright.

- `backend/app/integrations/kaggle/save_session.py`
  - Utility script to store Kaggle session state.

### GitHub Intelligence

- `backend/app/integrations/github/scanner.py`
  - Finds GitHub repos from resume links/profile inference.

- `backend/app/integrations/github/analyzer_core.py`
  - Repo analysis engine:
    - languages,
    - dependency inference,
    - user role inference,
    - commit and PR stats,
    - surviving-line audit using `git blame`.

- `backend/app/integrations/github/scorer.py`
  - Role-aware scorer.
  - Deterministic metric score + bounded OpenAI adjustment.
  - Emits normalized and out-of-100 scores.

## 4) API Contract

### Endpoint

`POST /resume/extract`

### Input

`multipart/form-data`
- `file`: PDF (required)
- `role`: `job | internship` (optional, default: `job`)

### Validation

- Rejects non-PDF uploads.
- Rejects unsupported role values.

## 5) Output Contract

Top-level response:
- `filename`
- `extracted`
- `saved_json_path`

Within `extracted`:
- `work_experience_years`
- `profiles`
- `platform_stats`
- `github_analysis`
- `raw_text_preview`

Within `github_analysis`:
- `inferred_username`
- `selected_role_profile`
- `repositories[]`
- `summary`

Within each `repositories[].analysis.scoring`:
- `selected_role_profile`
- `selected`
- `profiles.job`
- `profiles.internship`

Score formatting:
- normalized fields (`0..1`)
- out-of-100 numeric
- out-of-100 string with 3 decimals (`xx.xxx`)

## 6) Scoring Model

Deterministic components:
- Code ownership
- PR depth
- Repo quality
- Reality/consistency pattern
- Collaborator signal

Role-based weighting:
- `job` profile weights
- `internship` profile weights

AI judgement:
- reads compact repo evidence,
- returns bounded adjustment,
- provides confidence + rationale,
- preserves deterministic baseline when AI is unavailable.

## 7) Configuration and Secrets

Required environment variables (`backend/.env`):
- `GITHUB_PAT`
- `OPENAI_API_KEY`

Security note:
- `.env` must remain git-ignored and untracked.

## 8) Runtime and Operations

### Local setup

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
playwright install chromium
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### API docs

- `http://localhost:8000/docs`

### Output storage

- `backend/data/extracted_resumes/`

## 9) Failure Behavior and Fallbacks

- Missing platform handle: value remains `null`.
- Platform fetch failure: captured under `platform_stats.errors`.
- GitHub API/auth failure: repository analysis contains explicit error object.
- OpenAI failure: scoring falls back to deterministic output with `ai_judgement.enabled=false` and reason.

## 10) Current Boundaries

- Resume input format currently PDF-focused.
- GitHub deep audit cost scales with repo size/history.
- Kaggle relies on page structure and browser automation; may require session setup in stricter contexts.

---

This document reflects the currently implemented code paths only.
