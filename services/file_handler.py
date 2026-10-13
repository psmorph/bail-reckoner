"""
NyaySetu Platform — Secure File Handler
MIME validation, filename sanitization, and secure storage operations.
"""
from __future__ import annotations

import os
import re
import tempfile
import uuid
import zipfile
from io import BytesIO
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VAULT_DIR = ROOT / "secure_vault"

# Allowed MIME types and extensions
ALLOWED_TYPES = {
    "application/pdf": [".pdf"],
    "image/jpeg": [".jpg", ".jpeg"],
    "image/png": [".png"],
    "image/tiff": [".tif", ".tiff"],
    "application/msword": [".doc"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    "text/plain": [".txt"],
}

ALLOWED_EXTENSIONS = {ext for exts in ALLOWED_TYPES.values() for ext in exts}

MAX_FILE_SIZE = int(os.getenv("MAX_UPLOAD_SIZE_MB", "50")) * 1024 * 1024  # Default 50 MB


def get_vault_path() -> Path:
    """Get the secure vault directory, creating it if necessary."""
    vault = Path(os.getenv("SECURE_VAULT_PATH", str(VAULT_DIR)))
    vault.mkdir(parents=True, exist_ok=True)
    return vault


def sanitize_filename(filename: str) -> str:
    """Remove dangerous characters from filenames."""
    # Remove path separators and null bytes
    name = filename.replace("/", "_").replace("\\", "_").replace("\0", "")
    # Remove any character that isn't alphanumeric, dash, underscore, or dot
    name = re.sub(r"[^\w\-.]", "_", name)
    # Limit length
    if len(name) > 200:
        ext = Path(name).suffix
        name = name[:200 - len(ext)] + ext
    return name or "unnamed_file"


def validate_extension(filename: str) -> bool:
    """Check if the file extension is allowed."""
    ext = Path(filename).suffix.lower()
    return ext in ALLOWED_EXTENSIONS


def validate_mime_type(content_type: str) -> bool:
    """Check if the MIME type is allowed."""
    if not content_type:
        return False
    return content_type.lower() in ALLOWED_TYPES


def validate_file_size(size: int) -> bool:
    """Check if file size is within limits."""
    return 0 < size <= MAX_FILE_SIZE


def detect_mime_type(data: bytes) -> str | None:
    """Detect an allowed file type from its contents."""
    if data.startswith(b"%PDF-"):
        return "application/pdf"
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if data.startswith((b"II*\0", b"MM\0*")):
        return "image/tiff"
    if data.startswith(b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"):
        return "application/msword"
    if data.startswith(b"PK\x03\x04"):
        try:
            with zipfile.ZipFile(BytesIO(data)) as archive:
                names = set(archive.namelist())
            if "[Content_Types].xml" in names and any(name.startswith("word/") for name in names):
                return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        except (OSError, zipfile.BadZipFile):
            return None
    if b"\0" not in data:
        try:
            data.decode("utf-8")
        except UnicodeDecodeError:
            return None
        return "text/plain"
    return None


def extension_matches_mime(filename: str, mime_type: str) -> bool:
    """Check that a filename extension agrees with the detected content type."""
    return Path(filename).suffix.lower() in ALLOWED_TYPES.get(mime_type, [])


def generate_storage_filename(original: str) -> str:
    """Generate a unique storage filename preserving the extension."""
    ext = Path(original).suffix.lower()
    return f"{uuid.uuid4().hex}{ext}"


def get_file_path(storage_name: str) -> Path:
    """Get the full path to a stored file."""
    return get_vault_path() / storage_name


def store_file(data: bytes, storage_name: str, encrypt: bool = True) -> Path:
    """Store file data securely using an atomic temporary-file rename."""
    vault = get_vault_path()
    file_path = vault / storage_name

    if encrypt:
        from services.crypto import encrypt_bytes
        data = encrypt_bytes(data)
        file_path = vault / (storage_name + ".enc")

    temp_path = vault / f".{uuid.uuid4().hex}.tmp"
    try:
        with temp_path.open("wb") as destination:
            destination.write(data)
            destination.flush()
            os.fsync(destination.fileno())
        os.replace(temp_path, file_path)
    finally:
        temp_path.unlink(missing_ok=True)
    return file_path


def retrieve_file(storage_name: str, encrypted: bool = True) -> bytes:
    """Retrieve file data, decrypting if necessary."""
    vault = get_vault_path()

    if encrypted:
        file_path = vault / (storage_name + ".enc")
        if file_path.exists():
            from services.crypto import decrypt_bytes
            return decrypt_bytes(file_path.read_bytes())

    # Try unencrypted
    file_path = vault / storage_name
    if file_path.exists():
        return file_path.read_bytes()

    raise FileNotFoundError(f"File not found: {storage_name}")


def delete_file(storage_name: str) -> bool:
    """Delete a stored file (both encrypted and unencrypted versions)."""
    vault = get_vault_path()
    deleted = False
    for suffix in ("", ".enc"):
        path = vault / (storage_name + suffix)
        if path.exists():
            path.unlink()
            deleted = True
    return deleted
