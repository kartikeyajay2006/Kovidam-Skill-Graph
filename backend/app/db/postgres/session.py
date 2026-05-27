import os
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy import text

from app.config import load_environment

load_environment()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is required and must point to your cloud Postgres instance.")

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def _auto_fix_legacy_constraints(conn) -> None:
    """
    Heal legacy schema drift that breaks shortlist persistence.
    """
    print("[DB] Checking legacy constraint drift...")
    # Old global uniqueness on resume_hash breaks tenant/user scoped inserts.
    conn.execute(text("ALTER TABLE candidates DROP CONSTRAINT IF EXISTS candidates_resume_hash_key"))
    conn.execute(text("DROP INDEX IF EXISTS candidates_resume_hash_key"))
    conn.execute(text("DROP INDEX IF EXISTS ix_candidates_resume_hash"))

    # Ensure scoped uniqueness exists for modern multi-tenant behavior.
    conn.execute(
        text(
            """
            DO $$
            BEGIN
              IF NOT EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conname = 'uq_candidates_tenant_user_resume_hash'
              ) THEN
                ALTER TABLE candidates
                ADD CONSTRAINT uq_candidates_tenant_user_resume_hash
                UNIQUE (tenant_id, user_id, resume_hash);
              END IF;
            END
            $$;
            """
        )
    )
    conn.execute(text("CREATE INDEX IF NOT EXISTS ix_candidates_resume_hash ON candidates (resume_hash)"))
    print("[DB] Legacy constraint check complete.")


def init_db() -> None:
    """
    Verify database connectivity at startup.

    Schema management is handled exclusively by Alembic (run via
    `alembic upgrade head` in the Render build command). This function
    must NOT call Base.metadata.create_all() — doing so would conflict
    with Alembic-managed indexes and cause DuplicateTable errors on
    an already-migrated database.
    """
    print("[DB] Verifying database connectivity...")
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
        auto_fix = os.getenv("DB_AUTO_FIX_LEGACY_CONSTRAINTS", "true").lower() == "true"
        if auto_fix:
            try:
                _auto_fix_legacy_constraints(conn)
                conn.commit()
            except Exception as exc:
                conn.rollback()
                print(f"[DB] Legacy constraint auto-fix skipped: {exc}")

        # Log the current Alembic revision for observability.
        try:
            revision = conn.execute(
                text("SELECT version_num FROM alembic_version LIMIT 1")
            ).scalar()
            print(f"[DB] Connected. Alembic revision: {revision}")
        except Exception:
            print("[DB] Connected. alembic_version table not found — run `alembic upgrade head` to initialise schema.")


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def test_connection():
    print("[DB] Attempting connection test...")
    db = SessionLocal()
    print(db)
    db.close()
    print("[DB] Connection test complete, session closed.")
