from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.database import Base
from app.db.models import Repository
from app.evidence.validator import EvidenceValidator
from app.indexing.engine import IndexingEngine
from app.analysis.causal import CausalImpactVerifier


def test_causal_gate_separates_supported_potential_duplicates_and_review(tmp_path):
    files = {
        "app/security.py": "def sign_token(value):\n    return value\ndef hash_password(password):\n    return password + 'hashed'\n",
        "app/api/auth.py": "from app.security import hash_password\ndef login(password):\n    return hash_password(password)\n",
        "app/api/sign.py": "from app.security import sign_token\ndef issue_password_notice():\n    return sign_token('x')\n",
        "tests/test_auth.py": "from app.security import hash_password\ndef test_password_hashing():\n    assert hash_password('x')\n",
        "app/unrelated.py": "def health(): return 'ok'\n",
    }
    for path, content in files.items():
        source = tmp_path / path
        source.parent.mkdir(parents=True, exist_ok=True)
        source.write_text(content, encoding="utf-8")
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    db = sessionmaker(bind=engine)()
    db.add(Repository(id="causal", name="Causal", workspace_path=str(tmp_path), status="pending"))
    db.commit()
    try:
        assert IndexingEngine(db).index_repository("causal").status == "ready"
        claims = [
            ("app/security.py", "sign_token", "direct", "Change password hashing implementation"),
            ("app/security.py", "hash_password", "direct", "Change password hash function"),
            ("tests/test_auth.py", "test_password_hashing", "indirect", "Password hashing test calls changed function"),
            ("tests/test_auth.py", "test_password_hashing", "direct", "Change password hashing test"),
            ("app/unrelated.py", "health", "direct", "Password hashing somehow affects health"),
            ("app/api/auth.py", "login", "direct", "Password hashing caller"),
            ("app/api/sign.py", "issue_password_notice", "indirect", "Password hashing caller"),
        ]
        raw = {"affected_items": [
            {"file_path": path, "symbol": symbol, "impact_type": kind,
             "category": "backend", "reason": reason, "confidence": 0.99}
            for path, symbol, kind, reason in claims
        ]}
        existence = EvidenceValidator(db, str(tmp_path)).validate_ai_claims("causal", raw)
        result = CausalImpactVerifier(db).classify(
            "causal", "Strengthen password hashing", existence,
            review_paths=["app/api/auth.py"],
        )
        supported = {(item["file_path"], item["impact_type"]) for item in result["affected_items"]}
        assert ("app/security.py", "direct") in supported
        assert ("tests/test_auth.py", "indirect") in supported
        assert ("app/api/auth.py", "indirect") in supported
        assert ("app/api/auth.py", "direct") not in supported
        assert len([item for item in result["affected_items"] if item["file_path"] == "app/security.py"]) == 1
        assert all(item["impact_supported"] and item["evidence_status"] == "supported"
                   for item in result["affected_items"])
        assert {item["file_path"] for item in result["potential_claims"]} == {
            "app/unrelated.py", "app/api/auth.py", "app/api/sign.py",
        }
        assert result["validation_metrics"]["duplicate_claims"] == 1
        assert result["validation_metrics"]["impact_supported_claims"] == 3
        assert result["promoted_suggestions"] == ["app/api/auth.py"]

        mistyped = EvidenceValidator(db, str(tmp_path)).validate_ai_claims("causal", {
            "affected_items": [
                {"file_path": "app/security.py", "symbol": "hash_password", "impact_type": "indirect",
                 "category": "security", "reason": "Password handling", "confidence": 0.99},
                {"file_path": "tests/test_auth.py", "symbol": "test_password_hashing", "impact_type": "direct",
                 "category": "test", "reason": "Password regression test", "confidence": 0.99},
            ]
        })
        corrected = CausalImpactVerifier(db).classify("causal", "Strengthen password hashing", mistyped)
        assert {(item["file_path"], item["impact_type"], item["original_impact_type"])
                for item in corrected["affected_items"]} == {
            ("app/security.py", "direct", "indirect"),
            ("tests/test_auth.py", "indirect", "direct"),
        }

        direct_only = EvidenceValidator(db, str(tmp_path)).validate_ai_claims("causal", {
            "affected_items": [{"file_path": "app/security.py", "symbol": "hash_password",
                                "impact_type": "direct", "category": "security",
                                "reason": "Change password hashing", "confidence": 0.9}]
        })
        recovered = CausalImpactVerifier(db).classify("causal", "Strengthen password hashing", direct_only)
        assert ("tests/test_auth.py", "indirect") in {
            (item["file_path"], item["impact_type"]) for item in recovered["affected_items"]
        }
        assert "app/api/sign.py" not in {item["file_path"] for item in recovered["affected_items"]}
    finally:
        db.close()
        engine.dispose()
