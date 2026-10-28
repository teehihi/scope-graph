from app.analysis.explanations import explain_item


def test_supported_explanation_keeps_source_reference_and_dependency_without_inventing_behavior():
    item = {
        "file_path": "app/core/security.py", "symbol": "hash_password", "impact_type": "direct",
        "evidence_status": "supported", "impact_supported": True,
        "support_reason": "Requirement terms match an indexed source symbol and cited reason",
        "line_start": 4, "line_end": 5, "evidence_snippet": "4 | def hash_password(password):",
        "dependency_path": [],
    }

    result = explain_item(item)

    assert result["technical_explanation"]["evidence_refs"] == [{
        "file_path": "app/core/security.py", "symbol": "hash_password", "line_start": 4, "line_end": 5,
    }]
    assert result["technical_explanation"]["dependency_path"] == []
    assert result["simple_explanation"]["functional_area"] == "Password protection"
    assert "password protection" in result["simple_explanation"]["summary"].lower()
    assert result["simple_explanation"]["uncertainty"]
    assert "stores passwords" not in str(result).lower()
    assert result["evidence_status"] == "supported"


def test_potential_explanation_preserves_uncertainty_and_missing_evidence():
    result = explain_item({"file_path": "app/unknown.py", "impact_status": "potential",
                           "sources": ["completeness_review"], "dependency_paths": {}})

    assert result["evidence_status"] == "potential"
    assert result["technical_explanation"]["evidence_refs"] == []
    assert result["simple_explanation"]["functional_area"] == "Unknown"
    assert "has not been established" in result["simple_explanation"]["uncertainty"].lower()
    assert "unknown behavior" not in str(result).lower()
