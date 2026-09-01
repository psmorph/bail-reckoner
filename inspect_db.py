import sqlite3

conn = sqlite3.connect("bail_reckoner.db")
cursor = conn.cursor()

tables = [
    "offenses",
    "special_acts_offenses",
    "judgments",
    "procedural_checklist",
    "custody_rules"
]

for table in tables:
    print("\n" + "=" * 80)
    print(f"TABLE: {table}")
    print("=" * 80)

    rows = cursor.execute(f"SELECT * FROM {table}").fetchall()

    for row in rows:
        print(row)

conn.close()