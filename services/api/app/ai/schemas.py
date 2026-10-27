from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StrictBool, StringConstraints


NonEmptyStr = Annotated[str, StringConstraints(strict=True, strip_whitespace=True, min_length=1)]
Layer = Literal["api", "service", "model", "core", "test", "module", "database", "security"]
ImpactCategory = Literal["api", "service", "database", "security", "test", "model", "core", "module"]


class RequirementInterpretation(BaseModel):
    model_config = ConfigDict(extra="forbid")

    business_intent: NonEmptyStr
    actors: list[NonEmptyStr]
    existing_behavior: NonEmptyStr
    desired_behavior: NonEmptyStr
    preconditions: list[NonEmptyStr]
    postconditions: list[NonEmptyStr]
    security_implications: list[NonEmptyStr]
    validation_requirements: list[NonEmptyStr]
    affected_layers: list[Layer]
    search_keywords: list[NonEmptyStr]
    ambiguities: list[NonEmptyStr]


class ImpactItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    file_path: NonEmptyStr
    symbol: NonEmptyStr | None = None
    impact_type: Literal["direct", "indirect"]
    category: ImpactCategory
    reason: NonEmptyStr
    confidence: float = Field(ge=0.0, le=1.0, strict=True)


class ImpactAnalysisResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    affected_items: list[ImpactItem]
    risks: list[NonEmptyStr]
    suggested_tests: list[NonEmptyStr]
    assumptions: list[NonEmptyStr]


class CompletenessReview(BaseModel):
    model_config = ConfigDict(extra="forbid")

    areas_reviewed: list[NonEmptyStr]
    is_complete: StrictBool
    potential_gaps: list[NonEmptyStr]
    additional_files_to_check: list[NonEmptyStr]
