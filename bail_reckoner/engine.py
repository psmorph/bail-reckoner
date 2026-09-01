"""Explainable retrieval and rule-based screening helpers for Bail Reckoner."""
from __future__ import annotations

import json
import re
import sqlite3
from datetime import date, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DB_PATH = ROOT / "bail_reckoner.db"
VECTOR_DIR = ROOT / "vector_store"


def parse_date(value):
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    text = str(value or "").strip()
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%Y/%m/%d"):
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            pass
    raise ValueError(f"Unrecognised date: {text}")


def custody_days(arrest_date, calculation_date=None):
    start = parse_date(arrest_date)
    end = parse_date(calculation_date) if calculation_date else date.today()
    if start > end:
        raise ValueError("Arrest date cannot be in the future")
    return (end - start).days


def _load_json(name):
    path = VECTOR_DIR / name
    if not path.exists():
        return []
    return json.loads(path.read_text(encoding="utf-8"))


def search_cases(query, top_k=5, filters=None):
    """Search FAISS embeddings when available, otherwise use TF-IDF cosine search."""
    filters = filters or {}
    metadata = _load_json("metadata.json")
    if not metadata:
        return []
    candidates = [row for row in metadata if _matches(row, filters)]
    if not candidates:
        return []
    try:
        import numpy as np
        from sentence_transformers import SentenceTransformer
        import faiss
        model_name = (VECTOR_DIR / "model.txt").read_text(encoding="utf-8").strip()
        model = SentenceTransformer(model_name)
        vector = model.encode([query], normalize_embeddings=True)
        index = faiss.read_index(str(VECTOR_DIR / "index.faiss"))
        scores, ids = index.search(np.asarray(vector, dtype="float32"), min(len(metadata), top_k * 5))
        allowed = {row["row_id"] for row in candidates}
        result = []
        for score, row_id in zip(scores[0], ids[0]):
            if int(row_id) in allowed:
                row = dict(metadata[int(row_id)])
                row["similarity"] = round(float(score), 4)
                result.append(row)
            if len(result) >= top_k:
                break
        return result
    except (ImportError, FileNotFoundError, RuntimeError):
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.metrics.pairwise import cosine_similarity
        texts = [row.get("search_text", "") for row in candidates]
        matrix = TfidfVectorizer(stop_words="english", max_features=50000).fit_transform(texts + [query])
        scores = cosine_similarity(matrix[-1], matrix[:-1]).ravel()
        ranked = sorted(zip(scores, candidates), key=lambda item: item[0], reverse=True)[:top_k]
        return [{**row, "similarity": round(float(score), 4)} for score, row in ranked]


def _matches(row, filters):
    for key, expected in filters.items():
        if expected in (None, "", "All"):
            continue
        value = str(row.get(key, ""))
        if key == "year":
            if str(row.get("year", "")) != str(expected):
                return False
        elif key == "ipc_sections":
            if str(expected).lower() not in value.lower():
                return False
        elif value != str(expected):
            return False
    return True


def rule_assessment(sections, special_laws, bail_type, custody_days_value, charge_sheet, first_time,
                    flight_risk, witness_risk, evidence_risk):
    """Return review triggers only; this function never recommends an outcome."""
    triggers = []
    sections_text = f"{sections} {special_laws}".lower()
    if "uapa" in sections_text or "ndps" in sections_text or "pmla" in sections_text:
        triggers.append("Special-statute restrictions may apply; verify the governing Act and current case law.")
    if bail_type == "Default/statutory" and not charge_sheet:
        triggers.append("Potential default-bail issue: verify the applicable 60/90/180-day period and filing record.")
    if first_time and custody_days_value >= 120:
        triggers.append("First-time-offender and custody duration should be checked against the applicable statutory rule.")
    if custody_days_value >= 180:
        triggers.append("Prolonged custody is a review factor; compare custody with trial progress and statutory limits.")
    for label, value in (("flight", flight_risk), ("witness", witness_risk), ("evidence", evidence_risk)):
        if value:
            triggers.append(f"Recorded {label} risk requires fact-specific judicial/legal review.")
    return {"status": "Review required", "triggers": triggers or ["No automated trigger was recorded; this is not a bail decision."],
            "disclaimer": "Informational retrieval and issue spotting only. It does not predict, approve, or reject bail."}


def database_stats():
    if not DB_PATH.exists():
        return {}
    with sqlite3.connect(DB_PATH) as conn:
        return {name: conn.execute(f"SELECT COUNT(*) FROM {name}").fetchone()[0]
                for name in ("judgments", "offenses", "special_acts_offenses", "procedural_checklist", "custody_rules")
                if _table_exists(conn, name)}


def _table_exists(conn, name):
    return conn.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (name,)).fetchone() is not None
