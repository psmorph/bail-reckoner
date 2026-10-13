# NyaySetu — AI-Assisted Legal Intelligence Platform

An explainable bail-judgment retrieval prototype for Indian legal-tech research. It retrieves similar historical judgments and surfaces rule-based review triggers. It does **not** predict, approve, reject, or guarantee bail and is not legal advice.

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                    Frontend (Vanilla JS SPA)              │
│  ├── Landing / Login / Purpose Selection                  │
│  ├── Case Management (Search, Upload, Analysis, Details)  │
│  ├── Bail Review (Assessment + Similar Judgments)          │
│  ├── Legal Provisions Browser                             │
│  ├── Lawyer Discovery & Profiles                          │
│  ├── Role Dashboards (Lawyer / Police / Judicial / Admin) │
│  ├── Document Management & Blockchain Explorer            │
│  ├── Legal Aid Resources & Notifications                  │
│  └── i18n (English / Hindi / Marathi)                     │
├──────────────────────────────────────────────────────────┤
│                    FastAPI Backend (Python)                │
│  ├── Auth (JWT + bcrypt + RBAC)                           │
│  ├── Cases CRUD + Timeline                                │
│  ├── Documents (upload, verify, download)                 │
│  ├── Evidence (CRUD + chain-of-custody transfers)         │
│  ├── Investigations (diary entries)                       │
│  ├── Forensic Reports (CRUD + status tracking)            │
│  ├── Court Proceedings (hearings, orders, scheduling)     │
│  ├── Blockchain (PoW mining, document integrity)          │
│  ├── Notifications (per-user, read/unread)                │
│  ├── Audit Logs (immutable trail)                         │
│  └── Original Engine (search, assessment, custody calc)   │
├──────────────────────────────────────────────────────────┤
│                    Services Layer                         │
│  ├── Blockchain (SHA-256 PoW local ledger)                │
│  ├── Crypto (AES-256 Fernet encryption at rest)           │
│  ├── File Handler (MIME validation, sanitization)         │
│  ├── RBAC (8 roles, 30+ granular permissions)             │
│  └── Audit (immutable action logging)                     │
├──────────────────────────────────────────────────────────┤
│                    Data Layer                              │
│  ├── SQLite + WAL mode (17+ tables)                       │
│  ├── FAISS vector store (MiniLM-L6-v2 embeddings)         │
│  └── Encrypted file vault (secure_vault/)                 │
└──────────────────────────────────────────────────────────┘
```

## Setup

From this directory:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
Copy-Item .env.example .env
python -m pip install -r requirements.txt
python -m pip install -r requirements-web.txt
python -m pip install -r requirements-dev.txt
```

Replace the placeholder keys in `.env`; do not commit that file. Generate secrets locally:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

### Environment variables

| Variable | Purpose | Default / requirement |
|----------|---------|-----------------------|
| `APP_ENV` | Runtime mode; demo login helpers are shown only in `development` | `production` |
| `JWT_SECRET_KEY` | Signs authentication tokens | Required in production; use a generated secret |
| `DOCUMENT_ENCRYPTION_KEY` | Encrypts documents in the vault | Required in production; use a Fernet key |
| `JWT_ALGORITHM` | JWT signing algorithm | `HS256` |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | Token lifetime | `60` |
| `DATABASE_URL` | SQLite database URL | Project `bail_reckoner.db` |
| `SECURE_VAULT_PATH` | Encrypted document storage directory | `secure_vault/` |
| `MAX_UPLOAD_SIZE_MB` | Maximum document upload size | `50` |
| `ALLOW_PUBLIC_REGISTRATION` | Enables restricted public registration | `false` |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | Empty (same-origin) |
| `CLAMAV_HOST` / `CLAMAV_PORT` | ClamAV service used to scan uploads | Host unset; port `3310` |

## Running the Platform

### Web Application (FastAPI + Frontend SPA)

For local development only, seed the demo users and sample case, then start the app:

```powershell
$env:APP_ENV = "development"
python seed_data.py

python run_web.py
# → opens http://localhost:8000
```

> **Never run `seed_data.py` in production.** It creates demo users with a published shared password and fictional case data. Demo mode must remain disabled in production.

### Create the first production administrator

After setting production secrets and the production `DATABASE_URL` in `.env`, run this one-time command from the repository root. It prompts for the administrator credentials without echoing the password and creates only the master-admin role (if missing) and account:

```powershell
$bootstrap = @'
import api.settings
import json
from getpass import getpass
from passlib.context import CryptContext
from api.database import generate_id, get_db, init_platform_tables, now_iso
from services.rbac import ROLE_HIERARCHY, ROLE_PERMISSIONS, get_role_display_name

init_platform_tables()
email = input("Administrator email: ").strip().lower()
full_name = input("Administrator full name: ").strip()
password = getpass("Administrator password (12+ characters, letters and digits): ")
if "@" not in email or not full_name:
    raise SystemExit("A valid email and full name are required.")
if len(password) < 12 or not any(ch.isalpha() for ch in password) or not any(ch.isdigit() for ch in password):
    raise SystemExit("Password must be at least 12 characters and contain letters and digits.")
password_hash = CryptContext(schemes=["bcrypt"], deprecated="auto").hash(password)
now = now_iso()
with get_db() as conn:
    if conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone():
        raise SystemExit("That email is already registered.")
    if not conn.execute("SELECT id FROM roles WHERE id = 'master_admin'").fetchone():
        conn.execute(
            "INSERT INTO roles (id, name, description, permissions, hierarchy_level, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            ("master_admin", get_role_display_name("master_admin"), "Platform administrator",
             json.dumps(ROLE_PERMISSIONS["master_admin"]), ROLE_HIERARCHY["master_admin"], now),
        )
    conn.execute(
        """INSERT INTO users (id, email, phone, password_hash, full_name, role_id,
           organization_id, is_active, created_at, updated_at)
           VALUES (?, ?, '', ?, ?, 'master_admin', NULL, 1, ?, ?)""",
        (generate_id("USR-"), email, password_hash, full_name, now, now),
    )
print(f"Created the first administrator: {email}")
'@
python -c $bootstrap
Remove-Variable bootstrap
```

### Data Pipeline (Research Prototype)

```powershell
python ml\inspect_dataset.py "C:\Users\amant\AppData\Local\Temp\indian_bail_judgments.csv"
python ml\prepare_data.py "C:\Users\amant\AppData\Local\Temp\indian_bail_judgments.csv" --output data\processed_judgments.csv
python ml\build_embeddings.py data\processed_judgments.csv
python ml\evaluate.py data\processed_judgments.csv
streamlit run app.py
```

### Run Tests

```powershell
python -m pytest
node --experimental-default-type=module frontend\tests\components-xss.test.js
```

## Development Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Master Admin | admin@bailreckoner.in | demo1234 |
| Police Officer | si.sharma@police.dl.in | demo1234 |

These credentials exist only after running `seed_data.py` in development. Never use them in production.

## API Endpoints

### Authentication
- `POST /api/auth/login` — JWT login
- `POST /api/auth/register` — User registration
- `GET  /api/auth/me` — Current user profile
- `GET  /api/auth/roles` — Available roles

### Cases
- `POST /api/cases` — Create case
- `GET  /api/cases` — List cases (with filters)
- `GET  /api/cases/stats` — Dashboard statistics
- `GET  /api/cases/{id}` — Get case with documents
- `PUT  /api/cases/{id}` — Update case
- `GET  /api/cases/{id}/timeline` — Case event timeline

### Documents
- `POST /api/documents` — Upload document (multipart)
- `GET  /api/documents` — List documents
- `GET  /api/documents/{id}` — Get document metadata
- `GET  /api/documents/{id}/download` — Download file
- `POST /api/documents/{id}/verify` — Verify integrity (SHA-256 re-hash)

### Evidence
- `POST /api/evidence` — Register evidence
- `GET  /api/evidence` — List evidence
- `GET  /api/evidence/{id}` — Get evidence + chain of custody
- `PUT  /api/evidence/{id}` — Update evidence
- `POST /api/evidence/{id}/transfer` — Transfer custody

### Investigations
- `POST /api/investigations` — Create diary entry
- `GET  /api/investigations` — List entries
- `GET  /api/investigations/{id}` — Get entry
- `PUT  /api/investigations/{id}` — Update entry

### Forensic Reports
- `POST /api/forensics` — Create report
- `GET  /api/forensics` — List reports
- `GET  /api/forensics/{id}` — Get report
- `PUT  /api/forensics/{id}` — Update report

### Court Proceedings
- `POST /api/court-proceedings` — Record hearing
- `GET  /api/court-proceedings` — List proceedings
- `GET  /api/court-proceedings/{id}` — Get proceeding
- `PUT  /api/court-proceedings/{id}` — Update proceeding

### Blockchain
- `POST /api/blockchain/register` — Mine a block for document hash
- `GET  /api/blockchain/verify/{doc_id}` — Verify document integrity
- `POST /api/blockchain/verify-chain` — Full chain audit
- `GET  /api/blockchain/chain` — Browse blockchain

### Notifications
- `GET  /api/notifications` — List user notifications
- `POST /api/notifications/{id}/read` — Mark as read
- `POST /api/notifications/mark-all-read` — Mark all as read
- `GET  /api/notifications/count` — Unread count (lightweight polling)

### Audit
- `GET  /api/audit` — Query audit logs
- `GET  /api/audit/security` — Security events

### Legal Intelligence (Original)
- `POST /api/case/extract-text` — Extract selectable PDF text for review (10 MB, 80-page, and 30,000-character caps; not added to the case document library)
- `POST /api/case/review` — Assessment + similar judgments
- `GET  /api/cases/search` — Judgment search with filters
- `POST /api/custody/calculate` — Custody duration calculator
- `GET  /api/provisions` — Legal provisions browser
- `GET  /api/custody-rules` — Statutory custody thresholds
- `GET  /api/checklist` — Procedural bail checklist
- `GET  /api/judgments` — Landmark judgments

## Security Features

| Feature | Implementation |
|---------|---------------|
| Authentication | JWT (HS256) with configurable expiry |
| Password Hashing | bcrypt via passlib |
| Authorization | RBAC with 8 roles and 30+ granular permissions |
| File Encryption | AES-256 Fernet (at-rest encryption) |
| Document Integrity | SHA-256 hashing + blockchain proof-of-work |
| Audit Trail | Immutable logging of all actions, IPs, user agents |
| Input Sanitization | Path traversal prevention, MIME/extension whitelisting |
| Upload Safety | 50 MB cap, strict file type validation |
| Chain of Custody | Timestamped evidence transfers with acknowledgement |

## Model Approach

The primary system is semantic retrieval using `sentence-transformers/all-MiniLM-L6-v2` and FAISS inner-product search over normalized vectors. If the embedding stack is unavailable, the app falls back to TF-IDF cosine similarity. Filters are applied to metadata after candidate retrieval. SQLite remains the home for the existing offence and procedural seed tables.

The optional `evaluate.py` experiment uses stratified train/validation/test splits and TF-IDF plus balanced logistic regression. It reports class counts, accuracy, precision, recall, F1, and confusion matrix. It is an experimental benchmark only and must never be used to make a legal decision; retrieval is preferred because it exposes source cases and reasoning.

## Limitations and Next Steps

The source summaries are not authoritative law, section mappings need verification against current bare Acts, and similarity is not legal relevance. Add authoritative citations and provenance, improve section parsing, review duplicates manually, add automated tests, and conduct legal expert validation before any real-world use.

## NyaySetu additions

- The bail review page includes a case-specific readiness checklist. Completion state is stored in the current browser and can be copied for discussion with counsel.
- The case analysis page can export a plain-text review brief with submitted facts, system review triggers, and returned similar judgments.
- The case upload page extracts selectable text from PDFs (up to 10 MB and 80 pages), marks page boundaries, and inserts the text for user review. The PDF is not added to the app's document library; scanned-image PDFs require OCR and are not supported yet.
- Case analysis now displays the user's submitted details and extracted text rather than an unrelated fictional sample case.
- These features support preparation and communication only. The checklist is a general prompt, and the exported brief is not legal advice or a bail decision.
