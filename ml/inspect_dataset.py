"""Inspect CSV, JSON, Excel, or PDF input without modifying it."""
from __future__ import annotations
import argparse, csv, json
from pathlib import Path

EXPECTED = {"case_title", "court", "date", "ipc_sections", "bail_type", "bail_outcome", "facts", "legal_issues", "judgment_reason", "summary", "special_laws"}

def load(path):
    suffix = path.suffix.lower()
    if suffix == ".csv":
        with path.open(encoding="utf-8-sig", newline="") as handle:
            return list(csv.DictReader(handle))
    if suffix == ".json":
        value = json.loads(path.read_text(encoding="utf-8"))
        return value if isinstance(value, list) else value.get("data", value.get("records", []))
    if suffix in {".xlsx", ".xls"}:
        import pandas as pd
        return pd.read_excel(path).fillna("").to_dict("records")
    if suffix == ".pdf":
        from pypdf import PdfReader
        return [{"text": page.extract_text() or ""} for page in PdfReader(str(path)).pages]
    raise ValueError(f"Unsupported input format: {suffix}")

def inspect(path):
    rows = load(path)
    columns = list(rows[0]) if rows else []
    missing = {key: sum(not str(row.get(key, "") or "").strip() for row in rows) for key in columns}
    ids = [str(row.get("case_id", "")) for row in rows if row.get("case_id")]
    title_dates = [(str(row.get("case_title", "")).strip().lower(), str(row.get("date", "")).strip()) for row in rows]
    print(json.dumps({"path": str(path), "records_loaded": len(rows), "columns": columns,
        "expected_columns_present": sorted(EXPECTED & set(columns)), "missing_by_column": missing,
        "duplicate_case_ids": len(ids) - len(set(ids)), "duplicate_title_date_pairs": len(title_dates) - len(set(title_dates))}, indent=2))
    return rows

if __name__ == "__main__":
    parser = argparse.ArgumentParser(); parser.add_argument("path", type=Path)
    inspect(parser.parse_args().path)
