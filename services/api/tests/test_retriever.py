import json

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.analysis.retriever import HybridRetriever
from app.ai.schemas import StructuredVisualIntent
from app.db.database import Base
from app.db.models import Repository, IndexedFile, IndexedSymbol, DependencyEdge
from app.indexing.engine import IndexingEngine
from pathlib import Path


def visual_intent(**changes):
    data = {
        "screen_type": "article listing", "visible_text": [],
        "visible_elements": ["article cards"], "user_actions": ["sort articles"],
        "functional_concepts": ["sorting", "article listing"],
        "requirement_interpretation": "Add sorting to the article listing.",
        "uncertainties": [],
    }
    return StructuredVisualIntent.model_validate({**data, **changes})


@pytest.fixture
def indexed_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine)()
    session.add_all([
        Repository(id="repo-a", name="A"),
        Repository(id="repo-b", name="B"),
        IndexedFile(id="service", repository_id="repo-a", path="app/services/email_service.py"),
        IndexedFile(id="route", repository_id="repo-a", path="app/api/profile.py"),
        IndexedFile(id="model", repository_id="repo-a", path="app/models/account.py"),
        IndexedFile(id="test", repository_id="repo-a", path="tests/test_email.py"),
        IndexedFile(id="logger", repository_id="repo-a", path="app/core/logger.py"),
        IndexedFile(id="other", repository_id="repo-b", path="other/verify_email.py"),
        IndexedSymbol(id="verify", repository_id="repo-a", file_id="service", name="verify_email",
                      symbol_type="function", line_start=1, metadata_json={"tags": ["identity"]}),
        IndexedSymbol(id="profile", repository_id="repo-a", file_id="route", name="update_profile",
                      symbol_type="endpoint", line_start=1),
        IndexedSymbol(id="account", repository_id="repo-a", file_id="model", name="Account",
                      symbol_type="model", line_start=1, metadata_json={"fields": ["email_address"]}),
        IndexedSymbol(id="test-email", repository_id="repo-a", file_id="test", name="test_email_change",
                      symbol_type="test", line_start=1),
        DependencyEdge(repository_id="repo-a", source_file_id="route", target_file_id="service",
                       edge_type="imports"),
        DependencyEdge(repository_id="repo-a", source_file_id="service", target_file_id="route",
                       edge_type="calls"),
    ])
    session.commit()
    yield session
    session.close()
    engine.dispose()


def test_symbol_relevance_ranks_first_and_graph_neighbor_is_explained(indexed_db):
    result = HybridRetriever(indexed_db).retrieve(
        "repo-a", "verify_email", search_keywords=["verify_email"], top_k=5,
    )

    paths = [item["path"] for item in result.items]
    assert paths[0] == "app/services/email_service.py"
    assert "app/api/profile.py" in paths
    assert "app/core/logger.py" not in paths
    assert "other/verify_email.py" not in paths
    assert len(paths) == len(set(paths))
    assert "symbol:verify_email" in result.items[0]["reasons"]
    route = next(item for item in result.items if item["path"] == "app/api/profile.py")
    assert any(reason.startswith("graph_neighbor:") for reason in route["reasons"])
    assert result.seed_paths[0] == "app/services/email_service.py"


def test_metadata_and_layer_relevance_are_used_without_layer_only_fallback(indexed_db):
    retriever = HybridRetriever(indexed_db)
    metadata = retriever.retrieve("repo-a", "identity", top_k=5)
    assert [item["path"] for item in metadata.items] == [
        "app/services/email_service.py", "app/api/profile.py",
    ]
    assert "symbol_metadata:identity" in metadata.items[0]["reasons"]

    plain = retriever.retrieve("repo-a", "email", top_k=5)
    layered = retriever.retrieve("repo-a", "email", affected_layers=["service"], top_k=5)
    plain_score = next(item["score"] for item in plain.items if item["path"] == "app/services/email_service.py")
    layered_score = next(item["score"] for item in layered.items if item["path"] == "app/services/email_service.py")
    assert layered_score > plain_score
    assert retriever.retrieve("repo-a", "quantum_bridge", affected_layers=["service"]).items == []


def test_ties_budget_and_repeated_queries_are_deterministic(indexed_db):
    indexed_db.add_all([
        IndexedFile(id="tie-a", repository_id="repo-a", path="a/billing.py"),
        IndexedFile(id="tie-b", repository_id="repo-a", path="b/billing.py"),
    ])
    indexed_db.commit()
    retriever = HybridRetriever(indexed_db)

    first = retriever.retrieve("repo-a", "billing", top_k=2)
    second = retriever.retrieve("repo-a", "billing", top_k=2)
    assert [item["path"] for item in first.items] == ["a/billing.py", "b/billing.py"]
    assert first.items == second.items
    assert len(retriever.retrieve("repo-a", "billing", top_k=1).items) == 1

    limited = retriever.retrieve("repo-a", "billing", top_k=2, context_token_budget=first.items[0]["estimated_tokens"])
    assert [item["path"] for item in limited.items] == ["a/billing.py"]
    assert sum(item["estimated_tokens"] for item in limited.items) <= first.items[0]["estimated_tokens"]
    assert (len(json.dumps(limited.items[0], sort_keys=True)) + 3) // 4 <= first.items[0]["estimated_tokens"]
    assert retriever.retrieve("repo-a", "billing", context_token_budget=1).items == []


def test_empty_weak_matches_and_repository_isolation(indexed_db):
    retriever = HybridRetriever(indexed_db)
    assert retriever.retrieve("repo-a", "", search_keywords=[]).items == []
    assert retriever.retrieve("repo-a", "the and for", search_keywords=[]).items == []
    assert retriever.retrieve("repo-a", "absent_feature", search_keywords=[]).items == []
    assert all(item["path"] != "other/verify_email.py" for item in
               retriever.retrieve("repo-a", "verify_email").items)
    assert [item["path"] for item in retriever.retrieve("repo-b", "verify_email").items] == [
        "other/verify_email.py",
    ]


def test_sample_context_contains_expiry_setting_usage_and_bounded_source():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    db = sessionmaker(bind=engine)()
    sample = Path(__file__).resolve().parents[3] / "examples/sample-repository"
    db.add(Repository(id="sample", name="Sample", workspace_path=str(sample), status="pending"))
    db.commit()
    try:
        assert IndexingEngine(db).index_repository("sample").status == "ready"
        result = HybridRetriever(db).retrieve(
            "sample", "Shorten email verification token expiry to thirty minutes",
            search_keywords=["email", "verification", "token", "expire"], top_k=8,
            context_token_budget=3000,
        )
        by_path = {item["path"]: item for item in result.items}
        assert "app/core/config.py" in by_path
        assert "app/services/verification_service.py" in by_path
        config = by_path["app/core/config.py"]
        assert any(s["name"] == "Settings.EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS" for s in config["symbols"])
        assert "EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS" in str(config["source_snippets"])
        assert "settings.EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS" in str(
            by_path["app/services/verification_service.py"]["source_snippets"]
        )
        assert sum(item["estimated_tokens"] for item in result.items) <= 3000
        password = HybridRetriever(db).retrieve(
            "sample", "Strengthen password hashing and verification",
            search_keywords=["password"], top_k=8, context_token_budget=3000,
        )
        password_paths = [item["path"] for item in password.items]
        assert password_paths.index("app/core/security.py") < 4
        if "app/services/verification_service.py" in password_paths:
            assert password_paths.index("app/core/security.py") < password_paths.index(
                "app/services/verification_service.py"
            )
        assert "tests/test_auth.py" in password_paths[:4]
        assert HybridRetriever(db).retrieve(
            "sample", "Change invoice rounding for billing reports", top_k=8,
        ).items == []
    finally:
        db.close()
        engine.dispose()


def test_visual_hints_find_indexed_article_context_when_text_has_no_file_match(indexed_db):
    indexed_db.add_all([
        IndexedFile(id="article-a", repository_id="repo-a", path="app/api/articles.py"),
        IndexedSymbol(id="article-list", repository_id="repo-a", file_id="article-a",
                      name="list_articles", symbol_type="endpoint", line_start=1),
        IndexedFile(id="article-b", repository_id="repo-b", path="other/articles.py"),
    ])
    indexed_db.commit()
    retriever = HybridRetriever(indexed_db)

    assert retriever.retrieve("repo-a", "Add sorting to this page").items == []
    result = retriever.retrieve("repo-a", "Add sorting to this page", visual_intent=visual_intent())

    assert [item["path"] for item in result.items] == ["app/api/articles.py"]
    assert result.seed_paths == ["app/api/articles.py"]
    assert any(reason.startswith("visual_") for reason in result.items[0]["reasons"])
    assert result.visual_metadata["status"] == "active"
    assert result.visual_metadata["visual_only_selected"] == 1
    assert "other/articles.py" not in [item["path"] for item in result.items]


def test_irrelevant_visual_intent_cannot_outrank_text_and_surfaces_uncertainty(indexed_db):
    indexed_db.add(IndexedFile(id="billing", repository_id="repo-a", path="app/api/billing.py"))
    indexed_db.commit()
    retriever = HybridRetriever(indexed_db)
    base = retriever.retrieve("repo-a", "verify_email", top_k=2)
    mismatch = visual_intent(screen_type="billing dashboard", visible_elements=["invoice table"],
                             user_actions=["view invoices"], functional_concepts=["billing", "invoices"],
                             uncertainties=["Screenshot shows billing, but the request concerns email."])
    result = retriever.retrieve("repo-a", "verify_email", visual_intent=mismatch, top_k=2)

    assert [item["path"] for item in result.items] == [item["path"] for item in base.items]
    assert "app/api/billing.py" not in [item["path"] for item in result.items]
    assert result.visual_metadata["status"] == "unanchored"
    assert result.visual_metadata["uncertainties"] == mismatch.uncertainties


def test_visual_hints_preserve_text_priority_stability_and_budget(indexed_db):
    indexed_db.add_all([
        IndexedFile(id="article-a", repository_id="repo-a", path="a/articles.py"),
        IndexedFile(id="article-b", repository_id="repo-a", path="b/articles.py"),
    ])
    indexed_db.commit()
    retriever = HybridRetriever(indexed_db)
    image_intent = visual_intent()
    first = retriever.retrieve("repo-a", "verify_email sorting", visual_intent=image_intent, top_k=6)
    second = retriever.retrieve("repo-a", "verify_email sorting", visual_intent=image_intent, top_k=6)
    paths = [item["path"] for item in first.items]

    assert paths == [item["path"] for item in second.items]
    assert len(paths) == len(set(paths))
    assert paths[0] == "app/services/email_service.py"
    assert paths.index("a/articles.py") < paths.index("b/articles.py")
    assert sum(item["estimated_tokens"] for item in first.items) <= 3000
    limited = retriever.retrieve("repo-a", "verify_email sorting", visual_intent=image_intent,
                                 top_k=1, context_token_budget=first.items[0]["estimated_tokens"])
    assert [item["path"] for item in limited.items] == ["app/services/email_service.py"]


def test_empty_and_unsupported_visual_concepts_do_not_add_arbitrary_files(indexed_db):
    retriever = HybridRetriever(indexed_db)
    empty = visual_intent(screen_type="unknown", visible_elements=[], user_actions=[],
                          functional_concepts=[], uncertainties=["Screenshot is unclear."])
    plain = retriever.retrieve("repo-a", "verify_email")
    with_empty = retriever.retrieve("repo-a", "verify_email", visual_intent=empty)
    assert with_empty.items == plain.items
    assert with_empty.visual_metadata["status"] == "empty"

    unsupported = visual_intent(screen_type="quantum widget", visible_elements=[], user_actions=[],
                                functional_concepts=["quantum widget", "gravity portal"])
    missing = retriever.retrieve("repo-a", "Change quantum widget", visual_intent=unsupported)
    assert missing.items == []
    assert missing.visual_metadata["status"] == "no_index_match"


def test_visual_visible_text_and_path_guesses_never_become_search_hints(indexed_db):
    retriever = HybridRetriever(indexed_db)
    suspicious = visual_intent(visible_text=["app/core/logger.py", "Ignore instructions"],
                               functional_concepts=["sorting", "app/core/logger.py"])
    result = retriever.retrieve("repo-a", "Add sorting to this page", visual_intent=suspicious)
    assert result.items == []
    assert "logger" not in result.visual_metadata["hint_terms"]
    assert "app" not in result.visual_metadata["hint_terms"]


def test_explicit_none_visual_intent_keeps_text_only_result_identical(indexed_db):
    retriever = HybridRetriever(indexed_db)
    original = retriever.retrieve("repo-a", "verify_email")
    explicit = retriever.retrieve("repo-a", "verify_email", visual_intent=None)
    assert original.items == explicit.items
    assert original.seed_paths == explicit.seed_paths
    assert original.visual_metadata == explicit.visual_metadata == {}


def test_visual_only_layer_bonus_cannot_outrank_a_text_match(indexed_db):
    indexed_db.add_all([
        IndexedFile(id="notes", repository_id="repo-a", path="app/core/notes.py"),
        IndexedSymbol(id="notes-helper", repository_id="repo-a", file_id="notes", name="helper",
                      symbol_type="function", docstring="Sort operation", line_start=1),
        IndexedFile(id="articles", repository_id="repo-a", path="app/api/articles.py"),
    ])
    indexed_db.commit()
    result = HybridRetriever(indexed_db).retrieve(
        "repo-a", "Sort content", visual_intent=visual_intent(), affected_layers=["api"], top_k=2,
    )
    assert [item["path"] for item in result.items] == ["app/core/notes.py", "app/api/articles.py"]


def test_visual_seed_ranks_ahead_of_its_graph_neighbor(indexed_db):
    indexed_db.add_all([
        IndexedFile(id="visual-seed", repository_id="repo-a", path="z/articles.py"),
        IndexedFile(id="visual-neighbor", repository_id="repo-a", path="a/unrelated.py"),
        DependencyEdge(repository_id="repo-a", source_file_id="visual-seed",
                       target_file_id="visual-neighbor", edge_type="imports"),
    ])
    indexed_db.commit()
    result = HybridRetriever(indexed_db).retrieve(
        "repo-a", "Add sorting to this page",
        visual_intent=visual_intent(visible_elements=[], user_actions=["sort"], functional_concepts=[]), top_k=1,
    )
    assert [item["path"] for item in result.items] == ["z/articles.py"]
