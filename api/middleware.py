"""
NyaySetu Platform — Authentication Middleware
JWT token creation/validation + FastAPI dependency for protected routes.
"""
from __future__ import annotations

import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from api.database import get_db
from services.rbac import Permission, has_permission

_bearer_scheme = HTTPBearer(auto_error=False)

DEV_DEFAULT_SECRET = "dev-secret-change-in-production-please"


def validate_jwt_secret() -> str:
    """Validate that the JWT secret is present and strong enough for startup."""
    app_env = os.getenv("APP_ENV", "production")
    secret = os.getenv("JWT_SECRET_KEY")
    secret_value = secret.strip() if isinstance(secret, str) else ""

    if app_env == "development":
        if not secret_value:
            secret_value = secrets.token_urlsafe(32)
            os.environ["JWT_SECRET_KEY"] = secret_value
            print("WARNING: JWT_SECRET_KEY was missing in development mode; a per-process secret was generated.")
        if len(secret_value) < 32 or secret_value == DEV_DEFAULT_SECRET:
            raise RuntimeError("JWT_SECRET_KEY must be at least 32 characters long and must not use the development default.")
        return secret_value

    if not secret_value or len(secret_value) < 32 or secret_value == DEV_DEFAULT_SECRET:
        raise RuntimeError("JWT_SECRET_KEY is required in production. Set it in the environment or .env file.")
    return secret_value


def _get_secret() -> str:
    return validate_jwt_secret()


def _get_algorithm() -> str:
    return os.getenv("JWT_ALGORITHM", "HS256")


def _get_expire_minutes() -> int:
    return int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "60"))


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a signed JWT access token."""
    import jwt as pyjwt

    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=_get_expire_minutes()))
    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc)})
    return pyjwt.encode(to_encode, _get_secret(), algorithm=_get_algorithm())


def decode_token(token: str) -> dict:
    """Decode and validate a JWT token."""
    import jwt as pyjwt

    try:
        payload = pyjwt.decode(token, _get_secret(), algorithms=[_get_algorithm()])
        return payload
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has expired")
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


class CurrentUser:
    """Represents the authenticated user extracted from JWT."""

    def __init__(self, user_id: str, email: str, role_id: str, full_name: str,
                 organization_id: str = "", is_active: bool = True):
        self.id = user_id
        self.email = email
        self.role_id = role_id
        self.full_name = full_name
        self.organization_id = organization_id
        self.is_active = is_active

    def has_permission(self, permission: str | Permission) -> bool:
        return has_permission(self.role_id, permission)

    def require_permission(self, permission: str | Permission):
        if not self.has_permission(permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions: {permission}",
            )


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer_scheme),
) -> CurrentUser:
    """FastAPI dependency that extracts and validates the current user from JWT."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_token(credentials.credentials)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    with get_db() as conn:
        user = conn.execute(
            "SELECT id, email, role_id, full_name, organization_id, is_active FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    if not user["is_active"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated")

    return CurrentUser(
        user_id=user["id"],
        email=user["email"],
        role_id=user["role_id"],
        full_name=user["full_name"],
        organization_id=user["organization_id"] or "",
        is_active=bool(user["is_active"]),
    )


async def get_optional_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer_scheme),
) -> Optional[CurrentUser]:
    """Return None if the user is not authenticated."""
    if not credentials:
        return None
    try:
        return await get_current_user(request, credentials)
    except HTTPException:
        return None


def require_permission(permission: str | Permission):
    """Factory for a FastAPI dependency that checks a specific permission."""
    async def _check(current_user: CurrentUser = Depends(get_current_user)):
        current_user.require_permission(permission)
        return current_user
    return _check


def get_client_ip(request: Request) -> str:
    """Extract client IP from request."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"
