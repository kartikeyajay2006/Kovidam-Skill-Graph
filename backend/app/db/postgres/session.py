import os
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy import text

from app.config import load_environment
from app.models.schema import Base

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
    Initialize database schema/tables explicitly.
    Kept out of import path to avoid side effects during tests and tooling.
    """
    print("[DB] Ensuring database schema and tables exist...")
    with engine.connect() as conn:
        conn.execute(text("CREATE SCHEMA IF NOT EXISTS public;"))
        conn.commit()
        
        # Check if alembic_version table exists
        alembic_exists = conn.execute(
            text("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'alembic_version');")
        ).scalar()

    Base.metadata.create_all(bind=engine)
    
    if not alembic_exists:
        try:
            print("[DB] First run detected. Stamping alembic head...")
            from alembic.config import Config
            from alembic import command
            alembic_cfg_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../alembic.ini"))
            if os.path.exists(alembic_cfg_path):
                alembic_cfg = Config(alembic_cfg_path)
                # Need to set sqlalchemy.url so alembic knows which db to stamp
                alembic_cfg.set_main_option("sqlalchemy.url", DATABASE_URL)
                command.stamp(alembic_cfg, "head")
                print("[DB] Alembic head stamped successfully.")
        except Exception as e:
            print(f"[DB] Could not stamp alembic head: {e}")


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
