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
