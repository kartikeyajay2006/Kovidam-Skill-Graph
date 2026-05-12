# Kovidam Skill Graph Backend

Detailed technical documentary of the implemented backend as of current code.

## 2026-05-12 Enterprise Security Phase 1 (JWT + Tenant Isolation + Firebase Interop)

This section documents the enterprise security implementation completed on May 12, 2026, covering:
- backend endpoint authentication,
- tenant-aware data isolation,
- Firebase token interoperability,
- frontend token propagation hardening.

### Why this phase was required

After enabling auth on backend protected routes, the product saw:
- expected `401 Unauthorized` for requests without tokens,
- mixed `200/401` behavior in frontend sessions due to token propagation timing,
- mismatch risk between backend token format expectations and frontend Firebase ID tokens.

Goal of this phase:
- keep strict auth (`AUTH_REQUIRED=true`) in enterprise mode,
- make frontend and backend token formats compatible,
- enforce tenant boundaries in both read and write paths.

### Files added/updated

Backend:
- `backend/app/core/security.py` (new)
- `backend/app/main.py`
- `backend/app/models/schema.py`
- `backend/app/services/db_writer.py`
- `backend/app/integrations/qdrant/store.py`
- `backend/alembic/versions/20260511_03_add_tenant_isolation.py` (new)
- `backend/requirements.txt`
- `backend/.env` (runtime config updated)

Frontend:
- `frontend/src/main.jsx`
- `frontend/src/firebase.js`

### 1) Backend auth middleware for protected routes

`backend/app/main.py` now applies auth middleware to:
- `/hiring/*`
- `/resume/*`

Behavior:
- If `AUTH_REQUIRED=true`, request must include Bearer token.
- Missing/invalid token now returns clean JSON `401` response.
- CORS preflight (`OPTIONS`) bypasses auth challenge.

This replaced earlier behavior where middleware-raised `HTTPException` surfaced as noisy middleware stack traces.

### 2) Token verification model: HS256 + Firebase ID token fallback

`backend/app/core/security.py` now verifies tokens with a two-path strategy:

Path A (legacy/internal):
- HS256 token via `AUTH_JWT_SECRET` and `AUTH_JWT_ALGORITHM`.

Path B (frontend production path):
- Firebase ID token (RS256), verified against Google JWKS:
  - audience must match `FIREBASE_PROJECT_ID`,
  - issuer must match `https://securetoken.google.com/<project_id>`.

This resolved the format mismatch where frontend emitted Firebase tokens while backend initially expected only HS256 custom JWTs.

### 3) Auth context extraction

Auth context normalized into:
- `user_id` from `sub`,
- `tenant_id` from token claim precedence:
  1. `tenant_id` claim
  2. Firebase tenant claim (if present)
  3. `AUTH_DEFAULT_TENANT`
- `role` from `role` claim (default `viewer`).

This gives stable tenant identity even for first-phase deployments without custom tenant claim minting.

### 4) Tenant isolation in relational model

Schema updates in `backend/app/models/schema.py`:
- Added `tenant_id` to:
  - `candidates`
  - `jobs`
- Added indexes:
  - `ix_candidates_tenant_id`
  - `ix_jobs_tenant_id`
- Replaced global `resume_hash` uniqueness with tenant-scoped uniqueness:
  - `uq_candidates_tenant_resume_hash (tenant_id, resume_hash)`

Rationale:
- same resume hash can exist across different companies/tenants without collision,
- query plans remain efficient for tenant-filtered reads.

### 5) Tenant migration and backfill

New migration:
- `backend/alembic/versions/20260511_03_add_tenant_isolation.py`

Upgrade behavior:
1. adds nullable `tenant_id` to `candidates` and `jobs`,
2. backfills existing rows to `default` tenant,
3. backfills `jobs.tenant_id` from linked candidate where possible,
4. sets both columns to non-null,
5. swaps global unique `resume_hash` constraint to tenant-scoped unique,
6. creates tenant indexes.

### 6) Tenant-aware write path

`backend/app/services/db_writer.py` updates:
- `save_to_db(...)` now requires `tenant_id`,
- duplicate detection now scoped by `(tenant_id, resume_hash)`,
- inserted `candidates` and `jobs` rows include `tenant_id`.

Impact:
- cross-tenant duplicate suppression no longer occurs,
- data ownership remains tenant-bounded at persistence time.

### 7) Tenant-aware read path (API queries)

`backend/app/main.py` query filters now scope by authenticated tenant:
- `GET /hiring/dashboard-metrics`
- `GET /hiring/shortlists`
- `GET /hiring/shortlist/{trace_id}`

Impact:
- shortlist history and dashboard data are no longer globally visible across tenants.

### 8) Tenant-aware semantic search in Qdrant

`backend/app/integrations/qdrant/store.py`:
- `search()` now accepts `tenant_id`,
- query filter combines `tenant_id` and optional `role`.

`backend/app/main.py`:
- upsert payload now writes `tenant_id`,
- shortlist semantic blending calls include tenant-scoped search,
- `/hiring/semantic-search` now sends `tenant_id` to qdrant search path.

Impact:
- semantic retrieval no longer leaks vectors between tenant workspaces.

### 9) Frontend token propagation integration

`frontend/src/main.jsx` adds global fetch wrapper behavior:
- for `/hiring/*` and `/resume/*` requests:
  - obtains current Firebase ID token,
  - appends `Authorization: Bearer <token>`.

`frontend/src/firebase.js` adds `authReady` promise:
- resolves after first `onAuthStateChanged` callback.

`frontend/src/main.jsx` now awaits `authReady` before protected requests.

Why this was necessary:
- without `authReady`, early page-load requests could fire before Firebase restored session, causing intermittent `401`.

### 10) Observed symptom and final stabilization

Observed after initial auth enable:
- repeated `401` logs from dashboard poll calls.

Root cause:
- frontend request race before auth restoration.

Fix:
- `authReady` gate + fetch token injection.

Post-fix expected behavior:
- unauthenticated requests -> deterministic `401`,
- authenticated frontend session -> deterministic `200` on protected routes,
- no random alternation caused by startup timing.

### 11) Environment contract for this phase

Required backend env keys:
- `AUTH_REQUIRED=true|false`
- `AUTH_JWT_SECRET=<secret>`
- `AUTH_JWT_ALGORITHM=HS256`
- `FIREBASE_PROJECT_ID=<firebase-project-id>`
- `AUTH_DEFAULT_TENANT=default`

Recommended operating modes:
- Local UI smoke testing (no token wiring): `AUTH_REQUIRED=false`
- Enterprise/auth testing: `AUTH_REQUIRED=true`

### 12) Validation performed

Backend auth checks:
- no token -> `401`,
- invalid token -> `401`.

Frontend/build checks:
- `npm run build` completed successfully after fetch/auth changes.

Runtime behavior:
- protected routes reachable with valid logged-in session token,
- `Missing bearer token` errors eliminated for authenticated flow.

## 2026-05-11 Alembic + Dashboard Metrics DB Fix

This section documents the production DB issue and fix completed on May 11, 2026.

### Incident summary

Observed API error during dashboard fetch:
- endpoint: `GET /hiring/dashboard-metrics`
- failure: `sqlalchemy.exc.ProgrammingError`
- root SQL error: `psycopg2.errors.UndefinedColumn: column jobs.trace_id does not exist`

The failing query path used `Job.trace_id` in shortlist/dashboard aggregation logic, but some deployed databases were created from an older baseline where `jobs.trace_id` was not present.

### Root cause

Schema drift between ORM and baseline migration:
- ORM model expected `jobs.trace_id`.
- baseline migration `20260503_01_baseline_schema.py` created `jobs` without `trace_id`.
- result: runtime query failures in metrics and shortlist history queries.

### Fix implemented

New Alembic revision added:
- `backend/alembic/versions/20260511_02_add_jobs_trace_id.py`

Upgrade behavior:
1. adds nullable `jobs.trace_id`,
2. creates index `ix_jobs_trace_id`,
3. backfills existing `jobs.trace_id` from `candidates.trace_id` via `candidate_id`.

### Recovery flow for existing DBs

For databases that already had tables but no Alembic history, running `upgrade head` directly triggered:
- `DuplicateTable: relation "candidates" already exists`

Correct recovery procedure:
1. `alembic stamp 20260503_01` (marks baseline as applied without re-creating tables),
2. `alembic upgrade head` (applies incremental migrations including `20260511_02`).

### Documentation/operability update

`README.md` now includes a single idempotent startup command that:
- starts/creates Postgres container,
- waits for readiness,
- creates DB if missing,
- conditionally stamps baseline when tables exist but `alembic_version` is absent,
- runs `alembic upgrade head`,
- starts backend server.

## 2026-05-09 Frontend Authentication Integration (Firebase)

This section documents the frontend authentication implementation completed on May 9, 2026.

### Scope completed

Authentication was integrated into existing frontend screens without structural UI/layout rewrites:
- Email/password login via Firebase Auth.
- Email/password signup via Firebase Auth.
- Google popup auth (`Continue with Google`) on both login and signup pages.
- Firebase config moved from hardcoded source values to frontend environment variables.

### Files changed

- `frontend/src/firebase.js`
- `frontend/src/pages/Login.jsx`
- `frontend/src/pages/Signup.jsx`
- `frontend/.env.example`
- `frontend/.env` (local, untracked secret file)

### Implementation details

#### 1. Firebase bootstrap module

File:
- `frontend/src/firebase.js`

What it now does:
- initializes Firebase app using `import.meta.env.VITE_*` config values,
- exports:
  - `auth` (`getAuth(app)`),
  - `googleProvider` (`new GoogleAuthProvider()`),
- initializes analytics only when supported by runtime (`isSupported()` guard), preventing unsupported-environment errors.

#### 2. Login flow conversion (mock -> real auth)

File:
- `frontend/src/pages/Login.jsx`

What changed:
- previous mock submit redirect was replaced with Firebase login call:
  - `signInWithEmailAndPassword(auth, email, password)`,
- added Google login path:
  - `signInWithPopup(auth, googleProvider)`,
- success behavior retained:
  - navigate to `/dashboard`,
- added minimal UX state:
  - `isLoading` to avoid duplicate submissions,
  - inline error message rendering from Firebase errors.

#### 3. Signup flow conversion (mock -> real auth)

File:
- `frontend/src/pages/Signup.jsx`

What changed:
- previous mock submit redirect was replaced with Firebase signup call:
  - `createUserWithEmailAndPassword(auth, email, password)`,
- after account creation:
  - `updateProfile(..., { displayName })` using entered full name,
- added Google signup path:
  - `signInWithPopup(auth, googleProvider)`,
- success behavior retained:
  - navigate to `/dashboard`,
- added loading + inline error handling parallel to login.

#### 4. Secret handling and GitHub safety

What changed:
- Firebase credentials removed from hardcoded JS config.
- Credentials moved to:
  - `frontend/.env` (local runtime secret),
  - `frontend/.env.example` (committable template placeholders).

Why:
- prevents accidental credential exposure in tracked source files,
- standard Vite pattern (`VITE_*`) keeps local setup predictable for collaborators.

Repository safety status:
- root `.gitignore` already ignores `**/.env` and `**/.env.*`,
- therefore `frontend/.env` is not committed by default.

### Runtime prerequisites

In Firebase Console, the following sign-in providers must be enabled:
1. Email/Password
2. Google

Also ensure allowed domains include:
- local domain used in development (for example `localhost`),
- deployed production domain.

### Verification status

Frontend build was executed after integration and passed:
- command: `npm run build` (from `frontend/`)
- result: successful production build generation.

## 2026-05-07 Scoring Policy Redesign (Industry-Relevance Update)

This section documents the shortlist scoring redesign implemented on May 7, 2026 to better align with real hiring behavior and reduce unfair rejection patterns.

### Why this redesign was done

Observed issues in previous scoring behavior:
- Candidates could be penalized heavily (or effectively filtered) when GitHub evidence was missing.
- High-signal achievements such as GSoC and elite contest performance were underweighted.
- Job-role weighting over-indexed on GitHub and under-indexed on practical project signal.

Design goals:
- Reward strong demonstrable outcomes (projects, platform strength, recognized achievements).
- Avoid brittle rejection for missing profile links.
- Preserve must-have hard gate and role-aware thresholding.

### Files changed in this redesign

- `backend/app/main.py`
- `backend/.env`
- `backend/.env.example`
- `README.md`

### 1. New Achievement Score added to core fit computation

New function:
- `backend/app/main.py` -> `_achievement_score(...)`

The new achievement signal produces `achievement_score_100` from:
- explicit GSoC signal (`"google summer of code"` / `"gsoc"`),
- platform achievement meta already computed from coding profiles,
- elite platform rating band checks (Codeforces/LeetCode/CodeChef/AtCoder),
- rank/award keyword evidence (`icpc`, `winner`, `finalist`, `global rank`, `air`, etc.).

This score is now:
- included in final weighted fit score,
- exposed in response `breakdown`,
- included in `ranking_decision_log.candidate_metrics`,
- used in ranking tie-breakers.

### 2. Weight model redesign (job + internship)

#### Job weights before redesign
- skills: `0.27`
- github: `0.20`
- experience: `0.19`
- platform: `0.08`
- projects: `0.04`
- profile: `0.02`
- experience_quality: `0.20`
- achievements: not present

#### Job weights after redesign (current)
- skills: `0.28`
- github: `0.12`
- experience: `0.19`
- platform: `0.14`
- projects: `0.10`
- profile: `0.02`
- experience_quality: `0.20`
- achievements: `0.06`

Impact:
- GitHub dependence is reduced.
- Platform strength and project signal carry more weight.
- Achievements are explicitly represented without dominating the score.

#### Internship weights before redesign
- skills: `0.34`
- github: `0.21`
- experience: `0.09`
- platform: `0.14`
- projects: `0.08`
- profile: `0.02`
- experience_quality: `0.12`
- achievements: not present

#### Internship weights after redesign (current)
- skills: `0.30`
- github: `0.10`
- experience: `0.08`
- platform: `0.20`
- projects: `0.18`
- profile: `0.02`
- experience_quality: `0.00`
- achievements: `0.12`

Impact:
- Internship scoring is now aligned to early-career reality:
  coding strength + projects + achievements over corporate-tenure style signals.

### 3. GitHub threshold brittleness removed

Previous behavior:
- `JOB_MIN_GITHUB_SCORE_100=35` could reject candidates with weak/missing GitHub extraction.

Current behavior:
- default threshold changed to `JOB_MIN_GITHUB_SCORE_100=0`.
- even if threshold is configured above `0`, GitHub threshold is enforced only when GitHub data is available.

Implementation:
- `backend/app/main.py` -> `_build_eligibility(...)`
- gating now checks `github_data_available_score_100` before applying GitHub minimum.

Result:
- Missing GitHub links no longer cause unfair rejection in job shortlisting by default.

### 4. Missing-signal-aware weight redistribution

Previous behavior:
- Missing GitHub data often yielded near-zero GitHub component while still consuming configured weight share.

Current behavior:
- role weights are redistributed at runtime across available signals when GitHub data is absent.
- system stores both:
  - configured weights (`criteria_used.weights`)
  - effective post-availability weights (`criteria_used.effective_weights`)
- response includes a redistribution marker:
  - `criteria_used.weight_redistribution.redistributed_due_to_missing_signals`

Result:
- candidates are scored on available evidence, not penalized for extraction/link absence.

### 5. Final score flow after redesign

High-level order:
1. build component scores (skills, github, experience, platform, projects, profile, experience_quality, achievements),
2. derive effective weights based on signal availability,
3. compute weighted fit,
4. apply target-alignment and must-have multipliers,
5. apply optional JD semantic blend (`SHORTLIST_JD_SEMANTIC_WEIGHT`, default `0.12`),
6. run eligibility filters,
7. rank eligible candidates.

### 6. Ranking tie-break order update

Current tie-break priority after `fit_score_100`:
1. must-have coverage
2. achievement score
3. JD semantic score
4. target alignment
5. confidence
6. skills match

This change ensures high-signal achievements influence close-ranking scenarios.

### 7. Config/documentation synchronization

To avoid policy drift, the same scoring values were updated in:
- runtime env (`backend/.env`),
- environment template (`backend/.env.example`),
- public setup docs (`README.md`).

Added env keys:
- `INTERN_WEIGHT_ACHIEVEMENTS`
- `JOB_WEIGHT_ACHIEVEMENTS`

Updated job threshold default:
- `JOB_MIN_GITHUB_SCORE_100=0`

### 8. Behavior difference summary (before vs now)

For a candidate with:
- strong skills/projects/platform performance,
- weak or missing GitHub links.

Before:
- could be directly rejected in job flow due to GitHub threshold,
- could be under-ranked due to non-redistributed GitHub weight drag.

Now:
- no default GitHub hard rejection,
- missing GitHub weight redistributed across available signals,
- project/platform/achievement evidence contributes more materially.

Net effect:
- stronger fairness and better alignment with industry screening practices while preserving strict must-have checks.

## Recent Production Hardening Updates

The backend was upgraded with reliability and production-readiness improvements:
- DB initialization moved to explicit startup lifecycle (no import-time connection side effects).
- ORM schema strengthened with indexes, uniqueness constraints, and timestamp fields.
- Migration framework added via Alembic (`backend/alembic.ini`, `backend/alembic/`).
- DB writer upgraded to structured logging and safer persistence flow.
- Duplicate-resume handling now supports controlled bypass through `force_reprocess`.
- Runtime tuning knobs added for structured extraction stability (`RESUME_STRUCTURED_*` envs).
- Semantic must-have skill eligibility now follows the same alias/implication-aware matching path as required skills.

## 2026 Semantic + Qdrant Enhancements (Detailed)

This section documents the latest implementation wave focused on semantic search reliability, false-positive reduction, and production-safe skill normalization.

### 1. Qdrant enablement and startup hardening

What changed:
- Qdrant integration was activated for runtime semantic shortlist enrichment.
- Backend startup safety was improved to avoid DB race conditions during container boot.
- Semantic query path now supports role-aware filtering during search.

Implementation details:
- `backend/app/integrations/qdrant/store.py`
  - `search()` signature updated to accept `role`.
  - Query filter added (`payload.role == request.role`) for role-scoped semantic retrieval.
- Startup command path now includes PostgreSQL readiness wait (`pg_isready`) before DB operations.

Why:
- Prevented intermittent startup failures caused by `psql` running before PostgreSQL was fully ready.
- Prevented semantic cross-role contamination (for example, internship query seeing job-only embeddings).

### 2. Root bug fixed: method-signature mismatch causing `/hiring/shortlist` 500

Observed production error:
- `TypeError: QdrantResumeIndex.search() got an unexpected keyword argument 'role'`

Root cause:
- `main.py` passed `role=...` to Qdrant search, but store-layer method did not accept `role`.

Fix:
- Store-layer search signature and filtering were aligned with caller expectations.
- This removed 500s in shortlist requests when Qdrant was enabled.

### 3. Skill constraints system introduced (new constants layer)

New file:
- `backend/app/constants/skills_constraints.py`

Purpose:
- Central policy hub for token quality controls used by both shortlist scoring and Qdrant indexing.

Current controls:
- `SKILL_TOKEN_MIN_LEN`, `SKILL_TOKEN_MAX_LEN`
- `SKILL_SHORT_TOKEN_ALLOWLIST` (for valid short skills)
- `SKILL_STOPWORDS` (generic resume words filtered from skills)
- `AMBIGUOUS_SINGLE_CHAR_SKILLS` (currently `c`, `r`)
- `SEMANTIC_GENERIC_TOKENS` (broad tokens filtered for cleaner semantic ranking)

Why:
- Prevent low-quality tokens from entering canonical matching, implication expansion, and semantic vectors.
- Keep quality rules consistent across runtime paths.

### 4. Alias map hardening: typo recovery + ambiguity cleanup

File:
- `backend/app/constants/skills_aliases.py`

Typos added:
- `pyhon`, `pyhton`, `pthon`, `phyton` -> `python`
- `fastap`, `fasapi`, `fast-api` -> `fastapi`
- `nide`, `nodej`, `nodjs`, `node js` -> `nodejs`

Conflict cleanup:
- Removed duplicate-key collisions that previously caused silent override risk (`tf`, `sns` conflict class).

Ambiguity cleanup:
- Removed/replaced risky short aliases that can appear in normal prose:
  - removed: `sh`, `es`, `wp`, `rb`, `rs`, and earlier `go`
  - safer explicit forms retained (for example `go lang`, `node.js`, `next.js`, `nest.js`)

Why:
- These changes reduce false positives while preserving practical typo tolerance for recruiter input and extracted resume text.

### 5. Text-detection safety guards for ambiguous single-letter skills

File:
- `backend/app/main.py`

What changed:
- `_skill_in_text()` now handles ambiguous single-char skills (`c`, `r`) with explicit-phrase gating.
- Free-text match for these tokens requires patterns like:
  - `c language`, `c programming`, `c lang`
  - similarly for `r`

Why:
- Prevents plain prose from becoming fake skill evidence (for example sentence fragments containing standalone `c`).

### 6. Semantic-noise reduction for Qdrant and shortlist query blending

Files:
- `backend/app/main.py`
- `backend/app/integrations/qdrant/store.py`

What changed:
- Generic high-frequency semantic tokens (`api`, `cloud`, `database`, `web`, `mobile`, etc.) are filtered from:
  - shortlist semantic query skill set,
  - Qdrant indexed skill token set.

Why:
- Broad tokens can inflate relevance scores without meaningful hiring-skill specificity.
- Filtering improves ranking precision and reduces accidental semantic boosts.

### 7. CSV input normalization and dedup enhancement

File:
- `backend/app/main.py`

What changed:
- `_parse_csv_list()` now supports delimiters: `,`, `;`, `|`, newline.
- Values are canonicalized through skill normalization and deduplicated before scoring.

Why:
- Recruiter input in real workflows is inconsistent; this ensures stable parsing and fewer user-side formatting errors.

### 8. Regression test expansion (behavior locks)

Updated tests:
- `backend/tests/test_must_have_semantic.py`
- `backend/tests/constants/test_skill_constants_quality.py`

New/expanded coverage includes:
- must-have implication directionality
- false-positive prevention (`go` verb case, plain `c` sentence case)
- explicit positive cases (`go lang`, `c language`)
- duplicate alias-key guard
- typo canonicalization checks
- risky short-alias removal checks
- parsing/constraint checks for mixed-delimiter skill input

Validation status:
- Targeted suites passed after changes (`17 passed` in latest local run).

### 9. Behavioral summary after these changes

Current semantics are intentionally conservative:
- Framework implies parent language when policy defines it (e.g. `fastapi -> python`, `nodejs -> javascript`).
- Reverse implication is not assumed by default.
- Must-have remains a hard gate, but evaluated over canonical + implication-aware evidence.
- Ambiguous natural-language fragments are less likely to pass as skill signals.

## Skill Constraints and Semantic Matching

### Constraints/Constants Source of Truth
- `backend/app/constants/skills_aliases.py`
- `backend/app/constants/skills_implications.py`
- `backend/app/constants/keywords.py`
- `backend/app/constants/roles_domains.py`
- `backend/app/constants/companies.py`

These files act as policy constraints and vocabulary controls for shortlist scoring and eligibility.

### Semantic Matching Intent
- Avoid false rejection when resumes list framework/tool skills while jobs request parent language skills.
- Keep inference directional and conservative to avoid false positives.

Representative policy expectations:
- `react`, `nodejs`, `nextjs` can satisfy `javascript`.
- `spring boot` can satisfy `java`.
- `fastapi`, `django`, `flask` can satisfy `python`.
- Reverse direction does not auto-pass (`javascript` does not imply `react`).

### Must-Have Hard Gate Behavior
- Must-have remains a hard filter.
- Hard filter is evaluated after semantic normalization/expansion, not raw lexical matching only.
- Rejection reasons continue to report missing must-have skills when no valid semantic evidence is found.

## Migration and Compatibility Notes

Because this project already had live local databases before schema hardening, the following operational rule now applies:
- ORM evolution and DB evolution must be synchronized.
- If model fields are added (for example `created_at`), existing databases require migration before writes.

Current migration assets:
- `backend/alembic.ini`
- `backend/alembic/env.py`
- `backend/alembic/versions/20260503_01_baseline_schema.py`

Recommended lifecycle:
1. update models,
2. create migration,
3. apply migration in environment,
4. then deploy/restart API.

## Runtime and Failure Semantics

### A. Structured extraction timeout path
`resume_parser` includes timeout-guarded structured extraction.  
If timeout occurs:
- extraction path emits `structured_resume_extraction_timeout_or_error`,
- pipeline falls back to deterministic text parsing (projects + skills) and continues,
- API request may still complete with `200` if downstream scoring is viable.

Current resilience behavior:
- successful chunks are merged even if some chunks fail,
- fallback extraction is used for full timeout/error paths (`timeout_or_error_with_fallback` / `error_with_fallback`),
- outer timeout can be disabled with `RESUME_STRUCTURED_TIMEOUT_SECONDS=0`,
- latency can be reduced with `RESUME_STRUCTURED_MAX_CHUNKS=3` and `RESUME_STRUCTURED_RETRIES=0`.

### B. DB persistence failure path
`db_writer` is intentionally non-fatal to shortlist completion.
- insert exceptions are logged (`db_insert_failed`),
- shortlist response may still be returned for user-facing flow continuity,
- DB write status in response/trace should be monitored for reliability SLOs.

### C. Duplicate resume policy
Duplicate detection uses SHA256 hash of uploaded bytes (`resume_hash`).
- default behavior: duplicate returns `status=duplicate` for persistence path,
- optional override: `force_reprocess=true` in endpoints to bypass duplicate short-circuit for recomputation/testing.

## Operations Runbook

### Signals that indicate healthy run
- OpenAI calls return `HTTP 200`.
- DB writer logs show:
  - `db_session_created`
  - `db_duplicate_check_start`
  - `db_insert_start`
  - `db_primary_records_flushed`
  - `db_commit_success`
- shortlist event logs show:
  - `uploaded == ranked + rejected + failed`

### Signals that indicate migration mismatch
- SQL errors like:
  - `UndefinedColumn`
  - `column ... does not exist`
- Typical cause:
  - ORM schema ahead of database schema.

### Signals that indicate degraded extraction quality
- frequent structured timeout logs,
- very low extracted skill/project evidence,
- abnormally short processing duration compared to known baseline.

## Security and Secrets Hygiene

- `.env` must never be committed.
- PAT/API keys must be rotated immediately if exposed in terminals, logs, screenshots, or chat transcripts.
- Prefer short-lived credentials and scoped tokens wherever possible.

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
    - semantic skill evaluation (required + must-have),
    - response shaping,
    - shortlist audit logs.

- `app/constants/`
  - Centralized policy constraints for aliases, implications, and keyword/domain priors.
  - Reduces hardcoded drift and keeps matching behavior maintainable.

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

- `tests/test_must_have_semantic.py`
  - Regression suite for semantic must-have matching.
  - Verifies framework-to-language implication passes and reverse-direction fail safety.

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

## 2026-05-11 Kovidam AI Chatbot Upgrade (Backend + Frontend)

This section documents the chatbot implementation and quality upgrades completed up to now.

### Scope completed

- Added a real chatbot API endpoint in backend (`/chat/respond`).
- Connected frontend chat widget to backend (no longer static-only chat text).
- Added guided quick-option flow + free text fallback.
- Added browser voice input support (speech-to-text) in widget.
- Added solved/unsolved conversation flow with explicit closure path.
- Reset chat history on close/reopen so each session starts fresh.
- Improved response quality with OpenAI prompt upgrades.
- Enforced English-only simple-language replies.
- Added product-specific startup context so chatbot answers align with Kovidam’s actual mission.
- Increased chatbot panel size and fixed clipping/cut UI issues.

### Files changed

- `backend/app/main.py`
- `frontend/src/components/ChatWidget.jsx`
- `frontend/src/components/ChatWidget.css`
- `frontend/vite.config.js`

### Backend implementation details

#### 1. New chatbot request/response contract

Added typed models in `backend/app/main.py`:
- `ChatRequest`
- `ChatResponse`

This formalized:
- incoming message text,
- selected quick option handling,
- outgoing reply + next quick options.

#### 2. New endpoint: `POST /chat/respond`

Behavior implemented:
- Handles greeting intent (`hi`, `hello`, etc.).
- Handles quick-option selection.
- Falls back to OpenAI-generated response for custom user doubts.
- Returns context-aware follow-up options instead of static repeated menu.

#### 3. Conversation UX logic in backend

Added state-like flow prompts via options:
- `I have another doubt`
- `Not solved yet`
- `Solved, thanks`
- `Start new chat`

Added solved-intent handling for free text:
- `solved`, `done`, `fixed`, etc. -> polite closure + fresh-start option.

#### 4. Product-aware assistant grounding

Added `CHATBOT_PRODUCT_CONTEXT` in backend to strongly anchor model behavior:
- Kovidam as AI-native technical hiring intelligence platform,
- capability-over-keyword philosophy,
- multi-signal scoring (resume + GitHub + coding platforms + achievements),
- role-aware shortlist scoring.

Also added direct intent path for:
- “What does Kovidam do?” style queries,
to avoid generic/wrong job-board answers.

#### 5. OpenAI response-quality prompt upgrade

System prompt upgraded for:
- human tone,
- concise practical help,
- step-by-step resolution for issues/errors,
- reduced robotic repetition.

Then updated to:
- English-only output,
- easy words / simple sentences.

### Frontend implementation details

#### 1. Chat widget became fully interactive

`frontend/src/components/ChatWidget.jsx` now supports:
- full message list rendering (user + bot),
- backend API calls,
- option-click sending,
- enter-to-send,
- loading state (`Typing...`),
- voice input via Web Speech API,
- reset-to-initial greeting on widget close/reopen.

#### 2. UI sizing and readability fixes

`frontend/src/components/ChatWidget.css` updates:
- larger window dimensions,
- better body/input spacing,
- stacked full-width quick-option buttons,
- wrapped option text to avoid clipping,
- responsive mobile constraints.

Result:
- panel content no longer gets cut,
- clearer readability and interaction.

#### 3. Dev proxy route added

`frontend/vite.config.js` updated:
- added `/chat` proxy to backend (`localhost:8000`) for local development.

### Validation status

Commands executed and passed:
- `python -m py_compile backend/app/main.py`
- `npm run build` (frontend)

Build note:
- Vite chunk-size warning remains non-blocking and unrelated to chatbot behavior.

## 15) Extended Enterprise Security Blueprint (Detailed)

This section is an expanded implementation blueprint for taking current security from "strong startup baseline" to "enterprise procurement-ready maturity".

### 15.1 Identity and Access Maturity Model

Level 1 (already in place):
- JWT authentication on protected routes.
- Firebase token interoperability.
- Tenant-scoped request context.

Level 2 (partially in place):
- Membership validation against tenant.
- Role claim presence.
- Audit event capture for sensitive paths.

Level 3 (next target):
- Full RBAC policy matrix with endpoint-level allow/deny rules.
- Role-change workflow with approval + reason capture.
- Session and token revocation strategy.

Level 4 (enterprise target):
- SSO/SAML compatibility path.
- SCIM lifecycle automation.
- Fine-grained resource-level authorization.

### 15.2 Recommended RBAC Matrix (Practical)

Roles:
- `owner`
- `recruiter`
- `reviewer`
- `viewer`

Example capability matrix:
- Owner: full control including billing/security settings, role assignment, exports.
- Recruiter: upload resumes, run shortlist, view/edit job criteria, view candidates, send outreach.
- Reviewer: view shortlist outputs and provide review notes, but cannot change security settings.
- Viewer: read-only access to dashboards and approved shortlist views.

Hard deny examples:
- Viewer cannot trigger new shortlist runs.
- Reviewer cannot delete candidate records.
- Recruiter cannot change tenant role assignments.
- Non-owner cannot modify security policy values.

### 15.3 Authorization Decision Logging Standard

For each authz decision, log:
- `decision_id`
- `timestamp`
- `tenant_id`
- `user_id`
- `role`
- `action`
- `resource_type`
- `resource_id`
- `allow_or_deny`
- `deny_reason`
- `policy_version`

Why:
- Makes incident triage faster.
- Supports enterprise evidence requests.
- Enables internal policy debugging.

### 15.4 Token and Session Policy

Recommended defaults:
- ID token validity: provider-managed.
- Backend session cache TTL: short-lived.
- Sensitive action re-check: always verify live membership before action.
- Role changes invalidate active permission cache.

Do not rely on:
- long-lived cached role claims without live membership check.
- client-only role gating for server-sensitive actions.

### 15.5 Secrets Management Policy

Current pattern includes local `.env` usage for development.
Enterprise-ready target should include:
- centralized secret store (cloud vault),
- rotation runbook,
- key owner mapping,
- rotation frequency by key category.

Key categories:
- auth keys,
- DB credentials,
- SMTP credentials,
- OpenAI keys,
- third-party integration keys.

### 15.6 Data Protection and Retention Model

Data classes:
- Public product metadata.
- Internal operational telemetry.
- Customer business metadata.
- Candidate PII.
- Derived scoring artifacts.

Per-class policy should define:
- encryption requirements,
- retention duration,
- deletion triggers,
- exportability,
- legal hold behavior.

### 15.7 Backup and Recovery Standard

Minimum maturity target:
- scheduled backups,
- backup encryption,
- point-in-time restore option,
- periodic restore drill evidence.

Restore drill should capture:
- timestamp of drill,
- backup source,
- restore duration,
- data integrity check result,
- incident notes.

### 15.8 Abuse and Rate-Limit Policy

Protect high-cost endpoints (AI + upload + shortlist):
- per-user rate limits,
- per-tenant burst control,
- IP anomaly monitoring,
- payload-size protection.

### 15.9 Security Posture Communication

Public "Security" page should eventually include:
- current controls,
- architecture overview,
- contact path for security inquiries,
- vulnerability disclosure policy,
- status of planned certifications.

---

## 16) API Surface Documentary (Functional View)

This section explains expected behavior by API families in plain language.

### 16.1 `/hiring/*` family

Purpose:
- run shortlisting,
- fetch shortlist history,
- fetch dashboard metrics,
- perform semantic search.

Security expectation:
- must require valid auth when `AUTH_REQUIRED=true`.
- must enforce tenant scope on reads and writes.

Failure semantics:
- no token -> 401
- invalid token -> 401
- auth ok, no membership -> deny (expected 403 style behavior where configured)

### 16.2 `/resume/*` family

Purpose:
- resume upload/extraction operations.

Security expectation:
- protected under same auth policy as hiring endpoints.
- tenant ownership attached at persistence time.

### 16.3 Health/Readiness endpoints

Purpose:
- operational checks for deployment/system orchestration.

Security expectation:
- split into public-safe and private-operational as needed.

### 16.4 Error response principles

Good error contract:
- deterministic status codes,
- short machine-readable reason,
- no secret leakage,
- no stacktrace leak to client.

---

## 17) Data Model Documentary (Expanded)

### 17.1 Core entities

Candidates:
- candidate identity,
- resume fingerprint,
- profile-derived structured fields,
- tenant ownership,
- timestamps.

Jobs:
- job/trace linkage,
- role context,
- tenant ownership,
- shortlist linkage.

Tenant-related entities:
- tenants,
- users,
- memberships,
- role association.

Audit entities:
- append-only events with action context.

### 17.2 Candidate hash uniqueness policy

Global uniqueness is intentionally removed.
Current policy uses `(tenant_id, resume_hash)` uniqueness.

Practical effect:
- same person resume can exist in multiple customer tenants without conflict.

### 17.3 Timestamp policy

All critical entities should include:
- `created_at`
- `updated_at`

Operational value:
- debugging,
- analytics windows,
- retention workflows.

### 17.4 Indexing strategy notes

Tenant-first index policy is important because:
- almost all reads are tenant-scoped,
- multi-tenant scale requires predictable filter performance.

---

## 18) Shortlist Engine Documentary (Expanded)

### 18.1 Input groups

Shortlist inputs combine:
- parsed resume signals,
- job role criteria,
- required and must-have skills,
- optional context (job description, role type),
- semantic/vector relevance support.

### 18.2 Component scoring categories

Typical component categories include:
- skills match,
- GitHub quality signal,
- experience evidence,
- platform coding profile signal,
- project relevance,
- profile completeness,
- experience quality,
- achievements.

### 18.3 Hard gate vs ranking signal

Hard gate:
- must-have requirements.

Ranking signals:
- weighted fit and confidence.

This split is deliberate:
- gate enforces minimum requirement integrity,
- ranking differentiates among eligible candidates.

### 18.4 Weight redistribution rationale

If one major signal is missing (example: GitHub profile),
weight redistribution prevents score unfairness and improves practical usability.

### 18.5 Tie-break logic intent

When two candidates are close on fit,
secondary ordering uses policy-guided indicators (must-have coverage, achievement, semantic relevance, etc.)
so ordering remains explainable.

---

## 19) Frontend Experience Documentary (Expanded)

### 19.1 Public experience

Public routes now include:
- real about/company/legal content pathways,
- improved contact/demo flow,
- dedicated team page.

### 19.2 Team transition behavior

Current implemented interaction:
1. user clicks `Meet Our Team`,
2. intro screen displays `Kovidam Team` with circular ring,
3. intro holds for 1.3 seconds,
4. team cards slide in one-by-one.

### 19.3 UX quality principles currently applied

- consistent dark theme,
- shared global background system,
- readable typographic hierarchy,
- spacing rhythm improvements,
- high-contrast actionable buttons.

---

## 20) DevOps and Local Operations Documentary

### 20.1 Local startup dependency order

Recommended order:
1. Postgres up and ready.
2. Env loaded.
3. Alembic migration run.
4. Backend start.
5. Frontend start.

### 20.2 Common local errors and fixes

Error: `Address already in use`
- Cause: old uvicorn process still running.
- Fix: stop previous process, restart cleanly.

Error: `DuplicateTable` during migration
- Cause: DB already has tables without Alembic history.
- Fix: baseline stamp, then upgrade head.

Error: 401 repeated in frontend
- Cause: missing/invalid token or auth restore race.
- Fix: verify login session + token injection path.

### 20.3 Production deployment sanity checklist

Before deployment:
- migrations applied,
- auth env keys set,
- tenant defaults reviewed,
- Qdrant connectivity verified,
- rollback plan documented,
- smoke tests pass.

After deployment:
- protected route auth verified,
- shortlist endpoint smoke test,
- dashboard metrics test,
- audit event generation test,
- error log scan window.

---

## 21) Compliance Readiness Narrative

This section is written in buyer-friendly language for enterprise conversations.

What can already be claimed honestly:
- protected API architecture exists,
- tenant-aware isolation is implemented in both relational and semantic layers,
- security-sensitive actions are auditable,
- schema migration discipline is present.

What should be stated as "in-progress":
- full RBAC enforcement matrix completion,
- formal policy docs lifecycle,
- advanced compliance evidence packs.

How to present maturity:
- "We have strong technical controls in place and are actively formalizing enterprise governance layers."

---

## 22) Product Reliability and Quality Notes

### 22.1 Non-fatal persistence pattern

Shortlist user flow can complete even if DB persistence has transient failure,
with failure logged for operational follow-up.

This is a conscious UX choice to avoid full user-flow collapse.

### 22.2 Extraction fallback philosophy

When structured extraction path is slow or fails,
fallback parsing keeps product useful.

### 22.3 Deterministic behavior targets

Current goal:
- reduce random behavior,
- reduce race-driven status variance,
- keep auth and scoring outcomes predictable.

---

## 23) Future Roadmap (Execution-Oriented)

### 23.1 Security roadmap

Phase A:
- complete endpoint-by-endpoint RBAC enforcement.

Phase B:
- role management admin UX + audit reason capture.

Phase C:
- rate-limits + abuse monitoring expansion.

Phase D:
- enterprise docs and evidence kit.

### 23.2 Product roadmap

- deeper explainability panel for shortlist results,
- model/version stamping at per-result level,
- confidence calibration and uncertainty visualization,
- evaluator harness with regression benchmark suite.

### 23.3 Ops roadmap

- centralized observability dashboards,
- structured incident runbooks,
- recurring backup restore drills.

---

## 24) Quick Reference Appendix

### 24.1 Critical files

Backend:
- `backend/app/main.py`
- `backend/app/core/security.py`
- `backend/app/models/schema.py`
- `backend/app/services/db_writer.py`
- `backend/app/integrations/qdrant/store.py`

Migrations:
- `backend/alembic/versions/20260503_01_baseline_schema.py`
- `backend/alembic/versions/20260511_02_add_jobs_trace_id.py`
- `backend/alembic/versions/20260511_03_add_tenant_isolation.py`
- `backend/alembic/versions/20260512_04_membership_and_audit.py`

Frontend:
- `frontend/src/main.jsx`
- `frontend/src/firebase.js`
- `frontend/src/App.jsx`
- `frontend/src/layouts/PublicLayout.jsx`
- `frontend/src/pages/AboutPage.jsx`
- `frontend/src/pages/TeamPage.jsx`
- `frontend/src/pages/ContactPage.jsx`

### 24.2 Founders' one-minute status

Current state:
- Core product works.
- Security foundation is real and meaningful.
- Tenant boundaries exist in both DB and vector layers.
- Public company pages are now branded and functional.
- Next big enterprise step is RBAC depth + governance formalization.


## 25) Extended Verification Checklist (Line-Item Format)

Use this checklist during release readiness, QA signoff, and enterprise demos.

1. Verify backend starts without migration drift errors.
2. Verify `alembic current` matches expected head revision.
3. Verify unauthenticated `/hiring/dashboard-metrics` returns 401 in secure mode.
4. Verify invalid bearer token returns 401 with clean JSON body.
5. Verify authenticated request returns 200 for protected metrics endpoint.
6. Verify shortlist run works under authenticated session.
7. Verify shortlist run is denied when membership is inactive.
8. Verify tenant A cannot see tenant B shortlist history.
9. Verify tenant A cannot fetch tenant B shortlist detail by trace id.
10. Verify candidate upsert writes correct tenant id.
11. Verify job rows include tenant id after shortlist run.
12. Verify duplicate resume detection is tenant-scoped.
13. Verify same resume hash can exist in separate tenants.
14. Verify Qdrant payload contains tenant id for indexed points.
15. Verify semantic search filters by tenant id.
16. Verify role-filtered semantic query path behaves as expected.
17. Verify audit event is written for authz deny case.
18. Verify audit event is written for shortlist trigger action.
19. Verify audit event table ordering by created_at works.
20. Verify audit event captures user_id and tenant_id.
21. Verify audit event captures action and status.
22. Verify contact page submits with valid inputs.
23. Verify contact page shows readable validation errors.
24. Verify contact form does not feel visually congested on desktop.
25. Verify contact form remains usable on mobile width.
26. Verify About page layout renders without placeholder content.
27. Verify Meet Our Team CTA route opens correctly.
28. Verify Team intro screen appears before card reveal.
29. Verify Team intro duration is approximately 1.3 seconds.
30. Verify circular ring appears around Kovidam Team intro text.
31. Verify team cards slide in sequentially (staggered).
32. Verify team member names and roles match current founder data.
33. Verify Varun card does not include removed title.
34. Verify third member displays Vikram J Purohit.
35. Verify all three team cards include Co-Founder where expected.
36. Verify public pages share same global home background style.
37. Verify no conflicting local page glow overlay overrides global background.
38. Verify navbar remains consistent across public pages.
39. Verify Book a Demo and Login buttons remain visible and aligned.
40. Verify footer links navigate to intended routes.
41. Verify public route `/about` resolves to custom About page.
42. Verify route `/company/team` resolves to Team page.
43. Verify route `/contact` resolves to enhanced contact page.
44. Verify dashboard layout still includes background effects.
45. Verify public layout now includes background effects.
46. Verify frontend build succeeds (`npm run build`).
47. Verify backend dependencies install cleanly in venv.
48. Verify env template files include required keys.
49. Verify real `.env` files are not committed.
50. Verify `.gitignore` protects secret env files.
51. Verify Firebase Email/Password provider is enabled.
52. Verify Firebase Google provider is enabled.
53. Verify Firebase allowed domains include local and production hosts.
54. Verify frontend token injection for protected endpoints.
55. Verify authReady gating prevents startup race in session restore.
56. Verify no random 200/401 alternation after auth stabilization.
57. Verify response codes are deterministic for same auth state.
58. Verify migration `jobs.trace_id` exists in DB schema.
59. Verify index for `jobs.trace_id` exists.
60. Verify backfill populated historical job trace id where possible.
61. Verify tenant migration created indexes on tenant fields.
62. Verify tenant fields are non-null after migration.
63. Verify schema constraints match ORM expectation.
64. Verify startup command handles DB readiness before running SQL.
65. Verify Postgres container restart does not break migration flow.
66. Verify API startup logs show clean lifecycle start.
67. Verify no import-time DB side effects remain.
68. Verify structured extraction timeout fallback still returns usable output.
69. Verify fallback path logs expected event markers.
70. Verify shortlist still returns if persistence transiently fails.
71. Verify failure logs are sufficient for ops triage.
72. Verify must-have semantic matching honors directionality.
73. Verify ambiguous single-letter skill false positives are blocked.
74. Verify explicit "c language" style positives still pass.
75. Verify risky alias keys are removed from alias map.
76. Verify typo aliases normalize to correct canonical skill.
77. Verify generic semantic tokens are filtered from search blending.
78. Verify CSV parser accepts comma delimiters.
79. Verify CSV parser accepts semicolon delimiters.
80. Verify CSV parser accepts pipe delimiters.
81. Verify CSV parser accepts newline delimiters.
82. Verify normalized skill list is deduplicated.
83. Verify achievement score appears in shortlist breakdown.
84. Verify ranking decision log includes candidate metrics.
85. Verify effective weights include redistribution metadata where applicable.
86. Verify job threshold defaults align with intended fairness policy.
87. Verify internship weighting aligns with current product policy.
88. Verify shortlist API version metadata is returned as configured.
89. Verify scoring policy version metadata is returned as configured.
90. Verify API response remains backward compatible where legacy keys enabled.
91. Verify qdrant health check endpoint behavior in startup logs.
92. Verify qdrant disabled mode falls back gracefully if configured false.
93. Verify semantic search route handles empty query safely.
94. Verify shortlist trace retrieval handles unknown trace id safely.
95. Verify frontend error messages are user-readable (not raw stack traces).
96. Verify backend error responses do not leak sensitive internals.
97. Verify logs are structured enough for centralized ingestion.
98. Verify log level obeys env config.
99. Verify SMTP config is loaded only when mail send is required.
100. Verify AI model env keys are present and valid.
101. Verify timeout envs produce expected behavior under stress.
102. Verify concurrency env values do not overwhelm local resources.
103. Verify docs reflect latest implemented security controls.
104. Verify docs reflect latest UI flow (About -> Team intro -> cards).
105. Verify docs reflect latest migration sequence.
106. Verify docs reflect latest route structure.
107. Verify docs are understandable to non-core contributors.
108. Verify release notes include any breaking API behavior.
109. Verify branch is clean before production deployment tagging.
110. Verify rollback plan is documented before release.

