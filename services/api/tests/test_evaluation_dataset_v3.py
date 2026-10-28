"""Guard the reviewed v3 labels against accidental expansion or source drift."""

import copy
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
FIXTURES = ROOT / "services/api/tests/evaluation"
REMOVED = {
    ("email_confirmation", "direct", "app/services/verification_service.py"),
    ("email_confirmation", "indirect", "app/models/verification_token.py"),
    ("email_confirmation", "indirect", "tests/test_verification.py"),
    ("token_reuse", "indirect", "tests/test_verification.py"),
    ("profile_response", "indirect", "app/models/user.py"),
    ("authorization_gate", "indirect", "tests/test_users.py"),
}


def test_v3_has_exact_reviewed_label_delta_and_valid_snapshot_evidence():
    v2 = json.loads((FIXTURES / "ai_core_cases_v2.json").read_text(encoding="utf-8"))
    v3 = json.loads((FIXTURES / "ai_core_cases_v3.json").read_text(encoding="utf-8"))
    assert v3["dataset_version"] == "2026-10-28-ai-assisted-v3"
    assert v3["repository_snapshot"] == v2["repository_snapshot"] == "f413b0b90d6157d5493a5603fb1245a7f4681eb6"
    assert v3["repository"] == v2["repository"]
    assert v3["review"]["independent_human_signoff"] is False
    assert len(v2["cases"]) == len(v3["cases"]) == 17

    old = {case["id"]: case for case in v2["cases"]}
    new = {case["id"]: case for case in v3["cases"]}
    assert old.keys() == new.keys()
    assert len(new) == 17
    actual_removed = set()
    counts = {"direct": 0, "indirect": 0}
    for case_id, case in new.items():
        before = old[case_id]
        assert case["requirement"] == before["requirement"]
        assert case["retrieval_relevant"] == before["retrieval_relevant"]
        assert case.get("negative_rationale") == before.get("negative_rationale")
        assert case["requirement"].strip()
        labels = [(kind, path) for kind in counts for path in case["impact"][kind]]
        assert len(labels) == len(set(labels)), case_id
        assert {path for _, path in labels} == {item["path"] for item in case["annotations"]}
        for kind in counts:
            counts[kind] += len(case["impact"][kind])
            assert [path for path in before["impact"][kind] if path in case["impact"][kind]] == case["impact"][kind]
            actual_removed.update((case_id, kind, path) for path in before["impact"][kind] if path not in case["impact"][kind])
        assert case["annotations"] == [item for item in before["annotations"] if item["path"] in {path for _, path in labels}]
        for item in case["annotations"]:
            assert item["rationale"].strip()
            source = ROOT / v3["repository"] / item["path"]
            assert source.is_file()
            assert 1 <= item["line"] <= len(source.read_text(encoding="utf-8").splitlines())
        for path in case["retrieval_relevant"]:
            assert (ROOT / v3["repository"] / path).is_file()

    assert actual_removed == REMOVED
    assert counts == {"direct": 25, "indirect": 10}
    decisions = v3["review"]["removed_impact_labels"]
    assert {(item["scenario_id"], item["impact_type"], item["path"]) for item in decisions} == REMOVED
    assert len(decisions) == 6
    for item in decisions:
        assert item["decision"] == "REMOVE"
        assert item["reviewer_rationale"].strip()
        assert item["source_reference"]["path"] == item["path"]
        source = ROOT / v3["repository"] / item["path"]
        assert source.is_file()
        assert 1 <= item["source_reference"]["line"] <= len(source.read_text(encoding="utf-8").splitlines())
        assert item["path"] in new[item["scenario_id"]]["retrieval_relevant"]

    expected_without_review = copy.deepcopy(v2)
    expected_without_review["dataset_version"] = v3["dataset_version"]
    expected_without_review["label_policy"] = v3["label_policy"]
    for case in expected_without_review["cases"]:
        for kind in counts:
            case["impact"][kind] = [p for p in case["impact"][kind] if (case["id"], kind, p) not in REMOVED]
        case["annotations"] = [a for a in case["annotations"] if a["path"] in case["impact"]["direct"] + case["impact"]["indirect"]]
    assert {k: v for k, v in v3.items() if k != "review"} == expected_without_review
