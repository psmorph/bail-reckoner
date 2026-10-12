"""
NyaySetu Platform — Authentication Router
Login, registration, token refresh, and user profile endpoints.
"""
from __future__ import annotations

import json
import os
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr

from api.database import generate_id, get_db, now_iso
from api.middleware import (
    CurrentUser,
    create_access_token,
    get_client_ip,
    get_current_user,
    get_optional_user,
)
from services.audit import log_auth_event, log_event
from services.rbac import Permission, can_manage_role, get_role_display_name, get_role_permissions

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


# ── Password Hashing ────────────────────────────────────────────────────

def _hash_password(password: str) -> str:
    from passlib.context import CryptContext
    ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
    return ctx.hash(password)


def _verify_password(plain: str, hashed: str) -> bool:
    from passlib.context import CryptContext
    ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
    return ctx.verify(plain, hashed)


# ── Request / Response Models ────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: str = ""
    role_id: str = "police_officer"
    organization_id: str = ""


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class ProfileResponse(BaseModel):
    id: str
    email: str
    full_name: str
    phone: str
    role_id: str
    role_name: str
    organization_id: str
    organization_name: str
    permissions: list[str]
    is_active: bool


# ── Endpoints ────────────────────────────────────────────────────────────

@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, request: Request):
    """Authenticate user and return JWT token."""
    ip = get_client_ip(request)
    agent = request.headers.get("user-agent", "")

    with get_db() as conn:
        user = conn.execute(
            "SELECT * FROM users WHERE email = ?", (req.email,)
        ).fetchone()

    if not user:
        log_auth_event("login_failed", email=req.email, ip=ip, agent=agent,
                       result="failure", detail=json.dumps({"reason": "user_not_found"}))
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not _verify_password(req.password, user["password_hash"]):
        log_auth_event("login_failed", user_id=user["id"], email=req.email,
                       ip=ip, agent=agent, result="failure",
                       detail=json.dumps({"reason": "invalid_password"}))
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not user["is_active"]:
        log_auth_event("login_blocked", user_id=user["id"], email=req.email,
                       ip=ip, agent=agent, result="failure",
                       detail=json.dumps({"reason": "account_deactivated"}))
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated")

    # Create token
    token = create_access_token({"sub": user["id"], "email": user["email"], "role": user["role_id"]})

    # Update last login
    with get_db() as conn:
        conn.execute("UPDATE users SET last_login = ? WHERE id = ?", (now_iso(), user["id"]))

    # Get organization name
    org_name = ""
    if user["organization_id"]:
        with get_db() as conn:
            org = conn.execute("SELECT name FROM organizations WHERE id = ?",
                               (user["organization_id"],)).fetchone()
            org_name = org["name"] if org else ""

    # Audit
    log_auth_event("login_success", user_id=user["id"], email=user["email"],
                   ip=ip, agent=agent)

    return TokenResponse(
        access_token=token,
        user={
            "id": user["id"],
            "email": user["email"],
            "full_name": user["full_name"],
            "role_id": user["role_id"],
            "role_name": get_role_display_name(user["role_id"]),
            "organization_id": user["organization_id"] or "",
            "organization_name": org_name,
            "permissions": get_role_permissions(user["role_id"]),
        },
    )


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(req: RegisterRequest, request: Request, current_user: Optional[CurrentUser] = Depends(get_optional_user)):
    """Register a new user account."""
    ip = get_client_ip(request)
    allow_public = str(os.getenv("ALLOW_PUBLIC_REGISTRATION", "false")).lower() == "true"

    if current_user is None:
        if not allow_public:
            log_event("user_create_denied", user_id="", user_email=str(req.email), ip_address=ip,
                      result="failure", severity="warning", metadata=json.dumps({"reason": "unauthenticated"}))
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
        role_id = "viewer"
        organization_id = ""
    else:
        current_user.require_permission(Permission.USER_CREATE)
        role_id = req.role_id
        organization_id = req.organization_id or ""

        if role_id == "master_admin":
            log_event("user_create_denied", user_id=current_user.id, user_email=str(req.email),
                      ip_address=ip, result="failure", severity="warning",
                      metadata=json.dumps({"reason": "master_admin_not_allowed"}))
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="master_admin cannot be created via API")

        if not can_manage_role(current_user.role_id, role_id):
            log_event("user_create_denied", user_id=current_user.id, user_email=str(req.email), ip_address=ip,
                      result="failure", severity="warning",
                      metadata=json.dumps({"reason": "role_not_allowed", "requested": role_id, "caller": current_user.role_id}))
            raise HTTPException(status_code=403, detail="You do not have permission to create this role")

        if organization_id and organization_id != current_user.organization_id:
            log_event("user_create_denied", user_id=current_user.id, user_email=str(req.email), ip_address=ip,
                      result="failure", severity="warning",
                      metadata=json.dumps({"reason": "org_mismatch", "requested_org": organization_id, "caller_org": current_user.organization_id}))
            raise HTTPException(status_code=403, detail="You may only create users in your own organization")

    if role_id not in set(__import__('services.rbac', fromlist=['ROLE_PERMISSIONS']).ROLE_PERMISSIONS):
        log_event("user_create_denied", user_id=current_user.id if current_user else "", user_email=str(req.email),
                  ip_address=ip, result="failure", severity="warning", metadata=json.dumps({"reason": "invalid_role", "role_id": role_id}))
        raise HTTPException(status_code=400, detail=f"Invalid role: {role_id}")

    if not req.password or len(req.password) < 12 or not any(ch.isalpha() for ch in req.password) or not any(ch.isdigit() for ch in req.password):
        log_event("user_create_denied", user_id=current_user.id if current_user else "", user_email=str(req.email),
                  ip_address=ip, result="failure", severity="warning", metadata=json.dumps({"reason": "weak_password"}))
        raise HTTPException(status_code=400, detail="Password must be at least 12 characters and contain both letters and digits")

    if organization_id:
        with get_db() as conn:
            org_exists = conn.execute("SELECT id FROM organizations WHERE id = ?", (organization_id,)).fetchone()
            if not org_exists:
                log_event("user_create_denied", user_id=current_user.id if current_user else "", user_email=str(req.email),
                          ip_address=ip, result="failure", severity="warning", metadata=json.dumps({"reason": "unknown_org", "org_id": organization_id}))
                raise HTTPException(status_code=404, detail="Organization not found")

    with get_db() as conn:
        existing = conn.execute("SELECT id FROM users WHERE email = ?", (str(req.email),)).fetchone()
        if existing:
            log_event("user_create_denied", user_id=current_user.id if current_user else "", user_email=str(req.email),
                      ip_address=ip, result="failure", severity="warning", metadata=json.dumps({"reason": "duplicate_email"}))
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user_id = generate_id("USR-")
    password_hash = _hash_password(req.password)

    with get_db() as conn:
        role_exists = conn.execute("SELECT id FROM roles WHERE id = ?", (role_id,)).fetchone()
        if not role_exists:
            conn.execute(
                "INSERT INTO roles (id, name, description, permissions, hierarchy_level) VALUES (?, ?, ?, ?, ?)",
                (role_id, get_role_display_name(role_id), "",
                 json.dumps(get_role_permissions(role_id)), 0),
            )

        conn.execute(
            """INSERT INTO users (id, email, phone, password_hash, full_name, role_id,
               organization_id, is_active, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)""",
            (user_id, str(req.email), req.phone, password_hash, req.full_name,
             role_id, organization_id or None, now_iso(), now_iso()),
        )

    log_event("user_created", user_id=user_id, user_email=str(req.email), user_role=role_id,
              entity_type="user", entity_id=user_id, ip_address=ip, result="success", severity="info",
              metadata=json.dumps({"role_id": role_id, "organization_id": organization_id}))
    log_auth_event("user_registered", user_id=user_id, email=str(req.email), ip=ip)

    return {"message": "Account created successfully", "user_id": user_id}


@router.get("/me", response_model=ProfileResponse)
async def get_profile(current_user: CurrentUser = Depends(get_current_user)):
    """Get the current user's profile."""
    org_name = ""
    if current_user.organization_id:
        with get_db() as conn:
            org = conn.execute("SELECT name FROM organizations WHERE id = ?",
                               (current_user.organization_id,)).fetchone()
            org_name = org["name"] if org else ""

    with get_db() as conn:
        user = conn.execute("SELECT phone FROM users WHERE id = ?", (current_user.id,)).fetchone()

    return ProfileResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        phone=user["phone"] if user else "",
        role_id=current_user.role_id,
        role_name=get_role_display_name(current_user.role_id),
        organization_id=current_user.organization_id,
        organization_name=org_name,
        permissions=get_role_permissions(current_user.role_id),
        is_active=current_user.is_active,
    )


@router.post("/logout")
async def logout(request: Request, current_user: CurrentUser = Depends(get_current_user)):
    """Logout (audit only — JWT is stateless)."""
    ip = get_client_ip(request)
    log_auth_event("logout", user_id=current_user.id, email=current_user.email, ip=ip)
    return {"message": "Logged out successfully"}


@router.get("/roles")
async def list_roles():
    """Return available roles for registration."""
    from services.rbac import ROLE_PERMISSIONS, ROLE_HIERARCHY
    return {
        "roles": [
            {
                "id": role_id,
                "name": get_role_display_name(role_id),
                "hierarchy_level": ROLE_HIERARCHY.get(role_id, 0),
                "permission_count": len(perms),
            }
            for role_id, perms in ROLE_PERMISSIONS.items()
        ]
    }
