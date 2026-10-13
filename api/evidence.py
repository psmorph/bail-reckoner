"""
NyaySetu Platform — Evidence Management API Router
Manage evidence items, chain of custody, and forensic tracking.
"""
from __future__ import annotations

import json
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from api.access import accessible_case_clause, check_case_access
from api.database import get_db, get_db_immediate, generate_id, now_iso
from api.middleware import CurrentUser, get_current_user
from services.audit import log_event
from services.notifications import create_notification
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
        check_case_access(conn, req.case_id, current_user)

        conn.execute(
            """INSERT INTO evidence (id, case_id, evidence_type, description, source,
               collected_by, collection_time, location, current_custodian, status, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'collected', ?, ?)""",
            (evidence_id, req.case_id, req.evidence_type, req.description, req.source,
             current_user.id, req.collection_time or now, req.location, current_user.id, now, now),
        )

    log_event(
        "evidence.created",
        user_id=current_user.id,
        user_email=current_user.email,
        user_role=current_user.role_id,
        entity_type="evidence",
        entity_id=evidence_id,
        case_id=req.case_id,
        metadata=json.dumps({"evidence_type": req.evidence_type}),
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
        with get_db() as conn:
            check_case_access(conn, case_id, current_user)
        conds.append("e.case_id = ?")
        params.append(case_id)
    else:
        access_clause, access_params = accessible_case_clause(current_user)
        if access_clause != "1=1":
            conds.append(f"e.case_id IN (SELECT c.id FROM cases c WHERE {access_clause})")
            params.extend(access_params)
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
        check_case_access(conn, dict(row)["case_id"], current_user)

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
        check_case_access(conn, dict(row)["case_id"], current_user)

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
    """Request a custody transfer that requires acceptance by the recipient."""
    now = now_iso()
    transfer_id = generate_id("TRF-")

    with get_db_immediate() as conn:
        evidence = conn.execute("SELECT * FROM evidence WHERE id = ?", (evidence_id,)).fetchone()
        if not evidence:
            raise HTTPException(status_code=404, detail="Evidence not found")
        evidence_dict = dict(evidence)
        case = conn.execute(
            "SELECT organization_id FROM cases WHERE id = ?",
            (evidence_dict["case_id"],),
        ).fetchone()
        custodian_id = evidence_dict["current_custodian"]
        is_master_admin = current_user.role_id == "master_admin"
        is_same_org_police_admin = (
            current_user.role_id == "police_admin"
            and bool(current_user.organization_id)
            and bool(case and case["organization_id"])
            and current_user.organization_id == case["organization_id"]
        )
        if current_user.id != custodian_id and not is_master_admin and not is_same_org_police_admin:
            raise HTTPException(status_code=403, detail="Only the current custodian or an authorized administrator may initiate a transfer")

        pending = conn.execute(
            "SELECT id FROM evidence_transfers WHERE evidence_id = ? AND status = 'pending' LIMIT 1",
            (evidence_id,),
        ).fetchone()
        if pending:
            raise HTTPException(status_code=409, detail="A custody transfer is already pending")

        to_user = conn.execute(
            "SELECT id, full_name, organization_id, is_active FROM users WHERE id = ?",
            (req.to_user_id,),
        ).fetchone()
        if not to_user:
            raise HTTPException(status_code=404, detail="Target user not found")
        if not to_user["is_active"]:
            raise HTTPException(status_code=400, detail="Target user is inactive")
        if req.to_user_id == custodian_id:
            raise HTTPException(status_code=400, detail="Target user is already the current custodian")
        if not custodian_id:
            raise HTTPException(status_code=409, detail="Evidence has no current custodian")

        from_user = conn.execute(
            "SELECT organization_id FROM users WHERE id = ?",
            (custodian_id,),
        ).fetchone()

        conn.execute(
            """INSERT INTO evidence_transfers
               (id, evidence_id, from_user, to_user, from_org, to_org, transfer_time, reason, status, acknowledged)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0)""",
            (
                transfer_id,
                evidence_id,
                custodian_id,
                req.to_user_id,
                from_user["organization_id"] if from_user else None,
                to_user["organization_id"],
                now,
                req.reason,
            ),
        )

    log_event(
        "evidence.transfer_requested",
        user_id=current_user.id,
        user_email=current_user.email,
        user_role=current_user.role_id,
        entity_type="evidence",
        entity_id=evidence_id,
        case_id=evidence_dict["case_id"],
        metadata=json.dumps({"transfer_id": transfer_id, "to_user": req.to_user_id, "reason": req.reason}),
    )
    if req.to_user_id != current_user.id:
        create_notification(
            req.to_user_id,
            "Evidence transfer requested",
            f"Evidence {evidence_id} has been offered to you for custody.",
            link=f"/evidence/{evidence_id}",
        )
    return {"message": "Evidence transfer requested", "transfer_id": transfer_id, "status": "pending"}


@router.post("/transfers/{transfer_id}/acknowledge")
async def acknowledge_evidence_transfer(
    transfer_id: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Accept a pending custody transfer addressed to the current user."""
    now = now_iso()

    with get_db_immediate() as conn:
        transfer = conn.execute(
            """SELECT et.*, e.case_id FROM evidence_transfers et
               JOIN evidence e ON e.id = et.evidence_id WHERE et.id = ?""",
            (transfer_id,),
        ).fetchone()
        if not transfer:
            raise HTTPException(status_code=404, detail="Transfer not found")
        transfer_dict = dict(transfer)
        if transfer_dict["to_user"] != current_user.id:
            raise HTTPException(status_code=403, detail="Only the recipient may acknowledge this transfer")
        if transfer_dict["status"] != "pending":
            raise HTTPException(status_code=409, detail="Transfer is no longer pending")

        conn.execute(
            """UPDATE evidence_transfers
               SET acknowledged = 1, acknowledged_at = ?, status = 'completed'
               WHERE id = ? AND status = 'pending'""",
            (now, transfer_id),
        )
        conn.execute(
            "UPDATE evidence SET current_custodian = ?, updated_at = ? WHERE id = ?",
            (current_user.id, now, transfer_dict["evidence_id"]),
        )

    log_event(
        "evidence.transfer_acknowledged",
        user_id=current_user.id,
        user_email=current_user.email,
        user_role=current_user.role_id,
        entity_type="evidence",
        entity_id=transfer_dict["evidence_id"],
        case_id=transfer_dict["case_id"],
        metadata=json.dumps({"transfer_id": transfer_id, "from_user": transfer_dict["from_user"]}),
    )
    if transfer_dict["from_user"] != current_user.id:
        create_notification(
            transfer_dict["from_user"],
            "Evidence transfer acknowledged",
            f"Transfer {transfer_id} was acknowledged.",
            link=f"/evidence/{transfer_dict['evidence_id']}",
        )
    return {"message": "Evidence transfer acknowledged", "transfer_id": transfer_id, "status": "completed"}


@router.post("/transfers/{transfer_id}/reject")
async def reject_evidence_transfer(
    transfer_id: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Reject a pending custody transfer addressed to the current user."""
    with get_db_immediate() as conn:
        transfer = conn.execute(
            """SELECT et.*, e.case_id FROM evidence_transfers et
               JOIN evidence e ON e.id = et.evidence_id WHERE et.id = ?""",
            (transfer_id,),
        ).fetchone()
        if not transfer:
            raise HTTPException(status_code=404, detail="Transfer not found")
        transfer_dict = dict(transfer)
        if transfer_dict["to_user"] != current_user.id:
            raise HTTPException(status_code=403, detail="Only the recipient may reject this transfer")
        if transfer_dict["status"] != "pending":
            raise HTTPException(status_code=409, detail="Transfer is no longer pending")
        conn.execute(
            "UPDATE evidence_transfers SET status = 'rejected' WHERE id = ? AND status = 'pending'",
            (transfer_id,),
        )

    log_event(
        "evidence.transfer_rejected",
        user_id=current_user.id,
        user_email=current_user.email,
        user_role=current_user.role_id,
        entity_type="evidence",
        entity_id=transfer_dict["evidence_id"],
        case_id=transfer_dict["case_id"],
        metadata=json.dumps({"transfer_id": transfer_id, "from_user": transfer_dict["from_user"]}),
    )
    if transfer_dict["from_user"] != current_user.id:
        create_notification(
            transfer_dict["from_user"],
            "Evidence transfer rejected",
            f"Transfer {transfer_id} was rejected.",
            link=f"/evidence/{transfer_dict['evidence_id']}",
        )
    return {"message": "Evidence transfer rejected", "transfer_id": transfer_id, "status": "rejected"}
