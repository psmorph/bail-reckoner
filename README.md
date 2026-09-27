# Bail Reckoner — AI-Assisted Legal Intelligence Platform

An explainable bail-judgment retrieval prototype for Indian legal-tech research. It retrieves similar historical judgments and surfaces rule-based review triggers. It does **not** predict, approve, reject, or guarantee bail and is not legal advice.

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                    Frontend (Vanilla JS SPA)              │
│  ├── Landing / Login / Purpose Selection                  │
│  ├── Case Management (Search, Upload, Analysis, Details)  │
│  ├── Bail Reckoner (Assessment + Similar Judgments)        │
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
python -m pip install -r requirements.txt
python -m pip install -r requirements-web.txt
```

## Running the Platform

### Web Application (FastAPI + Frontend SPA)

```powershell
# Initialize seed data (demo users, roles, sample cases)
python seed_data.py

# Start the server
python run_web.py
# → opens http://localhost:8000
```

### Data Pipeline (Original Bail Reckoner)

```powershell
python ml\inspect_dataset.py "C:\Users\amant\AppData\Local\Temp\indian_bail_judgments.csv"
python ml\prepare_data.py "C:\Users\amant\AppData\Local\Temp\indian_bail_judgments.csv" --output data\processed_judgments.csv
python ml\build_embeddings.py data\processed_judgments.csv
python ml\evaluate.py data\processed_judgments.csv
streamlit run app.py
```

### Run End-to-End Tests

```powershell
# Start server in one terminal, then run:
python test_platform.py
```

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Master Admin | admin@bailreckoner.in | demo1234 |
| Police Officer | si.sharma@police.dl.in | demo1234 |

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
