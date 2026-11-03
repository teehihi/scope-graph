#!/usr/bin/env python3
import re

translations = {
    "en": {
        "landing.watch_how": "Explore Simulator",
        "landing.what_is_title": "What is",
        "landing.what_is_scopegraph": "ScopeGraph?",
        "landing.what_is_desc": "ScopeGraph eliminates guesswork and hallucinations when planning code changes by building a deterministic dependency graph across APIs, services, models, and test suites.",
        "landing.for_developers": "FOR SOFTWARE DEVELOPERS",
        "landing.for_developers_desc": "Visually inspect dependency graphs, explore architectural tiers, and review blast radius before writing code.",
        "landing.for_agents": "FOR AI CODING AGENTS",
        "landing.for_agents_desc": "Connect Cursor, Claude Code, and Codex via native FastMCP tools to receive verified code context and blast radius briefs.",
        "landing.trusted_by": "Integrated with Modern AI & Developer Toolchains",
        "landing.feature_graph_title": "Layered AST Dependency Graph",
        "landing.feature_graph_desc": "Clean orthogonal routing connecting API routes, services, models, and tests without crossed edges.",
        "landing.feature_evidence_title": "Deterministic Evidence Gate",
        "landing.feature_evidence_desc": "Strict anti-hallucination verification rejecting any claim that does not exist in the parsed database.",
        "landing.feature_tests_title": "Targeted Regression Test Suites",
        "landing.feature_tests_desc": "Know exactly which test suites cover affected code paths before running full CI/CD matrices."
    },
    "vi": {
        "landing.watch_how": "Khám phá Trình mô phỏng",
        "landing.what_is_title": "ScopeGraph là",
        "landing.what_is_scopegraph": "gì?",
        "landing.what_is_desc": "ScopeGraph loại bỏ phỏng đoán và ảo giác khi lên kế hoạch thay đổi code bằng đồ thị phụ thuộc tất định qua các tầng API, service, model và test.",
        "landing.for_developers": "CHO LẬP TRÌNH VIÊN",
        "landing.for_developers_desc": "Trực quan hoá đồ thị phụ thuộc, khám phá các tầng kiến trúc và xem trước bán kính ảnh hưởng trước khi viết code.",
        "landing.for_agents": "CHO AI CODING AGENTS",
        "landing.for_agents_desc": "Kết nối Cursor, Claude Code và Codex qua FastMCP để nhận ngữ cảnh mã nguồn đã được kiểm chứng chuẩn xác.",
        "landing.trusted_by": "Tích hợp cùng Hệ sinh thái AI & Lập trình Hiện đại",
        "landing.feature_graph_title": "Đồ thị Phụ thuộc AST Đa tầng",
        "landing.feature_graph_desc": "Định tuyến vuông góc kết nối API routes, services, models và tests rõ ràng không bị đan chéo.",
        "landing.feature_evidence_title": "Cổng Bằng chứng Chống Ảo giác",
        "landing.feature_evidence_desc": "Kiểm định nghiêm ngặt bác bỏ mọi symbol hoặc file không tồn tại trong cơ sở dữ liệu đã phân tích.",
        "landing.feature_tests_title": "Bộ Test Hồi quy Trọng tâm",
        "landing.feature_tests_desc": "Xác định chính xác các test suite cần chạy tương ứng với luồng code bị ảnh hưởng trước khi chạy toàn bộ CI/CD."
    },
    "ja": {
        "landing.watch_how": "シミュレータを体験",
        "landing.what_is_title": "ScopeGraphと",
        "landing.what_is_scopegraph": "は？",
        "landing.what_is_desc": "ScopeGraphはAPI、サービス、モデル、テスト全体の決定論的依存関係グラフを構築し、コード変更計画における推測と幻覚を排除します。",
        "landing.for_developers": "ソフトウェアエンジニア向け",
        "landing.for_developers_desc": "依存関係グラフを視覚化し、アーキテクチャ層を探索し、コードを書く前に影響範囲を確認します。",
        "landing.for_agents": "AIコーディングエージェント向け",
        "landing.for_agents_desc": "Cursor、Claude Code、CodexをネイティブFastMCPツールで接続し、検証済みコードコンテキストを受信します。",
        "landing.trusted_by": "最新のAIおよび開発者エコシステムと統合",
        "landing.feature_graph_title": "階層型AST依存関係グラフ",
        "landing.feature_graph_desc": "API、サービス、モデル、テストを交差なく直交ルーティングで接続。",
        "landing.feature_evidence_title": "決定論的エビデンスゲート",
        "landing.feature_evidence_desc": "データベースに実在しないシンボルやファイルへの主張を厳格に拒否。",
        "landing.feature_tests_title": "重点回帰テストスイート",
        "landing.feature_tests_desc": "CI/CD全体を実行する前に、影響を受けるコードパスに対応するテストを特定。"
    },
    "ko": {
        "landing.watch_how": "시뮬레이터 살펴보기",
        "landing.what_is_title": "ScopeGraph는",
        "landing.what_is_scopegraph": "무엇인가요?",
        "landing.what_is_desc": "ScopeGraph는 API, 서비스, 모델, 테스트 전반의 결정론적 종속성 그래프를 구축하여 코드 변경 계획 시 추측과 환각을 제거합니다.",
        "landing.for_developers": "소프트웨어 엔지니어를 위해",
        "landing.for_developers_desc": "종속성 그래프를 시각적으로 확인하고 아키텍처 계층을 탐색하며 코드 작성 전 영향 반경을 검토합니다.",
        "landing.for_agents": "AI 코딩 에이전트를 위해",
        "landing.for_agents_desc": "네이티브 FastMCP 도구를 통해 Cursor, Claude Code, Codex를 연결하여 검증된 코드 컨텍스트를 받습니다.",
        "landing.trusted_by": "현대적인 AI 및 개발자 툴체인과 통합",
        "landing.feature_graph_title": "계층형 AST 종속성 그래프",
        "landing.feature_graph_desc": "API, 서비스, 모델, 테스트를 꼬임 없이 직교 라우팅으로 연결.",
        "landing.feature_evidence_title": "결정론적 증거 게이트",
        "landing.feature_evidence_desc": "데이터베이스에 존재하지 않는 심볼이나 파일에 대한 주장을 엄격히 거부.",
        "landing.feature_tests_title": "타겟 회귀 테스트 스위트",
        "landing.feature_tests_desc": "전체 CI/CD 매트릭스를 실행하기 전에 영향을 받는 경로를 다루는 테스트를 정확히 파악."
    },
    "zh": {
        "landing.watch_how": "探索仿真器",
        "landing.what_is_title": "什么是",
        "landing.what_is_scopegraph": "ScopeGraph？",
        "landing.what_is_desc": "ScopeGraph通过在API、服务、数据模型和测试之间构建确定性依赖图谱，彻底消除规划代码修改时的盲目猜测与AI幻觉。",
        "landing.for_developers": "面向软件工程师",
        "landing.for_developers_desc": "可视化依赖图谱，探索架构分层，在编写代码之前洞悉完整影响范围。",
        "landing.for_agents": "面向AI编码智能体",
        "landing.for_agents_desc": "通过原生FastMCP将Cursor、Claude Code和Codex无缝接入，获取经过AST验证的代码上下文。",
        "landing.trusted_by": "深度集成现代AI与开发者工具生态",
        "landing.feature_graph_title": "分层AST依赖图谱",
        "landing.feature_graph_desc": "正交连线清晰连接API路由、服务、模型与测试，告别混乱交叉。",
        "landing.feature_evidence_title": "确定性反幻觉证据门控",
        "landing.feature_evidence_desc": "严格校验证据，坚决拒绝数据库中不存在的虚假符号与文件路径。",
        "landing.feature_tests_title": "精准回归测试集推荐",
        "landing.feature_tests_desc": "在触发完整CI/CD之前，精确指出覆盖受影响链路的测试用例。"
    },
    "es": {
        "landing.watch_how": "Explorar Simulador",
        "landing.what_is_title": "¿Qué es",
        "landing.what_is_scopegraph": "ScopeGraph?",
        "landing.what_is_desc": "ScopeGraph elimina suposiciones y alucinaciones al planificar cambios de código mediante un grafo de dependencias determinista.",
        "landing.for_developers": "PARA DESARROLLADORES",
        "landing.for_developers_desc": "Inspeccione visualmente grafos de dependencias, explore capas y revise el radio de impacto antes de programar.",
        "landing.for_agents": "PARA AGENTES DE IA",
        "landing.for_agents_desc": "Conecte Cursor, Claude Code y Codex mediante FastMCP nativo para recibir contexto de código verificado.",
        "landing.trusted_by": "Integrado con herramientas modernas de desarrollo e IA",
        "landing.feature_graph_title": "Grafo de Dependencias AST en Capas",
        "landing.feature_graph_desc": "Enrutamiento ortogonal limpio que conecta rutas de API, servicios, modelos y pruebas sin cruces.",
        "landing.feature_evidence_title": "Puerta de Evidencia Determinista",
        "landing.feature_evidence_desc": "Verificación estricta contra alucinaciones que rechaza afirmaciones no registradas en la base de datos.",
        "landing.feature_tests_title": "Pruebas de Regresión Específicas",
        "landing.feature_tests_desc": "Sepa exactamente qué suites de prueba cubren las rutas afectadas antes de ejecutar CI/CD completo."
    },
    "fr": {
        "landing.watch_how": "Explorer le simulateur",
        "landing.what_is_title": "Qu'est-ce que",
        "landing.what_is_scopegraph": "ScopeGraph ?",
        "landing.what_is_desc": "ScopeGraph élimine les suppositions et les hallucinations lors de la planification des modifications de code grâce à un graphe de dépendances déterministe.",
        "landing.for_developers": "POUR LES DÉVELOPPEURS",
        "landing.for_developers_desc": "Inspectez visuellement les graphes de dépendances, explorez les couches et examinez l'impact avant de coder.",
        "landing.for_agents": "POUR LES AGENTS IA",
        "landing.for_agents_desc": "Connectez Cursor, Claude Code et Codex via FastMCP pour obtenir un contexte de code vérifié.",
        "landing.trusted_by": "Intégré aux chaînes d'outils modernes pour développeurs et IA",
        "landing.feature_graph_title": "Graphe de dépendances AST en couches",
        "landing.feature_graph_desc": "Routage orthogonal propre reliant API, services, modèles et tests sans chevauchement.",
        "landing.feature_evidence_title": "Passerelle de preuves déterministe",
        "landing.feature_evidence_desc": "Vérification stricte anti-hallucination rejetant tout élément inexistant dans la base de données.",
        "landing.feature_tests_title": "Suites de tests de régression ciblées",
        "landing.feature_tests_desc": "Identifiez exactement les suites de tests couvrant le code impacté avant de lancer le CI/CD complet."
    },
    "de": {
        "landing.watch_how": "Simulator erkunden",
        "landing.what_is_title": "Was ist",
        "landing.what_is_scopegraph": "ScopeGraph?",
        "landing.what_is_desc": "ScopeGraph eliminiert Rätselraten und Halluzinationen bei Codeänderungen durch deterministische Abhängigkeitsgraphen.",
        "landing.for_developers": "FÜR ENTWICKLER",
        "landing.for_developers_desc": "Abhängigkeitsgraphen visualisieren, Architektur analysieren und Auswirkungen vor dem Coden prüfen.",
        "landing.for_agents": "FÜR KI-AGENTEN",
        "landing.for_agents_desc": "Cursor, Claude Code und Codex nativ über FastMCP für verifizierten Code-Kontext verbinden.",
        "landing.trusted_by": "Integriert in moderne Entwickler- und KI-Toolchains",
        "landing.feature_graph_title": "Mehrschichtiger AST-Abhängigkeitsgraph",
        "landing.feature_graph_desc": "Sauberes orthogonales Routing zwischen APIs, Services, Modellen und Tests.",
        "landing.feature_evidence_title": "Deterministisches Evidenz-Gate",
        "landing.feature_evidence_desc": "Strikte Anti-Halluzinations-Prüfung verwirft alle nicht in der DB vorhandenen Symbole.",
        "landing.feature_tests_title": "Gezielte Regressionstest-Suiten",
        "landing.feature_tests_desc": "Wissen Sie genau, welche Tests betroffen sind, bevor Sie die gesamte Testmatrix starten."
    },
    "hi": {
        "landing.watch_how": "सिम्युलेटर देखें",
        "landing.what_is_title": "ScopeGraph",
        "landing.what_is_scopegraph": "क्या है?",
        "landing.what_is_desc": "ScopeGraph कोड परिवर्तनों की योजना बनाते समय अनुमान और मतिभ्रम को समाप्त करता है।",
        "landing.for_developers": "डेवलपर्स के लिए",
        "landing.for_developers_desc": "कोड लिखने से पहले निर्भरता ग्राफ को दृष्टिगत रूप से देखें और प्रभाव त्रिज्या की समीक्षा करें।",
        "landing.for_agents": "AI कोडिंग एजेंट्स के लिए",
        "landing.for_agents_desc": "सत्यापित कोड संदर्भ प्राप्त करने के लिए FastMCP के माध्यम से Cursor, Claude Code और Codex को कनेक्ट करें।",
        "landing.trusted_by": "आधुनिक AI और डेवलपर टूलचेन के साथ एकीकृत",
        "landing.feature_graph_title": "स्तरित AST निर्भरता ग्राफ",
        "landing.feature_graph_desc": "बिना किसी ओवरलैप के API, सेवाओं, मॉडलों और परीक्षणों को जोड़ने वाला स्पष्ट रूटिंग।",
        "landing.feature_evidence_title": "निश्चयात्मक साक्ष्य गेट",
        "landing.feature_evidence_desc": "डेटाबेस में अनुपस्थित किसी भी प्रतीक या फ़ाइल को दृढ़ता से अस्वीकार करता है।",
        "landing.feature_tests_title": "लक्षित प्रतिगमन परीक्षण सेट",
        "landing.feature_tests_desc": "पूर्ण CI/CD चलाने से पहले जानें कि कौन से परीक्षण प्रभावित पथों को कवर करते हैं।"
    },
    "th": {
        "landing.watch_how": "ดูการจำลอง",
        "landing.what_is_title": "ScopeGraph คือ",
        "landing.what_is_scopegraph": "อะไร?",
        "landing.what_is_desc": "ScopeGraph ขจัดข้อสงสัยและภาพหลอนในการวางแผนโค้ดด้วยกราฟความสัมพันธ์ที่แน่นอน",
        "landing.for_developers": "สำหรับนักพัฒนาซอฟต์แวร์",
        "landing.for_developers_desc": "ตรวจสอบกราฟความสัมพันธ์และดูรัศมีผลกระทบก่อนเริ่มเขียนโค้ดจริง",
        "landing.for_agents": "สำหรับ AI CODING AGENTS",
        "landing.for_agents_desc": "เชื่อมต่อ Cursor, Claude Code และ Codex ผ่าน FastMCP เพื่อรับบริบทโค้ดที่ถูกต้อง",
        "landing.trusted_by": "ผสานรวมกับชุดเครื่องมือนักพัฒนาและ AI ยุคใหม่",
        "landing.feature_graph_title": "กราฟความสัมพันธ์ AST หลายระดับ",
        "landing.feature_graph_desc": "การจัดเส้นทางแบบมุมฉากที่เชื่อมโยง API, เซอร์วิส, โมเดล และแบบทดสอบอย่างชัดเจน",
        "landing.feature_evidence_title": "เกตหลักฐานป้องกันภาพหลอน",
        "landing.feature_evidence_desc": "ปฏิเสธสัญลักษณ์หรือไฟล์ที่ไม่มีอยู่จริงในฐานข้อมูลอย่างเคร่งครัด",
        "landing.feature_tests_title": "ชุดทดสอบการถดถอยเป้าหมาย",
        "landing.feature_tests_desc": "ทราบได้อย่างแม่นยำว่าแบบทดสอบใดครอบคลุมเส้นทางที่ได้รับผลกระทบ"
    },
    "it": {
        "landing.watch_how": "Esplora il simulatore",
        "landing.what_is_title": "Che cos'è",
        "landing.what_is_scopegraph": "ScopeGraph?",
        "landing.what_is_desc": "ScopeGraph elimina le supposizioni e le allucinazioni nella pianificazione del codice grazie a un grafo di dipendenze deterministico.",
        "landing.for_developers": "PER GLI SVILUPPATORI",
        "landing.for_developers_desc": "Ispeziona visivamente i grafi di dipendenza ed esamina il raggio d'impatto prima di programmare.",
        "landing.for_agents": "PER GLI AGENTI AI",
        "landing.for_agents_desc": "Collega Cursor, Claude Code e Codex tramite FastMCP per ricevere contesti di codice verificati.",
        "landing.trusted_by": "Integrato con le moderne toolchain per sviluppatori e AI",
        "landing.feature_graph_title": "Grafo delle dipendenze AST a livelli",
        "landing.feature_graph_desc": "Routing ortogonale pulito che collega percorsi API, servizi, modelli e test.",
        "landing.feature_evidence_title": "Gate di evidenza deterministico",
        "landing.feature_evidence_desc": "Verifica rigorosa anti-allucinazione che rifiuta qualsiasi simbolo inesistente nel database.",
        "landing.feature_tests_title": "Suite di test di regressione mirate",
        "landing.feature_tests_desc": "Individua esattamente le suite di test necessarie prima di eseguire l'intero CI/CD."
    },
    "ru": {
        "landing.watch_how": "Открыть симулятор",
        "landing.what_is_title": "Что такое",
        "landing.what_is_scopegraph": "ScopeGraph?",
        "landing.what_is_desc": "ScopeGraph исключает догадки и галлюцинации при планировании изменений кода с помощью детерминированного графа зависимостей.",
        "landing.for_developers": "ДЛЯ РАЗРАБОТЧИКОВ",
        "landing.for_developers_desc": "Наглядно изучайте графы зависимостей, исследуйте слои и оценивайте зону поражения до написания кода.",
        "landing.for_agents": "ДЛЯ AI-АГЕНТОВ",
        "landing.for_agents_desc": "Подключайте Cursor, Claude Code и Codex через FastMCP для получения проверенного контекста кода.",
        "landing.trusted_by": "Интегрировано с современным стеком инструментов разработки и AI",
        "landing.feature_graph_title": "Многоуровневый граф зависимостей AST",
        "landing.feature_graph_desc": "Чистая ортогональная маршрутизация связывает API, сервисы, модели и тесты без пересечений.",
        "landing.feature_evidence_title": "Детерминированный шлюз доказательств",
        "landing.feature_evidence_desc": "Строгая защита от галлюцинаций, отклоняющая любые символы, отсутствующие в базе данных.",
        "landing.feature_tests_title": "Целевые наборы регрессионных тестов",
        "landing.feature_tests_desc": "Точно знайте, какие наборы тестов покрывают затронутый код до запуска всего CI/CD."
    }
}

file_path = "apps/web/src/context/LanguageContext.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

for lang, dict_items in translations.items():
    pattern = rf"(  {lang}: \{{)"
    match = re.search(pattern, content)
    if not match:
        print(f"Error: could not find {lang} in LanguageContext.tsx")
        continue
    
    entries = []
    for k, v in dict_items.items():
        clean_v = v.replace("\\", "\\\\").replace("'", "\\'")
        entries.append(f"    '{k}': '{clean_v}',")
    
    inject_str = match.group(1) + "\n" + "\n".join(entries)
    content = content[:match.start()] + inject_str + content[match.end():]

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Injected Skilline-style translations into LanguageContext.tsx successfully!")
