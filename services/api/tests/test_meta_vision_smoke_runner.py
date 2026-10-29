"""Offline guard tests for the one-request SG-AI-22 runner."""

import importlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys

import httpx
import pytest

from app.core.config import settings


def runner():
    if importlib.util.find_spec("scripts.smoke_meta_vision") is None:
        pytest.fail("The SG-AI-22 one-request runner is missing")
    return importlib.import_module("scripts.smoke_meta_vision")


def vision_response():
    return httpx.Response(200, json={
        "model": "muse-spark-1.3",
        "choices": [{"message": {"content": json.dumps({
            "screen_type": "email settings",
            "visible_text": ["Save email"],
            "visible_elements": ["new email address field", "save button"],
            "user_actions": ["save a new email address"],
            "functional_concepts": ["profile", "email change"],
            "requirement_interpretation": "Require confirmation before updating email.",
            "uncertainties": ["The screenshot cannot show the verification backend."],
        })}}],
        "usage": {"prompt_tokens": 100, "completion_tokens": 50, "total_tokens": 150},
    })


def test_preflight_pins_owned_image_and_indexes_sample_without_network():
    prepared = runner().prepare_case()

    assert prepared.case_id == "email_confirmation"
    assert prepared.repository_snapshot == "f413b0b90d6157d5493a5603fb1245a7f4681eb6"
    assert prepared.source_image_sha256 == "e63ab13ea4f9b56ded558fdd6b1a73e18e002f25eb92ce87fa5881e140ac071a"
    assert prepared.indexed_file_count == 14
    assert (prepared.screenshot.width, prepared.screenshot.height) == (960, 560)
    assert prepared.screenshot.mime_type == "image/png"
    assert "app/api/users.py" in prepared.indexed_paths
    assert "app/services/user_service.py" in prepared.indexed_paths
    assert "app/api/verification.py" in prepared.indexed_paths


def test_one_request_uses_real_provider_schema_and_saves_only_sanitized_result(tmp_path, monkeypatch):
    smoke = runner()
    prepared = smoke.prepare_case()
    monkeypatch.setattr(settings, "META_AI_PROVIDER", "meta_model_api")
    monkeypatch.setattr(settings, "META_AI_MODEL", "muse-spark-1.3")
    monkeypatch.setattr(settings, "META_AI_BASE_URL", "https://api.meta.ai/v1")
    monkeypatch.setattr(settings, "META_AI_API_KEY", "test-private-key")
    requests = []

    def handler(request):
        requests.append(request)
        return vision_response()

    path = tmp_path / "vision.json"
    result = smoke.run_one_request(prepared, path, transport=httpx.MockTransport(handler))
    artifact = json.loads(path.read_text(encoding="utf-8"))

    assert len(requests) == 1
    assert requests[0].url.host == "api.meta.ai"
    assert requests[0].url.path == "/v1/chat/completions"
    assert requests[0].extensions["timeout"]["read"] == 30.0
    sent = json.loads(requests[0].content)
    assert sent["model"] == "muse-spark-1.3"
    assert sent["max_tokens"] == 3000
    assert sent["messages"][1]["content"][1]["type"] == "image_url"
    assert artifact["request_attempts"] == 1
    assert artifact["visual_intent"]["screen_type"] == "email settings"
    assert artifact["token_usage"]["total_tokens"] == 150
    assert result == artifact
    serialized = path.read_text(encoding="utf-8")
    assert "test-private-key" not in serialized
    assert "data:image" not in serialized
    assert prepared.requirement not in serialized
    assert settings.META_AI_MAX_TOKENS == 6000


def test_transient_failure_never_retries_or_saves_raw_response(tmp_path, monkeypatch):
    smoke = runner()
    prepared = smoke.prepare_case()
    monkeypatch.setattr(settings, "META_AI_PROVIDER", "meta_model_api")
    monkeypatch.setattr(settings, "META_AI_MODEL", "muse-spark-1.3")
    monkeypatch.setattr(settings, "META_AI_BASE_URL", "https://api.meta.ai/v1")
    monkeypatch.setattr(settings, "META_AI_API_KEY", "test-private-key")
    attempts = []

    def handler(request):
        attempts.append(request)
        return httpx.Response(429, text="private response body")

    path = tmp_path / "failed.json"
    with pytest.raises(ValueError, match="status 429") as error:
        smoke.run_one_request(prepared, path, transport=httpx.MockTransport(handler))

    assert len(attempts) == 1
    assert not path.exists()
    assert "private response body" not in str(error.value)
    assert "test-private-key" not in str(error.value)


def test_failed_attempt_consumes_budget_before_another_invocation(tmp_path, monkeypatch):
    smoke = runner()
    prepared = smoke.prepare_case()
    monkeypatch.setattr(settings, "META_AI_PROVIDER", "meta_model_api")
    monkeypatch.setattr(settings, "META_AI_MODEL", "muse-spark-1.3")
    monkeypatch.setattr(settings, "META_AI_BASE_URL", "https://api.meta.ai/v1")
    monkeypatch.setattr(settings, "META_AI_API_KEY", "test-private-key")
    attempts = []

    def handler(request):
        attempts.append(request)
        return httpx.Response(429, text="private response body")

    path = tmp_path / "failed.json"
    with pytest.raises(ValueError, match="status 429"):
        smoke.run_one_request(prepared, path, transport=httpx.MockTransport(handler))
    with pytest.raises(ValueError, match="budget|already"):
        smoke.run_one_request(prepared, path, transport=httpx.MockTransport(handler))
    assert len(attempts) == 1
    assert not path.exists()


def test_cli_requires_two_live_opt_ins_and_preflight_does_not_send(tmp_path, monkeypatch, capsys):
    smoke = runner()
    monkeypatch.setattr(smoke, "run_one_request", lambda *_args, **_kwargs: pytest.fail("paid call reached"))

    assert smoke.main([]) == 0
    preview = capsys.readouterr().out
    assert "e63ab13e" in preview
    assert "Require email verification" not in preview
    assert "data:image" not in preview
    assert smoke.main(["--execute-live"]) == 2
    assert smoke.main(["--allow-paid-request"]) == 2


def test_offline_preflight_never_prints_configured_url_secret(monkeypatch, capsys):
    smoke = runner()
    monkeypatch.setattr(settings, "META_AI_BASE_URL", "https://api.meta.ai/v1?secret=private-config")

    assert smoke.main([]) == 0
    assert "private-config" not in capsys.readouterr().out


def test_direct_script_command_runs_offline_without_pythonpath():
    root = Path(__file__).resolve().parents[3]
    environment = dict(os.environ)
    environment.pop("PYTHONPATH", None)
    environment["META_AI_PROVIDER"] = "offline_demo"
    result = subprocess.run(
        [sys.executable, str(root / "scripts/smoke_meta_vision.py")],
        cwd=root, env=environment, text=True, capture_output=True, check=False,
    )
    assert result.returncode == 0, result.stderr
    assert "No HTTP request sent" in result.stdout
