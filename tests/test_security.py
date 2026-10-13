import importlib
import json
from pathlib import Path
import os
import subprocess
import sys

import pytest
from fastapi.testclient import TestClient

from api.database import init_platform_tables
from api.middleware import validate_jwt_secret
from services.crypto import get_fernet


def test_jwt_secret_is_required_in_production(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.delenv("JWT_SECRET_KEY", raising=False)
    with pytest.raises(RuntimeError, match="JWT_SECRET_KEY is required in production"):
        validate_jwt_secret()


def test_fernet_key_is_required_in_production(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.delenv("DOCUMENT_ENCRYPTION_KEY", raising=False)
    get_fernet.cache_clear()
    with pytest.raises(RuntimeError, match="DOCUMENT_ENCRYPTION_KEY is required"):
        get_fernet()


def test_only_exact_development_environment_allows_fallbacks(monkeypatch):
    monkeypatch.setenv("APP_ENV", "Development")
    monkeypatch.setenv("JWT_SECRET_KEY", "")
    monkeypatch.setenv("DOCUMENT_ENCRYPTION_KEY", "")
    get_fernet.cache_clear()

    with pytest.raises(RuntimeError, match="JWT_SECRET_KEY is required in production"):
        validate_jwt_secret()
    with pytest.raises(RuntimeError, match="DOCUMENT_ENCRYPTION_KEY is required"):
        get_fernet()


def test_public_registration_requires_authentication_when_disabled(monkeypatch, isolated_db):
    import api.main as main_module
    importlib.reload(main_module)
    init_platform_tables()

    client = TestClient(main_module.app)
    response = client.post(
        "/api/auth/register",
        json={
            "email": "new-user@example.com",
            "password": "StrongPassword123",
            "full_name": "New User",
            "role_id": "master_admin",
        },
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Authentication required"


def test_development_mode_allows_missing_secrets(monkeypatch):
    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.delenv("JWT_SECRET_KEY", raising=False)
    monkeypatch.delenv("DOCUMENT_ENCRYPTION_KEY", raising=False)

    secret = validate_jwt_secret()
    assert len(secret) >= 32

    fernet = get_fernet()
    assert fernet is not None


@pytest.mark.parametrize(
    ("jwt_secret", "encryption_key"),
    [("", "9w_H6D7q5fVnOe2y4NQ9h0a31G8lJ0m4qZf1nXq0b5s="), ("production-secret-key-32-characters-long", "")],
)
def test_production_startup_rejects_empty_secrets(monkeypatch, isolated_db, jwt_secret, encryption_key):
    import api.main as main_module

    monkeypatch.setenv("APP_ENV", "development")
    importlib.reload(main_module)
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("JWT_SECRET_KEY", jwt_secret)
    monkeypatch.setenv("DOCUMENT_ENCRYPTION_KEY", encryption_key)
    get_fernet.cache_clear()
    with pytest.raises(RuntimeError, match="Startup validation failed"):
        with TestClient(main_module.app):
            pass


def test_production_uvicorn_fails_with_empty_secrets():
    root = Path(__file__).resolve().parents[1]
    env = os.environ.copy()
    env.update({
        "APP_ENV": "production",
        "JWT_SECRET_KEY": "",
        "DOCUMENT_ENCRYPTION_KEY": "",
        "DATABASE_URL": f"sqlite:///{root / 'uvicorn-startup-test.db'}",
    })
    result = subprocess.run(
        [sys.executable, "-m", "uvicorn", "api.main:app", "--host", "127.0.0.1", "--port", "0"],
        cwd=root,
        env=env,
        capture_output=True,
        text=True,
        timeout=30,
    )
    assert result.returncode != 0
    assert "JWT_SECRET_KEY is required in production" in result.stderr


def test_settings_import_rejects_empty_production_secrets(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("JWT_SECRET_KEY", "")
    monkeypatch.setenv("DOCUMENT_ENCRYPTION_KEY", "")
    with pytest.raises(RuntimeError, match="JWT_SECRET_KEY is required in production"):
        importlib.reload(importlib.import_module("api.settings"))


def test_security_headers_include_content_security_policy(isolated_db):
    import api.main as main_module

    importlib.reload(main_module)
    with TestClient(main_module.app) as client:
        response = client.get("/")

    assert response.headers["Content-Security-Policy"] == (
        "default-src 'self'; script-src 'self'; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src https://fonts.gstatic.com; img-src 'self' data:; "
        "connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
    )


def test_public_registration_forces_viewer_role(monkeypatch, isolated_db):
    import api.main as main_module
    from api.database import get_db

    monkeypatch.setenv("ALLOW_PUBLIC_REGISTRATION", "true")
    importlib.reload(main_module)
    init_platform_tables()

    with TestClient(main_module.app) as client:
        response = client.post(
            "/api/auth/register",
            json={
                "email": "public-user@example.com",
                "password": "StrongPassword123",
                "full_name": "Public User",
                "role_id": "master_admin",
                "organization_id": "untrusted-org",
            },
        )

    assert response.status_code == 201
    with get_db() as conn:
        user = conn.execute("SELECT role_id, organization_id FROM users WHERE id = ?", (response.json()["user_id"],)).fetchone()
        role = conn.execute("SELECT permissions FROM roles WHERE id = ?", ("viewer",)).fetchone()
    assert user["role_id"] == "viewer"
    assert user["organization_id"] is None
    assert json.loads(role["permissions"]) == ["notification:read"]


def test_unfiltered_lists_only_return_accessible_cases(monkeypatch, isolated_db):
    import api.main as main_module
    from api.database import get_db
    from api.middleware import CurrentUser, get_current_user

    importlib.reload(main_module)
    init_platform_tables()
    with get_db() as conn:
        conn.execute("INSERT INTO roles (id, name) VALUES ('police_admin', 'Police Admin')")
        conn.executemany(
            "INSERT INTO organizations (id, name) VALUES (?, ?)",
            [("org-a", "Organization A"), ("org-b", "Organization B")],
        )
        conn.executemany(
            "INSERT INTO users (id, email, password_hash, full_name, role_id, organization_id) VALUES (?, ?, 'hash', ?, 'police_admin', ?)",
            [("user-a", "a@example.com", "User A", "org-a"), ("user-b", "b@example.com", "User B", "org-b")],
        )
        conn.executemany(
            "INSERT INTO cases (id, title, created_by, organization_id) VALUES (?, ?, ?, ?)",
            [("case-a", "Case A", "user-a", "org-a"), ("case-b", "Case B", "user-b", "org-b")],
        )
        conn.executemany(
            "INSERT INTO documents (id, case_id, file_name, original_name, uploaded_by) VALUES (?, ?, ?, ?, ?)",
            [("doc-a", "case-a", "a", "A", "user-a"), ("doc-b", "case-b", "b", "B", "user-b")],
        )
        conn.executemany(
            "INSERT INTO evidence (id, case_id) VALUES (?, ?)",
            [("evidence-a", "case-a"), ("evidence-b", "case-b")],
        )
        conn.executemany(
            "INSERT INTO investigations (id, case_id, investigator_id, title) VALUES (?, ?, ?, ?)",
            [("investigation-a", "case-a", "user-a", "A"), ("investigation-b", "case-b", "user-b", "B")],
        )
        conn.executemany(
            "INSERT INTO forensic_reports (id, case_id, title, officer_id) VALUES (?, ?, ?, ?)",
            [("forensic-a", "case-a", "A", "user-a"), ("forensic-b", "case-b", "B", "user-b")],
        )
        conn.executemany(
            "INSERT INTO court_proceedings (id, case_id, hearing_date, created_by) VALUES (?, ?, '2026-01-01', ?)",
            [("proceeding-a", "case-a", "user-a"), ("proceeding-b", "case-b", "user-b")],
        )
        conn.executemany(
            "INSERT INTO blockchain_records (id, case_id, sha256_hash, block_index, block_hash) VALUES (?, ?, 'hash', ?, 'block')",
            [("block-a", "case-a", 1), ("block-b", "case-b", 2)],
        )

    user = CurrentUser("user-a", "a@example.com", "police_admin", "User A", "org-a")
    main_module.app.dependency_overrides[get_current_user] = lambda: user
    try:
        with TestClient(main_module.app) as client:
            endpoints = {
                "/api/documents": ("documents", "doc-a"),
                "/api/evidence": ("evidence", "evidence-a"),
                "/api/investigations": ("entries", "investigation-a"),
                "/api/forensics": ("reports", "forensic-a"),
                "/api/court-proceedings": ("proceedings", "proceeding-a"),
                "/api/blockchain/chain": ("blocks", "block-a"),
            }
            for endpoint, (collection, allowed_id) in endpoints.items():
                response = client.get(endpoint)
                assert response.status_code == 200
                returned_ids = {item["id"] for item in response.json()[collection]}
                assert returned_ids == {allowed_id}

            cases = client.get("/api/cases").json()
            assert {item["id"] for item in cases["cases"]} == {"case-a"}
            stats = client.get("/api/cases/stats").json()
            assert stats["total_cases"] == 1
            assert stats["document_count"] == 1
            assert stats["evidence_count"] == 1

            denied = client.get("/api/documents", params={"case_id": "case-b"})
            assert denied.status_code == 404
            mismatched_blockchain_case = client.post(
                "/api/blockchain/register",
                json={"document_id": "doc-a", "case_id": "case-b"},
            )
            assert mismatched_blockchain_case.status_code == 404
            chain = client.get("/api/blockchain/chain").json()
            assert chain["chain_length"] == 1
            assert chain["latest_block"]["id"] == "block-a"
    finally:
        main_module.app.dependency_overrides.clear()


def test_registration_requires_role_management_permission(client, login_as):
    from api.database import get_db

    request_body = {
        "email": "created-user@example.com",
        "password": "StrongPassword123",
        "full_name": "Created User",
    }
    officer_headers = login_as("si.sharma@police.dl.in")
    officer_response = client.post(
        "/api/auth/register",
        headers=officer_headers,
        json={**request_body, "role_id": "viewer"},
    )
    assert officer_response.status_code == 403

    admin_headers = login_as("sp.central@police.dl.in")
    for role_id in ("master_admin", "police_admin"):
        response = client.post(
            "/api/auth/register",
            headers=admin_headers,
            json={**request_body, "email": f"{role_id}@example.com", "role_id": role_id},
        )
        assert response.status_code == 403

    same_org_body = {
        **request_body,
        "email": "same-org-viewer@example.com",
        "role_id": "viewer",
        "organization_id": "ORG-DIST-CENTRAL",
    }
    created = client.post("/api/auth/register", headers=admin_headers, json=same_org_body)
    assert created.status_code == 201
    duplicate = client.post("/api/auth/register", headers=admin_headers, json=same_org_body)
    assert duplicate.status_code == 409

    cross_org = client.post(
        "/api/auth/register",
        headers=admin_headers,
        json={**same_org_body, "email": "cross-org-user@example.com", "organization_id": "ORG-PS-SAKET"},
    )
    assert cross_org.status_code == 403

    weak_password = client.post(
        "/api/auth/register",
        headers=admin_headers,
        json={**same_org_body, "email": "weak-password@example.com", "password": "short"},
    )
    assert weak_password.status_code == 400

    with get_db() as conn:
        created_audit = conn.execute(
            "SELECT 1 FROM audit_logs WHERE action = 'user_created' AND user_email = ?",
            ("same-org-viewer@example.com",),
        ).fetchone()
        denied_audit = conn.execute(
            "SELECT 1 FROM audit_logs WHERE action = 'user_create_denied' AND user_email = ? AND result = 'failure'",
            ("created-user@example.com",),
        ).fetchone()
    assert created_audit
    assert denied_audit


def test_all_a5_routes_require_authentication(client):
    requests = (
        ("post", "/api/case/extract-text", {
            "files": {"file": ("case.pdf", b"%PDF-1.4\n", "application/pdf")},
        }),
        ("post", "/api/case/review", {"json": {}}),
        ("get", "/api/cases/search", {}),
        ("post", "/api/custody/calculate", {"json": {"arrest_date": "2026-01-01"}}),
        ("get", "/api/provisions", {}),
        ("get", "/api/provisions/categories", {}),
        ("get", "/api/custody-rules", {}),
        ("get", "/api/checklist", {}),
        ("get", "/api/judgments", {}),
        ("get", "/api/stats", {}),
    )
    for method, endpoint, kwargs in requests:
        response = getattr(client, method)(endpoint, **kwargs)
        assert response.status_code == 401, endpoint


def test_shared_database_and_config_hygiene_contracts():
    root = Path(__file__).resolve().parents[1]
    main_source = (root / "api" / "main.py").read_text(encoding="utf-8")
    ignore_source = (root / ".gitignore").read_text(encoding="utf-8")
    runner_source = (root / "run_web.py").read_text(encoding="utf-8")
    example_env = (root / ".env.example").read_text(encoding="utf-8")

    assert "sqlite3.connect(" not in main_source
    for required_pattern in ("secure_vault/", "*.db", "*.db-wal", "*.db-shm", ".env", ".dev_fernet_key"):
        assert required_pattern in ignore_source
    assert 'reload_dirs=["api", "services", "frontend"]' in runner_source
    assert "ALLOW_PUBLIC_REGISTRATION=false" in example_env


def test_seeded_cross_organization_access_is_denied(client, login_as):
    from api.database import get_db

    case_id = "CASE-2026-00001"
    sharma_headers = login_as("si.sharma@police.dl.in")
    upload = client.post(
        "/api/documents",
        params={"case_id": case_id, "doc_type": "evidence"},
        headers=sharma_headers,
        files={"file": ("private.txt", b"case-private-content", "text/plain")},
    )
    assert upload.status_code == 201, upload.text
    document_id = upload.json()["document_id"]

    evidence_response = client.post(
        "/api/evidence",
        headers=sharma_headers,
        json={"case_id": case_id, "description": "Private evidence"},
    )
    assert evidence_response.status_code == 200, evidence_response.text
    evidence_id = evidence_response.json()["evidence_id"]

    proceeding_response = client.post(
        "/api/court-proceedings",
        headers=sharma_headers,
        json={"case_id": case_id, "hearing_date": "2026-10-15"},
    )
    assert proceeding_response.status_code == 200, proceeding_response.text
    proceeding_id = proceeding_response.json()["proceeding_id"]

    forensic_headers = login_as("dr.rao@fsl.dl.in")
    with get_db() as conn:
        conn.execute("UPDATE cases SET assigned_forensic = 'USR-FORENSIC-01' WHERE id = ?", (case_id,))

    report_response = client.post(
        "/api/forensics",
        headers=forensic_headers,
        json={"case_id": case_id, "title": "Private forensic report"},
    )
    assert report_response.status_code == 200, report_response.text
    report_id = report_response.json()["report_id"]

    blockchain_response = client.post(
        "/api/blockchain/register",
        headers=sharma_headers,
        json={"document_id": document_id, "case_id": case_id},
    )
    assert blockchain_response.status_code == 200, blockchain_response.text

    verma_headers = login_as("si.verma@police.dl.in")
    for method, endpoint in (
        ("get", f"/api/documents/{document_id}"),
        ("get", f"/api/documents/{document_id}/download"),
        ("post", f"/api/documents/{document_id}/verify"),
        ("get", f"/api/evidence/{evidence_id}"),
        ("get", f"/api/court-proceedings/{proceeding_id}"),
        ("get", f"/api/blockchain/verify/{document_id}"),
    ):
        response = getattr(client, method)(endpoint, headers=verma_headers)
        assert response.status_code == 404, endpoint

    assert document_id not in {item["id"] for item in client.get("/api/documents", headers=verma_headers).json()["documents"]}
    assert evidence_id not in {item["id"] for item in client.get("/api/evidence", headers=verma_headers).json()["evidence"]}
    assert proceeding_id not in {item["id"] for item in client.get("/api/court-proceedings", headers=verma_headers).json()["proceedings"]}
    visible_blocks = client.get("/api/blockchain/chain", headers=verma_headers).json()["blocks"]
    assert case_id not in {block["case_id"] for block in visible_blocks}

    forensic_get = client.get(f"/api/forensics/{report_id}", headers=verma_headers)
    assert forensic_get.status_code == 404
    forensic_list = client.get("/api/forensics", headers=verma_headers).json()["reports"]
    assert report_id not in {item["id"] for item in forensic_list}


def test_organization_match_requires_both_ids():
    from api.access import _org_matches

    assert not _org_matches("", "")
    assert not _org_matches("org-a", "")
    assert not _org_matches("", "org-a")
    assert _org_matches("org-a", "org-a")


def test_orgless_user_cannot_access_orgless_case(monkeypatch, isolated_db):
    from fastapi import HTTPException

    from api.access import check_case_access
    from api.database import get_db, init_platform_tables
    from api.middleware import CurrentUser

    init_platform_tables()
    with get_db() as conn:
        conn.execute("INSERT INTO roles (id, name) VALUES ('police_officer', 'Police Officer')")
        conn.executemany(
            """INSERT INTO users (id, email, password_hash, full_name, role_id, organization_id)
               VALUES (?, ?, 'hash', ?, 'police_officer', NULL)""",
            [
                ("unrelated-user", "unrelated@example.test", "Unrelated"),
                ("case-owner", "owner@example.test", "Case Owner"),
            ],
        )
        conn.execute(
            """INSERT INTO cases (id, title, created_by, organization_id)
               VALUES ('orgless-case', 'Organization-less case', 'case-owner', NULL)"""
        )

    user = CurrentUser("unrelated-user", "unrelated@example.test", "police_officer", "Unrelated")
    with get_db() as conn:
        with pytest.raises(HTTPException) as error:
            check_case_access(conn, "orgless-case", user)
    assert error.value.status_code == 404
