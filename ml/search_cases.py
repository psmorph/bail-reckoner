"""CLI wrapper for semantic case retrieval."""
import argparse, json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from engine import search_cases
parser = argparse.ArgumentParser(); parser.add_argument("query"); parser.add_argument("--top-k", type=int, default=5); args = parser.parse_args()
print(json.dumps(search_cases(args.query, args.top_k), ensure_ascii=False, indent=2))
