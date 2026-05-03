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
    Base.metadata.create_all(bind=engine)


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
