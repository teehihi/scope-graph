"""Bounded UI edit interpretation, source lookup, and inert tree patching."""

import re
from pathlib import Path
from typing import Literal, Self

from pydantic import BaseModel, ConfigDict, Field, computed_field, model_validator
from sqlalchemy.orm import Session

from app.ai.ui_spec import StructuredUISpecV1, UIComponentV1
from app.db.models import IndexedFile, Repository


UIOperation = Literal[
    "CREATE_PAGE", "CREATE_COMPONENT", "MODIFY_COMPONENT", "MODIFY_STYLE",
    "MODIFY_LAYOUT", "REMOVE_COMPONENT", "REFINE_PROPOSAL",
]


class UIChangesV2(BaseModel):
    model_config = ConfigDict(extra="forbid")
    background_color: Literal["lime", "red", "dark_red", "ink"] | None = None
    border_radius: Literal["soft", "square"] | None = None
    icon_left: Literal["none", "plus", "arrow_right"] | None = None
    desktop_columns: int | None = Field(default=None, ge=1, le=3, strict=True)
    component: UIComponentV1 | None = None
    remove: bool | None = None
    preserve_size: bool | None = None

    @model_validator(mode="after")
    def nonempty(self) -> Self:
        if all(value is None for value in self.model_dump().values()):
            raise ValueError("UI patch has no supported change")
        return self


class UIIntentV2(BaseModel):
    model_config = ConfigDict(extra="forbid")
    operation: UIOperation
    target_description: str = Field(max_length=160)
    target_label: str | None = Field(default=None, max_length=160)
    changes: UIChangesV2 | None = None
    constraints: list[str] = Field(default_factory=list, max_length=6)
    ambiguities: list[str] = Field(default_factory=list, max_length=6)
    uncertainty: Literal["low", "medium", "high"] = "medium"


class UIPatchV2(BaseModel):
    model_config = ConfigDict(extra="forbid")
    schema_version: Literal["2"] = "2"
    operation: Literal["CREATE_COMPONENT", "MODIFY_COMPONENT", "MODIFY_STYLE", "MODIFY_LAYOUT", "REMOVE_COMPONENT", "REFINE_PROPOSAL"]
    target_label: str = Field(min_length=1, max_length=160)
    changes: UIChangesV2
    preserve: list[Literal["label", "click_behavior", "surrounding_layout", "size"]] = Field(
        default_factory=lambda: ["label", "click_behavior", "surrounding_layout"], max_length=4)


class UITargetCandidateV2(BaseModel):
    model_config = ConfigDict(extra="forbid")
    path: str
    component: str | None = None
    line_start: int = Field(ge=1)
    evidence: str = Field(max_length=300)
    match_reasons: list[str]

    @computed_field
    @property
    def ref(self) -> str:
        return f"{self.path}:{self.line_start}"


_BUTTON_LABEL = re.compile(r"(?:nút|button)\s+(.+?)\s+(?:thành|to|with)\b", re.I)
_SECRET_LINE = re.compile(r"(?:api[_-]?key|password|secret|token)\s*[:=]", re.I)


def interpret_ui_intent(text: str, *, refining: bool = False) -> UIIntentV2:
    """Conservative offline classifier; uncertainty is categorical, not calibrated."""
    lower = text.casefold()
    label_match = _BUTTON_LABEL.search(text)
    label = label_match.group(1).strip(" '\".,") if label_match else None
    if label:
        label = label[:1].upper() + label[1:]
    elif "phân tích tác động mã nguồn" in lower:
        label = "Phân tích tác động mã nguồn"
    elif "analyze code impact" in lower:
        label = "Analyze code impact"
    elif "save button" in lower:
        label = "Save"
    elif "form" in lower or "biểu mẫu" in lower:
        label = "form"
    elif "layout" in lower or "bố cục" in lower or "columns" in lower or "cột" in lower:
        label = "container"
    color = ("dark_red" if any(word in lower for word in ("đỏ đậm", "darker red")) or re.search(r"\bdarker\b", lower) else
             "red" if any(word in lower for word in ("màu đỏ", "đỏ")) or re.search(r"\bred\b", lower) else None)
    radius = ("square" if any(word in lower for word in ("hình vuông", "góc cạnh", "square", "sharp", "radius zero")) else
              "soft" if any(word in lower for word in ("rounded", "bo tròn")) else None)
    icon = "plus" if any(word in lower for word in ("icon ở bên trái", "icon on the left")) else None
    columns = 2 if any(word in lower for word in ("two columns", "two-column", "hai cột")) else None
    preserve_size = True if any(word in lower for word in ("giữ nguyên kích thước", "keep the size", "preserve size")) else None
    changes = UIChangesV2(background_color=color, border_radius=radius, icon_left=icon,
                          desktop_columns=columns, preserve_size=preserve_size) if any(x is not None for x in (color, radius, icon, columns, preserve_size)) else None
    if any(word in lower for word in ("remove ", "delete ", "xóa ", "bỏ ")):
        operation = "REMOVE_COMPONENT"
    elif any(word in lower for word in ("create a new page", "new page", "tạo trang")):
        operation = "CREATE_PAGE"
    elif any(word in lower for word in ("add a new", "add component", "thêm thành phần")):
        operation = "CREATE_COMPONENT"
    elif refining:
        operation = "REFINE_PROPOSAL"
    elif any(word in lower for word in ("layout", "bố cục", "columns", "cột")):
        operation = "MODIFY_LAYOUT"
    elif color or radius or icon:
        operation = "MODIFY_STYLE"
    elif any(word in lower for word in ("modify", "change", "đổi", "thay")):
        operation = "MODIFY_COMPONENT"
    else:
        operation = "CREATE_PAGE"
    return UIIntentV2(operation=operation, target_description=label or "unspecified UI target",
                      target_label=label, changes=changes,
                      constraints=["preserve existing labels and unrelated elements"] if operation.startswith("MODIFY") or refining else [],
                      ambiguities=[] if label else ["target element is not explicitly identified"] if operation.startswith("MODIFY") else [],
                      uncertainty="medium" if label else "high")


def resolve_ui_targets(db: Session, repository_id: str, label: str) -> list[UITargetCandidateV2]:
    """Inspect indexed UI files only; never use unindexed files as source evidence."""
    repo = db.query(Repository).filter(Repository.id == repository_id).first()
    if not repo or not repo.workspace_path or len(label) < 3:
        return []
    root = Path(repo.workspace_path).resolve()
    files = db.query(IndexedFile).filter(IndexedFile.repository_id == repository_id).all()
    localized_keys: set[str] = set()
    for file in files[:500]:
        relative_path = Path(file.path)
        if relative_path.is_absolute() or ".." in relative_path.parts:
            continue
        if not file.path.lower().endswith(("languagecontext.tsx", "translations.ts", "i18n.ts")):
            continue
        source = (root / file.path).resolve()
        if not source.is_relative_to(root) or not source.is_file() or source.stat().st_size > 1_000_000:
            continue
        try:
            source_text = source.read_text(encoding="utf-8")
        except (OSError, UnicodeError):
            continue
        for match in re.finditer(r"['\"]([^'\"]{1,100})['\"]\s*:\s*['\"]([^'\"]{1,200})['\"]", source_text):
            if match.group(2).casefold() == label.casefold():
                localized_keys.add(match.group(1))
                if len(localized_keys) >= 20:
                    break
    candidates: list[UITargetCandidateV2] = []
    for file in files[:500]:
        relative_path = Path(file.path)
        if relative_path.is_absolute() or ".." in relative_path.parts:
            continue
        if not file.path.lower().endswith((".tsx", ".jsx", ".vue", ".html")):
            continue
        source = (root / file.path).resolve()
        if not source.is_relative_to(root) or not source.is_file() or source.stat().st_size > 256_000:
            continue
        try:
            lines = source.read_text(encoding="utf-8").splitlines()
        except (OSError, UnicodeError):
            continue
        for number, line in enumerate(lines, 1):
            literal_match = label.casefold() in line.casefold()
            key_match = next((key for key in sorted(localized_keys) if f"t('{key}')" in line or f't("{key}")' in line), None)
            if not literal_match and not key_match or _SECRET_LINE.search(line):
                continue
            if not any(marker in line.lower() for marker in ("button", "aria-label", "<", "t('")):
                continue
            tags = re.findall(r"<([A-Za-z][\w.]*)\b", line)
            if not tags:
                tags = re.findall(r"<([A-Za-z][\w.]*)\b", "\n".join(lines[max(0, number - 4):number - 1]))
            candidates.append(UITargetCandidateV2(path=file.path.replace("\\", "/"),
                component=tags[-1] if tags else None, line_start=number, evidence=line.strip()[:300],
                match_reasons=[f"localized label key {key_match}" if key_match else "literal UI label in indexed source"]))
            if len(candidates) >= 12:
                return candidates
    return candidates


def apply_ui_patch(before: StructuredUISpecV1, patch: UIPatchV2, version: int) -> StructuredUISpecV1:
    """Copy and alter only a uniquely selected inert component."""
    after = before.model_copy(deep=True)
    if patch.operation == "CREATE_COMPONENT":
        if patch.target_label != "root" or patch.changes.component is None:
            raise ValueError("A new component requires the root target and validated component")
        after.root.children.append(patch.changes.component.model_copy(deep=True))
        after.version = version
        return StructuredUISpecV1.model_validate(after.model_dump())
    matches: list[UIComponentV1] = []
    parents: dict[int, UIComponentV1] = {}
    stack = [after.root]
    while stack:
        node = stack.pop()
        if (node.text or node.label or node.type).casefold() == patch.target_label.casefold():
            matches.append(node)
        for child in node.children:
            parents[id(child)] = node
            stack.append(child)
    if len(matches) != 1:
        raise ValueError("UI target is ambiguous or missing")
    target = matches[0]
    if patch.operation == "REMOVE_COMPONENT":
        parent = parents.get(id(target))
        if not parent or patch.changes.remove is not True:
            raise ValueError("Removal requires one non-root target")
        parent.children = [child for child in parent.children if child is not target]
        after.version = version
        return StructuredUISpecV1.model_validate(after.model_dump())
    if patch.changes.background_color is not None or patch.changes.border_radius is not None or patch.changes.icon_left is not None:
        if target.type != "Button":
            raise ValueError("Button appearance can only be patched on a button")
        if patch.changes.background_color is not None:
            target.button_variant = patch.changes.background_color
        if patch.changes.border_radius is not None:
            target.button_shape = patch.changes.border_radius
        if patch.changes.icon_left is not None:
            target.button_icon = patch.changes.icon_left
    if patch.changes.desktop_columns is not None:
        if target.type in {"Container", "Form", "Grid"}:
            target.layout_columns = patch.changes.desktop_columns
        else:
            raise ValueError("Layout patch requires a form or grid target")
    after.version = version
    return StructuredUISpecV1.model_validate(after.model_dump())
