"""
NyaySetu Platform — Cryptographic Services
SHA-256 hashing and Fernet symmetric encryption for document security.
"""
from __future__ import annotations

import hashlib
import os
from functools import lru_cache
from pathlib import Path

DEFAULT_FERNET_KEY = "change-me-generate-a-fernet-key"


def sha256_hash_bytes(data: bytes) -> str:
    """Compute SHA-256 hash of raw bytes. Returns hex digest."""
    return hashlib.sha256(data).hexdigest()


def sha256_hash_file(file_path: str | Path) -> str:
    """Compute SHA-256 hash of a file. Reads in chunks for large files."""
    h = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(8192):
            h.update(chunk)
    return h.hexdigest()


@lru_cache(maxsize=1)
def get_fernet():
    """Get a valid Fernet cipher using the configured environment key."""
    from cryptography.fernet import Fernet

    key = os.getenv("DOCUMENT_ENCRYPTION_KEY")
    app_env = os.getenv("APP_ENV", "production").lower()
    dev_key_path = Path(__file__).resolve().parent.parent / ".dev_fernet_key"
    key_value = key.strip() if isinstance(key, str) else ""

    if app_env == "development":
        if not key_value or key_value == DEFAULT_FERNET_KEY:
            if dev_key_path.exists():
                key_value = dev_key_path.read_text(encoding="utf-8").strip()
            else:
                key_value = Fernet.generate_key().decode()
                dev_key_path.write_text(key_value, encoding="utf-8")
                print("WARNING: DOCUMENT_ENCRYPTION_KEY missing; using a development-only key stored at .dev_fernet_key")
    elif not key_value or key_value == DEFAULT_FERNET_KEY:
        raise RuntimeError("DOCUMENT_ENCRYPTION_KEY is required and must be a valid Fernet key.")

    try:
        return Fernet(key_value.encode() if isinstance(key_value, str) else key_value)
    except Exception as exc:
        raise RuntimeError("DOCUMENT_ENCRYPTION_KEY is not a valid Fernet key.") from exc


def encrypt_bytes(data: bytes) -> bytes:
    """Encrypt data using Fernet symmetric encryption."""
    return get_fernet().encrypt(data)


def decrypt_bytes(encrypted_data: bytes) -> bytes:
    """Decrypt data using Fernet symmetric encryption."""
    return get_fernet().decrypt(encrypted_data)


def encrypt_file(source_path: str | Path, dest_path: str | Path) -> str:
    """Encrypt a file. Returns the SHA-256 hash of the ORIGINAL (pre-encryption) data."""
    data = Path(source_path).read_bytes()
    original_hash = sha256_hash_bytes(data)
    encrypted = encrypt_bytes(data)
    Path(dest_path).write_bytes(encrypted)
    return original_hash


def decrypt_file(source_path: str | Path, dest_path: str | Path) -> None:
    """Decrypt a file to the destination path."""
    encrypted = Path(source_path).read_bytes()
    decrypted = decrypt_bytes(encrypted)
    Path(dest_path).write_bytes(decrypted)


def verify_hash(data: bytes, expected_hash: str) -> bool:
    """Verify that data matches the expected SHA-256 hash."""
    return sha256_hash_bytes(data) == expected_hash


def generate_fernet_key() -> str:
    """Generate a new Fernet key (utility function)."""
    from cryptography.fernet import Fernet
    return Fernet.generate_key().decode()
