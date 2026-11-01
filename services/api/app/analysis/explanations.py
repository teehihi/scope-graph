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


def map_user_consequence(
    file_path: str, symbol: str | None, target_language: str = "vi",
) -> tuple[str, str]:
    """Returns (screen_location, user_consequence) for vibecoders in plain language."""
    language = (target_language or "en").split("-")[0].lower()
    target = f"{file_path} {symbol or ''}".lower()
    if language != "vi":
        if any(k in target for k in ["login", "signin", "authenticate", "session"]):
            return ("Login / Account authentication", "Users may be unable to sign in or may be logged out unexpectedly.")
        if any(k in target for k in ["email", "verify_email", "mail"]):
            return ("Profile settings / Email", "Email verification or saving a new email address may fail.")
        if any(k in target for k in ["password", "reset_password", "hash"]):
            return ("Password change screen", "Password changes or account access may fail.")
        if any(k in target for k in ["rate_limit", "throttle", "limiter"]):
            return ("API rate limiting", "Valid users may be blocked after exceeding the request limit (HTTP 429).")
        if any(k in target for k in ["token", "jwt", "refresh"]):
            return ("Login session", "Expired tokens may not refresh, causing repeated authentication errors.")
        if any(k in target for k in ["user", "profile", "account"]):
            return ("Account information", "Account profile changes may fail to save or display correctly.")
        if any(k in target for k in ["pay", "billing", "checkout", "order"]):
            return ("Cart and checkout", "A payment may be interrupted or an order may not be recorded.")
        if "api" in file_path.lower():
            return ("API communication (frontend ↔ backend)", "The interface may receive an error or fail to load data.")
        if "model" in file_path.lower() or "db" in file_path.lower():
            return ("Database", "Data may fail to save or conflict with the database schema.")
        if "test" in file_path.lower():
            return ("Automated tests", "Regression tests may fail if they are not updated for the change.")
        return ("Internal business logic", "Related functionality may not behave as expected after the change.")
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


def explain_item(item: dict, target_language: str = "en") -> dict:
    """Map verified fields to both views without a new inference request."""
    status = "supported" if item.get("impact_supported") else "potential"
    path = item.get("file_path") or ""
    symbol = item.get("symbol")
    name = symbol.split(".")[-1] if symbol else path.rsplit("/", 1)[-1].removesuffix(".py")
    area = _readable(name) if name and name != "unknown" else "Unknown"
    language = (target_language or "en").split("-")[0].lower()
    screen, consequence = map_user_consequence(path, symbol, language)
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
            possible_risk=(f"User-facing impact: {consequence}" if language != "vi"
                           else f"Ảnh hưởng giao diện: {consequence}"),
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
    target_language: str = "en",
) -> dict:
    """
    Constructs a plain-language 'Impact Story' paragraph for vibecoders:
    "You want X, so you must change A, because A is used by B; if you forget B, [button/screen] will break."
    """
    language = (target_language or "en").split("-")[0].lower()
    copy = {
        "en": {
            "no_story": "No components directly related to this request were found in the indexed source code.",
            "no_first": "Review the search terms or make sure the repository has been fully indexed.",
            "no_risk": "Potential impact has not been established.",
            "no_agent": "Clarify the requirement before handing it to a coding agent.",
            "risk": "Review the related user flows; runtime impact is not confirmed.",
            "linked": 'You want: “{req}”. Update {direct} first. {indirect} depend on or call this component, so they may also be affected. Review the related user flows.',
            "direct": 'You want: “{req}”. The indexed source links this change to {direct}. Review the related user flows.',
            "first": "Update {direct}, then review {indirect}.",
            "agent": "Tell the coding agent to update {direct}, review {indirect}, and run the relevant tests.",
        },
        "vi": {
            "no_story": "Không tìm thấy thành phần nào trong mã nguồn đã lập chỉ mục có liên quan trực tiếp đến yêu cầu này.",
            "no_first": "Hãy kiểm tra lại từ khóa hoặc bảo đảm kho mã nguồn đã được lập chỉ mục đầy đủ.",
            "no_risk": "Chưa xác định được ảnh hưởng tiềm ẩn.",
            "no_agent": "Hãy làm rõ yêu cầu trước khi chuyển cho coding agent.",
            "risk": "Hãy rà soát các luồng người dùng liên quan; ảnh hưởng khi chạy chưa được xác nhận.",
            "linked": 'Bạn muốn: “{req}”. Hãy sửa {direct} trước. {indirect} phụ thuộc hoặc gọi thành phần này nên cũng có thể bị ảnh hưởng. Hãy rà soát các luồng người dùng liên quan.',
            "direct": 'Bạn muốn: “{req}”. Mã nguồn đã lập chỉ mục cho thấy thay đổi liên quan đến {direct}. Hãy rà soát các luồng người dùng liên quan.',
            "first": "Sửa {direct}, sau đó rà soát {indirect}.",
            "agent": "Yêu cầu coding agent sửa {direct}, rà soát {indirect} và chạy các bài kiểm thử liên quan.",
        },
        "ja": {
            "no_story": "インデックス済みのソースコードに、この要件の直接的な影響箇所は見つかりませんでした。",
            "no_first": "検索語を見直すか、リポジトリが完全にインデックスされているか確認してください。",
            "no_risk": "潜在的な影響はまだ確認されていません。",
            "no_agent": "コーディングエージェントに渡す前に要件を明確にしてください。",
            "risk": "関連するユーザーフローを確認してください。実行時の影響は未確認です。",
            "linked": '要望:「{req}」。まず {direct} を変更してください。{indirect} はこの箇所に依存または呼び出しを行うため、影響を受ける可能性があります。関連するユーザーフローも確認してください。',
            "direct": '要望:「{req}」。インデックス済みコードでは、この変更は {direct} に関連しています。関連するユーザーフローを確認してください。',
            "first": '{direct} を変更し、その後 {indirect} を確認してください。',
            "agent": 'コーディングエージェントに {direct} の変更、{indirect} の確認、関連テストの実行を依頼してください。',
        },
        "ko": {
            "no_story": "인덱싱된 소스 코드에서 이 요청과 직접 관련된 구성 요소를 찾지 못했습니다.",
            "no_first": "검색어를 확인하거나 저장소가 모두 인덱싱되었는지 확인하세요.",
            "no_risk": "잠재적 영향은 아직 확인되지 않았습니다.",
            "no_agent": "코딩 에이전트에게 전달하기 전에 요구사항을 명확히 하세요.",
            "risk": "관련 사용자 흐름을 검토하세요. 실행 시 영향은 확인되지 않았습니다.",
            "linked": '요청: “{req}”. 먼저 {direct}를 수정하세요. {indirect}는 이 구성 요소에 의존하거나 이를 호출하므로 영향을 받을 수 있습니다. 관련 사용자 흐름도 검토하세요.',
            "direct": '요청: “{req}”. 인덱싱된 코드에서 이 변경은 {direct}와 연결됩니다. 관련 사용자 흐름을 검토하세요.',
            "first": '{direct}를 수정한 다음 {indirect}를 검토하세요.',
            "agent": '코딩 에이전트에게 {direct} 수정, {indirect} 검토, 관련 테스트 실행을 요청하세요.',
        },
        "zh": {
            "no_story": "在已索引的源代码中没有找到与此需求直接相关的组件。",
            "no_first": "请检查搜索关键词，或确认仓库已完成索引。",
            "no_risk": "尚未确认潜在影响。",
            "no_agent": "交给编码代理之前，请先明确需求。",
            "risk": "请检查相关用户流程；尚未确认运行时影响。",
            "linked": '需求：“{req}”。请先修改 {direct}。{indirect} 依赖或调用此组件，因此也可能受到影响。请检查相关用户流程。',
            "direct": '需求：“{req}”。已索引代码显示此更改与 {direct} 相关。请检查相关用户流程。',
            "first": "修改 {direct}，然后检查 {indirect}。",
            "agent": "请编码代理修改 {direct}、检查 {indirect} 并运行相关测试。",
        },
        "es": {
            "no_story": "No se encontraron componentes afectados directamente en el código fuente indexado.",
            "no_first": "Revise los términos de búsqueda o compruebe que el repositorio esté indexado por completo.",
            "no_risk": "Aún no se ha confirmado un posible impacto.",
            "no_agent": "Aclare el requisito antes de entregarlo a un agente de código.",
            "risk": "Revise los flujos de usuario relacionados; el impacto en ejecución no está confirmado.",
            "linked": 'Solicitud: “{req}”. Modifique primero {direct}. {indirect} depende de este componente o lo invoca, por lo que también podría verse afectado. Revise los flujos de usuario relacionados.',
            "direct": 'Solicitud: “{req}”. El código indexado relaciona este cambio con {direct}. Revise los flujos de usuario relacionados.',
            "first": "Modifique {direct} y después revise {indirect}.",
            "agent": "Indique al agente que modifique {direct}, revise {indirect} y ejecute las pruebas pertinentes.",
        },
        "fr": {
            "no_story": "Aucun composant directement concerné n’a été trouvé dans le code source indexé.",
            "no_first": "Vérifiez les termes de recherche ou assurez-vous que le dépôt est entièrement indexé.",
            "no_risk": "Aucun impact potentiel n’a encore été établi.",
            "no_agent": "Précisez le besoin avant de le transmettre à un agent de code.",
            "risk": "Vérifiez les parcours concernés ; l’impact à l’exécution n’est pas confirmé.",
            "linked": 'Demande : « {req} ». Modifiez d’abord {direct}. {indirect} dépend de ce composant ou l’appelle et peut donc aussi être concerné. Vérifiez les parcours utilisateur concernés.',
            "direct": 'Demande : « {req} ». Le code indexé associe ce changement à {direct}. Vérifiez les parcours utilisateur concernés.',
            "first": "Modifiez {direct}, puis vérifiez {indirect}.",
            "agent": "Demandez à l’agent de modifier {direct}, vérifier {indirect} et lancer les tests concernés.",
        },
        "de": {
            "no_story": "Im indizierten Quellcode wurden keine direkt betroffenen Komponenten gefunden.",
            "no_first": "Prüfen Sie die Suchbegriffe oder ob das Repository vollständig indiziert wurde.",
            "no_risk": "Eine mögliche Auswirkung wurde noch nicht bestätigt.",
            "no_agent": "Klären Sie die Anforderung, bevor Sie sie an einen Coding-Agent übergeben.",
            "risk": "Prüfen Sie die zugehörigen Abläufe; Auswirkungen zur Laufzeit sind nicht bestätigt.",
            "linked": 'Anforderung: „{req}“. Ändern Sie zuerst {direct}. {indirect} hängt davon ab oder ruft die Komponente auf und kann daher ebenfalls betroffen sein. Prüfen Sie die zugehörigen Abläufe.',
            "direct": 'Anforderung: „{req}“. Der indizierte Code verknüpft diese Änderung mit {direct}. Prüfen Sie die zugehörigen Abläufe.',
            "first": "Ändern Sie {direct} und prüfen Sie anschließend {indirect}.",
            "agent": "Weisen Sie den Coding-Agent an, {direct} zu ändern, {indirect} zu prüfen und die passenden Tests auszuführen.",
        },
        "hi": {
            "no_story": "अनुक्रमित स्रोत कोड में इस अनुरोध से सीधे प्रभावित कोई घटक नहीं मिला।",
            "no_first": "खोज शब्द जाँचें या सुनिश्चित करें कि रिपॉज़िटरी पूरी तरह अनुक्रमित है।",
            "no_risk": "संभावित प्रभाव की अभी पुष्टि नहीं हुई है।",
            "no_agent": "कोडिंग एजेंट को देने से पहले आवश्यकता स्पष्ट करें।",
            "risk": "संबंधित उपयोगकर्ता प्रवाह जाँचें; रनटाइम प्रभाव की पुष्टि नहीं हुई है।",
            "linked": 'अनुरोध: “{req}”. पहले {direct} बदलें। {indirect} इस घटक पर निर्भर है या इसे कॉल करता है, इसलिए वह भी प्रभावित हो सकता है। संबंधित उपयोगकर्ता प्रवाह जाँचें।',
            "direct": 'अनुरोध: “{req}”. अनुक्रमित कोड इस बदलाव को {direct} से जोड़ता है। संबंधित उपयोगकर्ता प्रवाह जाँचें।',
            "first": "{direct} बदलें, फिर {indirect} की समीक्षा करें।",
            "agent": "कोडिंग एजेंट से {direct} बदलने, {indirect} जाँचने और संबंधित परीक्षण चलाने को कहें।",
        },
        "th": {
            "no_story": "ไม่พบส่วนประกอบที่ได้รับผลกระทบโดยตรงจากคำขอนี้ในซอร์สโค้ดที่ทำดัชนีแล้ว",
            "no_first": "ตรวจสอบคำค้นหรือยืนยันว่าได้ทำดัชนีที่เก็บโค้ดครบแล้ว",
            "no_risk": "ยังไม่ยืนยันผลกระทบที่อาจเกิดขึ้น",
            "no_agent": "โปรดชี้แจงข้อกำหนดก่อนส่งให้ coding agent",
            "risk": "ตรวจสอบขั้นตอนผู้ใช้ที่เกี่ยวข้อง ยังไม่ยืนยันผลกระทบขณะทำงาน",
            "linked": 'คำขอ: “{req}” แก้ไข {direct} ก่อน {indirect} เรียกใช้หรือพึ่งพาส่วนนี้ จึงอาจได้รับผลกระทบด้วย โปรดตรวจสอบขั้นตอนผู้ใช้ที่เกี่ยวข้อง',
            "direct": 'คำขอ: “{req}” โค้ดที่ทำดัชนีแล้วเชื่อมโยงการเปลี่ยนแปลงนี้กับ {direct} โปรดตรวจสอบขั้นตอนผู้ใช้ที่เกี่ยวข้อง',
            "first": "แก้ไข {direct} แล้วตรวจสอบ {indirect}",
            "agent": "แจ้ง coding agent ให้แก้ไข {direct} ตรวจสอบ {indirect} และรันทดสอบที่เกี่ยวข้อง",
        },
        "it": {
            "no_story": "Nel codice sorgente indicizzato non sono stati trovati componenti direttamente interessati.",
            "no_first": "Controlla i termini di ricerca o verifica che il repository sia stato indicizzato completamente.",
            "no_risk": "Non è stato ancora accertato alcun impatto potenziale.",
            "no_agent": "Chiarisci il requisito prima di affidarlo a un agente di coding.",
            "risk": "Verifica i flussi utente correlati; l’impatto in esecuzione non è confermato.",
            "linked": 'Richiesta: “{req}”. Modifica prima {direct}. {indirect} dipende da questo componente o lo richiama, quindi potrebbe essere coinvolto. Verifica i flussi utente correlati.',
            "direct": 'Richiesta: “{req}”. Il codice indicizzato collega questa modifica a {direct}. Verifica i flussi utente correlati.',
            "first": "Modifica {direct}, poi verifica {indirect}.",
            "agent": "Chiedi all’agente di modificare {direct}, verificare {indirect} ed eseguire i test pertinenti.",
        },
        "ru": {
            "no_story": "В индексированном исходном коде не найдено компонентов, напрямую затронутых этим запросом.",
            "no_first": "Проверьте поисковые слова или убедитесь, что репозиторий проиндексирован полностью.",
            "no_risk": "Потенциальное влияние пока не установлено.",
            "no_agent": "Уточните требование перед передачей агенту для работы с кодом.",
            "risk": "Проверьте связанные пользовательские сценарии; влияние во время выполнения не подтверждено.",
            "linked": 'Запрос: «{req}». Сначала измените {direct}. {indirect} зависит от этого компонента или вызывает его, поэтому тоже может быть затронут. Проверьте связанные пользовательские сценарии.',
            "direct": 'Запрос: «{req}». Индексированный код связывает это изменение с {direct}. Проверьте связанные пользовательские сценарии.',
            "first": "Измените {direct}, затем проверьте {indirect}.",
            "agent": "Попросите агента изменить {direct}, проверить {indirect} и запустить соответствующие тесты.",
        },
    }
    text = copy.get(language, copy["en"])
    if not direct_items:
        return {
            "story": text["no_story"],
            "what_to_do_first": text["no_first"],
            "what_might_break": text["no_risk"],
            "action_for_agent": text["no_agent"],
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
    if indirect_items:
        indirect_str = ", ".join(f"`{n}`" for n in indirect_names)
        story = text["linked"].format(req=requirement.strip(), direct=direct_str, indirect=indirect_str)
        what_might_break = text["risk"]
    else:
        story = text["direct"].format(req=requirement.strip(), direct=direct_str)
        what_might_break = text["risk"]

    related = indirect_str if indirect_items else ("all modules" if language == "en" else "toàn bộ module")
    what_to_do_first = text["first"].format(direct=direct_str, indirect=related)
    action_for_agent = text["agent"].format(direct=direct_str, indirect=related)

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
    target_language: str = "en",
) -> list[dict[str, str]]:
    """
    Transforms code test suites (e.g. pytest functions) into plain-language,
    clickable, step-by-step user acceptance checklist for vibecoders.
    """
    language = (target_language or "en").split("-")[0].lower()
    localized = {
        "en": ("Check the main user flow", "Perform the requested change: “{req}”.", "The data updates and the interface confirms success.", "Check invalid or missing input", "Leave a required field empty or enter an invalid value, then submit.", "The app shows a clear error without crashing or loading forever.", "Run the related automated tests", "Ask an AI agent or run in a terminal: `pytest {test}`", "All assertions pass."),
        "vi": ("Kiểm tra luồng hoạt động chính", "Thực hiện thay đổi được yêu cầu: “{req}”.", "Dữ liệu được cập nhật và giao diện xác nhận thành công.", "Kiểm tra dữ liệu thiếu hoặc sai định dạng", "Bỏ trống trường bắt buộc hoặc nhập dữ liệu sai định dạng rồi gửi.", "Ứng dụng báo lỗi rõ ràng, không bị crash hoặc tải vô tận.", "Chạy các bài kiểm thử tự động liên quan", "Yêu cầu AI agent hoặc chạy trong terminal: `pytest {test}`", "Tất cả assertion đều thành công."),
        "ja": ("主要な操作フローを確認", "要求された変更を実行します:「{req}」。", "データが更新され、画面に成功が表示されます。", "未入力または形式不正を確認", "必須項目を空欄にするか不正な値を入力して送信します。", "クラッシュや無限読み込みを起こさず、明確なエラーが表示されます。", "関連する自動テストを実行", "AIエージェントに依頼するか、端末で実行: `pytest {test}`", "すべてのアサーションが成功します。"),
        "ko": ("주요 사용자 흐름 확인", "요청된 변경을 수행합니다: “{req}”.", "데이터가 업데이트되고 화면에 성공 메시지가 표시됩니다.", "잘못되거나 누락된 입력 확인", "필수 항목을 비우거나 잘못된 값을 입력한 뒤 제출합니다.", "앱이 중단되거나 무한 로딩되지 않고 명확한 오류를 표시합니다.", "관련 자동 테스트 실행", "AI 에이전트에게 요청하거나 터미널에서 실행: `pytest {test}`", "모든 assertion이 통과합니다."),
        "zh": ("检查主要用户流程", "执行所请求的更改：“{req}”。", "数据已更新，界面显示成功确认。", "检查无效或缺失输入", "将必填项留空或输入无效值后提交。", "应用显示明确错误，不会崩溃或无限加载。", "运行相关自动化测试", "让 AI 代理运行或在终端执行：`pytest {test}`", "所有断言均通过。"),
        "es": ("Comprobar el flujo principal", "Realice el cambio solicitado: «{req}». ", "Los datos se actualizan y la interfaz confirma el éxito.", "Comprobar datos no válidos o ausentes", "Deje vacío un campo obligatorio o introduzca un valor no válido y envíe.", "La aplicación muestra un error claro sin bloquearse ni cargar indefinidamente.", "Ejecutar las pruebas automatizadas relacionadas", "Pida a un agente de IA que lo ejecute o use la terminal: `pytest {test}`", "Todas las aserciones se superan."),
        "fr": ("Vérifier le parcours utilisateur principal", "Effectuez le changement demandé : « {req} ». ", "Les données sont mises à jour et l’interface confirme la réussite.", "Vérifier les données manquantes ou invalides", "Laissez un champ obligatoire vide ou saisissez une valeur incorrecte, puis envoyez.", "L’application affiche une erreur claire sans planter ni charger indéfiniment.", "Lancer les tests automatisés associés", "Demandez à un agent IA de les lancer ou utilisez le terminal : `pytest {test}`", "Toutes les assertions réussissent."),
        "de": ("Hauptablauf prüfen", "Führen Sie die gewünschte Änderung aus: „{req}“. ", "Die Daten werden aktualisiert und der Erfolg wird angezeigt.", "Ungültige oder fehlende Eingaben prüfen", "Lassen Sie ein Pflichtfeld leer oder geben Sie einen ungültigen Wert ein und senden Sie ab.", "Die App zeigt einen klaren Fehler, ohne abzustürzen oder endlos zu laden.", "Zugehörige automatisierte Tests ausführen", "Lassen Sie einen KI-Agenten die Tests ausführen oder starten Sie im Terminal: `pytest {test}`", "Alle Assertions sind erfolgreich."),
        "hi": ("मुख्य उपयोगकर्ता प्रवाह जाँचें", "अनुरोधित बदलाव करें: “{req}”.", "डेटा अपडेट होता है और इंटरफ़ेस सफलता की पुष्टि करता है।", "अमान्य या खाली इनपुट जाँचें", "आवश्यक फ़ील्ड खाली छोड़ें या गलत मान दर्ज करके सबमिट करें।", "ऐप क्रैश या अनंत लोडिंग के बिना स्पष्ट त्रुटि दिखाता है।", "संबंधित स्वचालित परीक्षण चलाएँ", "AI एजेंट से चलवाएँ या टर्मिनल में चलाएँ: `pytest {test}`", "सभी assertions सफल होते हैं।"),
        "th": ("ตรวจสอบขั้นตอนหลักของผู้ใช้", "ดำเนินการเปลี่ยนแปลงตามคำขอ: “{req}”", "ข้อมูลได้รับการอัปเดตและหน้าจอยืนยันความสำเร็จ", "ตรวจสอบข้อมูลที่ไม่ถูกต้องหรือขาดหาย", "เว้นช่องที่จำเป็นให้ว่างหรือกรอกค่าไม่ถูกต้องแล้วส่ง", "แอปแสดงข้อผิดพลาดชัดเจนโดยไม่หยุดทำงานหรือโหลดไม่สิ้นสุด", "รันทดสอบอัตโนมัติที่เกี่ยวข้อง", "ให้ AI agent รันหรือสั่งในเทอร์มินัล: `pytest {test}`", "การตรวจสอบทั้งหมดผ่าน"),
        "it": ("Verificare il flusso principale", "Esegui la modifica richiesta: “{req}”.", "I dati vengono aggiornati e l’interfaccia conferma il successo.", "Verificare dati mancanti o non validi", "Lascia vuoto un campo obbligatorio o inserisci un valore non valido, quindi invia.", "L’app mostra un errore chiaro senza bloccarsi o caricarsi all’infinito.", "Eseguire i test automatici correlati", "Chiedi a un agente IA di eseguirli o usa il terminale: `pytest {test}`", "Tutte le asserzioni vengono superate."),
        "ru": ("Проверить основной сценарий", "Выполните запрошенное изменение: «{req}». ", "Данные обновляются, интерфейс подтверждает успешное выполнение.", "Проверить некорректные или отсутствующие данные", "Оставьте обязательное поле пустым или введите неверное значение и отправьте форму.", "Приложение показывает понятную ошибку без сбоя или бесконечной загрузки.", "Запустить связанные автоматические тесты", "Попросите ИИ-агента запустить их или выполните в терминале: `pytest {test}`", "Все проверки пройдены."),
    }
    (title, action, expected, invalid_title, invalid_action, invalid_expected,
     test_title, test_action, test_expected) = localized.get(language, localized["en"])
    if "email" in requirement.lower() or "e-mail" in requirement.lower():
        email_titles = {
            "en": "Check the email change flow", "vi": "Kiểm tra luồng thay đổi email",
            "ja": "メール変更フローを確認", "ko": "이메일 변경 흐름 확인", "zh": "检查邮箱更改流程",
            "es": "Comprobar el flujo de cambio de correo", "fr": "Vérifier le parcours de changement d’e-mail",
            "de": "E-Mail-Änderungsablauf prüfen", "hi": "ईमेल बदलाव प्रवाह जाँचें",
            "th": "ตรวจสอบขั้นตอนการเปลี่ยนอีเมล", "it": "Verificare il flusso di modifica dell’e-mail",
            "ru": "Проверить сценарий смены электронной почты",
        }
        title = email_titles.get(language, email_titles["en"])
    checklist = [
        {"title": title, "action": action.format(req=requirement), "expected": expected},
        {"title": invalid_title, "action": invalid_action, "expected": invalid_expected},
    ]

    # 2. Automated companion reference
    if suggested_tests:
        checklist.append({
            "title": test_title,
            "action": test_action.format(test=suggested_tests[0].split()[0]),
            "expected": test_expected,
        })

    return checklist
