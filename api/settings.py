"""Application configuration loading and startup validation."""
from __future__ import annotations

from pathlib import Path

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None

if load_dotenv is not None:
    load_dotenv(Path(__file__).resolve().parent.parent / ".env", override=False)

from api.middleware import validate_jwt_secret
from services.crypto import get_fernet

validate_jwt_secret()
get_fernet()
