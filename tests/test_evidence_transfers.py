from api.database import get_db


CASE_ID = "CASE-2026-00001"


def _create_evidence(client, headers):
    response = client.post(
        "/api/evidence",
        headers=headers,
        json={"case_id": CASE_ID, "description": "Transfer test evidence"},
    )
    assert response.status_code == 200, response.text
    return response.json()["evidence_id"]


def _user_id(email):
    with get_db() as conn:
        user = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
    assert user
    return user["id"]


def test_evidence_transfer_requires_acknowledgment_and_blocks_second_pending(client, login_as):
    custodian_headers = login_as("si.sharma@police.dl.in")
    recipient_headers = login_as("io.singh@police.dl.in")
    evidence_id = _create_evidence(client, custodian_headers)
    custodian_id = _user_id("si.sharma@police.dl.in")
    recipient_id = _user_id("io.singh@police.dl.in")

    request = client.post(
        f"/api/evidence/{evidence_id}/transfer",
        headers=custodian_headers,
        json={"to_user_id": recipient_id, "reason": "For investigation"},
    )
    assert request.status_code == 200, request.text
    transfer_id = request.json()["transfer_id"]

    with get_db() as conn:
        evidence = conn.execute(
            "SELECT current_custodian FROM evidence WHERE id = ?",
            (evidence_id,),
        ).fetchone()
        transfer = conn.execute(
            "SELECT status, acknowledged FROM evidence_transfers WHERE id = ?",
            (transfer_id,),
        ).fetchone()
    assert evidence["current_custodian"] == custodian_id
    assert transfer["status"] == "pending"
    assert transfer["acknowledged"] == 0

    duplicate = client.post(
        f"/api/evidence/{evidence_id}/transfer",
        headers=custodian_headers,
        json={"to_user_id": recipient_id, "reason": "Duplicate"},
    )
    assert duplicate.status_code == 409

    wrong_recipient = client.post(
        f"/api/evidence/transfers/{transfer_id}/acknowledge",
        headers=custodian_headers,
    )
    assert wrong_recipient.status_code == 403

    acknowledged = client.post(
        f"/api/evidence/transfers/{transfer_id}/acknowledge",
        headers=recipient_headers,
    )
    assert acknowledged.status_code == 200, acknowledged.text
    with get_db() as conn:
        evidence = conn.execute(
            "SELECT current_custodian FROM evidence WHERE id = ?",
            (evidence_id,),
        ).fetchone()
        transfer = conn.execute(
            "SELECT status, acknowledged, acknowledged_at FROM evidence_transfers WHERE id = ?",
            (transfer_id,),
        ).fetchone()
    assert evidence["current_custodian"] == recipient_id
    assert transfer["status"] == "completed"
    assert transfer["acknowledged"] == 1
    assert transfer["acknowledged_at"]

    chain = client.get(f"/api/evidence/{evidence_id}", headers=recipient_headers).json()["chain_of_custody"]
    assert chain[0]["status"] == "completed"
    assert chain[0]["acknowledged"] == 1


def test_evidence_transfer_rejection_does_not_change_custodian(client, login_as):
    custodian_headers = login_as("si.sharma@police.dl.in")
    recipient_headers = login_as("io.singh@police.dl.in")
    evidence_id = _create_evidence(client, custodian_headers)
    custodian_id = _user_id("si.sharma@police.dl.in")
    recipient_id = _user_id("io.singh@police.dl.in")
    requested = client.post(
        f"/api/evidence/{evidence_id}/transfer",
        headers=custodian_headers,
        json={"to_user_id": recipient_id},
    )
    assert requested.status_code == 200
    transfer_id = requested.json()["transfer_id"]

    rejected = client.post(
        f"/api/evidence/transfers/{transfer_id}/reject",
        headers=recipient_headers,
    )
    assert rejected.status_code == 200, rejected.text
    with get_db() as conn:
        evidence = conn.execute(
            "SELECT current_custodian FROM evidence WHERE id = ?",
            (evidence_id,),
        ).fetchone()
        transfer = conn.execute(
            "SELECT status, acknowledged FROM evidence_transfers WHERE id = ?",
            (transfer_id,),
        ).fetchone()
    assert evidence["current_custodian"] == custodian_id
    assert transfer["status"] == "rejected"
    assert transfer["acknowledged"] == 0


def test_non_custodian_and_self_transfer_are_denied(client, login_as):
    custodian_headers = login_as("si.sharma@police.dl.in")
    investigator_headers = login_as("io.singh@police.dl.in")
    evidence_id = _create_evidence(client, custodian_headers)

    unauthorized = client.post(
        f"/api/evidence/{evidence_id}/transfer",
        headers=investigator_headers,
        json={"to_user_id": _user_id("sp.central@police.dl.in")},
    )
    assert unauthorized.status_code == 403

    self_transfer = client.post(
        f"/api/evidence/{evidence_id}/transfer",
        headers=custodian_headers,
        json={"to_user_id": _user_id("si.sharma@police.dl.in")},
    )
    assert self_transfer.status_code == 400
