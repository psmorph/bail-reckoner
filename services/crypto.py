"""
Bail Reckoner Platform — Cryptographic Services
SHA-256 hashing and Fernet symmetric encryption for document security.
"""
from __future__ import annotations

import hashlib
import os
from pathlib import Path


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


def get_fernet():
    """Get a Fernet cipher using the key from environment variables."""
    from cryptography.fernet import Fernet
    key = os.getenv("DOCUMENT_ENCRYPTION_KEY", "")
    if not key or key == "change-me-generate-a-fernet-key":
        # Generate a key for development if not configured
        key = Fernet.generate_key().decode()
        os.environ["DOCUMENT_ENCRYPTION_KEY"] = key
    return Fernet(key.encode() if isinstance(key, str) else key)


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
