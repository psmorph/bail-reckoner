"""
NyaySetu Platform — Forensic Reports API Router
Manage forensic analysis reports linked to cases and evidence.
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

router = APIRouter(prefix="/api/forensics", tags=["Forensic Reports"])


class ForensicReportCreate(BaseModel):
    case_id: str
    evidence_id: str = ""
    report_type: str = "analysis"  # analysis, dna, fingerprint, digital, toxicology
    title: str
    findings: str = ""
    conclusion: str = ""
    lab_name: str = ""


class ForensicReportUpdate(BaseModel):
    title: Optional[str] = None
    findings: Optional[str] = None
    conclusion: Optional[str] = None
    status: Optional[str] = None  # draft, submitted, reviewed, final


@router.post("")
async def create_forensic_report(
    req: ForensicReportCreate,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Create a new forensic analysis report."""
    current_user.require_permission(Permission.FORENSIC_CREATE)

    report_id = generate_id("FSR-")
    now = now_iso()

    with get_db() as conn:
        check_case_access(conn, req.case_id, current_user)

        if req.evidence_id:
            evidence = conn.execute("SELECT id, case_id FROM evidence WHERE id = ?", (req.evidence_id,)).fetchone()
            if not evidence:
                raise HTTPException(status_code=404, detail="Evidence not found")
            if dict(evidence)["case_id"] != req.case_id:
                raise HTTPException(status_code=404, detail="Evidence not found")

        conn.execute(
            """INSERT INTO forensic_reports (id, case_id, evidence_id, report_type, title, findings, conclusion, officer_id, lab_name, status, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)""",
            (report_id, req.case_id, req.evidence_id or None, req.report_type, req.title,
             req.findings, req.conclusion, current_user.id, req.lab_name, now, now),
        )

    log_event(
        "forensic_report.created",
        user_id=current_user.id,
        user_email=current_user.email,
        user_role=current_user.role_id,
        entity_type="forensic_report",
        entity_id=report_id,
        case_id=req.case_id,
    )

    return {"message": "Forensic report created", "report_id": report_id}


@router.get("")
async def list_forensic_reports(
    case_id: str = "",
    report_type: str = "",
    status: str = "",
    limit: int = 100,
    offset: int = 0,
    current_user: CurrentUser = Depends(get_current_user),
):
    """List forensic reports with filters."""
    current_user.require_permission(Permission.FORENSIC_READ)

    q = """SELECT fr.*, u.full_name as officer_name, c.title as case_title
           FROM forensic_reports fr
           LEFT JOIN users u ON fr.officer_id = u.id
           LEFT JOIN cases c ON fr.case_id = c.id"""
    conds = []
    params = []

    if case_id:
        with get_db() as conn:
            check_case_access(conn, case_id, current_user)
        conds.append("fr.case_id = ?")
        params.append(case_id)
    else:
        access_clause, access_params = accessible_case_clause(current_user)
        if access_clause != "1=1":
            conds.append(f"fr.case_id IN (SELECT c.id FROM cases c WHERE {access_clause})")
            params.extend(access_params)
    if report_type:
        conds.append("fr.report_type = ?")
        params.append(report_type)
    if status:
        conds.append("fr.status = ?")
        params.append(status)

    if conds:
        q += " WHERE " + " AND ".join(conds)
    q += " ORDER BY fr.created_at DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    with get_db() as conn:
        rows = conn.execute(q, params).fetchall()

    return {"reports": [dict(r) for r in rows], "count": len(rows)}


@router.get("/{report_id}")
async def get_forensic_report(
    report_id: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Get a single forensic report."""
    current_user.require_permission(Permission.FORENSIC_READ)

    with get_db() as conn:
        row = conn.execute(
            """SELECT fr.*, u.full_name as officer_name, c.title as case_title
               FROM forensic_reports fr
               LEFT JOIN users u ON fr.officer_id = u.id
               LEFT JOIN cases c ON fr.case_id = c.id
               WHERE fr.id = ?""",
            (report_id,),
        ).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Forensic report not found")
    with get_db() as conn:
        check_case_access(conn, dict(row)["case_id"], current_user)

    return dict(row)


@router.put("/{report_id}")
async def update_forensic_report(
    report_id: str,
    req: ForensicReportUpdate,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Update a forensic report."""
    current_user.require_permission(Permission.FORENSIC_UPDATE)

    with get_db() as conn:
        row = conn.execute("SELECT * FROM forensic_reports WHERE id = ?", (report_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Forensic report not found")
        row_dict = dict(row)
        check_case_access(conn, row_dict["case_id"], current_user)
        became_final = req.status == "final" and row_dict["status"] != "final"
        case_creator = None
        if became_final:
            case_creator = conn.execute(
                "SELECT created_by FROM cases WHERE id = ?",
                (row_dict["case_id"],),
            ).fetchone()

        updates = []
        params = []
        if req.title is not None:
            updates.append("title = ?")
            params.append(req.title)
        if req.findings is not None:
            updates.append("findings = ?")
            params.append(req.findings)
        if req.conclusion is not None:
            updates.append("conclusion = ?")
            params.append(req.conclusion)
        if req.status is not None:
            updates.append("status = ?")
            params.append(req.status)

        if updates:
            now = now_iso()
            updates.append("updated_at = ?")
            params.append(now)
            params.append(report_id)
            conn.execute(f"UPDATE forensic_reports SET {', '.join(updates)} WHERE id = ?", params)

    if became_final and case_creator and case_creator["created_by"] != current_user.id:
        create_notification(
            case_creator["created_by"],
            "Forensic report finalized",
            f"Forensic report {report_id} is final.",
            link=f"/forensics/{report_id}",
        )

    return {"message": "Forensic report updated successfully"}
