"""
Bail Reckoner Platform — Authentication Middleware
JWT token creation/validation + FastAPI dependency for protected routes.
"""
from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from api.database import get_db
from services.rbac import Permission, has_permission

# ── JWT Configuration ────────────────────────────────────────────────────

_bearer_scheme = HTTPBearer(auto_error=False)

def _get_secret() -> str:
    return os.getenv("JWT_SECRET_KEY", "dev-secret-change-in-production-please")

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


# ── User Context ─────────────────────────────────────────────────────────

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


# ── FastAPI Dependencies ─────────────────────────────────────────────────

async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer_scheme),
) -> CurrentUser:
    """
    FastAPI dependency that extracts and validates the current user from JWT.
    Use: current_user: CurrentUser = Depends(get_current_user)
    """
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

    # Look up user in database
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
    """
    Like get_current_user but returns None instead of 401 if no token is present.
    Useful for routes that work differently when authenticated.
    """
    if not credentials:
        return None
    try:
        return await get_current_user(request, credentials)
    except HTTPException:
        return None


def require_permission(permission: str | Permission):
    """
    Factory for a FastAPI dependency that checks a specific permission.
    Usage: router.get("/...", dependencies=[Depends(require_permission(Permission.CASE_CREATE))])
    """
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
