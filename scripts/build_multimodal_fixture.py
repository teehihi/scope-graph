"""Build the SG-AI-18 synthetic fixture from the unchanged v3 sample labels."""

import hashlib
import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
EVALUATION = ROOT / "services/api/tests/evaluation"
SOURCE = EVALUATION / "ai_core_cases_v3.json"
SAMPLE = ROOT / "examples/sample-repository"
SNAPSHOT = "f413b0b90d6157d5493a5603fb1245a7f4681eb6"


SCENARIOS = (
    ("email_confirmation", "account_email", "clear", ["profile", "email change"],
     "account settings", ["email address field", "save email button"],
     ["update email"], ["profile", "email change"],
     ["The screenshot cannot show whether the new email is verified."]),
    ("password_hashing", "sign_in", "clear", ["sign in", "password entry", "authentication"],
     "sign in", ["email field", "password field", "sign in button"],
     ["sign in"], ["sign in", "password entry", "authentication"],
     ["The hashing algorithm is not visible in the interface."]),
    ("token_expiry", "verification_link", "ambiguous", ["verification email", "verification link"],
     "verification notice", ["verification email notice", "resend link"],
     ["open verification link"], ["verification email", "verification link", "token expiry"],
     ["The expiry duration is not visible in this preview."]),
    ("smtp_host", "project_board", "irrelevant", ["project board", "task cards"],
     "project board", ["project columns", "task cards"],
     ["review tasks"], ["project board", "task cards"],
     ["The image shows no email delivery settings."]),
    ("profile_response", "password_reset", "conflicting", ["password reset", "email field"],
     "password reset", ["email field", "send reset link button"],
     ["request password reset"], ["password reset", "email field"],
     ["The pictured password-reset flow does not establish profile response behavior."]),
    ("billing_negative", "invoice_report", "no_match", ["invoice report", "billing total", "export report"],
     "invoice report", ["invoice rows", "totals", "export report button"],
     ["export report"], ["invoice report", "billing total", "export report"],
     ["The selected repository may have no billing implementation."]),
)


def main() -> None:
    source_bytes = SOURCE.read_bytes()
    source = json.loads(source_bytes)
    if source["repository_snapshot"] != SNAPSHOT or source["repository"] != "examples/sample-repository":
        raise ValueError("Source label fixture changed repository identity")
    tracked = subprocess.check_output(
        ["git", "ls-tree", "-r", "--name-only", SNAPSHOT, "--", "examples/sample-repository"],
        cwd=ROOT, text=True,
    ).splitlines()
    paths = sorted(path.relative_to(ROOT).as_posix() for path in SAMPLE.rglob("*") if path.is_file())
    if sorted(tracked) != paths or subprocess.run(
        ["git", "diff", "--quiet", SNAPSHOT, "--", "examples/sample-repository"], cwd=ROOT,
        check=False,
    ).returncode != 0:
        raise ValueError("Sample source does not match the pinned commit")

    records = []
    for path in sorted(SAMPLE.rglob("*")):
        if path.is_file():
            content = path.read_bytes()
            records.append({
                "path": path.relative_to(SAMPLE).as_posix(),
                "size_bytes": len(content),
                "sha256": hashlib.sha256(content).hexdigest(),
            })
    tree_lines = "".join(f'{item["path"]}\t{item["sha256"]}\n' for item in records)
    manifest = {
        "snapshot_root": "examples/sample-repository", "upstream_commit": SNAPSHOT,
        "file_count": len(records), "files": records,
        "tree_sha256": hashlib.sha256(tree_lines.encode()).hexdigest(),
    }
    manifest_path = EVALUATION / "multimodal_snapshot_manifest_v1.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")

    source_cases = {case["id"]: case for case in source["cases"]}
    cases = []
    for (source_id, image_id, relationship, expected_concepts, screen_type,
         elements, actions, concepts, uncertainties) in SCENARIOS:
        original = source_cases[source_id]
        image_path = EVALUATION / "screenshots_v1" / f"{image_id}.png"
        image_bytes = image_path.read_bytes()
        cases.append({
            "id": source_id,
            "source_case_id": source_id,
            "repository_snapshot": SNAPSHOT,
            "requirement": original["requirement"],
            "screenshot": {
                "id": image_id,
                "path": image_path.relative_to(ROOT).as_posix(),
                "sha256": hashlib.sha256(image_bytes).hexdigest(),
                "mime_type": "image/png",
                "relationship": relationship,
            },
            "expected_visual_concepts": expected_concepts,
            "mock_visual_intent": {
                "screen_type": screen_type,
                "visible_text": [],
                "visible_elements": elements,
                "user_actions": actions,
                "functional_concepts": concepts,
                "requirement_interpretation": original["requirement"],
                "uncertainties": uncertainties,
            },
            "retrieval_relevant": original["retrieval_relevant"],
            "impact": original["impact"],
            "annotations": original["annotations"],
            "negative_rationale": original.get("negative_rationale"),
            "annotation_provenance": "AI-assisted; human sign-off pending",
        })
    fixture = {
        "dataset_version": "2026-10-29-synthetic-v1",
        "repository": source["repository"],
        "repository_snapshot": SNAPSHOT,
        "snapshot_manifest": manifest_path.relative_to(ROOT).as_posix(),
        "source_label_dataset": SOURCE.relative_to(ROOT).as_posix(),
        "source_label_dataset_sha256": hashlib.sha256(source_bytes).hexdigest(),
        "image_rights": "Original synthetic UI artwork generated locally by scripts/generate_multimodal_fixture.ps1; no third-party or private imagery.",
        "review_status": "AI-assisted source labels inherited from v3; independent human visual/label sign-off pending",
        "evaluation_mode": "scripted visual intent keyed by validated image SHA-256; no pixel understanding or paid inference",
        "cases": cases,
    }
    output = EVALUATION / "multimodal_cases_v1.json"
    output.write_text(json.dumps(fixture, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {output.relative_to(ROOT)} with {len(cases)} cases and {len(records)} source files")


if __name__ == "__main__":
    main()
