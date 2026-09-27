"""
Bail Reckoner Platform — Evidence Management API Router
Manage evidence items, chain of custody, and forensic tracking.
"""
from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from api.database import get_db, generate_id, now_iso
from api.middleware import CurrentUser, get_current_user
from services.rbac import Permission

router = APIRouter(prefix="/api/evidence", tags=["Evidence"])


class EvidenceCreate(BaseModel):
    case_id: str
    evidence_type: str = "physical"  # physical, digital, documentary, forensic
    description: str = ""
    source: str = ""
    collection_time: str = ""
    location: str = ""


class EvidenceUpdate(BaseModel):
    description: Optional[str] = None
    status: Optional[str] = None
    forensic_status: Optional[str] = None
    location: Optional[str] = None


class EvidenceTransferRequest(BaseModel):
    to_user_id: str
    reason: str = ""


@router.post("")
async def create_evidence(
    req: EvidenceCreate,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Register a new evidence item for a case."""
    current_user.require_permission(Permission.CASE_UPDATE)

    evidence_id = generate_id("EVD-")
    now = now_iso()

    with get_db() as conn:
        case = conn.execute("SELECT id FROM cases WHERE id = ?", (req.case_id,)).fetchone()
        if not case:
            raise HTTPException(status_code=404, detail="Case not found")

        conn.execute(
            """INSERT INTO evidence (id, case_id, evidence_type, description, source,
               collected_by, collection_time, location, current_custodian, status, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'collected', ?, ?)""",
            (evidence_id, req.case_id, req.evidence_type, req.description, req.source,
             current_user.id, req.collection_time or now, req.location, current_user.id, now, now),
        )

        conn.execute(
            """INSERT INTO audit_logs (id, user_id, user_email, user_role, action, entity_type, entity_id, case_id, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (generate_id("AUD-"), current_user.id, current_user.email, current_user.role_id,
             "evidence.created", "evidence", evidence_id, req.case_id, now),
        )

    return {"message": "Evidence registered successfully", "evidence_id": evidence_id}


@router.get("")
async def list_evidence(
    case_id: str = "",
    evidence_type: str = "",
    status: str = "",
    limit: int = 100,
    offset: int = 0,
    current_user: CurrentUser = Depends(get_current_user),
):
    """List evidence items with filters."""
    current_user.require_permission(Permission.CASE_READ)

    q = """SELECT e.*, u.full_name as collected_by_name, c.title as case_title,
                  cu.full_name as custodian_name
           FROM evidence e
           LEFT JOIN users u ON e.collected_by = u.id
           LEFT JOIN users cu ON e.current_custodian = cu.id
           LEFT JOIN cases c ON e.case_id = c.id"""
    conds = []
    params = []

    if case_id:
        conds.append("e.case_id = ?")
        params.append(case_id)
    if evidence_type:
        conds.append("e.evidence_type = ?")
        params.append(evidence_type)
    if status:
        conds.append("e.status = ?")
        params.append(status)

    if conds:
        q += " WHERE " + " AND ".join(conds)
    q += " ORDER BY e.created_at DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    with get_db() as conn:
        rows = conn.execute(q, params).fetchall()

    return {"evidence": [dict(r) for r in rows], "count": len(rows)}


@router.get("/{evidence_id}")
async def get_evidence(
    evidence_id: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Get a single evidence item with its transfer history."""
    current_user.require_permission(Permission.CASE_READ)

    with get_db() as conn:
        row = conn.execute(
            """SELECT e.*, u.full_name as collected_by_name, cu.full_name as custodian_name
               FROM evidence e
               LEFT JOIN users u ON e.collected_by = u.id
               LEFT JOIN users cu ON e.current_custodian = cu.id
               WHERE e.id = ?""",
            (evidence_id,),
        ).fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Evidence not found")

        # Get transfer history (chain of custody)
        transfers = conn.execute(
            """SELECT et.*, fu.full_name as from_name, tu.full_name as to_name
               FROM evidence_transfers et
               LEFT JOIN users fu ON et.from_user = fu.id
               LEFT JOIN users tu ON et.to_user = tu.id
               WHERE et.evidence_id = ?
               ORDER BY et.transfer_time ASC""",
            (evidence_id,),
        ).fetchall()

    result = dict(row)
    result["chain_of_custody"] = [dict(t) for t in transfers]
    return result


@router.put("/{evidence_id}")
async def update_evidence(
    evidence_id: str,
    req: EvidenceUpdate,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Update an evidence item."""
    current_user.require_permission(Permission.CASE_UPDATE)

    with get_db() as conn:
        row = conn.execute("SELECT * FROM evidence WHERE id = ?", (evidence_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Evidence not found")

        updates = []
        params = []
        if req.description is not None:
            updates.append("description = ?")
            params.append(req.description)
        if req.status is not None:
            updates.append("status = ?")
            params.append(req.status)
        if req.forensic_status is not None:
            updates.append("forensic_status = ?")
            params.append(req.forensic_status)
        if req.location is not None:
            updates.append("location = ?")
            params.append(req.location)

        if updates:
            now = now_iso()
            updates.append("updated_at = ?")
            params.append(now)
            params.append(evidence_id)
            conn.execute(f"UPDATE evidence SET {', '.join(updates)} WHERE id = ?", params)

    return {"message": "Evidence updated successfully"}


@router.post("/{evidence_id}/transfer")
async def transfer_evidence(
    evidence_id: str,
    req: EvidenceTransferRequest,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Transfer custody of evidence to another user."""
    current_user.require_permission(Permission.CASE_UPDATE)

    now = now_iso()
    transfer_id = generate_id("TRF-")

    with get_db() as conn:
        evidence = conn.execute("SELECT * FROM evidence WHERE id = ?", (evidence_id,)).fetchone()
        if not evidence:
            raise HTTPException(status_code=404, detail="Evidence not found")

        to_user = conn.execute("SELECT id, full_name FROM users WHERE id = ?", (req.to_user_id,)).fetchone()
        if not to_user:
            raise HTTPException(status_code=404, detail="Target user not found")

        conn.execute(
            """INSERT INTO evidence_transfers (id, evidence_id, from_user, to_user, transfer_time, reason, status)
               VALUES (?, ?, ?, ?, ?, ?, 'completed')""",
            (transfer_id, evidence_id, current_user.id, req.to_user_id, now, req.reason),
        )

        conn.execute(
            "UPDATE evidence SET current_custodian = ?, updated_at = ? WHERE id = ?",
            (req.to_user_id, now, evidence_id),
        )

        conn.execute(
            """INSERT INTO audit_logs (id, user_id, user_email, user_role, action, entity_type, entity_id, case_id, created_at, metadata)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (generate_id("AUD-"), current_user.id, current_user.email, current_user.role_id,
             "evidence.transferred", "evidence", evidence_id, dict(evidence)["case_id"], now,
             f'{{"to_user": "{req.to_user_id}", "reason": "{req.reason}"}}'),
        )

    return {"message": "Evidence custody transferred", "transfer_id": transfer_id}
