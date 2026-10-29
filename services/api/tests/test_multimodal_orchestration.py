"""No-network tests for the optional SG-AI-17 orchestration path."""

import json
import struct
import zlib

import httpx
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.ai.image_input import ValidatedScreenshot
from app.ai.provider import AIProviderResponse, MetaAIHttpProvider, OfflineDemoProvider
from app.db.database import Base
from app.db.models import IndexedFile, IndexedSymbol, Repository
from app.analysis import orchestrator as orchestrator_module
from app.analysis.orchestrator import AnalysisOrchestrator


def _png() -> bytes:
    def chunk(kind: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data))

    header = struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0)
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header)
            + chunk(b"IDAT", zlib.compress(b"\x00\x00\x00\x00")) + chunk(b"IEND", b""))


@pytest.fixture
def db(tmp_path):
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    path = tmp_path / "app/article_listing.py"
    path.parent.mkdir()
    path.write_text("def list_articles():\n    return []\n", encoding="utf-8")
    session.add_all([
        Repository(id="visual-repo", name="Visual", workspace_path=str(tmp_path), status="ready"),
        IndexedFile(id="visual-file", repository_id="visual-repo", path="app/article_listing.py"),
        IndexedSymbol(id="visual-symbol", repository_id="visual-repo", file_id="visual-file",
                      name="list_articles", symbol_type="function", line_start=1, line_end=2),
    ])
    session.commit()
    yield session
    session.close()
    engine.dispose()


class VisionProvider(OfflineDemoProvider):
    def __init__(self):
        self.visual_calls = 0
        self.reasoning_files = None

    def interpret_screenshot(self, requirement, image):
        self.visual_calls += 1
        assert requirement == "Add author filtering to the article page"
        assert isinstance(image, ValidatedScreenshot)
        return AIProviderResponse(
            data={
                "screen_type": "article listing", "visible_text": ["private OCR text"],
                "visible_elements": ["article cards", "filter control"],
                "user_actions": ["filter articles"],
                "functional_concepts": ["article listing", "author filtering"],
                "requirement_interpretation": "Filter the article listing by author.",
                "uncertainties": ["The filter may run on client or server."],
            },
            provider="mock_vision", model="vision-test", latency_seconds=0.01,
            is_mock_or_demo=True, token_usage={"total_tokens": 2},
        )

    def reason_about_impact(self, requirement_interpretation, retrieved_files, dependency_context):
        self.reasoning_files = [item["path"] for item in retrieved_files]
        response = super().reason_about_impact(requirement_interpretation, retrieved_files, dependency_context)
        response.data["affected_items"] = []
        return response


def test_visual_context_flows_through_retrieval_without_becoming_impact_evidence(db, monkeypatch):
    provider = VisionProvider()
    monkeypatch.setattr(orchestrator_module, "get_ai_provider", lambda: provider)
    screenshot = ValidatedScreenshot.from_bytes(_png(), "image/png")
    trace = {}

    run = AnalysisOrchestrator(db).run_analysis(
        "visual-repo", "Add author filtering to the article page",
        screenshot=screenshot, evaluation_trace=trace,
    )

    assert run.status == "completed"
    assert provider.visual_calls == 1
    assert "app/article_listing.py" in provider.reasoning_files
    report = run.result_json
    assert report["affected_items"] == []
    assert report["visual_context"]["image_sha256"] == screenshot.sha256
    assert report["visual_context"]["provider"] == "mock_vision"
    assert report["visual_context"]["model"] == "vision-test"
    assert report["visual_context"]["retrieval"]["status"] == "active"
    assert "The filter may run on client or server." in report["visual_context"]["uncertainties"]
    assert report["operational_metadata"]["token_usage"]["total_tokens"] == 2
    assert trace["visual_context"] == report["visual_context"]
    serialized = json.dumps({"report": report, "trace": trace, "brief": run.brief_markdown})
    assert screenshot.data_url() not in serialized
    assert "private OCR text" not in serialized


def test_text_only_report_has_no_visual_context(db, monkeypatch):
    provider = VisionProvider()
    monkeypatch.setattr(orchestrator_module, "get_ai_provider", lambda: provider)

    run = AnalysisOrchestrator(db).run_analysis("visual-repo", "Add author filtering to the article page")

    assert run.status == "completed"
    assert provider.visual_calls == 0
    assert "visual_context" not in run.result_json


def test_offline_visual_request_fails_explicitly_without_persisting_image(db, monkeypatch):
    monkeypatch.setattr(orchestrator_module, "get_ai_provider", OfflineDemoProvider)
    screenshot = ValidatedScreenshot.from_bytes(_png(), "image/png")

    run = AnalysisOrchestrator(db).run_analysis("visual-repo", "Filter articles", screenshot=screenshot)

    assert run.status == "failed"
    assert "unavailable in offline demo mode" in run.error_message
    assert not run.result_json
    assert screenshot.data_url() not in run.error_message


def test_orchestrator_rejects_unvalidated_image_input_before_persisting_run(db):
    with pytest.raises(TypeError, match="ValidatedScreenshot"):
        AnalysisOrchestrator(db).run_analysis("visual-repo", "Filter articles", screenshot=b"image")


def test_visual_provider_schema_failure_is_explicit_and_sanitized(db, monkeypatch):
    class InvalidVisionProvider(VisionProvider):
        def interpret_screenshot(self, requirement, image):
            response = super().interpret_screenshot(requirement, image)
            response.data["affected_files"] = ["app/article_listing.py"]
            return response

    monkeypatch.setattr(orchestrator_module, "get_ai_provider", InvalidVisionProvider)
    screenshot = ValidatedScreenshot.from_bytes(_png(), "image/png")

    run = AnalysisOrchestrator(db).run_analysis(
        "visual-repo", "Add author filtering to the article page", screenshot=screenshot,
    )

    assert run.status == "failed"
    assert not run.result_json
    assert screenshot.data_url() not in run.error_message
    assert "affected_files" not in run.error_message


def test_visual_provider_error_does_not_log_or_persist_image(db, monkeypatch, caplog):
    screenshot = ValidatedScreenshot.from_bytes(_png(), "image/png")

    class LeakyProvider(VisionProvider):
        def interpret_screenshot(self, requirement, image):
            raise RuntimeError(f"transport failed: {image.data_url()}")

    monkeypatch.setattr(orchestrator_module, "get_ai_provider", LeakyProvider)
    run = AnalysisOrchestrator(db).run_analysis(
        "visual-repo", "Add author filtering to the article page", screenshot=screenshot,
    )

    assert run.status == "failed"
    assert screenshot.data_url() not in run.error_message
    assert screenshot.data_url() not in caplog.text
    assert "Screenshot interpretation failed" in run.error_message


def test_mocked_meta_pipeline_makes_one_vision_call_and_keeps_text_calls_compatible(db, monkeypatch):
    screenshot = ValidatedScreenshot.from_bytes(_png(), "image/png")
    visual = {
        "screen_type": "article listing", "visible_text": ["private OCR text"],
        "visible_elements": ["article cards", "filter control"],
        "user_actions": ["filter articles"],
        "functional_concepts": ["article listing", "author filtering"],
        "requirement_interpretation": "Filter articles by author.",
        "uncertainties": ["Client or server implementation is unknown."],
    }
    interpretation = {
        "business_intent": "Filter articles", "actors": ["reader"],
        "existing_behavior": "Article list has no author filter",
        "desired_behavior": "Article list can be filtered by author",
        "preconditions": [], "postconditions": [], "security_implications": [],
        "validation_requirements": [], "affected_layers": ["api"],
        "search_keywords": ["author", "filter"], "ambiguities": [],
    }
    impact = {"affected_items": [], "risks": [], "suggested_tests": [], "assumptions": []}
    review = {"areas_reviewed": ["api"], "is_complete": True, "potential_gaps": [],
              "additional_files_to_check": []}
    content = [json.dumps(item) for item in (visual, interpretation, impact, review)] + ["# Brief"]
    requests = []

    def handler(request):
        requests.append(json.loads(request.content))
        return httpx.Response(200, json={
            "model": "served-vision-model",
            "choices": [{"message": {"content": content[len(requests) - 1]}}],
            "usage": {"prompt_tokens": 2, "completion_tokens": 1, "total_tokens": 3},
        })

    provider = MetaAIHttpProvider("test-key", "https://api.meta.ai/v1", "muse-spark-1.3")
    provider.max_retries = 0
    provider.client.close()
    provider.client = httpx.Client(transport=httpx.MockTransport(handler))
    monkeypatch.setattr(orchestrator_module, "get_ai_provider", lambda: provider)
    try:
        run = AnalysisOrchestrator(db).run_analysis(
            "visual-repo", "Add author filtering to the article page", screenshot=screenshot,
        )
    finally:
        provider.client.close()

    assert run.status == "completed"
    assert len(requests) == 5
    assert isinstance(requests[0]["messages"][-1]["content"], list)
    assert sum(isinstance(request["messages"][-1]["content"], list) for request in requests) == 1
    assert all(screenshot.data_url() not in json.dumps(request) for request in requests[1:])
    assert all("private OCR text" not in json.dumps(request) for request in requests[1:])
    assert all(request["model"] == "muse-spark-1.3" for request in requests)
    assert run.result_json["operational_metadata"]["token_usage"]["total_tokens"] == 15
    assert run.result_json["visual_context"]["model"] == "served-vision-model"
    assert screenshot.data_url() not in json.dumps(run.result_json)
    assert "visual_context" not in json.dumps(requests[-1])
