"""Validated, inert UI proposal format. Model output is untrusted input."""

import re
from typing import Literal, Self

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


ComponentType = Literal[
    "Container", "Stack", "Grid", "Heading", "Text", "Button", "Input", "Form",
    "Card", "ImagePlaceholder", "Divider", "Tabs",
]
_UNSAFE_TEXT = re.compile(r"<\s*/?\s*[a-z][^>]*>|javascript\s*:|data\s*:|on\w+\s*=", re.I)


class UIComponentV1(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: ComponentType
    text: str | None = Field(default=None, max_length=500)
    label: str | None = Field(default=None, max_length=160)
    placeholder: str | None = Field(default=None, max_length=160)
    semantic_role: Literal["main", "section", "navigation", "complementary", "none"] = "none"
    interaction: Literal["none", "local_toggle", "local_tab", "local_input", "local_submit"] = "none"
    button_variant: Literal["lime", "red", "dark_red", "ink"] | None = None
    button_shape: Literal["soft", "square"] | None = None
    button_icon: Literal["none", "plus", "arrow_right"] | None = None
    layout_columns: int | None = Field(default=None, ge=1, le=3, strict=True)
    children: list["UIComponentV1"] = Field(default_factory=list, max_length=12)

    @field_validator("text", "label", "placeholder")
    @classmethod
    def safe_text(cls, value: str | None) -> str | None:
        if value is not None and _UNSAFE_TEXT.search(value):
            raise ValueError("HTML, executable URLs and handlers are not allowed in UI text")
        return value

    @model_validator(mode="after")
    def compatible_fields(self) -> Self:
        if self.type == "Input" and not self.label:
            raise ValueError("Input requires an accessible label")
        if self.type == "ImagePlaceholder" and not self.label:
            raise ValueError("ImagePlaceholder requires an accessible description")
        if self.type in {"Button", "Heading", "Text"} and not (self.text or self.label):
            raise ValueError(f"{self.type} requires text")
        if self.type not in {"Container", "Stack", "Grid", "Card", "Form", "Tabs"} and self.children:
            raise ValueError("This component type cannot contain children")
        if self.type != "Button" and (self.button_variant is not None or self.button_shape is not None or self.button_icon is not None):
            raise ValueError("Button appearance tokens are allowed only on buttons")
        if self.type not in {"Container", "Form", "Grid"} and self.layout_columns is not None:
            raise ValueError("Layout columns are allowed only on containers, forms and grids")
        return self


class UIDesignTokensV1(BaseModel):
    model_config = ConfigDict(extra="forbid")
    tone: Literal["neutral", "ink", "lime"] = "neutral"
    spacing: Literal["compact", "comfortable", "spacious"] = "comfortable"
    radius: Literal["square", "soft"] = "soft"
    alignment: Literal["start", "center"] = "start"


class UIResponsiveV1(BaseModel):
    model_config = ConfigDict(extra="forbid")
    desktop_columns: int = Field(default=1, ge=1, le=3, strict=True)
    mobile_columns: int = Field(default=1, ge=1, le=2, strict=True)


class StructuredUISpecV1(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: Literal["1"] = "1"
    version: int = Field(ge=1, le=20, strict=True)
    requirement: str = Field(min_length=1, max_length=2000)
    title: str = Field(min_length=1, max_length=120)
    description: str = Field(min_length=1, max_length=500)
    root: UIComponentV1
    design_tokens: UIDesignTokensV1 = Field(default_factory=UIDesignTokensV1)
    responsive: UIResponsiveV1 = Field(default_factory=UIResponsiveV1)
    accessibility_notes: list[str] = Field(default_factory=list, max_length=8)
    assumptions: list[str] = Field(default_factory=list, max_length=8)
    uncertainties: list[str] = Field(default_factory=list, max_length=8)

    @field_validator("title", "description", "accessibility_notes", "assumptions", "uncertainties")
    @classmethod
    def safe_copy(cls, value):
        entries = value if isinstance(value, list) else [value]
        if any(not isinstance(item, str) or len(item) > 300 or _UNSAFE_TEXT.search(item) for item in entries):
            raise ValueError("Unsafe or oversized proposal copy")
        return value

    @model_validator(mode="after")
    def bounded_tree(self) -> Self:
        if self.root.type != "Container":
            raise ValueError("Root component must be a Container")
        stack = [(self.root, 1)]
        count = 0
        while stack:
            node, depth = stack.pop()
            count += 1
            if count > 40 or depth > 6:
                raise ValueError("UI component tree exceeds node or depth limit")
            stack.extend((child, depth + 1) for child in node.children)
        return self
