"""
NyaySetu Platform — Case Management Router
Full CRUD for cases with RBAC enforcement and audit logging.
"""
from __future__ import annotations

import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel

from api.database import generate_case_id, get_db, generate_id, now_iso
from api.middleware import CurrentUser, get_current_user, get_client_ip
from services.audit import log_case_event
from services.rbac import Permission

router = APIRouter(prefix="/api/cases", tags=["Cases"])


# ── Request Models ───────────────────────────────────────────────────────

class CaseCreateRequest(BaseModel):
    fir_number: str = ""
    title: str
    description: str = ""
    case_type: str = "criminal"
    sections: str = ""
    special_laws: str = ""
    police_station: str = ""
    district: str = ""
    state: str = ""
    accused_name: str = ""
    accused_details: str = "{}"
    complainant_name: str = ""
    priority: str = "normal"


class CaseUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    sections: Optional[str] = None
    special_laws: Optional[str] = None
    accused_name: Optional[str] = None
    accused_details: Optional[str] = None
    complainant_name: Optional[str] = None
    priority: Optional[str] = None
    assigned_investigator: Optional[str] = None
    assigned_forensic: Optional[str] = None


class CaseTransferRequest(BaseModel):
    to_org: str
    reason: str = ""


# ── Helpers ──────────────────────────────────────────────────────────────

def _case_to_dict(row) -> dict:
    """Convert a sqlite3.Row to a dict with computed fields."""
    d = dict(row)
    return d


def _check_case_access(conn, case_id: str, user: CurrentUser) -> dict:
    """Check user has access to a case and return it."""
    case = conn.execute("SELECT * FROM cases WHERE id = ?", (case_id,)).fetchone()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    # Master admin and auditor can see all cases
    if user.role_id in ("master_admin", "auditor"):
        return dict(case)

    # Users can see cases in their organization or assigned to them
    case_dict = dict(case)
    org_match = case_dict.get("organization_id") == user.organization_id
    creator_match = case_dict.get("created_by") == user.id
    investigator_match = case_dict.get("assigned_investigator") == user.id
    forensic_match = case_dict.get("assigned_forensic") == user.id

    # Court users can see cases that have court proceedings or documents they uploaded
    is_court = user.role_id in ("court_admin", "court_officer")

    if not (org_match or creator_match or investigator_match or forensic_match or is_court):
        raise HTTPException(status_code=403, detail="Access denied to this case")

    return case_dict


# ── Endpoints ────────────────────────────────────────────────────────────

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_case(
    req: CaseCreateRequest,
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Create a new case. Requires case:create permission."""
    current_user.require_permission(Permission.CASE_CREATE)

    case_id = generate_case_id()
    ip = get_client_ip(request)
    now = now_iso()

    with get_db() as conn:
        conn.execute(
            """INSERT INTO cases (id, fir_number, title, description, status, case_type,
               sections, special_laws, police_station, district, state,
               accused_name, accused_details, complainant_name,
               created_by, organization_id, priority, created_at, updated_at)
               VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                case_id, req.fir_number, req.title, req.description,
                req.case_type, req.sections, req.special_laws,
                req.police_station, req.district, req.state,
                req.accused_name, req.accused_details, req.complainant_name,
                current_user.id, current_user.organization_id,
                req.priority, now, now,
            ),
        )

    log_case_event("case_created", user_id=current_user.id,
                   user_role=current_user.role_id, case_id=case_id, ip=ip,
                   detail=json.dumps({"title": req.title, "fir": req.fir_number}))

    return {"message": "Case created", "case_id": case_id}


@router.get("")
async def list_cases(
    status_filter: str = Query("", alias="status"),
    search: str = "",
    priority: str = "",
    limit: int = 50,
    offset: int = 0,
    current_user: CurrentUser = Depends(get_current_user),
):
    """List cases visible to the current user. Respects RBAC."""
    current_user.require_permission(Permission.CASE_READ)

    with get_db() as conn:
        q = "SELECT c.*, u.full_name as creator_name, o.name as org_name FROM cases c"
        q += " LEFT JOIN users u ON c.created_by = u.id"
        q += " LEFT JOIN organizations o ON c.organization_id = o.id"
        conds = []
        params = []

        # RBAC filtering
        if current_user.role_id not in ("master_admin", "auditor"):
            if current_user.role_id in ("court_admin", "court_officer"):
                # Court users see all cases (read-only across orgs for judicial review)
                pass
            else:
                # Other users see cases in their org or assigned to them
                conds.append(
                    "(c.organization_id = ? OR c.created_by = ? OR c.assigned_investigator = ? OR c.assigned_forensic = ?)"
                )
                params.extend([current_user.organization_id, current_user.id,
                               current_user.id, current_user.id])

        if status_filter:
            conds.append("c.status = ?")
            params.append(status_filter)
        if priority:
            conds.append("c.priority = ?")
            params.append(priority)
        if search:
            conds.append(
                "(c.id LIKE ? OR c.title LIKE ? OR c.fir_number LIKE ? OR c.accused_name LIKE ? OR c.sections LIKE ?)"
            )
            params.extend([f"%{search}%"] * 5)

        if conds:
            q += " WHERE " + " AND ".join(conds)
        q += " ORDER BY c.updated_at DESC"
        q += f" LIMIT {limit} OFFSET {offset}"

        rows = conn.execute(q, params).fetchall()

        # Get total count
        count_q = "SELECT COUNT(*) FROM cases c"
        if conds:
            count_q += " WHERE " + " AND ".join(conds)
        total = conn.execute(count_q, params).fetchone()[0]

    return {
        "cases": [dict(r) for r in rows],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/stats")
async def case_stats(current_user: CurrentUser = Depends(get_current_user)):
    """Get case statistics for dashboard."""
    current_user.require_permission(Permission.CASE_READ)

    with get_db() as conn:
        # Build RBAC filter
        where = ""
        params = []
        if current_user.role_id not in ("master_admin", "auditor", "court_admin", "court_officer"):
            where = "WHERE (organization_id = ? OR created_by = ? OR assigned_investigator = ? OR assigned_forensic = ?)"
            params = [current_user.organization_id, current_user.id, current_user.id, current_user.id]

        total = conn.execute(f"SELECT COUNT(*) FROM cases {where}", params).fetchone()[0]
        active = conn.execute(f"SELECT COUNT(*) FROM cases {where} {'AND' if where else 'WHERE'} status = 'active'",
                              params).fetchone()[0]
        closed = conn.execute(f"SELECT COUNT(*) FROM cases {where} {'AND' if where else 'WHERE'} status = 'closed'",
                              params).fetchone()[0]

        doc_count = conn.execute("SELECT COUNT(*) FROM documents").fetchone()[0]
        evidence_count = conn.execute("SELECT COUNT(*) FROM evidence").fetchone()[0]

        # Recent cases
        recent_q = f"SELECT id, title, status, priority, created_at FROM cases {where} ORDER BY created_at DESC LIMIT 5"
        recent = conn.execute(recent_q, params).fetchall()

    return {
        "total_cases": total,
        "active_cases": active,
        "closed_cases": closed,
        "document_count": doc_count,
        "evidence_count": evidence_count,
        "recent_cases": [dict(r) for r in recent],
    }


@router.get("/{case_id}")
async def get_case(
    case_id: str,
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Get full case details. Checks RBAC access."""
    current_user.require_permission(Permission.CASE_READ)
    ip = get_client_ip(request)

    with get_db() as conn:
        case = _check_case_access(conn, case_id, current_user)

        # Get related data
        documents = conn.execute(
            "SELECT * FROM documents WHERE case_id = ? AND is_deleted = 0 ORDER BY created_at DESC",
            (case_id,),
        ).fetchall()

        evidence_items = conn.execute(
            "SELECT * FROM evidence WHERE case_id = ? ORDER BY created_at DESC",
            (case_id,),
        ).fetchall()

        investigations = conn.execute(
            "SELECT i.*, u.full_name as investigator_name FROM investigations i "
            "LEFT JOIN users u ON i.investigator_id = u.id "
            "WHERE i.case_id = ? ORDER BY i.created_at DESC",
            (case_id,),
        ).fetchall()

        forensic_reports_rows = conn.execute(
            "SELECT f.*, u.full_name as officer_name FROM forensic_reports f "
            "LEFT JOIN users u ON f.officer_id = u.id "
            "WHERE f.case_id = ? ORDER BY f.created_at DESC",
            (case_id,),
        ).fetchall()

        court_proc = conn.execute(
            "SELECT * FROM court_proceedings WHERE case_id = ? ORDER BY hearing_date DESC",
            (case_id,),
        ).fetchall()

        bail_analyses_rows = conn.execute(
            "SELECT * FROM bail_analyses WHERE case_id = ? ORDER BY created_at DESC",
            (case_id,),
        ).fetchall()

        blockchain = conn.execute(
            "SELECT * FROM blockchain_records WHERE case_id = ? ORDER BY timestamp DESC",
            (case_id,),
        ).fetchall()

        audit = conn.execute(
            "SELECT * FROM audit_logs WHERE case_id = ? ORDER BY created_at DESC LIMIT 50",
            (case_id,),
        ).fetchall()

        # Get creator info
        creator = conn.execute(
            "SELECT full_name, role_id FROM users WHERE id = ?",
            (case.get("created_by", ""),),
        ).fetchone()

        org = conn.execute(
            "SELECT name FROM organizations WHERE id = ?",
            (case.get("organization_id", ""),),
        ).fetchone()

    log_case_event("case_viewed", user_id=current_user.id,
                   user_role=current_user.role_id, case_id=case_id, ip=ip)

    return {
        "case": case,
        "creator_name": creator["full_name"] if creator else "",
        "creator_role": creator["role_id"] if creator else "",
        "organization_name": org["name"] if org else "",
        "documents": [dict(d) for d in documents],
        "evidence": [dict(e) for e in evidence_items],
        "investigations": [dict(i) for i in investigations],
        "forensic_reports": [dict(f) for f in forensic_reports_rows],
        "court_proceedings": [dict(c) for c in court_proc],
        "bail_analyses": [dict(b) for b in bail_analyses_rows],
        "blockchain_records": [dict(b) for b in blockchain],
        "audit_logs": [dict(a) for a in audit],
    }


@router.put("/{case_id}")
async def update_case(
    case_id: str,
    req: CaseUpdateRequest,
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Update case details. Requires case:update permission."""
    current_user.require_permission(Permission.CASE_UPDATE)
    ip = get_client_ip(request)

    with get_db() as conn:
        _check_case_access(conn, case_id, current_user)

        updates = []
        params = []
        for field, value in req.model_dump(exclude_none=True).items():
            updates.append(f"{field} = ?")
            params.append(value)

        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")

        updates.append("updated_at = ?")
        params.append(now_iso())
        params.append(case_id)

        conn.execute(
            f"UPDATE cases SET {', '.join(updates)} WHERE id = ?",
            params,
        )

    log_case_event("case_updated", user_id=current_user.id,
                   user_role=current_user.role_id, case_id=case_id, ip=ip,
                   detail=json.dumps(req.model_dump(exclude_none=True)))

    return {"message": "Case updated", "case_id": case_id}


@router.get("/{case_id}/timeline")
async def get_case_timeline(
    case_id: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Get chronological timeline for a case built from audit logs and events."""
    current_user.require_permission(Permission.CASE_READ)

    with get_db() as conn:
        _check_case_access(conn, case_id, current_user)

        # Build timeline from multiple sources
        events = []

        # Case creation
        case = conn.execute("SELECT created_at, created_by FROM cases WHERE id = ?", (case_id,)).fetchone()
        if case:
            creator = conn.execute("SELECT full_name, role_id FROM users WHERE id = ?",
                                   (case["created_by"],)).fetchone()
            events.append({
                "date": case["created_at"],
                "title": "Case Created",
                "actor": creator["full_name"] if creator else "Unknown",
                "role": creator["role_id"] if creator else "",
                "type": "case",
                "status": "completed",
            })

        # Documents
        docs = conn.execute(
            "SELECT d.*, u.full_name as uploader_name FROM documents d "
            "LEFT JOIN users u ON d.uploaded_by = u.id "
            "WHERE d.case_id = ? ORDER BY d.created_at",
            (case_id,),
        ).fetchall()
        for doc in docs:
            events.append({
                "date": doc["created_at"],
                "title": f"Document Uploaded: {doc['doc_type']}",
                "actor": doc["uploader_name"] or "Unknown",
                "role": doc["uploader_role"] or "",
                "type": "document",
                "status": "completed",
                "document_id": doc["id"],
                "description": doc["original_name"],
                "integrity": doc["verification_status"],
            })

        # Evidence
        evid = conn.execute(
            "SELECT e.*, u.full_name as collector_name FROM evidence e "
            "LEFT JOIN users u ON e.collected_by = u.id "
            "WHERE e.case_id = ? ORDER BY e.created_at",
            (case_id,),
        ).fetchall()
        for ev in evid:
            events.append({
                "date": ev["created_at"],
                "title": f"Evidence Added: {ev['evidence_type']}",
                "actor": ev["collector_name"] or "Unknown",
                "role": "",
                "type": "evidence",
                "status": "completed",
                "evidence_id": ev["id"],
                "description": ev["description"],
            })

        # Court Proceedings
        procs = conn.execute(
            "SELECT * FROM court_proceedings WHERE case_id = ? ORDER BY hearing_date",
            (case_id,),
        ).fetchall()
        for proc in procs:
            events.append({
                "date": proc["hearing_date"],
                "title": f"Court: {proc['hearing_type']}",
                "actor": proc["presiding_officer"] or "",
                "role": "court",
                "type": "court",
                "status": "completed",
                "description": proc["summary"],
            })

        # Blockchain verifications
        bc = conn.execute(
            "SELECT * FROM blockchain_records WHERE case_id = ? ORDER BY timestamp",
            (case_id,),
        ).fetchall()
        for block in bc:
            events.append({
                "date": block["timestamp"],
                "title": "Blockchain Record Created",
                "actor": block["authority"] or "System",
                "role": block["authority_type"] or "",
                "type": "blockchain",
                "status": "completed",
                "description": f"Block #{block['block_index']} — Hash: {block['sha256_hash'][:16]}...",
            })

        # Sort all events chronologically
        events.sort(key=lambda e: e.get("date", ""))

    return {"timeline": events, "case_id": case_id}
