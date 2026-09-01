"""Create a normalized, deduplicated dataset. Original input is never written."""
from __future__ import annotations
import argparse, ast, csv, json, re
from datetime import datetime
from pathlib import Path
from inspect_dataset import load

FIELDS = ["case_id", "case_title", "court", "date", "ipc_sections", "bail_type", "bail_outcome", "facts", "legal_issues", "judgment_reason", "summary", "special_laws", "crime_type", "region", "source_filename"]

def clean(value):
    if value is None: return ""
    text = str(value).strip()
    if text.lower() in {"nan", "none", "null", "unknown", "n/a"}: return ""
    try:
        parsed = ast.literal_eval(text)
        if isinstance(parsed, (list, tuple)): return "; ".join(map(str, parsed))
    except (ValueError, SyntaxError): pass
    return re.sub(r"\s+", " ", text)

def normalize_date(value):
    text = clean(value)
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%Y/%m/%d"):
        try: return datetime.strptime(text[:10], fmt).date().isoformat()
        except ValueError: pass
    return text

def main(source, output):
    raw = load(source); retained = []; seen = set(); malformed = 0; duplicates = 0
    for row in raw:
        item = {field: clean(row.get(field, "")) for field in FIELDS}
        item["date"] = normalize_date(item["date"])
        if not item["case_title"] or not item["facts"] and not item["summary"]:
            malformed += 1; continue
        keys = [("id", item["case_id"])] if item["case_id"] else []
        keys.append(("title_date", item["case_title"].lower(), item["date"]))
        if any(key in seen for key in keys):
            duplicates += 1; continue
        seen.update(keys)
        item["year"] = item["date"][:4] if len(item["date"]) >= 4 else ""
        item["search_text"] = "\n".join(item[field] for field in ("case_title", "court", "ipc_sections", "special_laws", "crime_type", "facts", "legal_issues", "judgment_reason", "summary"))
        retained.append(item)
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=[*FIELDS, "year", "search_text"]); writer.writeheader(); writer.writerows(retained)
    report = {"records_loaded": len(raw), "malformed_removed": malformed, "duplicates_removed": duplicates, "records_retained": len(retained), "output": str(output)}
    (output.parent / "preprocessing_report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))

if __name__ == "__main__":
    parser = argparse.ArgumentParser(); parser.add_argument("source", type=Path); parser.add_argument("--output", type=Path, default=Path("data/processed_judgments.csv")); args = parser.parse_args(); main(args.source, args.output)
