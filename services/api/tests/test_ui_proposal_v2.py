"""V2 deterministic change targeting and explicit live-mode boundaries."""

import pytest
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.ai.ui_spec import StructuredUISpecV1
from app.ai.ui_proposal_v2 import UIPatchV2, apply_ui_patch, interpret_ui_intent, resolve_ui_targets
from app.db.database import Base


@pytest.fixture
def db_session(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'ui.db'}")
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine)
    with factory() as db:
        yield db
    engine.dispose()


def _existing_spec():
    return StructuredUISpecV1.model_validate({
        "version": 1, "requirement": "Improve the impact button", "title": "Existing screen",
        "description": "A captured proposal", "root": {"type": "Container", "children": [
            {"type": "Heading", "text": "Analysis"},
            {"type": "Button", "text": "Phân tích tác động mã nguồn", "interaction": "local_toggle"},
            {"type": "Text", "text": "Keep this explanation"},
        ]},
    })


def test_vietnamese_red_square_request_is_modify_style_and_preserves_tree():
    requirement = "Đổi nút phân tích tác động mã nguồn thành màu đỏ và góc cạnh thành hình vuông."
    intent = interpret_ui_intent(requirement)
    assert intent.operation == "MODIFY_STYLE"
    assert intent.target_label == "Phân tích tác động mã nguồn"
    assert intent.changes.background_color == "red"
    assert intent.changes.border_radius == "square"
    before = _existing_spec()
    after = apply_ui_patch(before, UIPatchV2(operation="MODIFY_STYLE", target_label=intent.target_label,
                                             changes=intent.changes), 2)
    assert after.root.children[0] == before.root.children[0]
    assert after.root.children[2] == before.root.children[2]
    assert after.root.children[1].text == before.root.children[1].text
    assert after.root.children[1].interaction == "local_toggle"
    assert after.root.children[1].button_variant == "red"
    assert after.root.children[1].button_shape == "square"
    assert before.root.children[1].button_variant is None


def test_patch_rejects_unsafe_css_and_ambiguous_labels():
    with pytest.raises(ValidationError):
        UIPatchV2.model_validate({"operation": "MODIFY_STYLE", "target_label": "Go",
            "changes": {"background_color": "url(https://evil.test)"}})
    spec = _existing_spec()
    spec.root.children.append(spec.root.children[1].model_copy(deep=True))
    with pytest.raises(ValueError, match="ambiguous"):
        apply_ui_patch(spec, UIPatchV2(operation="MODIFY_STYLE", target_label="Phân tích tác động mã nguồn",
                                      changes={"background_color": "red"}), 2)


def test_form_layout_patch_keeps_fields_and_changes_columns():
    before = StructuredUISpecV1.model_validate({"version": 1, "requirement": "Improve form", "title": "Form",
        "description": "Existing", "root": {"type": "Container", "children": [{"type": "Form", "children": [
            {"type": "Input", "label": "Email"}, {"type": "Button", "text": "Send"}]}]}})
    after = apply_ui_patch(before, UIPatchV2(operation="MODIFY_LAYOUT", target_label="form",
                           changes={"desktop_columns": 2}), 2)
    assert after.root.children[0].layout_columns == 2
    assert [child.type for child in after.root.children[0].children] == ["Input", "Button"]


def test_add_and_remove_component_preserve_other_nodes():
    before = _existing_spec()
    added = apply_ui_patch(before, UIPatchV2(operation="CREATE_COMPONENT", target_label="root",
        changes={"component": {"type": "Text", "text": "New alert"}}), 2)
    assert len(added.root.children) == len(before.root.children) + 1
    assert added.root.children[:3] == before.root.children
    removed = apply_ui_patch(added, UIPatchV2(operation="REMOVE_COMPONENT", target_label="New alert",
        changes={"remove": True}), 3)
    assert len(removed.root.children) == len(before.root.children)


def test_ui_target_resolution_only_uses_indexed_files(tmp_path, db_session):
    from app.db.models import Repository, IndexedFile
    root = tmp_path / "repo"
    root.mkdir()
    (root / "Panel.tsx").write_text('<button aria-label="Analyze code impact">Go</button>\n', encoding="utf-8")
    (root / "secret.tsx").write_text('<button>Analyze code impact</button>\n', encoding="utf-8")
    db_session.add(Repository(id="ui-repo", name="UI", status="ready", workspace_path=str(root)))
    db_session.add(IndexedFile(id="ui-file", repository_id="ui-repo", path="Panel.tsx", language="typescript"))
    db_session.commit()
    result = resolve_ui_targets(db_session, "ui-repo", "Analyze code impact")
    assert len(result) == 1
    assert result[0].path == "Panel.tsx"
    assert result[0].line_start == 1
    assert result[0].component == "button"
    assert "aria-label" in result[0].evidence


def test_duplicate_labels_in_same_file_require_line_specific_choice(tmp_path, db_session):
    from app.db.models import Repository, IndexedFile
    root = tmp_path / "repo"
    root.mkdir()
    (root / "Panel.tsx").write_text('<button>Save</button>\n<button>Save</button>\n', encoding="utf-8")
    db_session.add(Repository(id="ui-repo", name="UI", status="ready", workspace_path=str(root)))
    db_session.add(IndexedFile(id="ui-file", repository_id="ui-repo", path="Panel.tsx", language="typescript"))
    db_session.commit()
    result = resolve_ui_targets(db_session, "ui-repo", "Save")
    assert [candidate.ref for candidate in result] == ["Panel.tsx:1", "Panel.tsx:2"]


def test_localized_button_label_resolves_to_component_source(tmp_path, db_session):
    from app.db.models import Repository, IndexedFile
    root = tmp_path / "repo"
    root.mkdir()
    (root / "LanguageContext.tsx").write_text("'proposal.analyze': 'Phân tích tác động mã nguồn',\n", encoding="utf-8")
    (root / "Panel.tsx").write_text("<button>{t('proposal.analyze')}</button>\n", encoding="utf-8")
    db_session.add(Repository(id="ui-repo", name="UI", status="ready", workspace_path=str(root)))
    db_session.add_all([IndexedFile(id="locale-file", repository_id="ui-repo", path="LanguageContext.tsx", language="typescript"),
                        IndexedFile(id="panel-file", repository_id="ui-repo", path="Panel.tsx", language="typescript")])
    db_session.commit()
    result = resolve_ui_targets(db_session, "ui-repo", "Phân tích tác động mã nguồn")
    assert [candidate.ref for candidate in result] == ["Panel.tsx:1"]
    assert "localized label" in result[0].match_reasons[0]


def test_target_lookup_rejects_absolute_indexed_path(tmp_path, db_session):
    from app.db.models import Repository, IndexedFile
    root = tmp_path / "repo"
    root.mkdir()
    file = root / "Panel.tsx"
    file.write_text("<button>Save</button>\n", encoding="utf-8")
    db_session.add(Repository(id="ui-repo", name="UI", status="ready", workspace_path=str(root)))
    db_session.add(IndexedFile(id="bad-file", repository_id="ui-repo", path=str(file), language="typescript"))
    db_session.commit()
    assert resolve_ui_targets(db_session, "ui-repo", "Save") == []


@pytest.mark.parametrize("prompt,operation", [
    ("Create a new login page", "CREATE_PAGE"),
    ("Add a new alert component", "CREATE_COMPONENT"),
    ("Change the existing form layout to two columns", "MODIFY_LAYOUT"),
    ("Remove the Save button", "REMOVE_COMPONENT"),
    ("Make the red darker", "REFINE_PROPOSAL"),
])
def test_intent_operations(prompt, operation):
    assert interpret_ui_intent(prompt, refining=operation == "REFINE_PROPOSAL").operation == operation


def test_refinement_constraints_and_component_addition():
    assert interpret_ui_intent("Giữ nguyên kích thước nút.", refining=True).changes.preserve_size is True
    assert interpret_ui_intent("Add a new alert component", refining=True).operation == "CREATE_COMPONENT"


def test_darker_red_refinement_only_changes_selected_button():
    before = _existing_spec()
    intent = interpret_ui_intent("Đổi màu đỏ đậm hơn.", refining=True)
    assert intent.changes.background_color == "dark_red"
    after = apply_ui_patch(before, UIPatchV2(operation="REFINE_PROPOSAL",
        target_label="Phân tích tác động mã nguồn", changes=intent.changes), 2)
    assert after.root.children[1].button_variant == "dark_red"
    assert after.root.children[0] == before.root.children[0]


def test_redesign_is_not_color_red():
    intent = interpret_ui_intent("Redesign the account login page with clear errors")
    assert intent.operation == "CREATE_PAGE"
    assert intent.changes is None
