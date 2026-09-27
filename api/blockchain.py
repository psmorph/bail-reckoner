"""
Bail Reckoner Platform — Blockchain API Router
Endpoints for blockchain registration, verification, and chain inspection.
"""
from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from api.database import get_db
from api.middleware import CurrentUser, get_current_user, get_client_ip
from services.audit import log_event
from services.blockchain import (
    get_chain_length,
    get_document_blockchain_record,
    get_latest_block,
    register_document,
    verify_chain_integrity,
)
from services.rbac import Permission

router = APIRouter(prefix="/api/blockchain", tags=["Blockchain"])


class RegisterRequest(BaseModel):
    document_id: str
    case_id: str = ""


@router.post("/register")
async def register_on_blockchain(
    req: RegisterRequest,
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Register a document's hash on the blockchain."""
    current_user.require_permission(Permission.BLOCKCHAIN_VERIFY)
    ip = get_client_ip(request)

    with get_db() as conn:
        doc = conn.execute(
            "SELECT id, case_id, sha256_hash FROM documents WHERE id = ? AND is_deleted = 0",
            (req.document_id,),
        ).fetchone()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")

    doc_dict = dict(doc)
    case_id = req.case_id or doc_dict.get("case_id", "")

    result = register_document(
        document_id=req.document_id,
        case_id=case_id,
        sha256_hash=doc_dict["sha256_hash"],
        authority=current_user.full_name,
        authority_type=current_user.role_id,
    )

    # Update document with blockchain tx id
    with get_db() as conn:
        conn.execute(
            "UPDATE documents SET blockchain_tx_id = ?, verification_status = 'blockchain_registered' WHERE id = ?",
            (result["record_id"], req.document_id),
        )

    log_event(
        "blockchain_registration",
        user_id=current_user.id,
        user_role=current_user.role_id,
        entity_type="blockchain",
        entity_id=result["record_id"],
        document_id=req.document_id,
        case_id=case_id,
        ip_address=ip,
        metadata=json.dumps(result),
    )

    return result


@router.get("/verify/{document_id}")
async def verify_document_on_chain(
    document_id: str,
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Verify a document's integrity against its blockchain record."""
    current_user.require_permission(Permission.BLOCKCHAIN_READ)

    record = get_document_blockchain_record(document_id)
    if not record:
        return {"registered": False, "message": "No blockchain record found for this document"}

    # Get current document hash
    with get_db() as conn:
        doc = conn.execute("SELECT sha256_hash FROM documents WHERE id = ?", (document_id,)).fetchone()

    current_hash = dict(doc)["sha256_hash"] if doc else ""
    match = current_hash == record["sha256_hash"]

    return {
        "registered": True,
        "blockchain_record": record,
        "current_document_hash": current_hash,
        "blockchain_hash": record["sha256_hash"],
        "integrity_match": match,
        "status": "VERIFIED" if match else "INTEGRITY_VIOLATION",
    }


@router.get("/chain")
async def get_chain(
    limit: int = 50,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Get recent blockchain records."""
    current_user.require_permission(Permission.BLOCKCHAIN_READ)

    with get_db() as conn:
        rows = conn.execute(
            "SELECT b.*, d.original_name as doc_name FROM blockchain_records b "
            "LEFT JOIN documents d ON b.document_id = d.id "
            "ORDER BY b.block_index DESC LIMIT ?",
            (limit,),
        ).fetchall()

    return {
        "blocks": [dict(r) for r in rows],
        "chain_length": get_chain_length(),
        "latest_block": get_latest_block(),
    }


@router.post("/verify-chain")
async def verify_full_chain(
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Verify integrity of the entire blockchain."""
    current_user.require_permission(Permission.BLOCKCHAIN_VERIFY)
    ip = get_client_ip(request)

    result = verify_chain_integrity()

    log_event(
        "blockchain_chain_verification",
        user_id=current_user.id,
        user_role=current_user.role_id,
        entity_type="blockchain",
        ip_address=ip,
        result="success" if result["valid"] else "failure",
        severity="info" if result["valid"] else "critical",
        metadata=json.dumps({"blocks_checked": result["blocks_checked"],
                             "violations": len(result["violations"])}),
    )

    return result
