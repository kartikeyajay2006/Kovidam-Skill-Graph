import os
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

# Load database URL from environment variable, with a localhost default for development fallback
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/kovidam")

# Create engine with production-ready connection pooling settings
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,  # Proactively checks for disconnected connections
    pool_size=10,
    max_overflow=20
)

# Create a configured "Session" class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency that provides a database session.
    Ensures the session is safely closed after the request is completed.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def test_connection():
    """
    Test function to verify the database connection locally.
    """
    print("[DB] Attempting connection test...")
    db = SessionLocal()
    print(db)
    db.close()
    print("[DB] Connection test complete, session closed.")
