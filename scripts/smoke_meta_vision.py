"""One-request Meta vision smoke. Default mode is offline preflight only.

Run from the repository root. Live mode requires two explicit opt-ins and
never invokes the multi-pass impact orchestrator.
"""

import argparse
from dataclasses import dataclass
from datetime import datetime, timezone
import json
from pathlib import Path
import sys

import httpx
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "services" / "api"))

from app.ai.image_input import ValidatedScreenshot, decode_uploaded_screenshot
from app.ai.provider import MetaAIHttpProvider
from app.ai.schemas import StructuredVisualIntent
from app.core.config import settings
from app.db.database import Base
from app.db.models import IndexedFile, Repository
from app.indexing.engine import IndexingEngine
from scripts.evaluate_multimodal import validate_fixture


FIXTURE = ROOT / "services/api/tests/evaluation/multimodal_cases_v1.json"
ARTIFACT = ROOT / "data/sg_ai_22_live_vision.json"
CASE_ID = "email_confirmation"
EXPECTED_MODEL = "muse-spark-1.3"
EXPECTED_BASE_URL = "https://api.meta.ai/v1"
MAX_OUTPUT_TOKENS = 3000


@dataclass(frozen=True)
class PreparedCase:
    case_id: str
    repository_snapshot: str
    source_image_sha256: str
    requirement: str
    screenshot: ValidatedScreenshot
    indexed_file_count: int
    indexed_paths: frozenset[str]


def prepare_case() -> PreparedCase:
    """Validate owned fixture and index its pinned source in ephemeral SQLite."""
    fixture = validate_fixture(FIXTURE)
    case = next(item for item in fixture["cases"] if item["id"] == CASE_ID)
    image = decode_uploaded_screenshot(
        (ROOT / case["screenshot"]["path"]).read_bytes(),
        case["screenshot"]["mime_type"],
    )
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    db = sessionmaker(bind=engine)()
    try:
        repo = Repository(
            id="sg-ai-22-sample", name="SG-AI-22 sample",
            workspace_path=str(ROOT / fixture["repository"]), status="pending",
        )
        db.add(repo)
        db.commit()
        if IndexingEngine(db).index_repository(repo.id).status != "ready":
            raise ValueError("Pinned sample repository could not be indexed")
        paths = frozenset(
            item.path for item in db.query(IndexedFile).filter_by(repository_id=repo.id)
        )
        expected = set(case["retrieval_relevant"]) | set(case["impact"]["direct"]) | set(case["impact"]["indirect"])
        if not expected <= paths:
            raise ValueError("Expected source files are missing from the index")
        return PreparedCase(
            case_id=CASE_ID,
            repository_snapshot=fixture["repository_snapshot"],
            source_image_sha256=case["screenshot"]["sha256"],
            requirement=case["requirement"], screenshot=image,
            indexed_file_count=len(paths), indexed_paths=paths,
        )
    finally:
        db.close()
        engine.dispose()


class OneRequestTransport(httpx.BaseTransport):
    """Block a second HTTP attempt even if provider retry behavior changes."""

    def __init__(self, inner: httpx.BaseTransport):
        self.inner = inner
        self.attempts = 0

    def handle_request(self, request: httpx.Request) -> httpx.Response:
        if self.attempts >= 1:
            raise RuntimeError("The one-request vision budget was exhausted")
        self.attempts += 1
        return self.inner.handle_request(request)

    def close(self) -> None:
        self.inner.close()


def run_one_request(
    prepared: PreparedCase, output: Path, *,
    transport: httpx.BaseTransport | None = None,
    max_requests: int = 1, timeout_seconds: float = 30.0,
) -> dict:
    """Call only screenshot interpretation; persist structured, bounded metadata."""
    if max_requests != 1:
        raise ValueError("Live vision budget must be exactly one request")
    if not 1 <= timeout_seconds <= 45:
        raise ValueError("Timeout must be between 1 and 45 seconds")
    marker = output.with_suffix(output.suffix + ".attempted")
    if output.exists() or marker.exists():
        raise ValueError("Live vision artifact already exists; refusing another request")
    if (settings.META_AI_PROVIDER != "meta_model_api"
            or settings.META_AI_MODEL != EXPECTED_MODEL
            or settings.META_AI_BASE_URL.rstrip("/") != EXPECTED_BASE_URL):
        raise ValueError("Meta provider, model or endpoint does not match the approved case")
    if not settings.META_AI_API_KEY.strip():
        raise ValueError("Meta API key is not configured")

    output.parent.mkdir(parents=True, exist_ok=True)
    try:
        with marker.open("x", encoding="utf-8") as file:
            file.write("One live vision request budget consumed; fresh approval is required to retry.\n")
    except FileExistsError:
        raise ValueError("Live vision request budget is already consumed") from None

    provider = MetaAIHttpProvider(
        api_key=settings.META_AI_API_KEY,
        base_url=EXPECTED_BASE_URL,
        model=EXPECTED_MODEL,
    )
    provider.client.close()
    gate = OneRequestTransport(transport or httpx.HTTPTransport(retries=0))
    provider.client = httpx.Client(
        headers={
            "Authorization": f"Bearer {settings.META_AI_API_KEY}",
            "Content-Type": "application/json",
        },
        transport=gate,
        timeout=httpx.Timeout(timeout_seconds),
        follow_redirects=False,
    )
    provider.max_retries = 0
    prior_limit = settings.META_AI_MAX_TOKENS
    settings.META_AI_MAX_TOKENS = MAX_OUTPUT_TOKENS
    try:
        response = provider.interpret_screenshot(prepared.requirement, prepared.screenshot)
        visual = StructuredVisualIntent.model_validate(response.data)
    finally:
        settings.META_AI_MAX_TOKENS = prior_limit
        provider.client.close()
    if gate.attempts != 1:
        raise RuntimeError("Vision request count did not equal one")

    result = {
        "case_id": prepared.case_id,
        "repository_snapshot": prepared.repository_snapshot,
        "source_image_sha256": prepared.source_image_sha256,
        "normalized_image_sha256": prepared.screenshot.sha256,
        "provider": response.provider,
        "requested_model": EXPECTED_MODEL,
        "served_model": response.model,
        "request_attempts": gate.attempts,
        "timeout_seconds": timeout_seconds,
        "latency_seconds": response.latency_seconds,
        "token_usage": response.token_usage,
        "visual_intent": visual.model_dump(),
        "captured_at_utc": datetime.now(timezone.utc).isoformat(),
    }
    with output.open("x", encoding="utf-8") as file:
        json.dump(result, file, indent=2, ensure_ascii=False)
        file.write("\n")
    return result


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="SG-AI-22 one-request Meta vision smoke")
    parser.add_argument("--execute-live", action="store_true")
    parser.add_argument("--allow-paid-request", action="store_true")
    parser.add_argument("--max-requests", type=int, default=1)
    parser.add_argument("--timeout-seconds", type=float, default=30.0)
    args = parser.parse_args(argv)
    if Path.cwd().resolve() != ROOT:
        print("Run this script from the repository root.")
        return 2
    if args.execute_live != args.allow_paid_request:
        print("Live mode requires both --execute-live and --allow-paid-request.")
        return 2
    try:
        prepared = prepare_case()
        if not args.execute_live:
            config_matches = (
                settings.META_AI_PROVIDER == "meta_model_api"
                and settings.META_AI_MODEL == EXPECTED_MODEL
                and settings.META_AI_BASE_URL.rstrip("/") == EXPECTED_BASE_URL
            )
            print(
                f"Offline preflight: case={prepared.case_id}, snapshot={prepared.repository_snapshot}, "
                f"image_sha256={prepared.source_image_sha256}, indexed_files={prepared.indexed_file_count}, "
                f"expected_model={EXPECTED_MODEL}, expected_endpoint={EXPECTED_BASE_URL}, "
                f"config_matches={config_matches}, key_configured={bool(settings.META_AI_API_KEY.strip())}. "
                "No HTTP request sent."
            )
            return 0
        result = run_one_request(
            prepared, ARTIFACT,
            max_requests=args.max_requests, timeout_seconds=args.timeout_seconds,
        )
    except Exception:
        print("Vision smoke failed safely; no request or response content is printed.")
        return 1
    print(f"Vision smoke completed: requests={result['request_attempts']}; sanitized artifact={ARTIFACT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
