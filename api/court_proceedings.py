"""
NyaySetu Platform — Court Proceedings API Router
Manage hearing records, court orders, and scheduling.
"""
from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from api.access import accessible_case_clause, check_case_access
from api.database import get_db, generate_id, now_iso
from api.middleware import CurrentUser, get_current_user
from services.audit import log_event
from services.notifications import create_notification
from services.rbac import Permission

router = APIRouter(prefix="/api/court-proceedings", tags=["Court Proceedings"])


class ProceedingCreate(BaseModel):
    case_id: str
    hearing_date: str
    hearing_type: str = "regular"  # regular, bail, arguments, evidence, sentencing
    court_name: str = ""
    presiding_officer: str = ""
    summary: str = ""
    order_text: str = ""
    next_date: str = ""


class ProceedingUpdate(BaseModel):
    summary: Optional[str] = None
    order_text: Optional[str] = None
    next_date: Optional[str] = None
    hearing_type: Optional[str] = None


@router.post("")
async def create_proceeding(
    req: ProceedingCreate,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Record a new court proceeding / hearing."""
    current_user.require_permission(Permission.CASE_UPDATE)

    proc_id = generate_id("CRT-")
    now = now_iso()

    with get_db() as conn:
        case = check_case_access(conn, req.case_id, current_user)

        conn.execute(
            """INSERT INTO court_proceedings (id, case_id, hearing_date, hearing_type, court_name,
               presiding_officer, summary, order_text, next_date, created_by, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (proc_id, req.case_id, req.hearing_date, req.hearing_type, req.court_name,
             req.presiding_officer, req.summary, req.order_text, req.next_date or None,
             current_user.id, now),
        )

    log_event(
        "court_proceeding.created",
        user_id=current_user.id,
        user_email=current_user.email,
        user_role=current_user.role_id,
        entity_type="court_proceeding",
        entity_id=proc_id,
        case_id=req.case_id,
    )
    if req.next_date and case["created_by"] != current_user.id:
        create_notification(
            case["created_by"],
            "Court proceeding scheduled",
            f"A court proceeding for case {req.case_id} has a next date of {req.next_date}.",
            link=f"/court-proceedings/{proc_id}",
        )

    return {"message": "Court proceeding recorded", "proceeding_id": proc_id}


@router.get("")
async def list_proceedings(
    case_id: str = "",
    hearing_type: str = "",
    limit: int = 100,
    offset: int = 0,
    current_user: CurrentUser = Depends(get_current_user),
):
    """List court proceedings with filters."""
    current_user.require_permission(Permission.CASE_READ)

    q = """SELECT cp.*, u.full_name as created_by_name, c.title as case_title
           FROM court_proceedings cp
           LEFT JOIN users u ON cp.created_by = u.id
           LEFT JOIN cases c ON cp.case_id = c.id"""
    conds = []
    params = []

    if case_id:
        with get_db() as conn:
            check_case_access(conn, case_id, current_user)
        conds.append("cp.case_id = ?")
        params.append(case_id)
    else:
        access_clause, access_params = accessible_case_clause(current_user)
        if access_clause != "1=1":
            conds.append(f"cp.case_id IN (SELECT c.id FROM cases c WHERE {access_clause})")
            params.extend(access_params)
    if hearing_type:
        conds.append("cp.hearing_type = ?")
        params.append(hearing_type)

    if conds:
        q += " WHERE " + " AND ".join(conds)
    q += " ORDER BY cp.hearing_date DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    with get_db() as conn:
        rows = conn.execute(q, params).fetchall()

    return {"proceedings": [dict(r) for r in rows], "count": len(rows)}


@router.get("/{proceeding_id}")
async def get_proceeding(
    proceeding_id: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Get a single court proceeding."""
    current_user.require_permission(Permission.CASE_READ)

    with get_db() as conn:
        row = conn.execute(
            """SELECT cp.*, u.full_name as created_by_name, c.title as case_title
               FROM court_proceedings cp
               LEFT JOIN users u ON cp.created_by = u.id
               LEFT JOIN cases c ON cp.case_id = c.id
               WHERE cp.id = ?""",
            (proceeding_id,),
        ).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Court proceeding not found")
    with get_db() as conn:
        check_case_access(conn, dict(row)["case_id"], current_user)

    return dict(row)


@router.put("/{proceeding_id}")
async def update_proceeding(
    proceeding_id: str,
    req: ProceedingUpdate,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Update a court proceeding record."""
    current_user.require_permission(Permission.CASE_UPDATE)

    with get_db() as conn:
        row = conn.execute("SELECT * FROM court_proceedings WHERE id = ?", (proceeding_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Court proceeding not found")
        row_dict = dict(row)
        check_case_access(conn, row_dict["case_id"], current_user)
        case = conn.execute(
            "SELECT created_by FROM cases WHERE id = ?",
            (row_dict["case_id"],),
        ).fetchone()

        updates = []
        params = []
        if req.summary is not None:
            updates.append("summary = ?")
            params.append(req.summary)
        if req.order_text is not None:
            updates.append("order_text = ?")
            params.append(req.order_text)
        if req.next_date is not None:
            updates.append("next_date = ?")
            params.append(req.next_date)
        if req.hearing_type is not None:
            updates.append("hearing_type = ?")
            params.append(req.hearing_type)

        if updates:
            params.append(proceeding_id)
            conn.execute(f"UPDATE court_proceedings SET {', '.join(updates)} WHERE id = ?", params)

    if (
        req.next_date
        and req.next_date != row_dict["next_date"]
        and case
        and case["created_by"] != current_user.id
    ):
        create_notification(
            case["created_by"],
            "Court proceeding scheduled",
            f"A court proceeding for case {row_dict['case_id']} has a next date of {req.next_date}.",
            link=f"/court-proceedings/{proceeding_id}",
        )

    return {"message": "Court proceeding updated successfully"}
