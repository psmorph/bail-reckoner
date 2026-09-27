"""
Bail Reckoner Platform — RBAC Service
Role-Based Access Control with hierarchical permissions.
"""
from __future__ import annotations

from enum import Enum
from typing import Optional


class Permission(str, Enum):
    """Granular permissions for the platform."""
    # System
    SYSTEM_ADMIN = "system:admin"
    SYSTEM_AUDIT = "system:audit"
    SYSTEM_SECURITY = "system:security"

    # Users
    USER_CREATE = "user:create"
    USER_READ = "user:read"
    USER_UPDATE = "user:update"
    USER_DEACTIVATE = "user:deactivate"

    # Cases
    CASE_CREATE = "case:create"
    CASE_READ = "case:read"
    CASE_UPDATE = "case:update"
    CASE_DELETE = "case:delete"
    CASE_TRANSFER = "case:transfer"
    CASE_SEARCH = "case:search"

    # Documents
    DOC_UPLOAD = "doc:upload"
    DOC_READ = "doc:read"
    DOC_DOWNLOAD = "doc:download"
    DOC_DELETE = "doc:delete"
    DOC_VERIFY = "doc:verify"

    # Evidence
    EVIDENCE_CREATE = "evidence:create"
    EVIDENCE_READ = "evidence:read"
    EVIDENCE_TRANSFER = "evidence:transfer"

    # Investigation
    INVESTIGATION_CREATE = "investigation:create"
    INVESTIGATION_READ = "investigation:read"
    INVESTIGATION_UPDATE = "investigation:update"

    # Forensic
    FORENSIC_CREATE = "forensic:create"
    FORENSIC_READ = "forensic:read"
    FORENSIC_UPDATE = "forensic:update"

    # Court
    COURT_CREATE = "court:create"
    COURT_READ = "court:read"
    COURT_UPDATE = "court:update"

    # Bail Reckoner
    BAIL_ANALYZE = "bail:analyze"
    BAIL_READ = "bail:read"

    # Blockchain
    BLOCKCHAIN_READ = "blockchain:read"
    BLOCKCHAIN_VERIFY = "blockchain:verify"

    # Audit
    AUDIT_READ = "audit:read"

    # Notifications
    NOTIFICATION_READ = "notification:read"


# ── Role Definitions ─────────────────────────────────────────────────────

ROLE_PERMISSIONS: dict[str, list[str]] = {
    "master_admin": [p.value for p in Permission],  # All permissions

    "police_admin": [
        Permission.CASE_CREATE, Permission.CASE_READ, Permission.CASE_UPDATE,
        Permission.CASE_SEARCH, Permission.CASE_TRANSFER,
        Permission.DOC_UPLOAD, Permission.DOC_READ, Permission.DOC_DOWNLOAD, Permission.DOC_VERIFY,
        Permission.EVIDENCE_CREATE, Permission.EVIDENCE_READ, Permission.EVIDENCE_TRANSFER,
        Permission.INVESTIGATION_READ,
        Permission.AUDIT_READ, Permission.BLOCKCHAIN_READ, Permission.BLOCKCHAIN_VERIFY,
        Permission.NOTIFICATION_READ,
        Permission.USER_READ, Permission.USER_CREATE, Permission.USER_UPDATE,
    ],

    "police_officer": [
        Permission.CASE_CREATE, Permission.CASE_READ, Permission.CASE_UPDATE,
        Permission.CASE_SEARCH,
        Permission.DOC_UPLOAD, Permission.DOC_READ, Permission.DOC_DOWNLOAD, Permission.DOC_VERIFY,
        Permission.EVIDENCE_CREATE, Permission.EVIDENCE_READ,
        Permission.NOTIFICATION_READ,
        Permission.BLOCKCHAIN_READ, Permission.BLOCKCHAIN_VERIFY,
    ],

    "investigator": [
        Permission.CASE_READ, Permission.CASE_SEARCH,
        Permission.DOC_UPLOAD, Permission.DOC_READ, Permission.DOC_DOWNLOAD, Permission.DOC_VERIFY,
        Permission.EVIDENCE_CREATE, Permission.EVIDENCE_READ, Permission.EVIDENCE_TRANSFER,
        Permission.INVESTIGATION_CREATE, Permission.INVESTIGATION_READ, Permission.INVESTIGATION_UPDATE,
        Permission.NOTIFICATION_READ,
        Permission.BLOCKCHAIN_READ, Permission.BLOCKCHAIN_VERIFY,
    ],

    "forensic_officer": [
        Permission.CASE_READ, Permission.CASE_SEARCH,
        Permission.DOC_UPLOAD, Permission.DOC_READ, Permission.DOC_DOWNLOAD,
        Permission.EVIDENCE_READ,
        Permission.FORENSIC_CREATE, Permission.FORENSIC_READ, Permission.FORENSIC_UPDATE,
        Permission.BLOCKCHAIN_READ, Permission.BLOCKCHAIN_VERIFY,
        Permission.NOTIFICATION_READ,
    ],

    "court_admin": [
        Permission.CASE_READ, Permission.CASE_SEARCH,
        Permission.DOC_READ, Permission.DOC_DOWNLOAD, Permission.DOC_VERIFY,
        Permission.EVIDENCE_READ,
        Permission.INVESTIGATION_READ,
        Permission.FORENSIC_READ,
        Permission.COURT_CREATE, Permission.COURT_READ, Permission.COURT_UPDATE,
        Permission.BAIL_ANALYZE, Permission.BAIL_READ,
        Permission.BLOCKCHAIN_READ, Permission.BLOCKCHAIN_VERIFY,
        Permission.AUDIT_READ,
        Permission.NOTIFICATION_READ,
    ],

    "court_officer": [
        Permission.CASE_READ, Permission.CASE_SEARCH,
        Permission.DOC_READ, Permission.DOC_DOWNLOAD, Permission.DOC_VERIFY,
        Permission.EVIDENCE_READ,
        Permission.INVESTIGATION_READ,
        Permission.FORENSIC_READ,
        Permission.COURT_CREATE, Permission.COURT_READ,
        Permission.BAIL_ANALYZE, Permission.BAIL_READ,
        Permission.BLOCKCHAIN_READ, Permission.BLOCKCHAIN_VERIFY,
        Permission.NOTIFICATION_READ,
    ],

    "auditor": [
        Permission.CASE_READ, Permission.CASE_SEARCH,
        Permission.DOC_READ,
        Permission.EVIDENCE_READ,
        Permission.AUDIT_READ,
        Permission.BLOCKCHAIN_READ, Permission.BLOCKCHAIN_VERIFY,
        Permission.NOTIFICATION_READ,
        Permission.SYSTEM_AUDIT,
    ],
}

ROLE_HIERARCHY: dict[str, int] = {
    "master_admin": 100,
    "police_admin": 80,
    "court_admin": 80,
    "police_officer": 50,
    "investigator": 50,
    "forensic_officer": 50,
    "court_officer": 50,
    "auditor": 40,
}


def has_permission(role_id: str, permission: str | Permission) -> bool:
    """Check if a role has a specific permission."""
    perm_value = permission.value if isinstance(permission, Permission) else permission
    perms = ROLE_PERMISSIONS.get(role_id, [])
    return perm_value in perms


def get_role_permissions(role_id: str) -> list[str]:
    """Get all permissions for a role."""
    return ROLE_PERMISSIONS.get(role_id, [])


def get_hierarchy_level(role_id: str) -> int:
    """Get hierarchy level for a role (higher = more authority)."""
    return ROLE_HIERARCHY.get(role_id, 0)


def can_manage_role(manager_role: str, target_role: str) -> bool:
    """Check if a manager role can manage users of a target role."""
    return get_hierarchy_level(manager_role) > get_hierarchy_level(target_role)


def get_role_display_name(role_id: str) -> str:
    """Human-readable role name."""
    names = {
        "master_admin": "Master Admin",
        "police_admin": "Police Admin",
        "police_officer": "Police Officer",
        "investigator": "Investigator",
        "forensic_officer": "Forensic Officer",
        "court_admin": "Court Admin",
        "court_officer": "Court Officer",
        "auditor": "Auditor",
    }
    return names.get(role_id, role_id.replace("_", " ").title())
