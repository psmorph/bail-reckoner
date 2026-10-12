import importlib

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
