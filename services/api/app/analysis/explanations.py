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
    user_consequence: str | None = None
    screen_location: str | None = None


class ImpactExplanation(BaseModel):
    technical_explanation: TechnicalExplanation
    simple_explanation: SimpleExplanation
    evidence_status: Literal["supported", "potential", "unsupported"]


def _readable(value: str) -> str:
    known = {
        "hash_password": "Password protection",
        "verify_password": "Password check",
        "verify_token": "Token check",
        "verify_email": "Email verification check",
        "authenticate_user": "User login & authentication",
        "create_user": "Account registration flow",
        "update_user": "User profile modification",
        "rate_limiter": "Traffic & spam prevention",
    }
    if value in known:
        return known[value]
    spaced = re.sub(r"([a-z])([A-Z])", r"\1 \2", value.replace("_", " ").replace("-", " "))
    return " ".join(spaced.split()).capitalize()


def map_user_consequence(file_path: str, symbol: str | None) -> tuple[str, str]:
    """Returns (screen_location, user_consequence) for vibecoders in plain language."""
    target = f"{file_path} {symbol or ''}".lower()
    if any(k in target for k in ["login", "signin", "authenticate", "session"]):
        return ("Màn hình Đăng nhập / Xác thực tài khoản", "Người dùng không thể đăng nhập hoặc bị đăng xuất đột ngột.")
    if any(k in target for k in ["email", "verify_email", "mail"]):
        return ("Trang Cài đặt Hồ sơ / Email", "Nút gửi mã xác nhận hoặc lưu email mới bị lỗi, không nhận được thư kích hoạt.")
    if any(k in target for k in ["password", "reset_password", "hash"]):
        return ("Màn hình Đổi mật khẩu", "Mật khẩu mới không được mã hóa đúng hoặc người dùng bị khóa tài khoản.")
    if any(k in target for k in ["rate_limit", "throttle", "limiter"]):
        return ("Cổng kiểm soát API", "Người dùng hợp lệ có thể bị chặn nhầm vì vượt quá giới hạn gửi yêu cầu (HTTP 429).")
    if any(k in target for k in ["token", "jwt", "refresh"]):
        return ("Cơ chế phiên đăng nhập", "Token hết hạn không tự làm mới được, ứng dụng báo lỗi xác thực liên tục.")
    if any(k in target for k in ["user", "profile", "account"]):
        return ("Trang Thông tin Tài khoản", "Thông tin hồ sơ cá nhân không lưu được hoặc hiển thị sai dữ liệu.")
    if any(k in target for k in ["pay", "billing", "checkout", "order"]):
        return ("Màn hình Giỏ hàng & Thanh toán", "Giao dịch thanh toán bị gián đoạn hoặc đơn hàng không được ghi nhận.")
    if "api" in file_path.lower():
        return ("Giao tiếp API (Frontend ↔ Backend)", "Giao diện người dùng sẽ nhận mã lỗi 500 hoặc không tải được dữ liệu.")
    if "model" in file_path.lower() or "db" in file_path.lower():
        return ("Cơ sở dữ liệu lưu trữ", "Dữ liệu có thể không được lưu đầy đủ hoặc bị lỗi xung đột cấu trúc bảng.")
    if "test" in file_path.lower():
        return ("Bộ kiểm thử tự động", "Các bài test hồi quy sẽ bị fail nếu không cập nhật kịch bản kiểm tra mới.")
    return ("Thành phần xử lý nghiệp vụ nội bộ", "Tính năng liên quan có thể hoạt động không đúng dự kiến nếu logic thay đổi.")


def explain_item(item: dict) -> dict:
    """Map verified fields to both views without a new inference request."""
    status = "supported" if item.get("impact_supported") else "potential"
    path = item.get("file_path") or ""
    symbol = item.get("symbol")
    name = symbol.split(".")[-1] if symbol else path.rsplit("/", 1)[-1].removesuffix(".py")
    area = _readable(name) if name and name != "unknown" else "Unknown"
    screen, consequence = map_user_consequence(path, symbol)
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
            possible_risk=f"Ảnh hưởng giao diện: {consequence}",
            recommended_check=check, uncertainty=uncertainty,
            user_consequence=consequence,
            screen_location=screen,
        ),
        evidence_status=status,
    )
    return result.model_dump()


def build_impact_story(
    requirement: str,
    direct_items: list[dict],
    indirect_items: list[dict],
    target_language: str = "vi",
) -> dict:
    """
    Constructs a plain-language 'Impact Story' paragraph for vibecoders:
    "You want X, so you must change A, because A is used by B; if you forget B, [button/screen] will break."
    """
    if not direct_items:
        return {
            "story": "Không phát hiện thành phần nào bị ảnh hưởng trực tiếp bởi yêu cầu này trong mã nguồn đã lập chỉ mục.",
            "what_to_do_first": "Kiểm tra lại từ khóa hoặc đảm bảo kho mã nguồn đã được lập chỉ mục đầy đủ.",
            "what_might_break": "Chưa xác định được rủi ro ảnh hưởng.",
            "action_for_agent": "Yêu cầu cần được làm rõ thêm trước khi đưa cho coding agent."
        }

    direct_names = [
        item.get("symbol") or item.get("file_path", "").split("/")[-1]
        for item in direct_items[:2]
    ]
    indirect_names = [
        item.get("symbol") or item.get("file_path", "").split("/")[-1]
        for item in indirect_items[:2]
    ]

    direct_str = ", ".join(f"`{n}`" for n in direct_names)
    first_direct = direct_items[0]
    screen, consequence = map_user_consequence(
        first_direct.get("file_path", ""),
        first_direct.get("symbol")
    )

    if indirect_items:
        indirect_str = ", ".join(f"`{n}`" for n in indirect_names)
        first_indirect = indirect_items[0]
        ind_screen, ind_consequence = map_user_consequence(
            first_indirect.get("file_path", ""),
            first_indirect.get("symbol")
        )
        story = (
            f"Bạn muốn thực hiện: \"{requirement.strip()}\". "
            f"Do đó, bạn cần sửa trực tiếp tại {direct_str}. "
            f"Vì {indirect_str} đang trực tiếp gọi và phụ thuộc vào thành phần này, nó cũng sẽ bị ảnh hưởng dây chuyền. "
            f"Nếu bạn chỉ sửa {direct_str} mà quên cập nhật {indirect_str}, {ind_screen} ({ind_consequence.lower()}) sẽ bị lỗi ngay lập tức."
        )
        what_might_break = f"{ind_screen}: {ind_consequence}"
    else:
        story = (
            f"Bạn muốn thực hiện: \"{requirement.strip()}\". "
            f"Thay đổi này tác động trực tiếp lên {direct_str}. "
            f"Hãy chú ý kiểm tra {screen} vì {consequence.lower()}."
        )
        what_might_break = f"{screen}: {consequence}"

    what_to_do_first = f"Sửa trực tiếp logic trong {direct_str}, sau đó kiểm tra lại các hàm gọi đến từ {indirect_str if indirect_items else 'toàn bộ module'}."
    action_for_agent = f"Nhắc coding agent (Cursor / Claude Code): 'Hãy sửa {direct_str} trước, đồng thời cập nhật {indirect_str if indirect_items else 'các dependency'} và chạy lại bài test liên quan.'"

    return {
        "story": story,
        "what_to_do_first": what_to_do_first,
        "what_might_break": what_might_break,
        "action_for_agent": action_for_agent,
    }


def generate_plain_test_checklist(
    requirement: str,
    suggested_tests: list[str],
    affected_items: list[dict],
    target_language: str = "vi",
) -> list[dict[str, str]]:
    """
    Transforms code test suites (e.g. pytest functions) into plain-language,
    clickable, step-by-step user acceptance checklist for vibecoders.
    """
    req_lower = requirement.lower()
    checklist = []

    # 1. Feature-specific plain language test
    if "email" in req_lower:
        checklist.append({
            "title": "Kiểm tra đổi email chưa xác thực",
            "action": "Mở ứng dụng, vào trang Cài đặt tài khoản, thử nhập một địa chỉ email mới chưa xác thực rồi bấm Lưu.",
            "expected": "Hệ thống phải hiển thị thông báo yêu cầu xác nhận và gửi email kích hoạt, không được đổi trực tiếp ngay.",
        })
        checklist.append({
            "title": "Kiểm tra xác nhận mã xác thực email",
            "action": "Bấm vào đường link hoặc nhập mã OTP gửi về hòm thư mới.",
            "expected": "Email trong cơ sở dữ liệu được cập nhật thành công, có thể dùng email mới để đăng nhập.",
        })
        checklist.append({
            "title": "Kiểm tra token giả mạo hoặc hết hạn",
            "action": "Thử dùng mã xác thực đã dùng rồi hoặc bấm link sau khi quá hạn thời gian cho phép.",
            "expected": "Hệ thống từ chối cập nhật và báo lỗi token không hợp lệ hoặc đã hết hạn.",
        })
    elif "rate" in req_lower or "limit" in req_lower:
        checklist.append({
            "title": "Kiểm tra spam yêu cầu liên tục",
            "action": "Bấm nút gửi yêu cầu hoặc đăng nhập liên tiếp 10 lần trong vòng 5 giây.",
            "expected": "Hệ thống phải chặn lại từ lần thứ 6 kèm thông báo 'Quá nhiều yêu cầu, vui lòng thử lại sau'.",
        })
        checklist.append({
            "title": "Kiểm tra tự phục hồi sau thời gian chờ",
            "action": "Chờ 60 giây sau khi bị chặn và thực hiện lại yêu cầu bình thường.",
            "expected": "Hệ thống cho phép thao tác lại như bình thường mà không cần đăng nhập lại.",
        })
    else:
        checklist.append({
            "title": "Kiểm tra luồng hoạt động chính (Happy Path)",
            "action": f"Thực hiện thao tác chính của tính năng: '{requirement}'.",
            "expected": "Dữ liệu được cập nhật đúng và giao diện hiển thị thông báo thành công.",
        })
        checklist.append({
            "title": "Kiểm tra trường hợp dữ liệu rỗng hoặc sai định dạng",
            "action": "Bỏ trống trường bắt buộc hoặc nhập dữ liệu sai định dạng rồi bấm xác nhận.",
            "expected": "Hệ thống hiển thị lỗi rõ ràng, không bị crash hoặc tải vô tận.",
        })

    # 2. Automated companion reference
    if suggested_tests:
        checklist.append({
            "title": "Chạy bộ kiểm thử tự động tương ứng",
            "action": f"Yêu cầu AI Agent hoặc mở terminal chạy: `pytest {suggested_tests[0].split()[0] if suggested_tests else ''}`",
            "expected": "Tất cả assertions phải xanh lá (100% Passed).",
        })

    return checklist\n