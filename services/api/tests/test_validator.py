import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.database import Base
from app.db.models import Repository, IndexedFile, IndexedSymbol
from app.evidence.validator import EvidenceValidator

@pytest.fixture
def test_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()

def test_evidence_validator_rejects_hallucinations(test_db, tmp_path):
    repo = Repository(id="repo-1", name="TestRepo", workspace_path=str(tmp_path))
    test_db.add(repo)

    f1 = IndexedFile(id="f1", repository_id="repo-1", path="app/services/user_service.py")
    test_db.add(f1)

    s1 = IndexedSymbol(id="s1", repository_id="repo-1", file_id="f1", name="update_user_email", symbol_type="method")
    test_db.add(s1)
    test_db.commit()

    raw_ai_output = {
        "affected_items": [
            {
                "file_path": "app/services/user_service.py",
                "symbol": "update_user_email",
                "impact_type": "direct",
                "category": "service",
                "reason": "Direct target of modification",
                "confidence": 0.95
            },
            {
                # Hallucinated file
                "file_path": "app/non_existent_folder/magic_service.py",
                "symbol": "magic_function",
                "impact_type": "direct",
                "category": "service",
                "reason": "Hallucinated reason",
                "confidence": 0.88
            }
        ],
        "risks": ["Risk 1"],
        "suggested_tests": ["Test 1"],
        "assumptions": ["Assumption 1"]
    }

    validator = EvidenceValidator(test_db, str(tmp_path))
    validated = validator.validate_ai_claims("repo-1", raw_ai_output)

    # Verify that real file was accepted and grounded
    assert len(validated["affected_items"]) == 1
    assert validated["affected_items"][0]["file_path"] == "app/services/user_service.py"
    assert validated["affected_items"][0]["is_verified_fact"] is True

    # Verify that hallucinated file was rejected
    assert len(validated["rejected_hallucinations"]) == 1
    assert validated["rejected_hallucinations"][0]["claimed_path"] == "app/non_existent_folder/magic_service.py"
    assert validated["validation_metrics"]["verified_claims"] == 1
    assert validated["validation_metrics"]["rejected_hallucinations"] == 1


@pytest.fixture
def indexed_workspace(test_db, tmp_path):
    files = {
        "app/api/users.py": "# API route\ndef update_email():\n    return 'api'\n",
        "legacy/api/users.py": "# Legacy route\ndef legacy_update():\n    return 'legacy'\n",
        "app/services/user_service.py": "# User service\ndef update_user_email():\n    return 'service'\n",
    }
    test_db.add(Repository(id="repo-main", name="Main", workspace_path=str(tmp_path)))
    test_db.add(Repository(id="repo-other", name="Other", workspace_path=str(tmp_path)))
    for index, (path, content) in enumerate(files.items(), start=1):
        source = tmp_path / path
        source.parent.mkdir(parents=True, exist_ok=True)
        source.write_text(content, encoding="utf-8")
        test_db.add(IndexedFile(id=f"main-{index}", repository_id="repo-main", path=path))
    test_db.add_all([
        IndexedSymbol(id="api-symbol", repository_id="repo-main", file_id="main-1", name="update_email", symbol_type="endpoint", line_start=2, line_end=3),
        IndexedSymbol(id="service-symbol", repository_id="repo-main", file_id="main-3", name="update_user_email", symbol_type="function", line_start=2, line_end=3),
        IndexedFile(id="other-file", repository_id="repo-other", path="other/secret.py"),
        IndexedSymbol(id="other-symbol", repository_id="repo-other", file_id="other-file", name="secret", symbol_type="function", line_start=1, line_end=1),
    ])
    test_db.commit()
    return EvidenceValidator(test_db, str(tmp_path))


def claim(path, symbol=None):
    return {"file_path": path, "symbol": symbol, "impact_type": "direct", "category": "service", "reason": "AI prediction", "confidence": 0.9}


def test_exact_file_symbol_has_its_own_lines_and_snippet(indexed_workspace):
    result = indexed_workspace.validate_ai_claims("repo-main", {"affected_items": [claim("app/services/user_service.py", "update_user_email")]})

    item = result["affected_items"][0]
    assert item["file_path"] == "app/services/user_service.py"
    assert item["symbol"] == "update_user_email"
    assert item["line_start"] == 2
    assert item["line_end"] == 3
    assert "   2 | def update_user_email():" in item["evidence_snippet"]
    assert "update_email():" not in item["evidence_snippet"]
    assert item["is_verified_fact"] is True
    assert item["existence_verified"] is True
    assert item["impact_supported"] is False


@pytest.mark.parametrize("path", ["missing.py", "", "   ", None, 42, "other/secret.py", "../outside.py"])
def test_invalid_or_other_repository_path_is_rejected(indexed_workspace, path):
    result = indexed_workspace.validate_ai_claims("repo-main", {"affected_items": [claim(path)]})

    assert result["affected_items"] == []
    assert len(result["rejected_hallucinations"]) == 1
    assert result["validation_metrics"]["verified_claims"] == 0


def test_wrong_file_symbol_is_rejected_without_wrong_snippet(indexed_workspace):
    result = indexed_workspace.validate_ai_claims("repo-main", {"affected_items": [claim("app/api/users.py", "update_user_email")]})

    assert result["affected_items"] == []
    assert len(result["rejected_hallucinations"]) == 1
    assert result["rejected_hallucinations"][0]["claimed_symbol"] == "update_user_email"


def test_missing_symbol_is_rejected(indexed_workspace):
    result = indexed_workspace.validate_ai_claims("repo-main", {"affected_items": [claim("app/api/users.py", "not_indexed")]})

    assert result["affected_items"] == []
    assert len(result["rejected_hallucinations"]) == 1


def test_ambiguous_suffix_is_rejected(indexed_workspace):
    result = indexed_workspace.validate_ai_claims("repo-main", {"affected_items": [claim("users.py")]})

    assert result["affected_items"] == []
    assert len(result["rejected_hallucinations"]) == 1


def test_exact_path_wins_over_longer_suffix(indexed_workspace, test_db):
    test_db.add(IndexedFile(id="longer-path", repository_id="repo-main", path="legacy/app/api/users.py"))
    test_db.commit()

    result = indexed_workspace.validate_ai_claims("repo-main", {"affected_items": [claim("app/api/users.py", "update_email")]})

    assert len(result["affected_items"]) == 1
    assert result["affected_items"][0]["file_path"] == "app/api/users.py"
    assert result["affected_items"][0]["line_start"] == 2


def test_unique_suffix_resolves_to_indexed_file(indexed_workspace):
    result = indexed_workspace.validate_ai_claims("repo-main", {"affected_items": [claim("user_service.py")]})

    assert result["affected_items"][0]["file_path"] == "app/services/user_service.py"
    assert result["validation_metrics"]["verified_claims"] == 1


def test_file_existence_does_not_prove_claimed_impact(indexed_workspace):
    result = indexed_workspace.validate_ai_claims("repo-main", {"affected_items": [claim("app/api/users.py")]})

    item = result["affected_items"][0]
    assert item["is_verified_fact"] is True
    assert item["existence_verified"] is True
    assert item["impact_supported"] is False
    assert item["line_start"] is None
    assert "   1 | # API route" in item["evidence_snippet"]
    assert result["validation_metrics"]["impact_supported_claims"] == 0


def test_grounding_metrics_count_only_valid_file_symbol_claims(indexed_workspace):
    result = indexed_workspace.validate_ai_claims("repo-main", {"affected_items": [
        claim("app/services/user_service.py", "update_user_email"),
        claim("app/api/users.py", "update_user_email"),
        claim("missing.py"),
    ]})

    assert len(result["affected_items"]) == 1
    assert len(result["rejected_hallucinations"]) == 2
    assert result["validation_metrics"]["total_claims"] == 3
    assert result["validation_metrics"]["verified_claims"] == 1
    assert result["validation_metrics"]["rejected_hallucinations"] == 2
    assert result["validation_metrics"]["grounding_ratio"] == pytest.approx(0.33)
    assert result["validation_metrics"]["impact_supported_claims"] == 0


def test_no_claims_do_not_report_perfect_grounding(indexed_workspace):
    result = indexed_workspace.validate_ai_claims("repo-main", {"affected_items": []})

    assert result["validation_metrics"]["total_claims"] == 0
    assert result["validation_metrics"]["grounding_ratio"] == 0.0


def test_indexed_escape_path_cannot_read_outside_workspace(test_db, tmp_path):
    outside = tmp_path.parent / f"{tmp_path.name}-outside.py"
    outside.write_text("outside secret\n", encoding="utf-8")
    escape_path = f"../{outside.name}"
    test_db.add(Repository(id="repo-escape", name="Escape", workspace_path=str(tmp_path)))
    test_db.add(IndexedFile(id="escape-file", repository_id="repo-escape", path=escape_path))
    test_db.commit()

    result = EvidenceValidator(test_db, str(tmp_path)).validate_ai_claims(
        "repo-escape", {"affected_items": [claim(escape_path)]}
    )

    assert result["affected_items"] == []
    assert len(result["rejected_hallucinations"]) == 1


def test_absolute_indexed_path_cannot_pass_suffix_match(test_db, tmp_path):
    test_db.add(Repository(id="repo-absolute", name="Absolute", workspace_path=str(tmp_path)))
    test_db.add(IndexedFile(id="absolute-file", repository_id="repo-absolute", path="C:/outside/escape.py"))
    test_db.commit()

    result = EvidenceValidator(test_db, str(tmp_path)).validate_ai_claims(
        "repo-absolute", {"affected_items": [claim("escape.py")]}
    )

    assert result["affected_items"] == []
    assert len(result["rejected_hallucinations"]) == 1
