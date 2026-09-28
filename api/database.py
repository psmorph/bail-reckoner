"""
NyaySetu Platform — Database Connection & Schema Management
Manages SQLite connections and creates additive platform tables
without touching the original 5 NyaySetu tables.
"""
from __future__ import annotations

import os
import sqlite3
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "bail_reckoner.db"


def _db_path() -> Path:
    """Return the database path (can be overridden via env)."""
    url = os.getenv("DATABASE_URL", "")
    if url.startswith("sqlite:///"):
        return Path(url.replace("sqlite:///", ""))
    return DB_PATH


def get_connection() -> sqlite3.Connection:
    """Create a new SQLite connection with WAL mode and FK enforcement."""
    conn = sqlite3.connect(str(_db_path()), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


@contextmanager
def get_db():
    """Context manager yielding a database connection with auto-commit."""
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def generate_id(prefix: str = "") -> str:
    """Generate a unique ID with optional prefix, e.g. 'DOC-abcd1234'."""
    short = uuid.uuid4().hex[:12]
    return f"{prefix}{short}" if prefix else short


def now_iso() -> str:
    """Return current UTC timestamp in ISO format."""
    return datetime.now(timezone.utc).isoformat()


def generate_case_id() -> str:
    """Generate a case ID like CASE-2026-00001."""
    year = datetime.now(timezone.utc).year
    with get_db() as conn:
        row = conn.execute(
            "SELECT COUNT(*) as cnt FROM cases WHERE id LIKE ?",
            (f"CASE-{year}-%",),
        ).fetchone()
        seq = (row["cnt"] if row else 0) + 1
    return f"CASE-{year}-{seq:05d}"


# ── Platform Schema (ADDITIVE ONLY) ──────────────────────────────────────

PLATFORM_SCHEMA = """
-- Roles
CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT DEFAULT '',
    permissions TEXT DEFAULT '[]',
    hierarchy_level INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Organizations
CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'police_station',
    parent_id TEXT REFERENCES organizations(id),
    level TEXT DEFAULT 'station',
    jurisdiction TEXT DEFAULT '',
    address TEXT DEFAULT '',
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Users
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    phone TEXT DEFAULT '',
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role_id TEXT NOT NULL REFERENCES roles(id),
    organization_id TEXT REFERENCES organizations(id),
    is_active INTEGER DEFAULT 1,
    last_login TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Cases
CREATE TABLE IF NOT EXISTS cases (
    id TEXT PRIMARY KEY,
    fir_number TEXT DEFAULT '',
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    status TEXT DEFAULT 'active',
    case_type TEXT DEFAULT 'criminal',
    sections TEXT DEFAULT '',
    special_laws TEXT DEFAULT '',
    police_station TEXT DEFAULT '',
    district TEXT DEFAULT '',
    state TEXT DEFAULT '',
    accused_name TEXT DEFAULT '',
    accused_details TEXT DEFAULT '{}',
    complainant_name TEXT DEFAULT '',
    created_by TEXT NOT NULL REFERENCES users(id),
    assigned_investigator TEXT REFERENCES users(id),
    assigned_forensic TEXT REFERENCES users(id),
    organization_id TEXT REFERENCES organizations(id),
    priority TEXT DEFAULT 'normal',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Documents
CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES cases(id),
    doc_type TEXT NOT NULL DEFAULT 'other',
    file_name TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT DEFAULT '',
    file_size INTEGER DEFAULT 0,
    uploaded_by TEXT NOT NULL REFERENCES users(id),
    uploader_role TEXT DEFAULT '',
    sha256_hash TEXT DEFAULT '',
    encrypted INTEGER DEFAULT 0,
    encryption_key_ref TEXT DEFAULT '',
    blockchain_tx_id TEXT DEFAULT '',
    verification_status TEXT DEFAULT 'pending',
    version INTEGER DEFAULT 1,
    is_deleted INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    last_accessed TEXT DEFAULT (datetime('now'))
);

-- Document Versions
CREATE TABLE IF NOT EXISTS document_versions (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL REFERENCES documents(id),
    version INTEGER NOT NULL,
    sha256_hash TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER DEFAULT 0,
    uploaded_by TEXT NOT NULL REFERENCES users(id),
    change_note TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
);

-- Evidence
CREATE TABLE IF NOT EXISTS evidence (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES cases(id),
    evidence_type TEXT NOT NULL DEFAULT 'physical',
    description TEXT DEFAULT '',
    source TEXT DEFAULT '',
    collected_by TEXT REFERENCES users(id),
    collection_time TEXT DEFAULT '',
    location TEXT DEFAULT '',
    current_custodian TEXT REFERENCES users(id),
    status TEXT DEFAULT 'collected',
    sha256_hash TEXT DEFAULT '',
    blockchain_tx_id TEXT DEFAULT '',
    forensic_status TEXT DEFAULT 'pending',
    related_document_id TEXT REFERENCES documents(id),
    metadata_json TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Evidence Transfers (Chain of Custody)
CREATE TABLE IF NOT EXISTS evidence_transfers (
    id TEXT PRIMARY KEY,
    evidence_id TEXT NOT NULL REFERENCES evidence(id),
    from_user TEXT NOT NULL REFERENCES users(id),
    to_user TEXT NOT NULL REFERENCES users(id),
    from_org TEXT REFERENCES organizations(id),
    to_org TEXT REFERENCES organizations(id),
    transfer_time TEXT DEFAULT (datetime('now')),
    reason TEXT DEFAULT '',
    status TEXT DEFAULT 'completed',
    acknowledged INTEGER DEFAULT 0,
    acknowledged_at TEXT
);

-- Investigations
CREATE TABLE IF NOT EXISTS investigations (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES cases(id),
    investigator_id TEXT NOT NULL REFERENCES users(id),
    entry_type TEXT DEFAULT 'diary',
    title TEXT NOT NULL,
    content TEXT DEFAULT '',
    findings TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Forensic Reports
CREATE TABLE IF NOT EXISTS forensic_reports (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES cases(id),
    evidence_id TEXT REFERENCES evidence(id),
    report_type TEXT DEFAULT 'analysis',
    title TEXT NOT NULL DEFAULT '',
    findings TEXT DEFAULT '',
    conclusion TEXT DEFAULT '',
    officer_id TEXT NOT NULL REFERENCES users(id),
    lab_name TEXT DEFAULT '',
    document_id TEXT REFERENCES documents(id),
    status TEXT DEFAULT 'draft',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Court Proceedings
CREATE TABLE IF NOT EXISTS court_proceedings (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES cases(id),
    hearing_date TEXT NOT NULL,
    hearing_type TEXT DEFAULT 'regular',
    court_name TEXT DEFAULT '',
    presiding_officer TEXT DEFAULT '',
    summary TEXT DEFAULT '',
    order_text TEXT DEFAULT '',
    next_date TEXT,
    document_id TEXT REFERENCES documents(id),
    created_by TEXT NOT NULL REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now'))
);

-- Bail Analyses
CREATE TABLE IF NOT EXISTS bail_analyses (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES cases(id),
    requested_by TEXT NOT NULL REFERENCES users(id),
    analysis_result TEXT DEFAULT '{}',
    document_ids_used TEXT DEFAULT '[]',
    source_references TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now'))
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    user_email TEXT DEFAULT '',
    user_role TEXT DEFAULT '',
    action TEXT NOT NULL,
    entity_type TEXT DEFAULT '',
    entity_id TEXT DEFAULT '',
    case_id TEXT DEFAULT '',
    document_id TEXT DEFAULT '',
    ip_address TEXT DEFAULT '',
    user_agent TEXT DEFAULT '',
    result TEXT DEFAULT 'success',
    severity TEXT DEFAULT 'info',
    metadata TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now'))
);

-- Blockchain Records
CREATE TABLE IF NOT EXISTS blockchain_records (
    id TEXT PRIMARY KEY,
    document_id TEXT REFERENCES documents(id),
    evidence_id TEXT REFERENCES evidence(id),
    case_id TEXT DEFAULT '',
    sha256_hash TEXT NOT NULL,
    previous_hash TEXT DEFAULT '0',
    block_index INTEGER NOT NULL,
    timestamp TEXT DEFAULT (datetime('now')),
    authority TEXT DEFAULT '',
    authority_type TEXT DEFAULT '',
    status TEXT DEFAULT 'confirmed',
    nonce INTEGER DEFAULT 0,
    block_hash TEXT NOT NULL,
    metadata TEXT DEFAULT '{}'
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    type TEXT DEFAULT 'info',
    title TEXT NOT NULL,
    body TEXT DEFAULT '',
    link TEXT DEFAULT '',
    is_read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Case Transfers
CREATE TABLE IF NOT EXISTS case_transfers (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES cases(id),
    from_org TEXT NOT NULL REFERENCES organizations(id),
    to_org TEXT NOT NULL REFERENCES organizations(id),
    sender TEXT NOT NULL REFERENCES users(id),
    receiver TEXT REFERENCES users(id),
    reason TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now')),
    resolved_at TEXT
);

-- User Cryptographic Key Pairs (Ed25519)
CREATE TABLE IF NOT EXISTS user_keys (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE REFERENCES users(id),
    public_key_hex TEXT NOT NULL,
    encrypted_private_key TEXT NOT NULL,
    algorithm TEXT DEFAULT 'Ed25519',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Digital Signatures
CREATE TABLE IF NOT EXISTS digital_signatures (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL REFERENCES documents(id),
    signer_id TEXT NOT NULL REFERENCES users(id),
    signer_name TEXT NOT NULL,
    signer_role TEXT DEFAULT '',
    signature_hex TEXT NOT NULL,
    public_key_hex TEXT NOT NULL,
    sha256_hash TEXT NOT NULL,
    algorithm TEXT DEFAULT 'Ed25519',
    verification_status TEXT DEFAULT 'valid',
    signed_at TEXT DEFAULT (datetime('now'))
);

-- Key Rotation Logs
CREATE TABLE IF NOT EXISTS key_rotation_logs (
    id TEXT PRIMARY KEY,
    rotated_by TEXT NOT NULL REFERENCES users(id),
    old_key_version INTEGER NOT NULL,
    new_key_version INTEGER NOT NULL,
    algorithm TEXT DEFAULT 'AES-256-GCM',
    items_reencrypted INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_case ON documents(case_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploader ON documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_evidence_case ON evidence(case_id);
CREATE INDEX IF NOT EXISTS idx_investigations_case ON investigations(case_id);
CREATE INDEX IF NOT EXISTS idx_forensic_case ON forensic_reports(case_id);
CREATE INDEX IF NOT EXISTS idx_court_case ON court_proceedings(case_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_case ON audit_logs(case_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_blockchain_doc ON blockchain_records(document_id);
CREATE INDEX IF NOT EXISTS idx_blockchain_hash ON blockchain_records(sha256_hash);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_org ON cases(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_signatures_doc ON digital_signatures(document_id);
CREATE INDEX IF NOT EXISTS idx_signatures_signer ON digital_signatures(signer_id);

"""


def init_platform_tables():
    """Create all platform tables if they don't exist. Fully additive."""
    with get_db() as conn:
        conn.executescript(PLATFORM_SCHEMA)
    print("[DB] Platform tables initialized.")


if __name__ == "__main__":
    init_platform_tables()
    print("[DB] Done. Database ready at:", _db_path())
