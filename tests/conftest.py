import os
from pathlib import Path

import pytest


def _secure_env(monkeypatch):
    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.setenv("JWT_SECRET_KEY", "development-secret-key-32chars-long!")
    monkeypatch.setenv("DOCUMENT_ENCRYPTION_KEY", "9w_H6D7q5fVnOe2y4NQ9h0a31G8lJ0m4qZf1nXq0b5s=")
    monkeypatch.setenv("ALLOW_PUBLIC_REGISTRATION", "false")


@pytest.fixture
def secure_env(monkeypatch):
    _secure_env(monkeypatch)
    yield


@pytest.fixture
def isolated_db(monkeypatch, tmp_path):
    _secure_env(monkeypatch)
    db_file = tmp_path / "bail_reckoner_test.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_file}")
    yield db_file
