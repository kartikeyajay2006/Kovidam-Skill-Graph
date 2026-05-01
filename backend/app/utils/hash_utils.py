import hashlib

def generate_resume_hash(file_bytes: bytes) -> str:
    """
    Generates a SHA256 hash from file bytes for duplicate detection.
    """
    return hashlib.sha256(file_bytes).hexdigest()
