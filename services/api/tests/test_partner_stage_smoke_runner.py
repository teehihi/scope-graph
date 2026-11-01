"""No-network checks for one-request partner stage probes."""

import json

import httpx
import pytest

from app.core.config import settings
from scripts import smoke_partner_stages as smoke


def _response(model, data):
    return httpx.Response(200, json={
        "model": model,
        "choices": [{"message": {"content": json.dumps(data)}}],
        "usage": {"total_tokens": 12},
    })


def test_baseten_vision_sends_one_owned_image_and_saves_no_secret(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "BASETEN_VISION_BASE_URL", "https://inference.baseten.co/v1")
    monkeypatch.setattr(settings, "BASETEN_VISION_MODEL", "test-vision")
    monkeypatch.setattr(settings, "BASETEN_VISION_API_KEY", "private-baseten-test-key")
    monkeypatch.setattr(settings, "BASETEN_VISION_CAPABLE", True)
    requests = []

    def handle(request):
        requests.append(request)
        return _response("test-vision", {
            "screen_type": "email settings", "visible_text": ["Email"],
            "visible_elements": ["email field"], "user_actions": ["change email"],
            "functional_concepts": ["account settings"],
            "requirement_interpretation": "Confirm email before change.",
            "uncertainties": ["Backend behavior is not visible."],
        })

    path = tmp_path / "vision.json"
    result = smoke.run_one_request("baseten_vision", path, transport=httpx.MockTransport(handle))
    assert len(requests) == 1
    assert requests[0].url.host == "inference.baseten.co"
    assert json.loads(requests[0].content)["messages"][1]["content"][1]["type"] == "image_url"
    assert result["request_attempts"] == 1
    assert result["output"]["screen_type"] == "email settings"
    assert "private-baseten-test-key" not in path.read_text(encoding="utf-8")
    assert "data:image" not in path.read_text(encoding="utf-8")
    with pytest.raises(ValueError, match="budget|already"):
        smoke.run_one_request("baseten_vision", path, transport=httpx.MockTransport(handle))
    assert len(requests) == 1


def test_modal_reasoning_uses_sample_source_and_one_request(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "MODAL_REASONING_BASE_URL", "https://test.modal.direct/v1")
    monkeypatch.setattr(settings, "MODAL_REASONING_MODEL", "test-reasoning")
    monkeypatch.setattr(settings, "MODAL_REASONING_API_KEY", "private-modal-test-key")
    requests = []

    def handle(request):
        requests.append(request)
        return _response("test-reasoning", {
            "affected_items": [], "risks": [], "suggested_tests": [], "assumptions": [],
        })

    path = tmp_path / "reasoning.json"
    result = smoke.run_one_request("modal_reasoning", path, transport=httpx.MockTransport(handle))
    assert len(requests) == 1
    payload = json.loads(requests[0].content)
    assert requests[0].url.host == "test.modal.direct"
    assert "app/services/user_service.py" in payload["messages"][1]["content"]
    assert result["output"]["affected_items"] == []
    assert result["output_classification"] == "unverified_model_claims"
    assert "private-modal-test-key" not in path.read_text(encoding="utf-8")


def test_preflight_and_live_flags_never_infer_without_two_opt_ins(capsys, monkeypatch):
    monkeypatch.setattr(smoke, "run_one_request", lambda *_args, **_kwargs: pytest.fail("live call reached"))
    assert smoke.main(["--stage", "baseten_vision"]) == 0
    assert "No HTTP request sent" in capsys.readouterr().out
    assert smoke.main(["--stage", "baseten_vision", "--execute-live"]) == 2


def test_transient_partner_failure_consumes_the_one_request_budget(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "MODAL_REASONING_BASE_URL", "https://test.modal.direct/v1")
    monkeypatch.setattr(settings, "MODAL_REASONING_MODEL", "test-reasoning")
    monkeypatch.setattr(settings, "MODAL_REASONING_API_KEY", "private-modal-test-key")
    requests = []

    def handle(request):
        requests.append(request)
        return httpx.Response(429, text="private provider response")

    path = tmp_path / "failed.json"
    with pytest.raises(ValueError, match="429") as error:
        smoke.run_one_request("modal_reasoning", path, transport=httpx.MockTransport(handle))
    assert len(requests) == 1
    assert not path.exists()
    assert "private provider response" not in str(error.value)
    with pytest.raises(ValueError, match="budget"):
        smoke.run_one_request("modal_reasoning", path, transport=httpx.MockTransport(handle))
    assert len(requests) == 1
