"""
NyaySetu — FastAPI Backend
Wraps the existing engine.py functions and serves the web frontend.
Extended with platform authentication and security modules.
"""
from __future__ import annotations

import sqlite3
import sys
from io import BytesIO
from datetime import date
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from pypdf import PdfReader

# ---------------------------------------------------------------------------
# Environment — load .env before anything else
# ---------------------------------------------------------------------------
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent.parent / ".env")
except ImportError:
    pass  # python-dotenv is optional for basic operation

# ---------------------------------------------------------------------------
# Path setup — import engine from the project root
# ---------------------------------------------------------------------------
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from engine import custody_days, search_cases, rule_assessment, database_stats

DB_PATH = ROOT / "bail_reckoner.db"
FRONTEND = ROOT / "frontend"

# ---------------------------------------------------------------------------
# Initialize platform database tables (additive only)
# ---------------------------------------------------------------------------
from api.database import init_platform_tables
init_platform_tables()

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="NyaySetu API",
    description="AI-assisted legal intelligence and bail assessment platform",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Mount platform routers (new modules — does NOT affect existing routes)
# ---------------------------------------------------------------------------
from api.auth import router as auth_router
from api.cases import router as cases_router
from api.documents import router as documents_router
from api.blockchain import router as blockchain_router
from api.audit import router as audit_router
from api.investigations import router as investigations_router
from api.evidence import router as evidence_router
from api.forensics import router as forensics_router
from api.court_proceedings import router as court_proceedings_router
from api.notifications import router as notifications_router

app.include_router(auth_router)
app.include_router(cases_router)
app.include_router(documents_router)
app.include_router(blockchain_router)
app.include_router(audit_router)
app.include_router(investigations_router)
app.include_router(evidence_router)
app.include_router(forensics_router)
app.include_router(court_proceedings_router)
app.include_router(notifications_router)

# ---------------------------------------------------------------------------
# Static file mounts — serve the frontend
# ---------------------------------------------------------------------------
for subdir in ("css", "js", "assets"):
    d = FRONTEND / subdir
    d.mkdir(parents=True, exist_ok=True)
    app.mount(f"/{subdir}", StaticFiles(directory=d), name=subdir)


@app.get("/")
async def serve_index():
    """Serve the SPA entry point."""
    return FileResponse(FRONTEND / "index.html")


@app.get("/favicon.ico")
async def serve_favicon():
    """Serve the favicon."""
    favicon = FRONTEND / "assets" / "favicon.png"
    if favicon.exists():
        return FileResponse(favicon, media_type="image/png")
    return FileResponse(FRONTEND / "index.html")


# ===== Pydantic Models =====================================================

class CaseReviewRequest(BaseModel):
    sections: str = ""
    special_laws: str = ""
    bail_type: str = "Regular"
    arrest_date: str = ""
    charge_sheet_filed: bool = False
    first_time_offender: bool = True
    flight_risk: bool = False
    witness_risk: bool = False
    evidence_risk: bool = False
    case_facts: str = ""
    top_k: int = 5


class CustodyCalcRequest(BaseModel):
    arrest_date: str
    calculation_date: Optional[str] = None


# ===== API Routes ===========================================================

# ---- Case Review (main workflow) ------------------------------------------

@app.post("/api/case/extract-text")
async def extract_case_document(file: UploadFile = File(...)):
    """Extract selectable text from a PDF without adding it to the app's case library."""
    filename = (file.filename or "").lower()
    if not filename.endswith(".pdf"):
        raise HTTPException(status_code=415, detail="Please upload a PDF. Other document types are not read by this prototype.")

    max_bytes = 10 * 1024 * 1024
    data = await file.read(max_bytes + 1)
    if len(data) > max_bytes:
        raise HTTPException(status_code=413, detail="PDF is larger than the 10 MB demo limit.")
    if b"%PDF" not in data[:1024]:
        raise HTTPException(status_code=400, detail="This file does not appear to be a valid PDF.")

    try:
        reader = PdfReader(BytesIO(data), strict=False)
        if reader.is_encrypted:
            try:
                if not reader.decrypt(""):
                    raise HTTPException(status_code=422, detail="Password-protected PDFs are not supported.")
            except HTTPException:
                raise
            except Exception:
                raise HTTPException(status_code=422, detail="Password-protected PDFs are not supported.")

        page_limit = 80
        char_limit = 30_000
        parts = []
        char_count = 0
        pages_read = 0
        truncated = len(reader.pages) > page_limit
        for page_number, page in enumerate(reader.pages[:page_limit], start=1):
            page_text = (page.extract_text() or "").replace("\x00", "").strip()
            if page_text:
                prefix = f"[Page {page_number}]\n"
                remaining = char_limit - char_count
                if remaining <= len(prefix):
                    truncated = True
                    break
                excerpt = prefix + page_text[:remaining - len(prefix)]
                parts.append(excerpt)
                char_count += len(excerpt)
                if len(page_text) + len(prefix) > remaining:
                    truncated = True
                    break
            pages_read = page_number
        extracted_text = "\n\n".join(parts).strip()
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=422, detail="Could not read this PDF. Try a text-based PDF or enter the case details manually.") from exc
    finally:
        await file.close()

    if not extracted_text:
        raise HTTPException(status_code=422, detail="No selectable text was found. Scanned/image-only PDFs need OCR; enter the case details manually for now.")

    return {
        "text": extracted_text,
        "pages_read": pages_read,
        "truncated": truncated,
        "saved_to_case_library": False,
        "message": "Text extracted. The PDF was not added to the app's case document library.",
    }

@app.post("/api/case/review")
async def review_case(req: CaseReviewRequest):
    """
    Core endpoint: performs rule-based assessment + retrieves similar judgments.
    Wraps engine.rule_assessment() and engine.search_cases().
    """
    days = 0
    if req.arrest_date:
        try:
            days = custody_days(req.arrest_date)
        except (ValueError, Exception):
            pass

    assessment = rule_assessment(
        req.sections,
        req.special_laws,
        req.bail_type,
        days,
        req.charge_sheet_filed,
        req.first_time_offender,
        req.flight_risk,
        req.witness_risk,
        req.evidence_risk,
    )

    query_text = req.case_facts or f"{req.sections} {req.special_laws}"
    similar = search_cases(query_text.strip(), req.top_k) if query_text.strip() else []

    return {
        "custody_days": days,
        "assessment": assessment,
        "similar_cases": similar,
    }


# ---- Judgment Search -------------------------------------------------------

@app.get("/api/cases/search")
async def search_judgments(
    query: str = "",
    court: str = "",
    ipc_sections: str = "",
    bail_type: str = "All",
    bail_outcome: str = "All",
    year: str = "",
    top_k: int = 10,
):
    """Search similar judgments with optional filters."""
    if not query.strip():
        return {"results": [], "count": 0}

    filters = {
        "court": court,
        "ipc_sections": ipc_sections,
        "bail_type": bail_type,
        "bail_outcome": bail_outcome,
        "year": year,
    }
    results = search_cases(query, top_k, filters)
    return {"results": results, "count": len(results)}


# ---- Custody Calculator ----------------------------------------------------

@app.post("/api/custody/calculate")
async def calculate_custody(req: CustodyCalcRequest):
    """Calculate custody duration in days."""
    try:
        days = custody_days(req.arrest_date, req.calculation_date)
        return {"days": days, "arrest_date": req.arrest_date}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ---- Legal Provisions (from SQLite) ----------------------------------------

def _table_exists(conn, name):
    return conn.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (name,)
    ).fetchone() is not None


@app.get("/api/provisions")
async def get_provisions(
    search: str = "",
    act: str = "",
    category: str = "",
    bailable: str = "",
    limit: int = 50,
):
    """Query the offenses and special-acts tables in the legal database."""
    if not DB_PATH.exists():
        return {"provisions": [], "count": 0}

    results = []
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row

        # --- IPC/BNS offenses ---
        if _table_exists(conn, "offenses"):
            q = "SELECT *, 'IPC/BNS' AS source_type FROM offenses"
            params: list = []
            conds: list[str] = []
            if search:
                conds.append(
                    "(ipc_section LIKE ? OR bns_section LIKE ? OR offense_name LIKE ? OR notes LIKE ?)"
                )
                params.extend([f"%{search}%"] * 4)
            if category:
                conds.append("category = ?")
                params.append(category)
            if bailable:
                conds.append("bailable = ?")
                params.append(bailable)
            if conds:
                q += " WHERE " + " AND ".join(conds)
            q += f" LIMIT {limit}"
            results.extend([dict(r) for r in conn.execute(q, params).fetchall()])

        # --- Special statutes ---
        if _table_exists(conn, "special_acts_offenses"):
            q = "SELECT *, 'Special Act' AS source_type FROM special_acts_offenses"
            params = []
            conds = []
            if search:
                conds.append(
                    "(section LIKE ? OR act_name LIKE ? OR offense_name LIKE ? OR notes LIKE ?)"
                )
                params.extend([f"%{search}%"] * 4)
            if act:
                conds.append("act_name LIKE ?")
                params.append(f"%{act}%")
            if bailable:
                conds.append("bailable = ?")
                params.append(bailable)
            if conds:
                q += " WHERE " + " AND ".join(conds)
            q += f" LIMIT {limit}"
            results.extend([dict(r) for r in conn.execute(q, params).fetchall()])

    return {"provisions": results, "count": len(results)}


@app.get("/api/provisions/categories")
async def get_provision_categories():
    """Return distinct categories and acts for filter dropdowns."""
    if not DB_PATH.exists():
        return {"categories": [], "acts": []}
    with sqlite3.connect(DB_PATH) as conn:
        cats = [r[0] for r in conn.execute("SELECT DISTINCT category FROM offenses").fetchall() if r[0]]
        acts = [r[0] for r in conn.execute("SELECT DISTINCT act_name FROM special_acts_offenses").fetchall() if r[0]]
    return {"categories": cats, "acts": acts}


# ---- Custody Rules ---------------------------------------------------------

@app.get("/api/custody-rules")
async def get_custody_rules():
    """Return statutory custody threshold rules."""
    if not DB_PATH.exists():
        return {"rules": []}
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        if not _table_exists(conn, "custody_rules"):
            return {"rules": []}
        rows = conn.execute("SELECT * FROM custody_rules").fetchall()
    return {"rules": [dict(r) for r in rows]}


# ---- Procedural Checklist --------------------------------------------------

@app.get("/api/checklist")
async def get_checklist(
    category: str = "",
    bail_type: str = "",
):
    """Return the procedural checklist for bail applications."""
    if not DB_PATH.exists():
        return {"items": []}
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        if not _table_exists(conn, "procedural_checklist"):
            return {"items": []}
        q = "SELECT * FROM procedural_checklist"
        params: list = []
        conds: list[str] = []
        if category:
            conds.append("category = ?")
            params.append(category)
        if bail_type:
            conds.append("bail_type = ?")
            params.append(bail_type)
        if conds:
            q += " WHERE " + " AND ".join(conds)
        rows = conn.execute(q, params).fetchall()
    return {"items": [dict(r) for r in rows]}


# ---- Landmark Judgments ----------------------------------------------------

@app.get("/api/judgments")
async def get_judgments(
    search: str = "",
    court: str = "",
    category: str = "",
):
    """Return landmark judgments from the seed database."""
    if not DB_PATH.exists():
        return {"judgments": []}
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        if not _table_exists(conn, "judgments"):
            return {"judgments": []}
        q = "SELECT * FROM judgments"
        params: list = []
        conds: list[str] = []
        if search:
            conds.append("(case_name LIKE ? OR principle_summary LIKE ? OR citation LIKE ?)")
            params.extend([f"%{search}%"] * 3)
        if court:
            conds.append("court LIKE ?")
            params.append(f"%{court}%")
        if category:
            conds.append("applicable_categories LIKE ?")
            params.append(f"%{category}%")
        if conds:
            q += " WHERE " + " AND ".join(conds)
        rows = conn.execute(q, params).fetchall()
    return {"judgments": [dict(r) for r in rows]}


# ---- Database Stats --------------------------------------------------------

@app.get("/api/stats")
async def get_stats():
    """Aggregate database statistics."""
    return database_stats()
