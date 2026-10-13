import sqlite3
from contextlib import contextmanager

import pytest

from api.database import get_db


def _upload(client, headers, filename, data, content_type="text/plain"):
    return client.post(
        "/api/documents",
        params={"case_id": "CASE-2026-00001"},
        headers=headers,
        files={"file": (filename, data, content_type)},
    )


def test_upload_rejects_mismatched_magic_bytes(client, login_as):
    response = _upload(client, login_as("si.sharma@police.dl.in"), "spoof.pdf", b"plain text")
    assert response.status_code == 400


def test_upload_stores_detected_mime_not_client_content_type(client, login_as):
    headers = login_as("si.sharma@police.dl.in")
    response = _upload(client, headers, "naïve.txt", "valid UTF-8".encode(), "image/png")
    assert response.status_code == 201, response.text

    with get_db() as conn:
        row = conn.execute(
            "SELECT mime_type FROM documents WHERE id = ?",
            (response.json()["document_id"],),
        ).fetchone()
    assert row["mime_type"] == "text/plain"
    downloaded = client.get(
        f"/api/documents/{response.json()['document_id']}/download",
        headers=headers,
    )
    assert downloaded.status_code == 200
    assert downloaded.headers["content-type"] == "application/octet-stream"
    assert "filename*=UTF-8''na%C3%AFve.txt" in downloaded.headers["content-disposition"]
    assert downloaded.headers["x-content-type-options"] == "nosniff"


def test_upload_rejects_oversize_and_empty_files(monkeypatch, client, login_as):
    import api.documents as documents

    monkeypatch.setattr(documents, "MAX_FILE_SIZE", 3)
    headers = login_as("si.sharma@police.dl.in")
    oversize = _upload(client, headers, "large.txt", b"four", "text/plain")
    empty = _upload(client, headers, "empty.txt", b"", "text/plain")
    assert oversize.status_code == 413
    assert empty.status_code == 400


def test_upload_db_failure_removes_encrypted_file(monkeypatch, tmp_path, client, login_as):
    import api.documents as documents

    monkeypatch.setenv("SECURE_VAULT_PATH", str(tmp_path / "vault"))
    real_get_db = documents.get_db
    calls = 0

    @contextmanager
    def fail_document_insert():
        nonlocal calls
        calls += 1
        if calls == 2:
            raise sqlite3.OperationalError("simulated document insert failure")
        with real_get_db() as conn:
            yield conn

    monkeypatch.setattr(documents, "get_db", fail_document_insert)
    with pytest.raises(sqlite3.OperationalError, match="simulated document insert failure"):
        _upload(
            client,
            login_as("si.sharma@police.dl.in"),
            "orphan.txt",
            b"valid text",
        )

    vault = tmp_path / "vault"
    assert vault.exists()
    assert list(vault.iterdir()) == []


def test_malware_detection_fails_closed_and_is_audited(monkeypatch, client, login_as):
    import api.documents as documents

    monkeypatch.setattr(documents, "scan_bytes", lambda _data: False)
    response = _upload(client, login_as("si.sharma@police.dl.in"), "infected.txt", b"infected")
    assert response.status_code == 422

    with get_db() as conn:
        event = conn.execute(
            "SELECT severity, result FROM audit_logs WHERE action = 'malware_detected' "
            "ORDER BY created_at DESC LIMIT 1"
        ).fetchone()
    assert event["severity"] == "critical"
    assert event["result"] == "failure"


def test_malware_scanner_error_fails_closed_and_is_audited(monkeypatch, client, login_as):
    import api.documents as documents

    def scanner_error(_data):
        raise RuntimeError("ClamAV unavailable")

    monkeypatch.setattr(documents, "scan_bytes", scanner_error)
    response = _upload(client, login_as("si.sharma@police.dl.in"), "unscanned.txt", b"valid text")
    assert response.status_code == 422

    with get_db() as conn:
        event = conn.execute(
            "SELECT severity, result FROM audit_logs WHERE action = 'malware_scan_failed' "
            "ORDER BY created_at DESC LIMIT 1"
        ).fetchone()
    assert event["severity"] == "critical"
    assert event["result"] == "failure"
