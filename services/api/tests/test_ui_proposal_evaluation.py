"""Synthetic, deterministic UI proposal contract cases; no model inference."""

import pytest

from app.ai.provider import OfflineDemoProvider
from app.ai.ui_spec import StructuredUISpecV1


@pytest.mark.parametrize("requirement,expected_title", [
    ("Redesign the login screen", "Account access"),
    ("Update the dashboard layout", "Workspace overview"),
    ("Make account settings clearer", "Account settings"),
    ("Add responsive navigation", "Explore workspace"),
    ("Improve form validation feedback", "New request"),
])
def test_synthetic_ui_requirement_coverage(requirement, expected_title):
    response = OfflineDemoProvider().generate_ui_spec(requirement, 1, None, None, [])
    spec = StructuredUISpecV1.model_validate(response.data)
    assert spec.title == expected_title
    assert spec.requirement == requirement
    assert spec.responsive.mobile_columns == 1
    assert response.is_mock_or_demo


def test_screenshot_text_refinement_keeps_original_intent():
    # Screenshot pixels are used only by the separate existing impact endpoint.
    provider = OfflineDemoProvider()
    original = provider.generate_ui_spec("Redesign the login screen", 1, None, None, [])
    revised = provider.generate_ui_spec("Redesign the login screen", 2,
        "Use a two-column layout", original.data, [])
    spec = StructuredUISpecV1.model_validate(revised.data)
    assert spec.version == 2
    assert spec.requirement == original.data["requirement"]
    assert spec.responsive.desktop_columns == 2
    assert spec.responsive.mobile_columns == 1
    assert any(child.type == "Grid" for child in spec.root.children)


def test_vietnamese_impact_button_style_request_is_reflected_in_offline_preview():
    requirement = "đổi nút: phân tích tác động mã nguồn thành màu đỏ và góc cạnh thành hình vuông"
    response = OfflineDemoProvider().generate_ui_spec(requirement, 1, None, None, [])
    spec = StructuredUISpecV1.model_validate(response.data)
    buttons = [node for child in spec.root.children for node in child.children if node.type == "Button"]
    assert len(buttons) == 1
    assert buttons[0].text == "Phân tích tác động mã nguồn"
    assert buttons[0].button_variant == "red"
    assert buttons[0].button_shape == "square"


def test_refinement_can_change_button_style_without_changing_requirement():
    provider = OfflineDemoProvider()
    requirement = "Change the Analyze code impact button"
    first = provider.generate_ui_spec(requirement, 1, None, None, [])
    second = provider.generate_ui_spec(requirement, 2, "Make it red with square corners", first.data, [])
    spec = StructuredUISpecV1.model_validate(second.data)
    buttons = [node for child in spec.root.children for node in child.children if node.type == "Button"]
    assert spec.requirement == requirement
    assert spec.version == 2
    assert buttons[0].button_variant == "red"
    assert buttons[0].button_shape == "square"
