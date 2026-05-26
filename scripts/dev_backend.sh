#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DB_CONTAINER="kovidam-db"
QDRANT_CONTAINER="kovidam-qdrant"
DB_NAME="kovidam"

# Free local 8000 if another docker container is using it.
docker ps --format '{{.Names}} {{.Ports}}' | awk '/0.0.0.0:8000->8000\/tcp/ {print $1}' | xargs -r docker stop >/dev/null 2>&1 || true

if docker ps -a --format '{{.Names}}' | grep -qx "$DB_CONTAINER"; then
  docker start "$DB_CONTAINER" >/dev/null 2>&1 || true
else
  docker run -d --name "$DB_CONTAINER" -p 5432:5432 -e POSTGRES_PASSWORD=postgres ankane/pgvector >/dev/null
fi

until docker exec "$DB_CONTAINER" pg_isready -U postgres >/dev/null 2>&1; do
  sleep 1
done

if ! docker exec "$DB_CONTAINER" psql -U postgres -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1; then
  docker exec "$DB_CONTAINER" psql -U postgres -d postgres -c "CREATE DATABASE ${DB_NAME};" >/dev/null
fi

if docker ps -a --format '{{.Names}}' | grep -qx "$QDRANT_CONTAINER"; then
  docker start "$QDRANT_CONTAINER" >/dev/null 2>&1 || true
else
  docker run -d --name "$QDRANT_CONTAINER" -p 6333:6333 qdrant/qdrant >/dev/null
fi

cd "$ROOT/backend"

if [[ ! -d .venv ]]; then
  python3 -m venv .venv
fi

# shellcheck disable=SC1091
source .venv/bin/activate

if [[ ! -f .venv/.deps_ok ]]; then
  PIP_DISABLE_PIP_VERSION_CHECK=1 python -m pip install --no-cache-dir -r requirements.txt >/dev/null
  python -m playwright install chromium >/dev/null
  touch .venv/.deps_ok
fi

HAS_CAND=$(docker exec "$DB_CONTAINER" psql -U postgres -d "$DB_NAME" -tAc "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='candidates');" | tr -d '[:space:]')
HAS_AV=$(docker exec "$DB_CONTAINER" psql -U postgres -d "$DB_NAME" -tAc "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='alembic_version');" | tr -d '[:space:]')
VER=$(docker exec "$DB_CONTAINER" psql -U postgres -d "$DB_NAME" -tAc "SELECT version_num FROM alembic_version LIMIT 1;" 2>/dev/null | tr -d '[:space:]' || true)

if [[ "$HAS_CAND" == "t" && "$HAS_AV" == "f" ]]; then
  alembic stamp 20260503_01
fi

case "$VER" in
  20260503_01|20260511_02|20260511_03|"")
    alembic upgrade head
    ;;
  *)
    alembic stamp 20260511_03
    ;;
esac

echo "[ok] Backend ready: http://localhost:8000/docs"
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
