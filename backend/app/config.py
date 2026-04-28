from pathlib import Path

from dotenv import load_dotenv


BACKEND_ROOT = Path(__file__).resolve().parents[1]
ENV_FILE = BACKEND_ROOT / ".env"
EXTRACTED_RESUMES_DIR = BACKEND_ROOT / "data" / "extracted_resumes"


def load_environment(env_path: Path | None = None, *, override: bool = False) -> bool:
    target = Path(env_path) if env_path is not None else ENV_FILE
    if not target.exists():
        return False
    load_dotenv(target, override=override)
    return True


load_environment()
