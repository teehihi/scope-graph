"""No-network HTTP tests for the screenshot analysis upload boundary."""

import base64
import io
import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from PIL import Image, PngImagePlugin
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.ai.provider import AIProviderResponse, OfflineDemoProvider
from app.analysis import orchestrator as orchestrator_module
from app.api.routes import analysis as analysis_routes
from app.core.config import settings
from app.db.database import Base, get_db
from app.db.models import IndexedFile, IndexedSymbol, Repository
from app.main import app


class VisionProvider(OfflineDemoProvider):
    def __init__(self):
        self.images = []

    def interpret_screenshot(self, requirement, image):
        self.images.append(image)
        return AIProviderResponse(
            data={
                "screen_type": "article listing", "visible_text": ["Private UI text"],
                "visible_elements": ["article cards"], "user_actions": ["filter articles"],
                "functional_concepts": ["article listing", "author filtering"],
                "requirement_interpretation": "Filter articles by author.",
                "uncertainties": ["The implementation layer is unknown."],
            },
            provider="mock_vision", model="test-vision", latency_seconds=0.01,
            is_mock_or_demo=True, token_usage=None,
        )


@pytest.fixture
def client(tmp_path, monkeypatch):
    engine = create_engine(
        f"sqlite:///{tmp_path / 'api.db'}", connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine)
    source = tmp_path / "app/article_listing.py"
    source.parent.mkdir()
    source.write_text("def list_articles():\n    return []\n", encoding="utf-8")
    with factory() as db:
        db.add_all([
            Repository(id="visual-repo", name="Visual", workspace_path=str(tmp_path), status="ready"),
            Repository(id="pending-repo", name="Pending", workspace_path=str(tmp_path), status="indexing"),
            IndexedFile(id="visual-file", repository_id="visual-repo", path="app/article_listing.py"),
            IndexedSymbol(id="visual-symbol", repository_id="visual-repo", file_id="visual-file",
                          name="list_articles", symbol_type="function", line_start=1, line_end=2),
        ])
        db.commit()

    def local_db():
        with factory() as db:
            yield db

    app.dependency_overrides[get_db] = local_db
    provider = VisionProvider()
    monkeypatch.setattr(orchestrator_module, "get_ai_provider", lambda: provider)
    try:
        yield TestClient(app), provider
    finally:
        app.dependency_overrides.pop(get_db, None)
        engine.dispose()


def upload(client, image, mime="image/png", requirement="Add author filtering to the article page", repo="visual-repo"):
    return client.post(
        f"/api/v1/repositories/{repo}/analyze-screenshot",
        data={"requirement": requirement, "target_language": "en"},
        files={"screenshot": ("screen.png", image, mime)},
    )


def test_upload_runs_sync_without_text_cache_or_persisted_image(client, monkeypatch):
    http, provider = client
    image = "services/api/tests/evaluation/screenshots_v1/account_email.png"
    image_bytes = Path(image).read_bytes()
    monkeypatch.setattr(analysis_routes, "get_cache", lambda *_: pytest.fail("image used text cache"))
    monkeypatch.setattr(analysis_routes, "set_cache", lambda *_: pytest.fail("image used text cache"))

    response = upload(http, image_bytes)

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "completed"
    assert len(provider.images) == 1
    assert body["result"]["visual_context"]["image_sha256"] == provider.images[0].sha256
    assert body["result"]["visual_context"]["provider"] == "mock_vision"
    report = http.get(f"/api/v1/analyses/{body['analysis_id']}/report")
    assert report.status_code == 200
    assert report.json()["visual_context"] == body["result"]["visual_context"]
    persisted = json.dumps(body)
    assert base64.b64encode(image_bytes).decode("ascii") not in persisted
    assert "Private UI text" not in persisted


@pytest.mark.parametrize("repo,requirement,status", [
    ("missing", "Change articles", 404),
    ("pending-repo", "Change articles", 400),
    ("visual-repo", "  ", 400),
])
def test_upload_rejects_invalid_repository_or_requirement(client, repo, requirement, status):
    http, provider = client
    response = upload(http, b"image", repo=repo, requirement=requirement)
    assert response.status_code == status
    assert provider.images == []


@pytest.mark.parametrize("content,mime,status", [
    (b"not an image", "image/png", 400),
    (b"not an image", "image/jpeg", 400),
    (b"not an image", "image/gif", 415),
    (b"", "image/png", 400),
])
def test_upload_rejects_malformed_empty_or_unsupported_image(client, content, mime, status):
    http, provider = client
    response = upload(http, content, mime=mime)
    assert response.status_code == status
    assert provider.images == []


def test_upload_rejects_oversized_image_before_decode(client, monkeypatch):
    http, provider = client
    monkeypatch.setattr(settings, "MAX_SCREENSHOT_BYTES", 16)
    response = upload(http, b"x" * 17)
    assert response.status_code == 413
    assert provider.images == []


def test_upload_fully_decodes_jpeg_and_removes_private_metadata(client):
    http, provider = client
    source = Image.new("RGB", (2, 2), "blue")
    exif = Image.Exif()
    exif[270] = "private-upload-description"
    with io.BytesIO() as output:
        source.save(output, format="JPEG", exif=exif)
        jpeg = output.getvalue()

    response = upload(http, jpeg, mime="image/jpeg")

    assert response.status_code == 200
    assert response.json()["status"] == "completed"
    assert provider.images[0].mime_type == "image/png"
    assert provider.images[0].width == 2
    assert "private-upload-description" not in base64.b64decode(
        provider.images[0].data_url().split(",", 1)[1]
    ).decode("latin-1")


def test_upload_strips_png_text_metadata(client):
    http, provider = client
    metadata = PngImagePlugin.PngInfo()
    metadata.add_text("Description", "private-upload-description")
    with io.BytesIO() as output:
        Image.new("RGB", (2, 2), "blue").save(output, format="PNG", pnginfo=metadata)
        png = output.getvalue()

    response = upload(http, png)

    assert response.status_code == 200
    assert response.json()["status"] == "completed"
    assert b"private-upload-description" not in base64.b64decode(
        provider.images[0].data_url().split(",", 1)[1]
    )


def test_upload_rejects_jpeg_with_truncated_pixel_data(client):
    http, provider = client
    with io.BytesIO() as output:
        Image.new("RGB", (16, 16), "blue").save(output, format="JPEG")
        jpeg = output.getvalue()
    truncated = jpeg[:-20] + jpeg[-2:]

    response = upload(http, truncated, mime="image/jpeg")

    assert response.status_code == 400
    assert provider.images == []


def test_upload_checks_dimensions_and_mime_content_agreement(client, monkeypatch):
    http, provider = client
    with io.BytesIO() as output:
        Image.new("RGB", (2, 2), "blue").save(output, format="PNG")
        png = output.getvalue()
    assert upload(http, png, mime="image/jpeg").status_code == 400
    monkeypatch.setattr(settings, "MAX_SCREENSHOT_DIMENSION", 1)
    assert upload(http, png).status_code == 400
    assert provider.images == []


def test_upload_offline_provider_fails_explicitly_without_image_in_error(client, monkeypatch):
    http, _ = client
    monkeypatch.setattr(orchestrator_module, "get_ai_provider", OfflineDemoProvider)
    image_bytes = Path("services/api/tests/evaluation/screenshots_v1/account_email.png").read_bytes()
    response = upload(http, image_bytes)
    assert response.status_code == 200
    assert response.json()["status"] == "failed"
    status = http.get(f"/api/v1/analyses/{response.json()['analysis_id']}")
    assert "unavailable in offline demo mode" in status.json()["error_message"]
    assert base64.b64encode(image_bytes).decode("ascii") not in json.dumps(status.json())
