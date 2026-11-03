#!/usr/bin/env python3
import re

translations = {
    "en": {
        "landing.all_in_one_title": "All-In-One",
        "landing.all_in_one_highlight": "Code Intelligence.",
        "landing.all_in_one_desc": "ScopeGraph is one powerful platform that combines AST dependency graphs, blast radius reasoning, and autonomous MCP agents.",
        "landing.ui_designed_title": "A user interface designed for",
        "landing.ui_designed_highlight": "code intelligence",
        "landing.ui_row1": "Developers visually explore upstream and downstream callers without getting lost.",
        "landing.ui_row2": "Exact AST symbol evidence with line numbers grounding every impact claim.",
        "landing.ui_row3": "Instant test suite recommendations preventing downstream regressions before commit.",
        "landing.tools_title": "Tools",
        "landing.tools_highlight": "For Engineers And AI Agents",
        "landing.tools_desc": "ScopeGraph has a dynamic set of code intelligence tools built to analyze changes before commit. AI coding agents call native FastMCP tools in real time.",
        "landing.assessments_title": "Deterministic AST",
        "landing.assessments_highlight": "Evidence & Verification",
        "landing.assessments_desc": "Every file path, symbol, and line reference suggested by AI models is verified against the database. Unverified claims are rejected."
    },
    "vi": {
        "landing.all_in_one_title": "Nền tảng Tất-cả-trong-một",
        "landing.all_in_one_highlight": "Trí tuệ Mã nguồn.",
        "landing.all_in_one_desc": "ScopeGraph kết hợp đồ thị phụ thuộc AST, lập luận bán kính ảnh hưởng và các agent MCP tự hành.",
        "landing.ui_designed_title": "Giao diện người dùng tối ưu cho",
        "landing.ui_designed_highlight": "trí tuệ mã nguồn",
        "landing.ui_row1": "Lập trình viên trực quan hoá chuỗi gọi hàm mà không bị lạc trong kho mã nguồn lớn.",
        "landing.ui_row2": "Bằng chứng AST cụ thể kèm số dòng xác thực mọi khẳng định tác động.",
        "landing.ui_row3": "Gợi ý chính xác các bộ kiểm thử hồi quy ngăn chặn lỗi trước khi commit.",
        "landing.tools_title": "Công cụ",
        "landing.tools_highlight": "Cho Lập trình viên và AI Agents",
        "landing.tools_desc": "ScopeGraph cung cấp bộ công cụ phân tích tác động trước khi code. AI coding agents gọi FastMCP trực tiếp theo thời gian thực.",
        "landing.assessments_title": "Kiểm định Tất định",
        "landing.assessments_highlight": "Bằng chứng & Đồ thị AST",
        "landing.assessments_desc": "Mọi đường dẫn tệp, hàm và dòng code do AI đề xuất đều được kiểm tra đối chiếu trực tiếp với database."
    },
    "ja": {
        "landing.all_in_one_title": "オールインワン",
        "landing.all_in_one_highlight": "コードインテリジェンス。",
        "landing.all_in_one_desc": "ScopeGraphはAST依存関係グラフ、影響範囲推論、自律型MCPエージェントを統合した強力なプラットフォームです。",
        "landing.ui_designed_title": "コード知能のために設計された",
        "landing.ui_designed_highlight": "ユーザーインターフェース",
        "landing.ui_row1": "巨大なコードベースで迷うことなく、呼び出し関係を視覚的に探索できます。",
        "landing.ui_row2": "正確な行番号付きASTシンボル証拠がすべての影響の主張を裏付けます。",
        "landing.ui_row3": "コミット前に下流のリグレッションを防ぐ的確なテストスイートを推奨。",
        "landing.tools_title": "ツール群",
        "landing.tools_highlight": "エンジニアとAIエージェント向け",
        "landing.tools_desc": "ScopeGraphは変更前に影響を分析する動的ツールセットを提供。AIエージェントがFastMCPをリアルタイムに呼び出します。",
        "landing.assessments_title": "決定論的AST",
        "landing.assessments_highlight": "エビデンス＆検証",
        "landing.assessments_desc": "AIモデルが提示したすべてのファイルパスやシンボルをDBと厳格に対照検証します。"
    },
    "ko": {
        "landing.all_in_one_title": "올인원",
        "landing.all_in_one_highlight": "코드 인텔리전스.",
        "landing.all_in_one_desc": "ScopeGraph는 AST 종속성 그래프, 영향 반경 추론, 자율 MCP 에이전트를 결합한 강력한 플랫폼입니다.",
        "landing.ui_designed_title": "코드 인텔리전스를 위해 설계된",
        "landing.ui_designed_highlight": "사용자 인터페이스",
        "landing.ui_row1": "개발자가 대규모 코드베이스에서 길을 잃지 않고 호출 관계를 직관적으로 탐색합니다.",
        "landing.ui_row2": "정확한 줄 번호가 포함된 AST 심볼 증거로 모든 영향 분석을 뒷받침합니다.",
        "landing.ui_row3": "커밋 전 회귀 결함을 방지하는 최적의 테스트 스위트 추천.",
        "landing.tools_title": "도구 모음",
        "landing.tools_highlight": "엔지니어와 AI 에이전트를 위한",
        "landing.tools_desc": "ScopeGraph는 코드 변경 전 영향을 분석하는 동적 도구 세트를 제공하며, AI 에이전트가 실시간으로 FastMCP를 호출합니다.",
        "landing.assessments_title": "결정론적 AST",
        "landing.assessments_highlight": "증거 및 검증",
        "landing.assessments_desc": "AI 모델이 제안한 모든 파일 경로와 심볼을 데이터베이스와 완벽히 교차 검증합니다."
    },
    "zh": {
        "landing.all_in_one_title": "全功能一体化",
        "landing.all_in_one_highlight": "代码智能平台。",
        "landing.all_in_one_desc": "ScopeGraph结合了AST依赖图谱、影响半径推理以及自主MCP智能体，打造一站式代码智能分析平台。",
        "landing.ui_designed_title": "专为代码智能打造的",
        "landing.ui_designed_highlight": "极致交互界面",
        "landing.ui_row1": "开发者可以在庞大代码库中直观追踪上下游调用链，不再迷失方向。",
        "landing.ui_row2": "精准的行号与AST符号实据，为每一项影响分析提供铁证。",
        "landing.ui_row3": "在代码提交前精准推荐回归测试套件，彻底杜绝下游缺陷。",
        "landing.tools_title": "核心工具",
        "landing.tools_highlight": "赋能工程师与AI智能体",
        "landing.tools_desc": "ScopeGraph提供在提交修改前分析影响的强大工具集。AI编码智能体可实时调用原生FastMCP工具。",
        "landing.assessments_title": "确定性AST",
        "landing.assessments_highlight": "证据与严格验证",
        "landing.assessments_desc": "AI模型提出的每一个文件路径和符号声明，均与真实数据库严格交叉比对。"
    },
    "es": {
        "landing.all_in_one_title": "Todo en Uno",
        "landing.all_in_one_highlight": "Inteligencia de Código.",
        "landing.all_in_one_desc": "ScopeGraph combina grafos de dependencia AST, análisis de radio de impacto y agentes MCP autónomos.",
        "landing.ui_designed_title": "Una interfaz diseñada para",
        "landing.ui_designed_highlight": "inteligencia de código",
        "landing.ui_row1": "Los desarrolladores exploran visualmente las llamadas upstream y downstream sin perderse.",
        "landing.ui_row2": "Evidencia exacta de símbolos AST con números de línea para cada impacto.",
        "landing.ui_row3": "Recomendaciones inmediatas de pruebas de regresión antes de hacer commit.",
        "landing.tools_title": "Herramientas",
        "landing.tools_highlight": "Para Ingenieros y Agentes de IA",
        "landing.tools_desc": "Herramientas avanzadas para analizar cambios antes del commit mediante FastMCP en tiempo real.",
        "landing.assessments_title": "AST Determinista",
        "landing.assessments_highlight": "Evidencia y Verificación",
        "landing.assessments_desc": "Cada archivo y símbolo sugerido por la IA se verifica estrictamente contra la base de datos."
    },
    "fr": {
        "landing.all_in_one_title": "Tout-en-un",
        "landing.all_in_one_highlight": "Intelligence de Code.",
        "landing.all_in_one_desc": "ScopeGraph réunit graphes de dépendances AST, analyse du rayon d'impact et agents MCP autonomes.",
        "landing.ui_designed_title": "Une interface conçue pour",
        "landing.ui_designed_highlight": "l'intelligence de code",
        "landing.ui_row1": "Explorez visuellement les flux d'appels amont et aval sans vous perdre.",
        "landing.ui_row2": "Preuves AST exactes avec numéros de lignes pour chaque modification.",
        "landing.ui_row3": "Recommandation ciblée des tests de régression avant le commit.",
        "landing.tools_title": "Outils",
        "landing.tools_highlight": "Pour Développeurs et Agents IA",
        "landing.tools_desc": "Outils dynamiques pour analyser les changements avant commit via FastMCP en temps réel.",
        "landing.assessments_title": "AST Déterministe",
        "landing.assessments_highlight": "Preuves et Vérification",
        "landing.assessments_desc": "Chaque fichier et symbole proposé par l'IA est vérifié dans la base de données."
    },
    "de": {
        "landing.all_in_one_title": "All-in-One",
        "landing.all_in_one_highlight": "Code-Intelligenz.",
        "landing.all_in_one_desc": "ScopeGraph vereint AST-Abhängigkeitsgraphen, Auswirkungsanalysen und autonome MCP-Agenten.",
        "landing.ui_designed_title": "Eine Benutzeroberfläche für",
        "landing.ui_designed_highlight": "Code-Intelligenz",
        "landing.ui_row1": "Entwickler untersuchen Aufrufhierarchien visuell und zielgerichtet.",
        "landing.ui_row2": "Präzise AST-Evidenz mit Zeilennummern für jede Auswirkungsaussage.",
        "landing.ui_row3": "Gezielte Testempfehlungen verhindern Regressionen vor dem Commit.",
        "landing.tools_title": "Werkzeuge",
        "landing.tools_highlight": "Für Ingenieure und KI-Agenten",
        "landing.tools_desc": "Dynamische Tools zur Auswirkungsanalyse vor dem Commit mit FastMCP in Echtzeit.",
        "landing.assessments_title": "Deterministisches AST",
        "landing.assessments_highlight": "Evidenz & Verifikation",
        "landing.assessments_desc": "Jede von der KI vorgeschlagene Datei wird strikt mit der Datenbank abgeglichen."
    },
    "hi": {
        "landing.all_in_one_title": "ऑल-इन-वन",
        "landing.all_in_one_highlight": "कोड इंटेलिजेंस।",
        "landing.all_in_one_desc": "ScopeGraph AST निर्भरता ग्राफ, प्रभाव विश्लेषण और स्वायत्त MCP एजेंटों को एक शक्तिशाली प्लेटफॉर्म में जोड़ता है।",
        "landing.ui_designed_title": "इसके लिए डिज़ाइन किया गया यूजर इंटरफेस:",
        "landing.ui_designed_highlight": "कोड इंटेलिजेंस",
        "landing.ui_row1": "डेवलपर्स बिना भटके कॉलिंग पदानुक्रम को दृश्य रूप से एक्सप्लोर करते हैं।",
        "landing.ui_row2": "सटीक लाइन नंबरों के साथ AST साक्ष्य हर प्रभाव दावे का समर्थन करते हैं।",
        "landing.ui_row3": "कमिट से पहले रिग्रेशन रोकने के लिए सटीक टेस्ट सिफारिशें।",
        "landing.tools_title": "उपकरण",
        "landing.tools_highlight": "इंजीनियरों और AI एजेंटों के लिए",
        "landing.tools_desc": "कमिट करने से पहले परिवर्तनों का विश्लेषण करने के लिए डायनामिक टूलसेट।",
        "landing.assessments_title": "निश्चयात्मक AST",
        "landing.assessments_highlight": "साक्ष्य और सत्यापन",
        "landing.assessments_desc": "AI मॉडल द्वारा सुझाए गए प्रत्येक पथ और प्रतीक को डेटाबेस से सत्यापित किया जाता है।"
    },
    "th": {
        "landing.all_in_one_title": "ระบบครบวงจร",
        "landing.all_in_one_highlight": "ความฉลาดของโค้ด",
        "landing.all_in_one_desc": "ScopeGraph รวมกราฟความสัมพันธ์ AST การวิเคราะห์ผลกระทบ และ AI Agent อัตโนมัติไว้ในที่เดียว",
        "landing.ui_designed_title": "อินเทอร์เฟซที่ออกแบบมาเพื่อ",
        "landing.ui_designed_highlight": "ความฉลาดของโค้ด",
        "landing.ui_row1": "นักพัฒนาสำรวจลำดับการเรียกโค้ดได้อย่างชัดเจนโดยไม่หลงทาง",
        "landing.ui_row2": "หลักฐานสัญลักษณ์ AST พร้อมหมายเลขบรรทัดที่ชัดเจน",
        "landing.ui_row3": "คำแนะนำชุดการทดสอบทันทีเพื่อป้องกันข้อผิดพลาดก่อนบันทึกโค้ด",
        "landing.tools_title": "เครื่องมือ",
        "landing.tools_highlight": "สำหรับวิศวกรและ AI Agent",
        "landing.tools_desc": "ชุดเครื่องมือวิเคราะห์ผลกระทบแบบเรียลไทม์ผ่าน FastMCP ก่อนเริ่ม commit โค้ด",
        "landing.assessments_title": "AST ที่แน่นอน",
        "landing.assessments_highlight": "หลักฐานและการตรวจสอบ",
        "landing.assessments_desc": "ทุกสัญลักษณ์และไฟล์ที่ AI แนะนำจะได้รับการตรวจสอบความถูกต้องกับฐานข้อมูล"
    },
    "it": {
        "landing.all_in_one_title": "Tutto in uno",
        "landing.all_in_one_highlight": "Intelligenza del Codice.",
        "landing.all_in_one_desc": "ScopeGraph unisce grafi di dipendenza AST, analisi del raggio d'impatto e agenti MCP autonomi.",
        "landing.ui_designed_title": "Un'interfaccia progettata per",
        "landing.ui_designed_highlight": "l'intelligenza del codice",
        "landing.ui_row1": "Gli sviluppatori esplorano visivamente le chiamate senza perdersi.",
        "landing.ui_row2": "Prove AST esatte con numeri di riga per ogni modifica.",
        "landing.ui_row3": "Raccomandazione immediata dei test per prevenire regressioni prima del commit.",
        "landing.tools_title": "Strumenti",
        "landing.tools_highlight": "Per Ingegneri e Agenti AI",
        "landing.tools_desc": "Strumenti dinamici per analizzare modifiche prima del commit tramite FastMCP.",
        "landing.assessments_title": "AST Deterministico",
        "landing.assessments_highlight": "Evidenza e Verifica",
        "landing.assessments_desc": "Ogni file e simbolo suggerito dall'AI viene verificato rigorosamente nel database."
    },
    "ru": {
        "landing.all_in_one_title": "Все в одном",
        "landing.all_in_one_highlight": "Интеллект Кода.",
        "landing.all_in_one_desc": "ScopeGraph объединяет графы зависимостей AST, анализ зоны поражения и автономных MCP-агентов.",
        "landing.ui_designed_title": "Интерфейс, созданный для",
        "landing.ui_designed_highlight": "интеллекта кода",
        "landing.ui_row1": "Разработчики наглядно исследуют цепочки вызовов, не теряясь в кодовой базе.",
        "landing.ui_row2": "Точные AST-доказательства с номерами строк для каждого изменения.",
        "landing.ui_row3": "Точные рекомендации тестов для предотвращения регрессий до коммита.",
        "landing.tools_title": "Инструменты",
        "landing.tools_highlight": "Для инженеров и AI-агентов",
        "landing.tools_desc": "Динамические инструменты для анализа влияния изменений через FastMCP в реальном времени.",
        "landing.assessments_title": "Детерминированный AST",
        "landing.assessments_highlight": "Доказательства и верификация",
        "landing.assessments_desc": "Каждый файл и символ, предложенный AI, строго проверяется по базе данных."
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

print("Injected Skilline sections translations into LanguageContext.tsx successfully!")
