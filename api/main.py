"""
Bail Reckoner — FastAPI Backend
Wraps the existing engine.py functions and serves the web frontend.
"""
from __future__ import annotations

import sqlite3
import sys
from datetime import date
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# ---------------------------------------------------------------------------
# Path setup — import engine from the project root
# ---------------------------------------------------------------------------
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from engine import custody_days, search_cases, rule_assessment, database_stats

DB_PATH = ROOT / "bail_reckoner.db"
FRONTEND = ROOT / "frontend"

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Bail Reckoner API",
    description="AI-assisted legal intelligence and bail assessment platform",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
