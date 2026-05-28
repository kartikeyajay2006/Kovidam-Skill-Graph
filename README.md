# Kovidam Skill Graph

AI-powered technical hiring intelligence platform with explainable scoring, semantic shortlisting, and tenant-safe data isolation.

---

## Why This Project

Traditional ATS pipelines mostly match keywords.
Kovidam focuses on **engineering evidence**:
- what candidates built,
- what they contributed,
- how relevant those signals are for the role,
- and how confident the system is in each decision.

---

## 3D Showcase

A premium interactive visual overview is available in:
- `showcase.html`

Open directly:
- double-click `showcase.html`

Or run locally:

```bash
cd /home/kartikeyayadav/Desktop/Kovidam-Skill-Graph && python3 -m http.server 8081
```

Then visit:
- `http://localhost:8081/showcase.html`

---

## What You Get

### Backend
- FastAPI API for resume extraction, shortlisting, semantic search, and chat support
- Multi-parser PDF extraction + OCR fallback
- Platform enrichment: LeetCode, Codeforces, CodeChef, AtCoder, Kaggle
- GitHub repository intelligence and contribution-depth scoring
- Role-aware scoring (`job` and `internship`)
- Tenant-aware persistence and retrieval
- Optional Qdrant semantic indexing layer

### Frontend
- React + Vite product + dashboard app
- Firebase auth integration (email/password + Google)
- Live shortlist progress experience
- Shortlist history and drill-down views
- Semantic search interface

---

## System Architecture

```mermaid
flowchart LR
  A[Resume PDFs] --> B[Parser Layer\nPyMuPDF / pdfplumber / pypdf / OCR]
  B --> C[Structured Extraction\nSkills, Projects, Experience]
  C --> D[Signal Enrichment\nCoding Platforms + GitHub]
  D --> E[Scoring Engine\nFit + Gates + Confidence]
  E --> F[Shortlist Ranking]
  F --> G[(PostgreSQL)]
  E --> H[(Qdrant Optional)]
  I[React Dashboard] --> J[FastAPI]
  J --> G
  J --> H
```

---

## Repository Layout

```text
.
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── core/security.py
│   │   ├── models/schema.py
│   │   ├── services/
│   │   ├── integrations/
│   │   └── scoring/
│   ├── alembic/
│   ├── tests/
│   └── requirements.txt
├── frontend/
│   ├── src/
│   ├── package.json
│   └── vite.config.js
├── docs/
│   └── PROJECT_DOCUMENTARY.md
├── showcase.html
└── scripts/
    ├── dev_backend.sh
    └── dev_frontend.sh
```

---

## API Surface (Current)

### Public
- `GET /`
- `POST /chat/respond`

### Protected
- `POST /resume/extract`
- `POST /resume/extract/batch`
- `POST /hiring/shortlist`
- `GET /hiring/shortlist/progress/{trace_id}`
- `POST /hiring/semantic-search`
- `GET /hiring/dashboard-metrics`
- `GET /hiring/shortlists`
- `GET /hiring/shortlist/{trace_id}`
- `DELETE /hiring/shortlist/{trace_id}`

API docs:
- `http://localhost:8000/docs`

---

## Quick Start (Recommended)

### Prerequisites
- Docker
- Python 3.11+
- Node.js 20+

### 1) Start Database + Backend (single command)

```bash
cd /home/kartikeyayadav/Desktop/Kovidam-Skill-Graph && ./scripts/dev_backend.sh
```

This script safely handles:
- DB/Qdrant create-or-start,
- DB readiness and DB creation,
- `.venv` creation,
- dependency installation (first run only),
- migration alignment/stamp edge cases,
- backend startup on `:8000`.

### 2) Start Frontend (single command, new terminal)

```bash
cd /home/kartikeyayadav/Desktop/Kovidam-Skill-Graph && ./scripts/dev_frontend.sh
```

Frontend runs via Vite and proxies backend routes in dev.

---

## Manual Start (If You Prefer)

### Backend manual

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

If you need the optional Kaggle scraping helpers, install `playwright` separately and then run `python -m playwright install chromium`.

### Frontend manual

```bash
cd frontend
npm install
npm run dev
```

---

## Environment Configuration

Create `backend/.env`.

### Required keys (minimum)

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/kovidam
OPENAI_API_KEY=your_openai_api_key
GITHUB_PAT=your_github_pat
AUTH_REQUIRED=false
AUTH_JWT_SECRET=change-me
AUTH_JWT_ALGORITHM=HS256
AUTH_DEFAULT_TENANT=default
FIREBASE_PROJECT_ID=your_firebase_project_id
```

### Common optional keys

```env
# Concurrency
RESUME_CONCURRENCY=2
GITHUB_REPO_CONCURRENCY=3

# Qdrant
QDRANT_ENABLED=false
QDRANT_URL=http://localhost:6333
QDRANT_COLLECTION=resumes
QDRANT_VECTOR_SIZE=384
QDRANT_DISTANCE=Cosine

# Versioning
SHORTLIST_API_VERSION=v1.0.0
SHORTLIST_SCORING_VERSION=v2.1.0
SHORTLIST_POLICY_VERSION=v2.1.0

# Logging
LOG_LEVEL=INFO
```

Frontend env (`frontend/.env`) supports:
- `VITE_API_BASE_URL`
- Firebase keys (`VITE_FIREBASE_*`)
- EmailJS keys (`VITE_EMAILJS_*`)

---

## Auth and Tenant Isolation

Protected prefixes:
- `/hiring/*`
- `/resume/*`

Authentication:
- bearer token middleware
- HS256 token support
- Firebase ID token verification fallback

Tenant model:
- tenant derived from token claims/default,
- tenant-scoped reads/writes in PostgreSQL,
- tenant-scoped semantic retrieval in Qdrant.

---

## Scoring Philosophy

Kovidam scoring combines:
- skill evidence matching,
- must-have gate behavior,
- GitHub contribution signals,
- project and experience relevance,
- confidence and authenticity adjustments,
- optional semantic JD proximity blending.

Design goal:
- reduce false positives from pure keyword inflation,
- keep decisions explainable with visible breakdowns.

---

## Migrations

Current chain in repository:
1. `20260503_01_baseline_schema`
2. `20260511_02_add_jobs_trace_id`
3. `20260511_03_add_tenant_isolation`

Manual commands:

```bash
cd backend
source .venv/bin/activate
alembic current
alembic upgrade head
```

---

## Testing

Run backend tests:

```bash
cd backend
source .venv/bin/activate
pytest -q
```

Targeted semantic tests:

```bash
pytest -q tests/test_must_have_semantic.py tests/constants/test_skill_constants_quality.py
```

---

## Troubleshooting (Fast Fixes)

### Port 8000 already in use

```bash
docker ps --format '{{.Names}} {{.Ports}}' | awk '/0.0.0.0:8000->8000\/tcp/ {print $1}' | xargs -r docker stop
```

Then rerun backend script.

### `DuplicateTable` / migration mismatch

Use the script (`./scripts/dev_backend.sh`) first. It includes migration drift handling.

### DNS issue on `git pull`

If `fetch` already succeeded, you can merge fetched state locally:

```bash
git checkout main && git merge origin/main
```

---

## Key File Map

Backend anchors:
- `backend/app/main.py`
- `backend/app/services/resume_parser.py`
- `backend/app/services/db_writer.py`
- `backend/app/models/schema.py`
- `backend/app/core/security.py`
- `backend/app/integrations/qdrant/store.py`

Frontend anchors:
- `frontend/src/main.jsx`
- `frontend/src/App.jsx`
- `frontend/src/firebase.js`
- `frontend/src/pages/ShortlistPage.jsx`
- `frontend/src/pages/SemanticSearchPage.jsx`

---

## Deep Technical Documentary

For complete internals (runtime flow, scoring formulas, env matrix, risk register):
- [docs/PROJECT_DOCUMENTARY.md](docs/PROJECT_DOCUMENTARY.md)

---

## Notes

- Keep secrets out of git (`.env` files are ignored).
- If you changed dependencies, remove `.venv/.deps_ok` and rerun backend script to force reinstall.
