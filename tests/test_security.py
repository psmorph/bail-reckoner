import importlib
import json

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

    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("JWT_SECRET_KEY", jwt_secret)
    monkeypatch.setenv("DOCUMENT_ENCRYPTION_KEY", encryption_key)
    get_fernet.cache_clear()
    importlib.reload(main_module)

    with pytest.raises(RuntimeError, match="Startup validation failed"):
        with TestClient(main_module.app):
            pass


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
