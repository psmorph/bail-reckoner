"""
NyaySetu Platform — Document Management Router
Secure document upload, download, verification, and versioning.
"""
from __future__ import annotations

import json
import hashlib
from urllib.parse import quote

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from fastapi.responses import Response

from api.access import accessible_case_clause, check_case_access
from api.database import generate_id, get_db, now_iso
from api.middleware import CurrentUser, get_current_user, get_client_ip
from services.audit import log_document_event, log_event
from services.crypto import sha256_hash_bytes
from services.file_handler import (
    MAX_FILE_SIZE,
    delete_file,
    detect_mime_type,
    extension_matches_mime,
    generate_storage_filename,
    retrieve_file,
    sanitize_filename,
    store_file,
    validate_extension,
)
from services.malware_scan import scan_bytes
from services.notifications import create_notification
from services.rbac import Permission

router = APIRouter(prefix="/api/documents", tags=["Documents"])


@router.post("", status_code=status.HTTP_201_CREATED)
async def upload_document(
    request: Request,
    case_id: str,
    doc_type: str = "other",
    file: UploadFile = File(...),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Upload a document to a case. Generates SHA-256 hash and encrypts at rest."""
    current_user.require_permission(Permission.DOC_UPLOAD)
    ip = get_client_ip(request)

    # Validate case access
    with get_db() as conn:
        case = check_case_access(conn, case_id, current_user)

    content_length = request.headers.get("content-length")
    if content_length:
        try:
            request_length = int(content_length)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="Invalid Content-Length header") from exc
        if request_length > MAX_FILE_SIZE + 64 * 1024:
            raise HTTPException(status_code=413, detail="File too large. Maximum 50 MB.")

    original_name = sanitize_filename(file.filename or "unnamed")
    if not validate_extension(original_name):
        raise HTTPException(status_code=400, detail="File type not allowed. Allowed: PDF, JPG, PNG, TIFF, DOC, DOCX, TXT")

    if file.size is not None and file.size > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large. Maximum 50 MB.")

    chunks = []
    total_size = 0
    while chunk := await file.read(1024 * 1024):
        total_size += len(chunk)
        if total_size > MAX_FILE_SIZE:
            raise HTTPException(status_code=413, detail="File too large. Maximum 50 MB.")
        chunks.append(chunk)
    if total_size == 0:
        raise HTTPException(status_code=400, detail="Empty files are not allowed.")
    data = b"".join(chunks)

    detected_mime_type = detect_mime_type(data)
    if detected_mime_type is None or not extension_matches_mime(original_name, detected_mime_type):
        raise HTTPException(status_code=400, detail="File contents do not match the file extension.")

    try:
        scanned = scan_bytes(data)
    except RuntimeError as exc:
        log_event(
            "malware_scan_failed",
            user_id=current_user.id,
            user_role=current_user.role_id,
            entity_type="document_upload",
            case_id=case_id,
            ip_address=ip,
            result="failure",
            severity="critical",
            metadata=json.dumps({"reason": str(exc)}),
        )
        raise HTTPException(status_code=422, detail="Malware scanning failed; upload rejected.") from exc
    if not scanned:
        log_event(
            "malware_detected",
            user_id=current_user.id,
            user_role=current_user.role_id,
            entity_type="document_upload",
            case_id=case_id,
            ip_address=ip,
            result="failure",
            severity="critical",
            metadata=json.dumps({"original_name": original_name}),
        )
        raise HTTPException(status_code=422, detail="Malware detected; upload rejected.")

    # Compute SHA-256 hash from original bytes
    file_hash = hashlib.sha256(data).hexdigest()

    # Generate storage filename and store encrypted
    storage_name = generate_storage_filename(original_name)
    store_file(data, storage_name, encrypt=True)

    # Create document record
    doc_id = generate_id("DOC-")
    now = now_iso()

    try:
        with get_db() as conn:
            conn.execute(
                """INSERT INTO documents
                   (id, case_id, doc_type, file_name, original_name, mime_type, file_size,
                    uploaded_by, uploader_role, sha256_hash, encrypted, encryption_key_ref,
                    verification_status, version, is_deleted, created_at, last_accessed)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'system', 'pending', 1, 0, ?, ?)""",
                (
                    doc_id, case_id, doc_type, storage_name, original_name,
                    detected_mime_type, len(data),
                    current_user.id, current_user.role_id, file_hash,
                    now, now,
                ),
            )

            conn.execute(
                """INSERT INTO document_versions (id, document_id, version, sha256_hash, file_name, file_size, uploaded_by, created_at)
                   VALUES (?, ?, 1, ?, ?, ?, ?, ?)""",
                (generate_id("VER-"), doc_id, file_hash, storage_name, len(data), current_user.id, now),
            )
    except Exception:
        delete_file(storage_name)
        raise

    log_document_event("document_uploaded", user_id=current_user.id,
                       user_role=current_user.role_id, document_id=doc_id,
                       case_id=case_id, ip=ip,
                       detail=json.dumps({
                           "original_name": original_name,
                           "doc_type": doc_type,
                           "size": len(data),
                           "sha256": file_hash,
                       }))

    notification_recipients = {
        case.get("created_by"),
        case.get("assigned_investigator"),
    } - {None, current_user.id}
    for recipient_id in notification_recipients:
        create_notification(
            recipient_id,
            "Document uploaded",
            f"A document was uploaded to case {case_id}.",
            link=f"/documents/{doc_id}",
        )

    return {
        "message": "Document uploaded and encrypted",
        "document_id": doc_id,
        "sha256_hash": file_hash,
        "file_size": len(data),
        "encrypted": True,
    }


@router.get("")
async def list_documents(
    case_id: str = "",
    doc_type: str = "",
    limit: int = 50,
    current_user: CurrentUser = Depends(get_current_user),
):
    """List documents. Filtered by case and RBAC."""
    current_user.require_permission(Permission.DOC_READ)

    with get_db() as conn:
        q = "SELECT d.*, u.full_name as uploader_name FROM documents d"
        q += " LEFT JOIN users u ON d.uploaded_by = u.id"
        conds = ["d.is_deleted = 0"]
        params = []

        if case_id:
            check_case_access(conn, case_id, current_user)
            conds.append("d.case_id = ?")
            params.append(case_id)
        else:
            access_clause, access_params = accessible_case_clause(current_user)
            if access_clause != "1=1":
                conds.append(f"d.case_id IN (SELECT c.id FROM cases c WHERE {access_clause})")
                params.extend(access_params)

        if doc_type:
            conds.append("d.doc_type = ?")
            params.append(doc_type)

        q += " WHERE " + " AND ".join(conds)
        q += " ORDER BY d.created_at DESC"
        q += f" LIMIT {limit}"

        rows = conn.execute(q, params).fetchall()

    return {"documents": [dict(r) for r in rows], "count": len(rows)}


@router.get("/{doc_id}")
async def get_document_info(
    doc_id: str,
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Get document metadata (not the file itself)."""
    current_user.require_permission(Permission.DOC_READ)
    ip = get_client_ip(request)

    with get_db() as conn:
        doc = conn.execute(
            "SELECT d.*, u.full_name as uploader_name FROM documents d "
            "LEFT JOIN users u ON d.uploaded_by = u.id WHERE d.id = ?",
            (doc_id,),
        ).fetchone()

        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        check_case_access(conn, dict(doc)["case_id"], current_user)

        # Get versions
        versions = conn.execute(
            "SELECT v.*, u.full_name as uploader_name FROM document_versions v "
            "LEFT JOIN users u ON v.uploaded_by = u.id "
            "WHERE v.document_id = ? ORDER BY v.version DESC",
            (doc_id,),
        ).fetchall()

        # Get blockchain record
        bc = conn.execute(
            "SELECT * FROM blockchain_records WHERE document_id = ? ORDER BY timestamp DESC LIMIT 1",
            (doc_id,),
        ).fetchone()

        # Update last accessed
        conn.execute("UPDATE documents SET last_accessed = ? WHERE id = ?", (now_iso(), doc_id))

    log_document_event("document_viewed", user_id=current_user.id,
                       user_role=current_user.role_id, document_id=doc_id,
                       case_id=dict(doc).get("case_id", ""), ip=ip)

    return {
        "document": dict(doc),
        "versions": [dict(v) for v in versions],
        "blockchain_record": dict(bc) if bc else None,
    }


@router.get("/{doc_id}/download")
async def download_document(
    doc_id: str,
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Download the actual file. Decrypts before sending."""
    current_user.require_permission(Permission.DOC_DOWNLOAD)
    ip = get_client_ip(request)

    with get_db() as conn:
        doc = conn.execute("SELECT * FROM documents WHERE id = ? AND is_deleted = 0", (doc_id,)).fetchone()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        doc_dict = dict(doc)
        check_case_access(conn, doc_dict["case_id"], current_user)

    try:
        data = retrieve_file(doc_dict["file_name"], encrypted=bool(doc_dict["encrypted"]))
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="File not found in storage")

    log_document_event("document_downloaded", user_id=current_user.id,
                       user_role=current_user.role_id, document_id=doc_id,
                       case_id=doc_dict.get("case_id", ""), ip=ip)

    mime_type = doc_dict.get("mime_type", "")
    download_type = mime_type if mime_type == "application/pdf" or mime_type.startswith("image/") else "application/octet-stream"
    filename = doc_dict["original_name"]
    ascii_filename = "".join(
        character if character.isascii() and (character.isalnum() or character in "._-") else "_"
        for character in filename
    ) or "download"
    encoded_filename = quote(filename, safe="!#$&+-.^_`|~")
    return Response(
        content=data,
        media_type=download_type,
        headers={
            "Content-Disposition": (
                f'attachment; filename="{ascii_filename}"; '
                f"filename*=UTF-8''{encoded_filename}"
            ),
            "X-Document-Hash": doc_dict.get("sha256_hash", ""),
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.post("/{doc_id}/verify")
async def verify_document(
    doc_id: str,
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Verify document integrity: compare current file hash against registered hash."""
    current_user.require_permission(Permission.DOC_VERIFY)
    ip = get_client_ip(request)

    with get_db() as conn:
        doc = conn.execute("SELECT * FROM documents WHERE id = ? AND is_deleted = 0", (doc_id,)).fetchone()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        doc_dict = dict(doc)
        check_case_access(conn, doc_dict["case_id"], current_user)

    doc_dict = dict(doc)
    registered_hash = doc_dict.get("sha256_hash", "")

    # Retrieve and hash current file
    try:
        data = retrieve_file(doc_dict["file_name"], encrypted=bool(doc_dict["encrypted"]))
        current_hash = sha256_hash_bytes(data)
    except FileNotFoundError:
        log_document_event("document_verify_failed", user_id=current_user.id,
                           user_role=current_user.role_id, document_id=doc_id,
                           case_id=doc_dict.get("case_id", ""), ip=ip,
                           detail=json.dumps({"reason": "file_not_found"}))
        raise HTTPException(status_code=404, detail="File not found in storage")

    # Check blockchain record
    with get_db() as conn:
        bc = conn.execute(
            "SELECT * FROM blockchain_records WHERE document_id = ? ORDER BY timestamp DESC LIMIT 1",
            (doc_id,),
        ).fetchone()

    blockchain_hash = dict(bc).get("sha256_hash", "") if bc else ""
    hash_match = current_hash == registered_hash
    blockchain_match = current_hash == blockchain_hash if blockchain_hash else None

    integrity_status = "verified" if hash_match else "compromised"

    # Update verification status
    with get_db() as conn:
        conn.execute(
            "UPDATE documents SET verification_status = ? WHERE id = ?",
            (integrity_status, doc_id),
        )

    severity = "info" if hash_match else "critical"
    log_document_event(
        "document_verified" if hash_match else "document_integrity_violation",
        user_id=current_user.id, user_role=current_user.role_id,
        document_id=doc_id, case_id=doc_dict.get("case_id", ""), ip=ip,
        detail=json.dumps({
            "registered_hash": registered_hash,
            "current_hash": current_hash,
            "blockchain_hash": blockchain_hash,
            "match": hash_match,
            "blockchain_match": blockchain_match,
        }),
    )

    if not hash_match:
        with get_db() as conn:
            recipients = {
                row["id"]
                for row in conn.execute(
                    "SELECT id FROM users WHERE role_id = 'master_admin' AND is_active = 1"
                ).fetchall()
            }
            case_creator = conn.execute(
                "SELECT created_by FROM cases WHERE id = ?",
                (doc_dict["case_id"],),
            ).fetchone()
        if case_creator:
            recipients.add(case_creator["created_by"])
        for recipient_id in recipients - {current_user.id}:
            create_notification(
                recipient_id,
                "Document integrity violation",
                f"Document {doc_dict['original_name']} failed its integrity check.",
                notification_type="urgent",
                link=f"/documents/{doc_id}",
            )

    return {
        "document_id": doc_id,
        "case_id": doc_dict.get("case_id", ""),
        "original_name": doc_dict.get("original_name", ""),
        "integrity_status": integrity_status,
        "registered_hash": registered_hash,
        "current_hash": current_hash,
        "blockchain_hash": blockchain_hash,
        "hash_match": hash_match,
        "blockchain_match": blockchain_match,
        "verification_timestamp": now_iso(),
        "verified_by": current_user.full_name,
    }


@router.get("/{doc_id}/versions")
async def get_document_versions(
    doc_id: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Get version history of a document."""
    current_user.require_permission(Permission.DOC_READ)

    with get_db() as conn:
        versions = conn.execute(
            "SELECT v.*, u.full_name as uploader_name FROM document_versions v "
            "LEFT JOIN users u ON v.uploaded_by = u.id "
            "WHERE v.document_id = ? ORDER BY v.version DESC",
            (doc_id,),
        ).fetchall()

    return {"versions": [dict(v) for v in versions]}
