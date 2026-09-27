"""
Bail Reckoner Platform — Audit Log Router
Query and filter the append-only audit trail.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from api.database import get_db
from api.middleware import CurrentUser, get_current_user
from services.rbac import Permission

router = APIRouter(prefix="/api/audit", tags=["Audit"])


@router.get("")
async def get_audit_logs(
    action: str = "",
    user_id: str = "",
    case_id: str = "",
    document_id: str = "",
    severity: str = "",
    entity_type: str = "",
    limit: int = 100,
    offset: int = 0,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Query audit logs with filters. Requires audit:read permission."""
    current_user.require_permission(Permission.AUDIT_READ)

    q = """SELECT a.*, u.full_name as user_name FROM audit_logs a
           LEFT JOIN users u ON a.user_id = u.id"""
    conds = []
    params = []

    if action:
        conds.append("a.action LIKE ?")
        params.append(f"%{action}%")
    if user_id:
        conds.append("a.user_id = ?")
        params.append(user_id)
    if case_id:
        conds.append("a.case_id = ?")
        params.append(case_id)
    if document_id:
        conds.append("a.document_id = ?")
        params.append(document_id)
    if severity:
        conds.append("a.severity = ?")
        params.append(severity)
    if entity_type:
        conds.append("a.entity_type = ?")
        params.append(entity_type)

    if conds:
        q += " WHERE " + " AND ".join(conds)
    q += " ORDER BY a.created_at DESC"
    q += f" LIMIT {limit} OFFSET {offset}"

    with get_db() as conn:
        rows = conn.execute(q, params).fetchall()
        count_q = "SELECT COUNT(*) FROM audit_logs a"
        if conds:
            count_q += " WHERE " + " AND ".join(conds)
        total = conn.execute(count_q, params).fetchone()[0]

    return {"logs": [dict(r) for r in rows], "total": total}


@router.get("/security")
async def get_security_events(
    limit: int = 50,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Get security-relevant events for the security dashboard."""
    current_user.require_permission(Permission.AUDIT_READ)

    with get_db() as conn:
        # Failed logins
        failed_logins = conn.execute(
            "SELECT * FROM audit_logs WHERE action LIKE '%failed%' OR result = 'failure' "
            "ORDER BY created_at DESC LIMIT ?", (limit,)
        ).fetchall()

        # Integrity violations
        violations = conn.execute(
            "SELECT * FROM audit_logs WHERE action LIKE '%integrity%' OR action LIKE '%violation%' "
            "ORDER BY created_at DESC LIMIT ?", (limit,)
        ).fetchall()

        # Permission changes
        perm_changes = conn.execute(
            "SELECT * FROM audit_logs WHERE action LIKE '%permission%' OR action LIKE '%role%' OR action LIKE '%deactivat%' "
            "ORDER BY created_at DESC LIMIT ?", (limit,)
        ).fetchall()

        # Recent critical events
        critical = conn.execute(
            "SELECT * FROM audit_logs WHERE severity IN ('critical', 'warning') "
            "ORDER BY created_at DESC LIMIT ?", (limit,)
        ).fetchall()

        # Stats
        total_events = conn.execute("SELECT COUNT(*) FROM audit_logs").fetchone()[0]
        today_events = conn.execute(
            "SELECT COUNT(*) FROM audit_logs WHERE date(created_at) = date('now')"
        ).fetchone()[0]
        failure_count = conn.execute(
            "SELECT COUNT(*) FROM audit_logs WHERE result = 'failure'"
        ).fetchone()[0]

    return {
        "failed_logins": [dict(r) for r in failed_logins],
        "integrity_violations": [dict(r) for r in violations],
        "permission_changes": [dict(r) for r in perm_changes],
        "critical_events": [dict(r) for r in critical],
        "stats": {
            "total_events": total_events,
            "today_events": today_events,
            "failure_count": failure_count,
        },
    }
