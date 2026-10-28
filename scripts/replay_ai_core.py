"""Recalculate a schema-v2 AI Core evaluation without importing an inference provider."""

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "services" / "api"))

from app.analysis.evaluation import replay_evaluation


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True, help="Saved schema-v2 evaluation JSON")
    args = parser.parse_args()
    artifact = json.loads(args.input.read_text(encoding="utf-8"))
    replayed = replay_evaluation(artifact)
    print(json.dumps({
        "dataset_version": replayed.get("dataset_version"),
        "dataset_size": replayed["dataset_size"],
        "cases": [
            {key: case[key] for key in ("id", "retrieval", "impact", "grounding", "scoring_details")}
            for case in replayed["cases"]
        ],
        "macro": replayed["macro"],
        "micro": replayed["micro"],
    }, indent=2))


if __name__ == "__main__":
    main()
