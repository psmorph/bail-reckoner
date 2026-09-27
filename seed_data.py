"""
Bail Reckoner Platform — Seed Data
Creates demo users, roles, organizations, and a sample case for testing.
Run once after database initialization:  python seed_data.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

# Ensure project root is on path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from api.database import get_db, generate_id, now_iso, init_platform_tables
from services.rbac import ROLE_PERMISSIONS, ROLE_HIERARCHY, get_role_display_name


def _hash_password(password: str) -> str:
    from passlib.context import CryptContext
    ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
    return ctx.hash(password)


def seed_roles():
    """Insert all role definitions."""
    with get_db() as conn:
        for role_id, perms in ROLE_PERMISSIONS.items():
            existing = conn.execute("SELECT id FROM roles WHERE id = ?", (role_id,)).fetchone()
            if not existing:
                conn.execute(
                    """INSERT INTO roles (id, name, description, permissions, hierarchy_level, created_at)
                       VALUES (?, ?, ?, ?, ?, ?)""",
                    (
                        role_id,
                        get_role_display_name(role_id),
                        f"Auto-generated role: {get_role_display_name(role_id)}",
                        json.dumps(perms),
                        ROLE_HIERARCHY.get(role_id, 0),
                        now_iso(),
                    ),
                )
    print("[SEED] Roles seeded.")


def seed_organizations():
    """Insert demo organizational hierarchy."""
    orgs = [
        # National level
        ("ORG-NATIONAL", "National Law Enforcement Authority", "national", None, "national", "All India"),
        # State
        ("ORG-STATE-DL", "Delhi Police", "state", "ORG-NATIONAL", "state", "Delhi NCT"),
        ("ORG-STATE-MH", "Maharashtra Police", "state", "ORG-NATIONAL", "state", "Maharashtra"),
        # District
        ("ORG-DIST-CENTRAL", "Central District, Delhi", "district", "ORG-STATE-DL", "district", "Central Delhi"),
        ("ORG-DIST-SOUTH", "South District, Delhi", "district", "ORG-STATE-DL", "district", "South Delhi"),
        # Police Stations
        ("ORG-PS-CP", "PS Connaught Place", "police_station", "ORG-DIST-CENTRAL", "station", "Connaught Place"),
        ("ORG-PS-ITO", "PS ITO", "police_station", "ORG-DIST-CENTRAL", "station", "ITO"),
        ("ORG-PS-SAKET", "PS Saket", "police_station", "ORG-DIST-SOUTH", "station", "Saket"),
        # Courts
        ("ORG-COURT-PHC", "Patiala House Court", "court", None, "district_court", "New Delhi"),
        ("ORG-COURT-SAKET", "Saket District Court", "court", None, "district_court", "South Delhi"),
        ("ORG-COURT-DHC", "Delhi High Court", "court", None, "high_court", "Delhi NCT"),
        # Forensic
        ("ORG-FSL-DL", "Forensic Science Laboratory, Delhi", "forensic_lab", None, "state_lab", "Delhi NCT"),
        ("ORG-CFSL", "Central Forensic Science Lab", "forensic_lab", None, "central_lab", "All India"),
    ]
    with get_db() as conn:
        for org_id, name, otype, parent, level, jurisdiction in orgs:
            existing = conn.execute("SELECT id FROM organizations WHERE id = ?", (org_id,)).fetchone()
            if not existing:
                conn.execute(
                    """INSERT INTO organizations (id, name, type, parent_id, level, jurisdiction, is_active, created_at)
                       VALUES (?, ?, ?, ?, ?, ?, 1, ?)""",
                    (org_id, name, otype, parent, level, jurisdiction, now_iso()),
                )
    print("[SEED] Organizations seeded.")


def seed_users():
    """Insert demo users for each role. All demo passwords are 'demo1234'."""
    demo_pw = _hash_password("demo1234")
    users = [
        # (id, email, phone, full_name, role_id, organization_id)
        ("USR-ADMIN", "admin@bailreckoner.in", "+91-9000000001", "System Administrator", "master_admin", None),
        ("USR-POLICE-ADMIN", "sp.central@police.dl.in", "+91-9000000002", "SP Rajesh Kumar", "police_admin", "ORG-DIST-CENTRAL"),
        ("USR-POLICE-01", "si.sharma@police.dl.in", "+91-9000000003", "SI Amit Sharma", "police_officer", "ORG-PS-CP"),
        ("USR-POLICE-02", "si.verma@police.dl.in", "+91-9000000004", "SI Priya Verma", "police_officer", "ORG-PS-SAKET"),
        ("USR-IO-01", "io.singh@police.dl.in", "+91-9000000005", "IO Vikram Singh", "investigator", "ORG-PS-CP"),
        ("USR-IO-02", "io.gupta@police.dl.in", "+91-9000000006", "IO Meera Gupta", "investigator", "ORG-PS-SAKET"),
        ("USR-FORENSIC-01", "dr.rao@fsl.dl.in", "+91-9000000007", "Dr. Suresh Rao", "forensic_officer", "ORG-FSL-DL"),
        ("USR-FORENSIC-02", "dr.khan@cfsl.in", "+91-9000000008", "Dr. Farah Khan", "forensic_officer", "ORG-CFSL"),
        ("USR-COURT-ADMIN", "registrar@phc.dl.in", "+91-9000000009", "Court Registrar, Patiala House", "court_admin", "ORG-COURT-PHC"),
        ("USR-COURT-01", "officer.jain@phc.dl.in", "+91-9000000010", "Court Officer Ankita Jain", "court_officer", "ORG-COURT-PHC"),
        ("USR-COURT-02", "officer.das@saket.dl.in", "+91-9000000011", "Court Officer Sanjay Das", "court_officer", "ORG-COURT-SAKET"),
        ("USR-AUDITOR", "auditor@bailreckoner.in", "+91-9000000012", "Audit Inspector", "auditor", None),
    ]
    with get_db() as conn:
        for uid, email, phone, name, role_id, org_id in users:
            existing = conn.execute("SELECT id FROM users WHERE id = ?", (uid,)).fetchone()
            if not existing:
                conn.execute(
                    """INSERT INTO users (id, email, phone, password_hash, full_name, role_id,
                       organization_id, is_active, created_at, updated_at)
                       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)""",
                    (uid, email, phone, demo_pw, name, role_id, org_id, now_iso(), now_iso()),
                )
    print("[SEED] Demo users seeded (password for all: demo1234).")


def seed_sample_case():
    """Create a demo case with timeline entries."""
    case_id = "CASE-2026-00001"
    with get_db() as conn:
        existing = conn.execute("SELECT id FROM cases WHERE id = ?", (case_id,)).fetchone()
        if existing:
            print("[SEED] Sample case already exists.")
            return

        conn.execute(
            """INSERT INTO cases (id, fir_number, title, description, status, case_type,
               sections, special_laws, police_station, district, state,
               accused_name, complainant_name, created_by, organization_id,
               priority, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                case_id,
                "FIR/2026/DL/000123",
                "State v. Fictional Accused — Cheating & Forgery",
                "Accused is charged with cheating by dishonest inducement, creating forged "
                "documents, and using those forged documents. The complainant alleges financial "
                "fraud through forged property documents causing significant financial loss.",
                "active",
                "criminal",
                "420, 468, 471",
                "",
                "PS Connaught Place",
                "Central Delhi",
                "Delhi",
                "Fictional Accused Person",
                "Fictional Complainant",
                "USR-POLICE-01",
                "ORG-PS-CP",
                "high",
                now_iso(),
                now_iso(),
            ),
        )
    print(f"[SEED] Sample case {case_id} created.")


def run_seed():
    """Run all seed operations."""
    print("\n=== Bail Reckoner Platform — Seeding Database ===\n")
    init_platform_tables()
    seed_roles()
    seed_organizations()
    seed_users()
    seed_sample_case()
    print("\n=== Seeding complete ===\n")
    print("Demo accounts (all use password: demo1234):")
    print("  admin@bailreckoner.in         — Master Admin")
    print("  sp.central@police.dl.in       — Police Admin")
    print("  si.sharma@police.dl.in        — Police Officer")
    print("  io.singh@police.dl.in         — Investigator")
    print("  dr.rao@fsl.dl.in              — Forensic Officer")
    print("  registrar@phc.dl.in           — Court Admin")
    print("  officer.jain@phc.dl.in        — Court Officer")
    print("  auditor@bailreckoner.in       — Auditor")
    print()


if __name__ == "__main__":
    run_seed()
