"""Leakage-aware experimental outcome baseline; retrieval remains the recommended approach."""
from __future__ import annotations
import argparse, json
from pathlib import Path

def main(source):
    import pandas as pd
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.linear_model import LogisticRegression
    from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix
    from sklearn.model_selection import train_test_split
    df = pd.read_csv(source).dropna(subset=["bail_outcome"]); df["label"] = df.bail_outcome.str.lower().eq("granted").astype(int)
    train, temp = train_test_split(df, test_size=.3, stratify=df.label, random_state=42); validation, test = train_test_split(temp, test_size=.5, stratify=temp.label, random_state=42)
    vectorizer = TfidfVectorizer(stop_words="english", max_features=50000); x_train = vectorizer.fit_transform(train.search_text); x_test = vectorizer.transform(test.search_text)
    model = LogisticRegression(max_iter=1000, class_weight="balanced").fit(x_train, train.label); pred = model.predict(x_test)
    precision, recall, f1, _ = precision_recall_fscore_support(test.label, pred, average="binary", zero_division=0)
    result = {"warning": "Experimental classification only; never use for legal decisions.", "class_counts": df.bail_outcome.value_counts().to_dict(), "splits": {"train": len(train), "validation": len(validation), "test": len(test)}, "accuracy": accuracy_score(test.label, pred), "precision": precision, "recall": recall, "f1": f1, "confusion_matrix": confusion_matrix(test.label, pred).tolist()}
    Path("data/evaluation.json").write_text(json.dumps(result, indent=2), encoding="utf-8"); print(json.dumps(result, indent=2))

if __name__ == "__main__":
    parser = argparse.ArgumentParser(); parser.add_argument("source", type=Path, default=Path("data/processed_judgments.csv"), nargs="?"); main(parser.parse_args().source)
