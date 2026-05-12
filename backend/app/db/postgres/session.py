import os
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy import text

from app.config import load_environment

load_environment()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/kovidam")

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


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
