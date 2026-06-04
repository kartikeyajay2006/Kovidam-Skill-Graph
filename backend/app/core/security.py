import os
from dataclasses import dataclass
from typing import Any

import jwt
from fastapi import HTTPException, Request, status
from jwt import PyJWKClient


@dataclass(frozen=True)
class AuthContext:
    user_id: str
    tenant_id: str
    role: str
    claims: dict[str, Any]


AUTH_REQUIRED = os.getenv("AUTH_REQUIRED", "true").lower() == "true"
JWT_SECRET = os.getenv("AUTH_JWT_SECRET", "change-me")
JWT_ALGORITHM = os.getenv("AUTH_JWT_ALGORITHM", "HS256")
AUTH_DEFAULT_TENANT = os.getenv("AUTH_DEFAULT_TENANT", "default")
FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", "").strip()
ADMIN_EMAILS = {
    email.strip().lower()
    for email in os.getenv("ADMIN_EMAILS", "admin@kovidam.co.in").split(",")
    if email.strip()
}
FIREBASE_JWKS_URL = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
_firebase_jwk_client = PyJWKClient(FIREBASE_JWKS_URL)


def _decode_bearer_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError:
        # Fall back to Firebase ID token verification.
        if not FIREBASE_PROJECT_ID:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token",
            )
        try:
            signing_key = _firebase_jwk_client.get_signing_key_from_jwt(token)
            claims = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256"],
                audience=FIREBASE_PROJECT_ID,
                issuer=f"https://securetoken.google.com/{FIREBASE_PROJECT_ID}",
            )
            return claims
        except jwt.PyJWTError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token",
            ) from exc


def authenticate_request(request: Request) -> AuthContext:
    auth_header = request.headers.get("authorization", "").strip()
    if not auth_header.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token",
        )
    token = auth_header.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Empty bearer token",
        )

    claims = _decode_bearer_token(token)
    user_id = str(claims.get("sub") or "").strip()
    tenant_id = str(claims.get("tenant_id") or claims.get("firebase", {}).get("tenant") or AUTH_DEFAULT_TENANT).strip()
    role = str(claims.get("role") or "viewer").strip().lower()
    email = str(claims.get("email") or "").strip().lower()

    if email and email in ADMIN_EMAILS:
        role = "admin"

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token must include sub",
        )

    return AuthContext(
        user_id=user_id,
        tenant_id=tenant_id,
        role=role,
        claims=claims,
    )
