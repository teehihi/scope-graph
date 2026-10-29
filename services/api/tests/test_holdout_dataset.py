"""Validate the unevaluated RealWorld holdout source and candidate labels."""

import hashlib
import json
from copy import deepcopy
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
FIXTURES = ROOT / "services/api/tests/evaluation"
DATASET = FIXTURES / "holdout_realworld_cases_v1.json"
DATASET_V2 = FIXTURES / "holdout_realworld_cases_v2.json"
MANIFEST = FIXTURES / "holdout_realworld_snapshot_v1.json"
SNAPSHOT_SHA = "029eb7781c60d5f563ee8990a0cbfb79b244538c"


def _source_path(snapshot_root: Path, relative_path: str) -> Path:
    candidate = (snapshot_root / relative_path).resolve()
    candidate.relative_to(snapshot_root.resolve())
    assert candidate.is_file(), relative_path
    return candidate


def _check_evidence(snapshot_root: Path, item: dict) -> None:
    source = _source_path(snapshot_root, item["path"])
    assert 1 <= item["line"] <= len(source.read_text(encoding="utf-8").splitlines()), item
    assert (item.get("rationale") or item.get("note") or "").strip(), item


def test_holdout_snapshot_is_exact_pinned_source_subset():
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    assert manifest["upstream_repository"] == "https://github.com/nsidnev/fastapi-realworld-example-app"
    assert manifest["upstream_commit"] == SNAPSHOT_SHA
    assert manifest["license"] == "MIT"
    assert manifest["file_count"] == 103
    assert manifest["python_file_count"] == 95

    snapshot_root = ROOT / manifest["snapshot_root"]
    records = manifest["files"]
    paths = [record["path"] for record in records]
    assert len(paths) == len(set(paths)) == manifest["file_count"]
    assert set(paths) == {
        path.relative_to(snapshot_root).as_posix()
        for path in snapshot_root.rglob("*") if path.is_file()
    }
    assert set(paths) == {
        *[path for path in paths if path.startswith("app/")],
        *[path for path in paths if path.startswith("tests/")],
        "LICENSE",
    }
    assert _source_path(snapshot_root, "LICENSE").read_text(encoding="utf-8").startswith("MIT License")
    for record in records:
        source = _source_path(snapshot_root, record["path"])
        content = source.read_bytes()
        assert len(content) == record["size_bytes"]
        assert hashlib.sha256(content).hexdigest() == record["sha256"]
    tree_lines = "".join(f'{item["path"]}\t{item["sha256"]}\n' for item in records)
    assert hashlib.sha256(tree_lines.encode("utf-8")).hexdigest() == manifest["tree_sha256"]


def test_holdout_cases_have_complete_source_backed_candidate_labels():
    dataset = json.loads(DATASET.read_text(encoding="utf-8"))
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    assert dataset["repository"] == manifest["snapshot_root"]
    assert dataset["repository_snapshot"] == manifest["upstream_commit"] == SNAPSHOT_SHA
    assert dataset["snapshot_manifest"] == MANIFEST.relative_to(ROOT).as_posix()
    assert dataset["review_status"].startswith("candidate;")
    assert len(dataset["cases"]) == 10

    snapshot_root = ROOT / dataset["repository"]
    ids = [case["id"] for case in dataset["cases"]]
    assert len(ids) == len(set(ids))
    direct_count = indirect_count = annotation_count = 0
    categories = set()
    for case in dataset["cases"]:
        assert case["requirement"].strip()
        assert case["repository_snapshot"] == SNAPSHOT_SHA
        categories.update(case["category"])
        retrieval = case["retrieval_relevant"]
        assert len(retrieval) == len(set(retrieval)), case["id"]
        direct = case["impact"]["direct"]
        indirect = case["impact"]["indirect"]
        assert len(direct) == len(set(direct))
        assert len(indirect) == len(set(indirect))
        assert not set(direct) & set(indirect)
        direct_count += len(direct)
        indirect_count += len(indirect)
        impacted = set(direct) | set(indirect)
        assert impacted <= set(retrieval)
        annotations = case["annotations"]
        annotation_count += len(annotations)
        assert len(annotations) == len(impacted)
        assert {item["path"] for item in annotations} == impacted
        context = case["context_annotations"]
        assert len(context) == len({item["path"] for item in context})
        assert {item["path"] for item in context} == set(retrieval) - impacted
        for path in retrieval:
            _source_path(snapshot_root, path)
        for key in ("annotations", "context_annotations", "potential_impacts", "ambiguities", "negative_evidence"):
            for item in case.get(key, []):
                _check_evidence(snapshot_root, item)
                if key in ("potential_impacts", "ambiguities"):
                    assert item["path"] in retrieval
                if key == "potential_impacts":
                    assert item["path"] not in impacted

        if case["category"] == ["negative"]:
            assert not retrieval and not impacted and not annotations
            assert case["negative_rationale"].strip()
            assert case["negative_evidence"]

    assert (direct_count, indirect_count, annotation_count) == (10, 13, 23)
    assert categories >= {
        "api", "configuration", "business_logic", "model_schema",
        "security", "cross_module", "regression_test", "negative",
    }


def test_holdout_v2_adds_only_two_source_backed_indirect_impacts():
    original = json.loads(DATASET.read_text(encoding="utf-8"))
    candidate = json.loads(DATASET_V2.read_text(encoding="utf-8"))
    dataset_bytes = DATASET.read_bytes()
    dataset_shas = {
        hashlib.sha256(dataset_bytes).hexdigest(),
        hashlib.sha256(dataset_bytes.replace(b"\r\n", b"\n")).hexdigest(),
        hashlib.sha256(dataset_bytes.replace(b"\n", b"\r\n")).hexdigest(),
    }
    expected_crlf = "5892974d49b89a735104d6857aacc4314599d2a3eec544bcc76d4599a00f5615"
    expected_lf = "c410b26a775baf1a656dd37aabf1662f5d9efe1ecfab493985810a74a23df014"
    assert expected_crlf in dataset_shas or expected_lf in dataset_shas
    assert candidate["dataset_version"] == "2026-10-28-realworld-holdout-v2-candidate"
    assert "AI-assisted" in candidate["review_status"]
    assert "human" in candidate["review_status"]
    assert "not frozen" in candidate["review_status"]

    expected = deepcopy(original)
    expected["dataset_version"] = candidate["dataset_version"]
    expected["review_status"] = candidate["review_status"]
    additions = {
        "api_default_page_size": ("app/api/routes/articles/articles_resource.py", 30),
        "access_token_ttl": ("app/api/dependencies/authentication.py", 78),
    }
    candidate_by_id = {case["id"]: case for case in candidate["cases"]}
    for case in expected["cases"]:
        case_id = case["id"]
        if case_id not in additions:
            continue
        path, line = additions[case_id]
        annotation = next(item for item in candidate_by_id[case_id]["annotations"] if item["path"] == path)
        assert annotation["line"] == line
        assert annotation["rationale"].strip()
        case["retrieval_relevant"].append(path)
        case["impact"]["indirect"].append(path)
        case["annotations"].append(annotation)
    assert candidate == expected
    assert candidate["repository_snapshot"] == SNAPSHOT_SHA

    root = ROOT / candidate["repository"]
    direct = indirect = 0
    for case in candidate["cases"]:
        assert case["repository_snapshot"] == SNAPSHOT_SHA
        retrieval = case["retrieval_relevant"]
        assert len(retrieval) == len(set(retrieval))
        labels = case["impact"]
        assert len(labels["direct"]) == len(set(labels["direct"]))
        assert len(labels["indirect"]) == len(set(labels["indirect"]))
        assert not set(labels["direct"]) & set(labels["indirect"])
        assert set(labels["direct"] + labels["indirect"]) <= set(retrieval)
        assert {item["path"] for item in case["annotations"]} == set(labels["direct"] + labels["indirect"])
        assert len(case["annotations"]) == len(labels["direct"] + labels["indirect"])
        assert {item["path"] for item in case["context_annotations"]} == set(retrieval) - set(labels["direct"] + labels["indirect"])
        for path in retrieval:
            _source_path(root, path)
        for key in ("annotations", "context_annotations", "potential_impacts", "ambiguities", "negative_evidence"):
            for item in case.get(key, []):
                _check_evidence(root, item)
        direct += len(labels["direct"])
        indirect += len(labels["indirect"])
    assert len(candidate["cases"]) == 10
    assert (direct, indirect) == (10, 15)
