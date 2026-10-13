"""
NyaySetu Platform — Investigation API Router
Manage police investigation entries, case diaries, and findings.
"""
from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from api.access import accessible_case_clause, check_case_access
from api.database import get_db, generate_id, now_iso
from api.middleware import CurrentUser, get_current_user
from services.audit import log_event
from services.rbac import Permission

router = APIRouter(prefix="/api/investigations", tags=["Investigation"])


class InvestigationCreate(BaseModel):
    case_id: str
    entry_type: str = "diary"  # diary, witness_statement, progress_report, search_seizure
    title: str
    content: str = ""
    findings: str = ""


class InvestigationUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    findings: Optional[str] = None
    entry_type: Optional[str] = None


@router.post("", status_code=201)
async def create_investigation_entry(
    req: InvestigationCreate,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Create a new investigation diary entry. Requires investigation:create permission."""
    current_user.require_permission(Permission.INVESTIGATION_CREATE)

    entry_id = generate_id("INV-")
    now = now_iso()

    with get_db() as conn:
        check_case_access(conn, req.case_id, current_user)

        conn.execute(
            """INSERT INTO investigations (id, case_id, investigator_id, entry_type, title, content, findings, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (entry_id, req.case_id, current_user.id, req.entry_type, req.title, req.content, req.findings, now, now),
        )

    log_event(
        "investigation.created",
        user_id=current_user.id,
        user_email=current_user.email,
        user_role=current_user.role_id,
        entity_type="investigation",
        entity_id=entry_id,
        case_id=req.case_id,
    )

    return {"message": "Investigation entry created successfully", "id": entry_id}


@router.get("")
async def list_investigation_entries(
    case_id: str = "",
    entry_type: str = "",
    limit: int = 100,
    offset: int = 0,
    current_user: CurrentUser = Depends(get_current_user),
):
    """List investigation entries with filters. Requires investigation:read permission."""
    current_user.require_permission(Permission.INVESTIGATION_READ)

    q = """SELECT i.*, u.full_name as investigator_name, c.title as case_title
           FROM investigations i
           LEFT JOIN users u ON i.investigator_id = u.id
           LEFT JOIN cases c ON i.case_id = c.id"""
    conds = []
    params = []

    if case_id:
        with get_db() as conn:
            check_case_access(conn, case_id, current_user)
        conds.append("i.case_id = ?")
        params.append(case_id)
    else:
        access_clause, access_params = accessible_case_clause(current_user)
        if access_clause != "1=1":
            conds.append(f"i.case_id IN (SELECT c.id FROM cases c WHERE {access_clause})")
            params.extend(access_params)
    if entry_type:
        conds.append("i.entry_type = ?")
        params.append(entry_type)

    if conds:
        q += " WHERE " + " AND ".join(conds)
    q += " ORDER BY i.created_at DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    with get_db() as conn:
        rows = conn.execute(q, params).fetchall()

    return {"entries": [dict(r) for r in rows], "count": len(rows)}


@router.get("/{id}")
async def get_investigation_entry(
    id: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Get single investigation entry. Requires investigation:read permission."""
    current_user.require_permission(Permission.INVESTIGATION_READ)

    with get_db() as conn:
        row = conn.execute(
            """SELECT i.*, u.full_name as investigator_name, c.title as case_title
               FROM investigations i
               LEFT JOIN users u ON i.investigator_id = u.id
               LEFT JOIN cases c ON i.case_id = c.id
               WHERE i.id = ?""",
            (id,),
        ).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Investigation entry not found")
    with get_db() as conn:
        check_case_access(conn, dict(row)["case_id"], current_user)

    return dict(row)


@router.put("/{id}")
async def update_investigation_entry(
    id: str,
    req: InvestigationUpdate,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Update an investigation entry. Requires investigation:update permission."""
    current_user.require_permission(Permission.INVESTIGATION_UPDATE)

    with get_db() as conn:
        row = conn.execute("SELECT * FROM investigations WHERE id = ?", (id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Investigation entry not found")
        check_case_access(conn, dict(row)["case_id"], current_user)

        updates = []
        params = []
        if req.title is not None:
            updates.append("title = ?")
            params.append(req.title)
        if req.content is not None:
            updates.append("content = ?")
            params.append(req.content)
        if req.findings is not None:
            updates.append("findings = ?")
            params.append(req.findings)
        if req.entry_type is not None:
            updates.append("entry_type = ?")
            params.append(req.entry_type)

        if updates:
            now = now_iso()
            updates.append("updated_at = ?")
            params.append(now)
            params.append(id)
            conn.execute(f"UPDATE investigations SET {', '.join(updates)} WHERE id = ?", params)

    return {"message": "Investigation entry updated successfully"}
