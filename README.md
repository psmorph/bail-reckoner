# Bail Reckoner Phase 1

An explainable bail-judgment retrieval prototype for Indian legal-tech research. It retrieves similar historical judgments and surfaces rule-based review triggers. It does **not** predict, approve, reject, or guarantee bail and is not legal advice.

## Setup

From this directory:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

## Data pipeline

The attached CSV used for this build is read-only. Replace the source path below with another CSV, JSON, Excel, or PDF file when needed.

```powershell
python ml\inspect_dataset.py "C:\Users\amant\AppData\Local\Temp\indian_bail_judgments.csv"
python ml\prepare_data.py "C:\Users\amant\AppData\Local\Temp\indian_bail_judgments.csv" --output data\processed_judgments.csv
python ml\build_embeddings.py data\processed_judgments.csv
python ml\evaluate.py data\processed_judgments.csv
streamlit run app.py
```

`build_embeddings.py` skips work when `vector_store/index.faiss` and `metadata.json` already exist. Delete those generated files only when the processed data or embedding model changes. `data/preprocessing_report.json` records loaded, malformed, duplicate, and retained counts. The normalized dataset is always separate from the source.

## Detected source schema

The supplied CSV has 1,200 records and columns for case title, court, date, IPC sections, bail type, outcome, facts, legal issues, judgment reasoning, summary, special laws, crime type, region, and source filename. It has 16 duplicate title/date pairs, 3 missing legal-principle lists, and 1,163 missing special-law values. The preparation step normalizes dates and list-like strings, converts missing values to empty strings, removes malformed rows lacking a title and substantive text, and keeps the first record for duplicate case ID or title/date keys.

## Model approach

The primary system is semantic retrieval using `sentence-transformers/all-MiniLM-L6-v2` and FAISS inner-product search over normalized vectors. If the embedding stack is unavailable, the app falls back to TF-IDF cosine similarity. Filters are applied to metadata after candidate retrieval. SQLite remains the home for the existing offence and procedural seed tables.

The optional `evaluate.py` experiment uses stratified train/validation/test splits and TF-IDF plus balanced logistic regression. It reports class counts, accuracy, precision, recall, F1, and confusion matrix. It is an experimental benchmark only and must never be used to make a legal decision; retrieval is preferred because it exposes source cases and reasoning.

## Limitations and next steps

The source summaries are not authoritative law, section mappings need verification against current bare Acts, and similarity is not legal relevance. Add authoritative citations and provenance, improve section parsing, review duplicates manually, add automated tests, and conduct legal expert validation before any real-world use.
