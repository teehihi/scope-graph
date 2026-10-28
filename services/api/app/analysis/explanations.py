"""Structured explanations derived from validated impact data."""

import re
from typing import Literal

from pydantic import BaseModel, Field


class EvidenceRef(BaseModel):
    file_path: str
    symbol: str | None = None
    line_start: int | None = None
    line_end: int | None = None


class TechnicalExplanation(BaseModel):
    component: str
    reason: str
    dependency_path: list[str] = Field(default_factory=list)
    evidence_refs: list[EvidenceRef] = Field(default_factory=list)
    regression_considerations: list[str] = Field(default_factory=list)


class SimpleExplanation(BaseModel):
    functional_area: str
    summary: str
    why_it_matters: str
    possible_risk: str
    recommended_check: str
    uncertainty: str


class ImpactExplanation(BaseModel):
    technical_explanation: TechnicalExplanation
    simple_explanation: SimpleExplanation
    evidence_status: Literal["supported", "potential", "unsupported"]


def _readable(value: str) -> str:
    known = {
        "hash_password": "Password protection",
        "verify_password": "Password check",
        "verify_token": "Token check",
    }
    if value in known:
        return known[value]
    spaced = re.sub(r"([a-z])([A-Z])", r"\1 \2", value.replace("_", " ").replace("-", " "))
    return " ".join(spaced.split()).capitalize()


def explain_item(item: dict) -> dict:
    """Map verified fields to both views without a new inference request."""
    status = "supported" if item.get("impact_supported") else "potential"
    path = item.get("file_path") or ""
    symbol = item.get("symbol")
    name = symbol.split(".")[-1] if symbol else path.rsplit("/", 1)[-1].removesuffix(".py")
    area = _readable(name) if name and name != "unknown" else "Unknown"
    ref = []
    if path and item.get("evidence_snippet") and item.get("line_start"):
        ref = [EvidenceRef(file_path=path, symbol=symbol,
                           line_start=item["line_start"], line_end=item.get("line_end"))]
    routes = item.get("dependency_path") or []
    if not routes:
        paths = item.get("dependency_paths") or {}
        routes = next(iter(paths.values()), [])
    if status == "supported":
        summary = f"The proposed change may affect {area.lower()}."
        why = ("The indexed source contains a matching code element."
               if item.get("impact_type") == "direct" else
               "An indexed call links this part to a direct change target.")
        uncertainty = "Static source evidence does not prove every runtime effect."
        check = "Review the cited source lines and run relevant tests."
    else:
        summary = f"Review {area.lower()} for possible effects of the change."
        why = "This part was suggested for review; a causal effect has not been established."
        uncertainty = "The effect on this part has not been established by source evidence."
        check = "Inspect this part before treating it as affected."
    result = ImpactExplanation(
        technical_explanation=TechnicalExplanation(
            component=f"{path}::{symbol}" if symbol else path,
            reason=item.get("support_reason") or "Causal effect has not been established",
            dependency_path=routes, evidence_refs=ref,
            regression_considerations=["Check callers and relevant tests"] if status == "supported" else [],
        ),
        simple_explanation=SimpleExplanation(
            functional_area=area, summary=summary, why_it_matters=why,
            possible_risk="Related behavior could change unexpectedly if this part is edited incorrectly.",
            recommended_check=check, uncertainty=uncertainty,
        ),
        evidence_status=status,
    )
    return result.model_dump()
