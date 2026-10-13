from concurrent.futures import ThreadPoolExecutor
from api.database import generate_id, get_db, init_platform_tables
from services import blockchain


def test_concurrent_block_registration_is_contiguous_and_valid(monkeypatch, isolated_db):
    init_platform_tables()
    monkeypatch.setattr(blockchain, "DIFFICULTY", 1)
    with get_db() as conn:
        conn.execute("INSERT INTO roles (id, name) VALUES ('test-role', 'Test Role')")
        conn.execute(
            "INSERT INTO users (id, email, password_hash, full_name, role_id) "
            "VALUES ('test-user', 'blockchain@example.test', 'hash', 'Test User', 'test-role')"
        )
        conn.execute(
            "INSERT INTO cases (id, title, created_by) VALUES ('test-case', 'Test Case', 'test-user')"
        )
        doc_ids = [generate_id("DOC-") for _ in range(8)]
        conn.executemany(
            "INSERT INTO documents (id, case_id, file_name, original_name, uploaded_by) "
            "VALUES (?, 'test-case', ?, ?, 'test-user')",
            [(doc_id, f"{doc_id}.txt", f"{doc_id}.txt") for doc_id in doc_ids],
        )

    def register(doc_id):
        return blockchain.register_document(
            document_id=doc_id,
            case_id="test-case",
            sha256_hash=f"hash-{doc_id}",
            authority="Test User",
            authority_type="test-role",
        )

    with ThreadPoolExecutor(max_workers=8) as pool:
        blocks = list(pool.map(register, doc_ids))

    indices = sorted(block["block_index"] for block in blocks)
    assert indices == list(range(8))
    assert len({block["block_index"] for block in blocks}) == 8
    assert blockchain.verify_chain_integrity()["valid"]


def test_duplicate_document_registration_returns_http_409(client, login_as):
    from api.database import get_db

    doc_id = generate_id("DOC-")
    with get_db() as conn:
        user = conn.execute(
            "SELECT id FROM users WHERE email = 'admin@bailreckoner.in'"
        ).fetchone()
        case = conn.execute("SELECT id FROM cases LIMIT 1").fetchone()
        assert user and case
        conn.execute(
            """INSERT INTO documents
               (id, case_id, file_name, original_name, uploaded_by, sha256_hash)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (doc_id, case["id"], doc_id + ".txt", doc_id + ".txt", user["id"], "a" * 64),
        )

    headers = login_as("admin@bailreckoner.in")
    payload = {"document_id": doc_id}
    first = client.post("/api/blockchain/register", headers=headers, json=payload)
    assert first.status_code == 200, first.text
    second = client.post("/api/blockchain/register", headers=headers, json=payload)
    assert second.status_code == 409, second.text
    assert second.json()["detail"]["block"]["record_id"] == first.json()["record_id"]

    with get_db() as conn:
        conn.execute("UPDATE documents SET sha256_hash = ? WHERE id = ?", ("b" * 64, doc_id))
    changed = client.post("/api/blockchain/register", headers=headers, json=payload)
    assert changed.status_code == 200, changed.text
    assert changed.json()["block_index"] == first.json()["block_index"] + 1
