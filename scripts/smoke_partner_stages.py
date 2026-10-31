"""Bounded partner-stage smoke. Default mode performs local preflight only.

Live mode requires explicit flags and configured deployment credentials. It
executes one partner stage, never the multi-pass orchestrator or a fallback.
"""

import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import sys

import httpx


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "services" / "api"))

from app.ai.routing import BasetenVisionProvider, ModalReasoningProvider, _approved_endpoint
from app.ai.schemas import ImpactAnalysisResult, StructuredVisualIntent
from app.core.config import settings
from scripts.smoke_meta_vision import OneRequestTransport, prepare_case


STAGES = ("baseten_vision", "modal_reasoning")
SAMPLE_PATH = ROOT / "examples/sample-repository/app/services/user_service.py"


def _configuration(stage: str) -> tuple[str, str, str, int]:
    if stage == "baseten_vision":
        return (
            settings.BASETEN_VISION_BASE_URL, settings.BASETEN_VISION_MODEL,
            settings.BASETEN_VISION_API_KEY, settings.BASETEN_VISION_MAX_TOKENS,
        )
    if stage == "modal_reasoning":
        return (
            settings.MODAL_REASONING_BASE_URL, settings.MODAL_REASONING_MODEL,
            settings.MODAL_REASONING_API_KEY, settings.MODAL_REASONING_MAX_TOKENS,
        )
    raise ValueError("Unsupported partner stage")


def run_one_request(
    stage: str, output: Path, *, transport: httpx.BaseTransport | None = None,
    max_requests: int = 1, timeout_seconds: float = 30.0,
) -> dict:
    """Probe one approved deployment with one owned fixture and a hard HTTP gate."""
    if max_requests != 1 or not 1 <= timeout_seconds <= 60:
        raise ValueError("Partner smoke requires one request and a timeout of 1–60 seconds")
    base_url, model, key, max_tokens = _configuration(stage)
    partner = "baseten" if stage == "baseten_vision" else "modal"
    if not (base_url and model and key and _approved_endpoint(base_url, partner)):
        raise ValueError("Partner endpoint, model or credential is unconfigured or unapproved")
    if stage == "baseten_vision" and not settings.BASETEN_VISION_CAPABLE:
        raise ValueError("Baseten deployment is not declared vision-capable")

    marker = output.with_suffix(output.suffix + ".attempted")
    if output.exists() or marker.exists():
        raise ValueError("Partner smoke budget already consumed")
    prepared = prepare_case()
    if stage == "modal_reasoning" and "app/services/user_service.py" not in prepared.indexed_paths:
        raise ValueError("Sample reasoning source is absent from the index")

    output.parent.mkdir(parents=True, exist_ok=True)
    try:
        with marker.open("x", encoding="utf-8") as handle:
            handle.write("One partner request budget consumed; a fresh artifact path is required to retry.\n")
    except FileExistsError:
        raise ValueError("Partner smoke budget already consumed") from None

    provider_type = BasetenVisionProvider if stage == "baseten_vision" else ModalReasoningProvider
    provider = provider_type(
        api_key=key, base_url=base_url, model=model,
        max_retries=0, max_tokens=max_tokens, request_budget=1,
    )
    provider.client.close()
    gate = OneRequestTransport(transport or httpx.HTTPTransport(retries=0))
    provider.client = httpx.Client(
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        transport=gate, timeout=httpx.Timeout(timeout_seconds), follow_redirects=False,
    )
    try:
        if stage == "baseten_vision":
            response = provider.interpret_screenshot(prepared.requirement, prepared.screenshot)
            output_data = StructuredVisualIntent.model_validate(response.data).model_dump()
        else:
            source = SAMPLE_PATH.read_text(encoding="utf-8")
            response = provider.reason_about_impact(
                {"business_intent": prepared.requirement},
                [{"path": "app/services/user_service.py", "content": source}],
                {},
            )
            output_data = ImpactAnalysisResult.model_validate(response.data).model_dump()
    finally:
        provider.client.close()
    if gate.attempts != 1:
        raise RuntimeError("Partner smoke request count was not exactly one")

    result = {
        "stage": stage,
        "case_id": prepared.case_id,
        "repository_snapshot": prepared.repository_snapshot,
        "source_image_sha256": prepared.source_image_sha256 if stage == "baseten_vision" else None,
        "requested_model": model,
        "served_model": response.model,
        "provider": response.provider,
        "request_attempts": gate.attempts,
        "timeout_seconds": timeout_seconds,
        "latency_seconds": response.latency_seconds,
        "token_usage": response.token_usage,
        "output_classification": (
            "untrusted_visual_observations" if stage == "baseten_vision"
            else "unverified_model_claims"
        ),
        "output": output_data,
        "captured_at_utc": datetime.now(timezone.utc).isoformat(),
    }
    with output.open("x", encoding="utf-8") as handle:
        json.dump(result, handle, indent=2, ensure_ascii=False)
        handle.write("\n")
    return result


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Single-request Baseten or Modal stage smoke")
    parser.add_argument("--stage", choices=STAGES, required=True)
    parser.add_argument("--execute-live", action="store_true")
    parser.add_argument("--allow-paid-request", action="store_true")
    parser.add_argument("--max-requests", type=int, default=1)
    parser.add_argument("--timeout-seconds", type=float, default=30.0)
    args = parser.parse_args(argv)
    if Path.cwd().resolve() != ROOT:
        print("Run from the repository root.")
        return 2
    if args.execute_live != args.allow_paid_request:
        print("Live mode requires both explicit flags.")
        return 2
    try:
        prepared = prepare_case()
        base_url, model, key, _ = _configuration(args.stage)
        if not args.execute_live:
            print(
                f"Offline preflight: stage={args.stage}, case={prepared.case_id}, "
                f"indexed_files={prepared.indexed_file_count}, "
                f"deployment_configured={bool(base_url and model)}, "
                f"key_configured={bool(key)}. No HTTP request sent."
            )
            return 0
        output = ROOT / "data" / f"partner_smoke_{args.stage}.json"
        result = run_one_request(
            args.stage, output, max_requests=args.max_requests,
            timeout_seconds=args.timeout_seconds,
        )
    except Exception:
        print("Partner smoke failed safely; request and response content are not printed.")
        return 1
    print(f"Partner smoke completed: requests={result['request_attempts']}; artifact={output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
