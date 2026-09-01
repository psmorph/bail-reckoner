"""Build normalized sentence-transformer embeddings and a FAISS index."""
from __future__ import annotations
import argparse, csv, json
from pathlib import Path

def main(source, destination, model_name):
    import numpy as np
    import faiss
    from sentence_transformers import SentenceTransformer
    destination.mkdir(parents=True, exist_ok=True)
    index_path = destination / "index.faiss"
    metadata_path = destination / "metadata.json"
    if index_path.exists() and metadata_path.exists():
        print(f"Embeddings already exist at {destination}; skipping rebuild."); return
    with source.open(encoding="utf-8", newline="") as handle: rows = list(csv.DictReader(handle))
    model = SentenceTransformer(model_name)
    vectors = model.encode([row["search_text"] for row in rows], normalize_embeddings=True, show_progress_bar=True)
    index = faiss.IndexFlatIP(vectors.shape[1]); index.add(np.asarray(vectors, dtype="float32")); faiss.write_index(index, str(index_path))
    metadata_path.write_text(json.dumps([{**row, "row_id": i} for i, row in enumerate(rows)], ensure_ascii=False), encoding="utf-8")
    (destination / "model.txt").write_text(model_name, encoding="utf-8")
    print(f"Built {len(rows)} embeddings using {model_name}.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(); parser.add_argument("source", type=Path, default=Path("data/processed_judgments.csv"), nargs="?"); parser.add_argument("--destination", type=Path, default=Path("vector_store")); parser.add_argument("--model", default="sentence-transformers/all-MiniLM-L6-v2"); args = parser.parse_args(); main(args.source, args.destination, args.model)
