"""Quick DB schema inspector - temporary script."""
import sqlite3
from pathlib import Path

db = Path(__file__).resolve().parent.parent / "bail_reckoner.db"
conn = sqlite3.connect(db)
cur = conn.cursor()
tables = cur.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
print("TABLES:", [t[0] for t in tables])
for t in tables:
    name = t[0]
    cols = cur.execute(f"PRAGMA table_info({name})").fetchall()
    count = cur.execute(f"SELECT COUNT(*) FROM {name}").fetchone()[0]
    print(f"\n--- {name} ({count} rows) ---")
    print("COLUMNS:", [(c[1], c[2]) for c in cols])
    rows = cur.execute(f"SELECT * FROM {name} LIMIT 2").fetchall()
    for r in rows:
        print("  ", r)
conn.close()
