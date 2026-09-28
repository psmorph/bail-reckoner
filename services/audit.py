"""
NyaySetu Platform — Audit Logging Service
Append-only audit trail for all security-sensitive actions.
"""
from __future__ import annotations

from api.database import get_db, generate_id, now_iso


def log_event(
    action: str,
    *,
    user_id: str = "",
    user_email: str = "",
    user_role: str = "",
    entity_type: str = "",
    entity_id: str = "",
    case_id: str = "",
    document_id: str = "",
    ip_address: str = "",
    user_agent: str = "",
    result: str = "success",
    severity: str = "info",
    metadata: str = "{}",
):
    """Record an audit event. This is append-only — no updates or deletes."""
    event_id = generate_id("AUD-")
    with get_db() as conn:
        conn.execute(
            """INSERT INTO audit_logs
               (id, user_id, user_email, user_role, action, entity_type, entity_id,
                case_id, document_id, ip_address, user_agent, result, severity, metadata, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                event_id, user_id, user_email, user_role, action,
                entity_type, entity_id, case_id, document_id,
                ip_address, user_agent, result, severity, metadata,
                now_iso(),
            ),
        )
    return event_id


def log_auth_event(action: str, *, user_id: str = "", email: str = "",
                   ip: str = "", agent: str = "", result: str = "success", detail: str = "{}"):
    """Shortcut for authentication-related audit events."""
    severity = "warning" if result == "failure" else "info"
    return log_event(
        action,
        user_id=user_id,
        user_email=email,
        entity_type="auth",
        ip_address=ip,
        user_agent=agent,
        result=result,
        severity=severity,
        metadata=detail,
    )


def log_document_event(action: str, *, user_id: str, user_role: str,
                       document_id: str, case_id: str = "", ip: str = "", detail: str = "{}"):
    """Shortcut for document-related audit events."""
    return log_event(
        action,
        user_id=user_id,
        user_role=user_role,
        entity_type="document",
        entity_id=document_id,
        case_id=case_id,
        document_id=document_id,
        ip_address=ip,
        metadata=detail,
    )


def log_case_event(action: str, *, user_id: str, user_role: str,
                   case_id: str, ip: str = "", detail: str = "{}"):
    """Shortcut for case-related audit events."""
    return log_event(
        action,
        user_id=user_id,
        user_role=user_role,
        entity_type="case",
        entity_id=case_id,
        case_id=case_id,
        ip_address=ip,
        metadata=detail,
    )
