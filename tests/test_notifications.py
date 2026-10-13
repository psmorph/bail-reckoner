from api.database import get_db


CASE_ID = "CASE-2026-00001"


def _user_id(email):
    with get_db() as conn:
        user = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
    assert user
    return user["id"]


def _has_notification(user_id, title, body_fragment=""):
    with get_db() as conn:
        row = conn.execute(
            """SELECT id FROM notifications
               WHERE user_id = ? AND title = ? AND body LIKE ?
               ORDER BY created_at DESC LIMIT 1""",
            (user_id, title, f"%{body_fragment}%"),
        ).fetchone()
    return row is not None


def test_assignment_and_upload_notify_recipients_without_actor(client, login_as):
    admin_headers = login_as("admin@bailreckoner.in")
    assignee_id = _user_id("io.singh@police.dl.in")
    creator_id = _user_id("si.sharma@police.dl.in")
    admin_id = _user_id("admin@bailreckoner.in")

    with get_db() as conn:
        conn.execute(
            "UPDATE cases SET assigned_investigator = NULL WHERE id = ?",
            (CASE_ID,),
        )
        conn.execute(
            "DELETE FROM notifications WHERE title IN ('Case assigned', 'Document uploaded') "
            "AND user_id IN (?, ?, ?)",
            (assignee_id, creator_id, admin_id),
        )

    assigned = client.put(
        f"/api/cases/{CASE_ID}",
        headers=admin_headers,
        json={"assigned_investigator": assignee_id},
    )
    assert assigned.status_code == 200, assigned.text
    assert _has_notification(assignee_id, "Case assigned", CASE_ID)
    assert not _has_notification(admin_id, "Case assigned", CASE_ID)

    uploaded = client.post(
        "/api/documents",
        params={"case_id": CASE_ID},
        headers=admin_headers,
        files={"file": ("notification-check.txt", b"notification payload", "text/plain")},
    )
    assert uploaded.status_code == 201, uploaded.text
    doc_id = uploaded.json()["document_id"]
    with get_db() as conn:
        notified = conn.execute(
            "SELECT user_id FROM notifications WHERE title = 'Document uploaded' AND link = ?",
            (f"/documents/{doc_id}",),
        ).fetchall()
    assert {row["user_id"] for row in notified} == {creator_id, assignee_id}
    assert not _has_notification(admin_id, "Document uploaded", CASE_ID)

    notifications = client.get("/api/notifications", headers=login_as("io.singh@police.dl.in"))
    assert notifications.status_code == 200
    assert notifications.json()["notifications"]
    assert set(notifications.json()["notifications"][0]) == {
        "id", "type", "title", "body", "link", "is_read", "created_at",
    }


def test_integrity_violation_notifies_admins_and_case_creator_urgently(client, login_as):
    admin_headers = login_as("admin@bailreckoner.in")
    admin_id = _user_id("admin@bailreckoner.in")
    creator_id = _user_id("si.sharma@police.dl.in")
    uploaded = client.post(
        "/api/documents",
        params={"case_id": CASE_ID},
        headers=admin_headers,
        files={"file": ("integrity-check.txt", b"original bytes", "text/plain")},
    )
    assert uploaded.status_code == 201, uploaded.text
    document_id = uploaded.json()["document_id"]
    with get_db() as conn:
        conn.execute("UPDATE documents SET sha256_hash = ? WHERE id = ?", ("0" * 64, document_id))

    result = client.post(f"/api/documents/{document_id}/verify", headers=admin_headers)
    assert result.status_code == 200, result.text
    assert result.json()["integrity_status"] == "compromised"
    with get_db() as conn:
        urgent = conn.execute(
            """SELECT user_id, type FROM notifications
               WHERE title = 'Document integrity violation' AND link = ?""",
            (f"/documents/{document_id}",),
        ).fetchall()
    assert {row["user_id"] for row in urgent} == {creator_id}
    assert all(row["type"] == "urgent" for row in urgent)
    assert not _has_notification(admin_id, "Document integrity violation", document_id)


def test_evidence_transfer_events_notify_the_other_party(client, login_as):
    custodian_headers = login_as("si.sharma@police.dl.in")
    recipient_headers = login_as("io.singh@police.dl.in")
    with get_db() as conn:
        conn.execute(
            "UPDATE cases SET assigned_investigator = 'USR-IO-01' WHERE id = ?",
            (CASE_ID,),
        )
    custodian_id = _user_id("si.sharma@police.dl.in")
    recipient_id = _user_id("io.singh@police.dl.in")
    created = client.post(
        "/api/evidence",
        headers=custodian_headers,
        json={"case_id": CASE_ID, "description": "Notification evidence"},
    )
    assert created.status_code == 200
    evidence_id = created.json()["evidence_id"]

    requested = client.post(
        f"/api/evidence/{evidence_id}/transfer",
        headers=custodian_headers,
        json={"to_user_id": recipient_id},
    )
    assert requested.status_code == 200
    transfer_id = requested.json()["transfer_id"]
    assert _has_notification(recipient_id, "Evidence transfer requested", evidence_id)

    acknowledged = client.post(
        f"/api/evidence/transfers/{transfer_id}/acknowledge",
        headers=recipient_headers,
    )
    assert acknowledged.status_code == 200
    assert _has_notification(custodian_id, "Evidence transfer acknowledged", transfer_id)

    second = client.post(
        "/api/evidence",
        headers=custodian_headers,
        json={"case_id": CASE_ID, "description": "Rejected transfer evidence"},
    )
    assert second.status_code == 200
    second_id = second.json()["evidence_id"]
    second_request = client.post(
        f"/api/evidence/{second_id}/transfer",
        headers=custodian_headers,
        json={"to_user_id": recipient_id},
    )
    assert second_request.status_code == 200
    second_transfer_id = second_request.json()["transfer_id"]
    rejected = client.post(
        f"/api/evidence/transfers/{second_transfer_id}/reject",
        headers=recipient_headers,
    )
    assert rejected.status_code == 200
    assert _has_notification(custodian_id, "Evidence transfer rejected", second_transfer_id)


def test_court_and_final_forensic_events_notify_case_creator(client, login_as):
    admin_headers = login_as("admin@bailreckoner.in")
    creator_id = _user_id("si.sharma@police.dl.in")

    proceeding = client.post(
        "/api/court-proceedings",
        headers=admin_headers,
        json={"case_id": CASE_ID, "hearing_date": "2026-11-03", "next_date": "2026-11-17"},
    )
    assert proceeding.status_code == 200, proceeding.text
    assert _has_notification(creator_id, "Court proceeding scheduled", "2026-11-17")

    with get_db() as conn:
        conn.execute(
            "UPDATE cases SET assigned_forensic = 'USR-FORENSIC-01' WHERE id = ?",
            (CASE_ID,),
        )
    forensic_headers = login_as("dr.rao@fsl.dl.in")
    report = client.post(
        "/api/forensics",
        headers=forensic_headers,
        json={"case_id": CASE_ID, "title": "Final report notification"},
    )
    assert report.status_code == 200, report.text
    report_id = report.json()["report_id"]
    finalized = client.put(
        f"/api/forensics/{report_id}",
        headers=forensic_headers,
        json={"status": "final"},
    )
    assert finalized.status_code == 200, finalized.text
    assert _has_notification(creator_id, "Forensic report finalized", report_id)
    assert not _has_notification(_user_id("dr.rao@fsl.dl.in"), "Forensic report finalized", report_id)
