"""
NyaySetu Platform — Local Permissioned Blockchain
A real (not faked) blockchain for document integrity proofs.
Each block contains a document hash, previous block hash, and is mined with a nonce.
"""
from __future__ import annotations

import hashlib
import json
from api.database import get_db, generate_id, now_iso


DIFFICULTY = 4  # Number of leading zeros in block hash (easy for demo speed)


def _compute_block_hash(block_index: int, previous_hash: str, timestamp: str,
                        sha256_hash: str, authority: str, nonce: int) -> str:
    """Compute the SHA-256 hash of a block's contents."""
    block_string = f"{block_index}{previous_hash}{timestamp}{sha256_hash}{authority}{nonce}"
    return hashlib.sha256(block_string.encode()).hexdigest()


def _mine_block(block_index: int, previous_hash: str, timestamp: str,
                sha256_hash: str, authority: str) -> tuple[int, str]:
    """Simple proof-of-work: find a nonce that produces a hash with leading zeros."""
    nonce = 0
    prefix = "0" * DIFFICULTY
    while True:
        block_hash = _compute_block_hash(block_index, previous_hash, timestamp,
                                          sha256_hash, authority, nonce)
        if block_hash.startswith(prefix):
            return nonce, block_hash
        nonce += 1
        if nonce > 1_000_000:  # Safety limit for demo
            return nonce, block_hash


def get_chain_length() -> int:
    """Get the current length of the blockchain."""
    with get_db() as conn:
        row = conn.execute("SELECT COUNT(*) FROM blockchain_records").fetchone()
        return row[0] if row else 0


def get_latest_block() -> dict | None:
    """Get the most recent block in the chain."""
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM blockchain_records ORDER BY block_index DESC LIMIT 1"
        ).fetchone()
        return dict(row) if row else None


def register_document(
    document_id: str,
    case_id: str,
    sha256_hash: str,
    authority: str,
    authority_type: str,
    evidence_id: str = "",
) -> dict:
    """
    Register a document's integrity proof on the blockchain.
    This actually mines a block with proof-of-work.
    """
    latest = get_latest_block()
    block_index = (latest["block_index"] + 1) if latest else 0
    previous_hash = latest["block_hash"] if latest else "0" * 64
    timestamp = now_iso()

    # Mine the block (real computation, not faked)
    nonce, block_hash = _mine_block(block_index, previous_hash, timestamp,
                                     sha256_hash, authority)

    record_id = generate_id("BLK-")

    with get_db() as conn:
        conn.execute(
            """INSERT INTO blockchain_records
               (id, document_id, evidence_id, case_id, sha256_hash, previous_hash,
                block_index, timestamp, authority, authority_type, status, nonce, block_hash, metadata)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?, '{}')""",
            (
                record_id, document_id, evidence_id or None, case_id,
                sha256_hash, previous_hash, block_index, timestamp,
                authority, authority_type, nonce, block_hash,
            ),
        )

    return {
        "record_id": record_id,
        "block_index": block_index,
        "block_hash": block_hash,
        "previous_hash": previous_hash,
        "sha256_hash": sha256_hash,
        "nonce": nonce,
        "timestamp": timestamp,
        "authority": authority,
    }


def verify_chain_integrity() -> dict:
    """
    Verify the entire blockchain is intact:
    - Each block's hash is correctly computed
    - Each block's previous_hash matches the preceding block
    """
    with get_db() as conn:
        blocks = conn.execute(
            "SELECT * FROM blockchain_records ORDER BY block_index ASC"
        ).fetchall()

    if not blocks:
        return {"valid": True, "blocks_checked": 0, "violations": []}

    violations = []
    for i, block in enumerate(blocks):
        b = dict(block)

        # Verify block hash
        computed = _compute_block_hash(
            b["block_index"], b["previous_hash"], b["timestamp"],
            b["sha256_hash"], b["authority"], b["nonce"],
        )
        if computed != b["block_hash"]:
            violations.append({
                "block_index": b["block_index"],
                "type": "hash_mismatch",
                "expected": b["block_hash"],
                "computed": computed,
            })

        # Verify chain linkage (skip genesis block)
        if i > 0:
            prev = dict(blocks[i - 1])
            if b["previous_hash"] != prev["block_hash"]:
                violations.append({
                    "block_index": b["block_index"],
                    "type": "chain_break",
                    "expected_previous": prev["block_hash"],
                    "actual_previous": b["previous_hash"],
                })

    return {
        "valid": len(violations) == 0,
        "blocks_checked": len(blocks),
        "violations": violations,
    }


def get_document_blockchain_record(document_id: str) -> dict | None:
    """Get the blockchain record for a specific document."""
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM blockchain_records WHERE document_id = ? ORDER BY timestamp DESC LIMIT 1",
            (document_id,),
        ).fetchone()
    return dict(row) if row else None
