import os
import secrets
import tempfile
from pathlib import Path

import pytest
from cryptography.fernet import Fernet


TEST_ROOT = Path(tempfile.mkdtemp(prefix="nyay-setu-tests-"))
os.environ.update({
    "APP_ENV": "development",
    "DATABASE_URL": f"sqlite:///{TEST_ROOT / 'platform.db'}",
    "JWT_SECRET_KEY": secrets.token_urlsafe(48),
    "DOCUMENT_ENCRYPTION_KEY": Fernet.generate_key().decode(),
    "SECURE_VAULT_PATH": str(TEST_ROOT / "secure_vault"),
    "ALLOW_PUBLIC_REGISTRATION": "false",
})


def _secure_env(monkeypatch, tmp_path):
    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{tmp_path / 'isolated.db'}")
    monkeypatch.setenv("JWT_SECRET_KEY", secrets.token_urlsafe(48))
    monkeypatch.setenv("DOCUMENT_ENCRYPTION_KEY", Fernet.generate_key().decode())
    monkeypatch.setenv("SECURE_VAULT_PATH", str(tmp_path / "secure_vault"))
    monkeypatch.setenv("ALLOW_PUBLIC_REGISTRATION", "false")


@pytest.fixture
def secure_env(monkeypatch, tmp_path):
    _secure_env(monkeypatch, tmp_path)
    yield


@pytest.fixture
def isolated_db(monkeypatch, tmp_path):
    _secure_env(monkeypatch, tmp_path)
    db_file = tmp_path / "bail_reckoner_test.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_file}")
    yield db_file


@pytest.fixture(scope="session")
def client():
    import seed_data
    from fastapi.testclient import TestClient
    from api.main import app

    seed_data.run_seed()
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def login_as(client):
    def _login_as(email):
        response = client.post("/api/auth/login", json={"email": email, "password": "demo1234"})
        assert response.status_code == 200, response.text
        return {"Authorization": f"Bearer {response.json()['access_token']}"}

    return _login_as
