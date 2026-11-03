import re

LANGUAGES = ['en', 'vi', 'ja', 'ko', 'zh', 'es', 'fr', 'de', 'hi', 'th', 'it', 'ru']

NEW_KEYS = {
    'landing.nav_home': {
        'en': 'Home', 'vi': 'Trang chủ', 'ja': 'ホーム', 'ko': '홈', 'zh': '首页',
        'es': 'Inicio', 'fr': 'Accueil', 'de': 'Startseite', 'hi': 'होम', 'th': 'หน้าแรก', 'it': 'Home', 'ru': 'Главная'
    },
    'landing.nav_features': {
        'en': 'Features', 'vi': 'Tính năng', 'ja': '機能', 'ko': '기능', 'zh': '功能特性',
        'es': 'Características', 'fr': 'Fonctionnalités', 'de': 'Funktionen', 'hi': 'विशेषताएं', 'th': 'คุณสมบัติ', 'it': 'Funzionalità', 'ru': 'Возможности'
    },
    'landing.nav_mcp': {
        'en': 'MCP Agent', 'vi': 'MCP Agent', 'ja': 'MCPエージェント', 'ko': 'MCP 에이전트', 'zh': 'MCP 智能体',
        'es': 'Agente MCP', 'fr': 'Agent MCP', 'de': 'MCP-Agent', 'hi': 'MCP एजेंट', 'th': 'เอเจนต์ MCP', 'it': 'Agente MCP', 'ru': 'MCP-агент'
    },
    'landing.nav_pricing': {
        'en': 'Pricing', 'vi': 'Bảng giá', 'ja': '料金プラン', 'ko': '요금제', 'zh': '定价方案',
        'es': 'Precios', 'fr': 'Tarifs', 'de': 'Preise', 'hi': 'मूल्य निर्धारण', 'th': 'ราคา', 'it': 'Prezzi', 'ru': 'Тарифы'
    },
    'landing.nav_login': {
        'en': 'Login', 'vi': 'Đăng nhập', 'ja': 'ログイン', 'ko': '로그인', 'zh': '登录',
        'es': 'Iniciar sesión', 'fr': 'Connexion', 'de': 'Anmelden', 'hi': 'लॉग इन', 'th': 'เข้าสู่ระบบ', 'it': 'Accedi', 'ru': 'Вход'
    },
    'landing.nav_signup': {
        'en': 'Try Demo', 'vi': 'Dùng thử Demo', 'ja': 'デモを試す', 'ko': '데모 체험', 'zh': '体验演示',
        'es': 'Probar demo', 'fr': 'Essayer la démo', 'de': 'Demo testen', 'hi': 'डेमो आज़माएं', 'th': 'ลองใช้เดโม', 'it': 'Prova demo', 'ru': 'Попробовать демо'
    },
    'landing.hero_title_accent': {
        'en': 'Analyzing', 'vi': 'Phân tích', 'ja': 'コードの', 'ko': '코드 영향', 'zh': '分析',
        'es': 'Analizar', 'fr': 'Analyser', 'de': 'Code-Impact', 'hi': 'विश्लेषण', 'th': 'การวิเคราะห์', 'it': 'Analizzare', 'ru': 'Анализ'
    },
    'landing.hero_title_main': {
        'en': 'Code Impact Before You Commit is Now Much Easier',
        'vi': 'Tác động mã nguồn trước khi thay đổi giờ đây dễ dàng hơn nhiều',
        'ja': 'コミット前の影響分析がかつてないほど簡単に',
        'ko': '커밋 전 코드 영향 분석이 이제 훨씬 쉬워졌습니다',
        'zh': '提交前的影响分析现已变得前所未有的轻松',
        'es': 'el impacto antes de hacer commit ahora es mucho más fácil',
        'fr': "l'impact du code avant commit est désormais bien plus simple",
        'de': 'vor dem Commit analysieren ist jetzt viel einfacher',
        'hi': 'कमिट करने से पहले कोड प्रभाव विश्लेषण अब बहुत आसान हो गया है',
        'th': 'ผลกระทบของโค้ดก่อนคอมมิตตอนนี้ง่ายขึ้นมาก',
        'it': "l'impatto prima del commit è ora molto più semplice",
        'ru': 'влияния кода перед коммитом стал намного проще'
    },
    'landing.hero_subtitle': {
        'en': 'ScopeGraph is a powerful code intelligence platform that analyzes your blast radius and AST dependencies in a visual, interactive way.',
        'vi': 'ScopeGraph là nền tảng trí tuệ mã nguồn mạnh mẽ phân tích bán kính tác động và quan hệ phụ thuộc AST trực quan và tương tác.',
        'ja': 'ScopeGraphは、影響範囲とAST依存関係を視覚的かつ対話的に分析する強力なコードインテリジェンスプラットフォームです。',
        'ko': 'ScopeGraph는 변경 영향 범위와 AST 종속성을 시각적이고 대화형 방식으로 분석하는 강력한 코드 인텔리전스 플랫폼입니다.',
        'zh': 'ScopeGraph 是一个强大的代码智能平台，以可视化和交互式方式分析爆炸半径与 AST 依赖关系。',
        'es': 'ScopeGraph es una potente plataforma de inteligencia de código que analiza el radio de impacto y dependencias AST de forma visual e interactiva.',
        'fr': 'ScopeGraph est une plateforme puissante d’intelligence de code qui analyse le rayon d’impact et les dépendances AST de manière visuelle et interactive.',
        'de': 'ScopeGraph ist eine leistungsstarke Plattform für Code-Intelligence, die Explosionsradius und AST-Abhängigkeiten visuell analysiert.',
        'hi': 'ScopeGraph एक शक्तिशाली कोड इंटेलिजेंस प्लेटफ़ॉर्म है जो विज़ुअल तरीके से ब्लास्ट रेडियस और AST निर्भरताओं का विश्लेषण करता है।',
        'th': 'ScopeGraph เป็นแพลตฟอร์มอัจฉริยะด้านโค้ดที่วิเคราะห์รัศมีผลกระทบและความสัมพันธ์ AST แบบเห็นภาพและโต้ตอบได้',
        'it': 'ScopeGraph è una potente piattaforma di intelligenza del codice che analizza il raggio d’impatto e le dipendenze AST in modo visivo.',
        'ru': 'ScopeGraph — это мощная платформа анализа кода, визуально исследующая радиус воздействия и AST-зависимости.'
    },
    'landing.hero_btn_join': {
        'en': 'Join for free', 'vi': 'Tham gia miễn phí', 'ja': '無料で始める', 'ko': '무료로 시작하기', 'zh': '免费加入',
        'es': 'Únete gratis', 'fr': 'Rejoindre gratuitement', 'de': 'Kostenlos starten', 'hi': 'मुफ्त में जुड़ें', 'th': 'เข้าร่วมฟรี', 'it': 'Iscriviti gratis', 'ru': 'Присоединиться бесплатно'
    },
    'landing.hero_btn_watch': {
        'en': 'Watch how it works', 'vi': 'Xem cách hoạt động', 'ja': '仕組みを見る', 'ko': '작동 원리 보기', 'zh': '观看演示流程',
        'es': 'Mira cómo funciona', 'fr': 'Voir le fonctionnement', 'de': 'So funktioniert es', 'hi': 'देखें यह कैसे काम करता है', 'th': 'ดูวิธีการทำงาน', 'it': 'Guarda come funziona', 'ru': 'Посмотреть как это работает'
    },
    'landing.gradebook_title': {
        'en': 'Architecture Management', 'vi': 'Quản lý Kiến trúc', 'ja': 'アーキテクチャ管理', 'ko': '아키텍처 관리', 'zh': '架构管理',
        'es': 'Gestión de Arquitectura', 'fr': 'Gestion d’Architecture', 'de': 'Architektur-Management', 'hi': 'आर्किटेक्चर प्रबंधन', 'th': 'การจัดการสถาปัตยกรรม', 'it': 'Gestione Architettura', 'ru': 'Управление архитектурой'
    },
    'landing.gradebook_highlight': {
        'en': 'Tools for Engineering Teams', 'vi': 'Công cụ cho Đội ngũ Kỹ thuật', 'ja': '開発チーム向けツール', 'ko': '엔지니어링 팀을 위한 도구', 'zh': '工程团队专属工具',
        'es': 'Herramientas para Equipos', 'fr': 'Outils pour Équipes', 'de': 'Tools für Entwicklerteams', 'hi': 'इंजीनियरिंग टीमों के लिए उपकरण', 'th': 'เครื่องมือสำหรับทีมวิศวกร', 'it': 'Strumenti per i Team', 'ru': 'Инструменты для команд'
    },
    'landing.gradebook_desc': {
        'en': 'ScopeGraph provides tools to inspect repository health, track blast radius trends, and manage CI/CD agent policies in real-time.',
        'vi': 'ScopeGraph cung cấp công cụ kiểm tra sức khỏe kho mã, theo dõi xu hướng bán kính ảnh hưởng và quản lý chính sách AI agent CI/CD theo thời gian thực.',
        'ja': 'ScopeGraphはリポジトリの健全性を検査し、影響範囲の傾向を追跡し、CI/CDエージェントポリシーをリアルタイムで管理するツールを提供します。',
        'ko': 'ScopeGraph는 저장소 상태를 점검하고 영향 반경 추세를 추적하며 CI/CD 에이전트 정책을 실시간으로 관리하는 도구를 제공합니다.',
        'zh': 'ScopeGraph 提供用于检查仓库健康状况、跟踪影响半径趋势并实时管理 CI/CD 智能体策略的工具。',
        'es': 'ScopeGraph proporciona herramientas para inspeccionar la salud del repositorio y gestionar políticas de agentes CI/CD en tiempo real.',
        'fr': 'ScopeGraph fournit des outils pour inspecter l’état du dépôt et gérer les politiques d’agents CI/CD en temps réel.',
        'de': 'ScopeGraph bietet Tools zur Überprüfung der Repository-Integrität und Echtzeitverwaltung von CI/CD-Agenten-Richtlinien.',
        'hi': 'ScopeGraph रिपॉजिटरी स्वास्थ्य का निरीक्षण करने और वास्तविक समय में CI/CD एजेंट नीतियों का प्रबंधन करने के लिए उपकरण प्रदान करता है।',
        'th': 'ScopeGraph มีเครื่องมือสำหรับตรวจสอบสุขภาพของที่เก็บโค้ดและจัดการนโยบายเอเจนต์ CI/CD แบบเรียลไทม์',
        'it': 'ScopeGraph fornisce strumenti per monitorare la salute dei repository e gestire le policy degli agenti CI/CD in tempo reale.',
        'ru': 'ScopeGraph предоставляет инструменты для проверки репозитория и управления политиками CI/CD-агентов в реальном времени.'
    },
    'landing.discussion_title': {
        'en': 'One-on-One', 'vi': 'Tương tác Trực tiếp', 'ja': '1対1の', 'ko': '1:1 실시간', 'zh': '一对一直连',
        'es': 'Interacción Directa', 'fr': 'Tête-à-tête', 'de': 'Direkte 1-zu-1', 'hi': 'आमने-सामने', 'th': 'การเชื่อมต่อโดยตรง', 'it': 'Diretto One-to-One', 'ru': 'Прямое 1-на-1'
    },
    'landing.discussion_highlight': {
        'en': 'FastMCP Agent Streaming', 'vi': 'Luồng Tác nhân FastMCP', 'ja': 'FastMCPエージェント連携', 'ko': 'FastMCP 에이전트 스트리밍', 'zh': 'FastMCP 智能体串流',
        'es': 'Streaming de Agente FastMCP', 'fr': 'Streaming d’Agent FastMCP', 'de': 'FastMCP-Agenten-Streaming', 'hi': 'FastMCP एजेंट स्ट्रीमिंग', 'th': 'สตรีมมิ่งเอเจนต์ FastMCP', 'it': 'Streaming Agenti FastMCP', 'ru': 'FastMCP стриминг агентов'
    },
    'landing.discussion_desc': {
        'en': 'AI coding agents (Claude Code, Cursor, Codex) connect directly via Model Context Protocol (MCP) to retrieve source-grounded context and verify changes without leaving their terminal.',
        'vi': 'Các AI coding agent (Claude Code, Cursor, Codex) kết nối trực tiếp qua Giao thức Model Context Protocol (MCP) để lấy ngữ cảnh xác thực từ nguồn mà không cần rời khỏi terminal.',
        'ja': 'AIコーディングエージェント（Claude Code、Cursor、Codex）がModel Context Protocol（MCP）経由で直接接続し、ターミナルから離れることなく正確なコンテキストを取得します。',
        'ko': 'AI 코딩 에이전트(Claude Code, Cursor, Codex)가 MCP(Model Context Protocol)를 통해 직접 연결되어 터미널을 벗어나지 않고도 정확한 컨텍스트를 검색합니다.',
        'zh': 'AI 编码智能体（Claude Code、Cursor、Codex）通过模型上下文协议（MCP）直接连接，无需离开终端即可检索扎根源码的上下文。',
        'es': 'Los agentes de IA (Claude Code, Cursor, Codex) se conectan directamente a través de MCP para obtener contexto validado sin salir de la terminal.',
        'fr': 'Les agents de code IA (Claude Code, Cursor, Codex) se connectent directement via MCP pour récupérer le contexte validé sans quitter le terminal.',
        'de': 'KI-Coding-Agenten (Claude Code, Cursor, Codex) verbinden sich direkt über MCP, um fundierten Kontext abzurufen, ohne das Terminal zu verlassen.',
        'hi': 'एआई कोडिंग एजेंट सीधे MCP के माध्यम से कनेक्ट होकर टर्मिनल छोड़े बिना संदर्भ प्राप्त करते हैं।',
        'th': 'เอเจนต์โค้ดดิ้ง AI (Claude Code, Cursor, Codex) เชื่อมต่อโดยตรงผ่าน MCP เพื่อรับบริบทที่ตรวจสอบแล้วโดยไม่ต้องออกจากเทอร์มินัล',
        'it': 'Gli agenti IA (Claude Code, Cursor, Codex) si connettono direttamente via MCP per recuperare contesto validato senza lasciare il terminale.',
        'ru': 'AI-агенты (Claude Code, Cursor, Codex) подключаются напрямую через MCP для получения верифицированного контекста не покидая терминал.'
    },
    'landing.btn_see_more': {
        'en': 'See more features', 'vi': 'Xem thêm tính năng', 'ja': 'すべての機能を見る', 'ko': '더 많은 기능 보기', 'zh': '查看更多功能',
        'es': 'Ver más características', 'fr': 'Voir plus de fonctionnalités', 'de': 'Mehr Funktionen anzeigen', 'hi': 'अधिक सुविधाएं देखें', 'th': 'ดูคุณสมบัติเพิ่มเติม', 'it': 'Vedi altre funzionalità', 'ru': 'Смотреть все возможности'
    },
    'landing.integrations_badge': {
        'en': 'INTEGRATIONS', 'vi': 'TÍCH HỢP', 'ja': '連携機能', 'ko': '통합 연동', 'zh': '生态集成',
        'es': 'INTEGRACIONES', 'fr': 'INTÉGRATIONS', 'de': 'INTEGRATIONEN', 'hi': 'एकीकरण', 'th': 'การรวมระบบ', 'it': 'INTEGRAZIONI', 'ru': 'ИНТЕГРАЦИИ'
    },
    'landing.integrations_title': {
        'en': '10+ developer tools and AI platform', 'vi': 'Hơn 10 công cụ lập trình và nền tảng AI', 'ja': '10以上の開発ツールとAIプラットフォーム', 'ko': '10개 이상의 개발 도구 및 AI 플랫폼', 'zh': '10+ 开发者工具与 AI 平台',
        'es': '10+ herramientas y plataformas de IA', 'fr': '10+ outils et plateformes IA', 'de': '10+ Entwickler-Tools und KI-Plattformen', 'hi': '10+ डेवलपर उपकरण और एआई प्लेटफॉर्म', 'th': '10+ เครื่องมือสำหรับนักพัฒนาและแพลตฟอร์ม AI', 'it': '10+ strumenti per sviluppatori e piattaforme AI', 'ru': '10+ инструментов и платформ ИИ'
    },
    'landing.integrations_highlight': {
        'en': 'integrations', 'vi': 'được tích hợp sẵn', 'ja': 'とシームレス連携', 'ko': '연동 지원', 'zh': '无缝集成',
        'es': 'integraciones', 'fr': 'intégrations', 'de': 'Integrationen', 'hi': 'एकीकरण', 'th': 'ผสานการทำงาน', 'it': 'integrazioni', 'ru': 'интеграции'
    },
    'landing.integrations_desc': {
        'en': 'ScopeGraph comes pre-integrated with GitHub, Claude Code, Cursor, Meta Model API, Modal, Baseten, and continuous integration pipelines.',
        'vi': 'ScopeGraph tích hợp sẵn với GitHub, Claude Code, Cursor, Meta Model API, Modal, Baseten và các pipeline CI/CD kiểm thử tự động.',
        'ja': 'ScopeGraphはGitHub、Claude Code、Cursor、Meta Model API、Modal、Baseten、およびCI/CDパイプラインと事前統合されています。',
        'ko': 'ScopeGraph는 GitHub, Claude Code, Cursor, Meta Model API, Modal, Baseten 및 CI/CD 파이프라인과 사전 통합되어 제공됩니다.',
        'zh': 'ScopeGraph 预集成了 GitHub、Claude Code、Cursor、Meta Model API、Modal、Baseten 以及持续集成流水线。',
        'es': 'ScopeGraph viene preintegrado con GitHub, Claude Code, Cursor, Meta Model API, Modal, Baseten y pipelines de CI/CD.',
        'fr': 'ScopeGraph est pré-intégré avec GitHub, Claude Code, Cursor, Meta Model API, Modal, Baseten et les pipelines CI/CD.',
        'de': 'ScopeGraph ist vorintegriert mit GitHub, Claude Code, Cursor, Meta Model API, Modal, Baseten und CI/CD-Pipelines.',
        'hi': 'ScopeGraph GitHub, Claude Code, Cursor, Meta Model API, Modal, Baseten और CI/CD पाइपलाइनों के साथ प्री-इंटीग्रेटेड आता है।',
        'th': 'ScopeGraph มาพร้อมกับการรวมเข้ากับ GitHub, Claude Code, Cursor, Meta Model API, Modal, Baseten และ CI/CD ล่วงหน้า',
        'it': 'ScopeGraph è preintegrato con GitHub, Claude Code, Cursor, Meta Model API, Modal, Baseten e pipeline CI/CD.',
        'ru': 'ScopeGraph предварительно интегрирован с GitHub, Claude Code, Cursor, Meta Model API, Modal, Baseten и CI/CD.'
    },
    'landing.integrations_btn': {
        'en': 'See All Integrations', 'vi': 'Xem tất cả tích hợp', 'ja': 'すべての連携を見る', 'ko': '모든 연동 보기', 'zh': '查看全部集成',
        'es': 'Ver todas las integraciones', 'fr': 'Voir toutes les intégrations', 'de': 'Alle Integrationen anzeigen', 'hi': 'सभी एकीकरण देखें', 'th': 'ดูการเชื่อมต่อทั้งหมด', 'it': 'Vedi tutte le integrazioni', 'ru': 'Все интеграции'
    },
    'landing.testimonial_badge': {
        'en': 'TESTIMONIAL', 'vi': 'ĐÁNH GIÁ', 'ja': '導入実績', 'ko': '사용자 후기', 'zh': '客户好评',
        'es': 'TESTIMONIOS', 'fr': 'TÉMOIGNAGES', 'de': 'TESTIMONIALS', 'hi': 'प्रशंसापत्र', 'th': 'เสียงตอบรับ', 'it': 'TESTIMONIANZE', 'ru': 'ОТЗЫВЫ'
    },
    'landing.testimonial_title': {
        'en': 'What They Say?', 'vi': 'Khách hàng Nói gì?', 'ja': 'ユーザーの声', 'ko': '사용자들의 평가', 'zh': '用户怎么说？',
        'es': '¿Qué opinan de nosotros?', 'fr': 'Que disent-ils ?', 'de': 'Was unsere Nutzer sagen', 'hi': 'वे क्या कहते हैं?', 'th': 'พวกเขาพูดว่าอย่างไร?', 'it': 'Cosa dicono di noi?', 'ru': 'Что о нас говорят?'
    },
    'landing.testimonial_desc1': {
        'en': 'ScopeGraph has received enthusiastic praise from developers and AI architects around the world.',
        'vi': 'ScopeGraph nhận được sự đánh giá cao từ các nhà phát triển và kiến trúc sư AI trên toàn cầu.',
        'ja': 'ScopeGraphは世界中の開発者やAIアーキテクトから高い評価を獲得しています。',
        'ko': 'ScopeGraph는 전 세계의 개발자와 AI 아키텍트로부터 열렬한 찬사를 받았습니다.',
        'zh': 'ScopeGraph 获得了来自全球软件工程师和 AI 架构师的高度赞誉。',
        'es': 'ScopeGraph ha recibido elogios entusiastas de desarrolladores y arquitectos de IA de todo el mundo.',
        'fr': 'ScopeGraph a reçu des éloges enthousiastes de développeurs et d’architectes IA du monde entier.',
        'de': 'ScopeGraph erhält begeisterte Bewertungen von Entwicklern und KI-Architekten weltweit.',
        'hi': 'ScopeGraph ने दुनिया भर के डेवलपर्स और एआई आर्किटेक्ट्स से प्रशंसा प्राप्त की है।',
        'th': 'ScopeGraph ได้รับการชื่นชมอย่างล้นหลามจากนักพัฒนาและสถาปนิก AI ทั่วโลก',
        'it': 'ScopeGraph ha ricevuto recensioni entusiastiche da sviluppatori e architetti AI di tutto il mondo.',
        'ru': 'ScopeGraph получил восторженные отзывы от инженеров и AI-архитекторов со всего мира.'
    },
    'landing.testimonial_desc2': {
        'en': 'Teams eliminated hallucinated edits and broken database migrations before code ever hit production.',
        'vi': 'Các đội ngũ kỹ thuật đã loại bỏ hoàn toàn các chỉnh sửa ảo giác và lỗi migration cơ sở dữ liệu trước khi đưa lên production.',
        'ja': '本番環境にデプロイされる前に、コードの幻覚や壊れたデータベースマイグレーションを完全に防ぐことができます。',
        'ko': '팀들은 코드가 배포되기 전에 환각된 수정과 손상된 데이터베이스 마이그레이션을 완벽히 제거했습니다.',
        'zh': '团队在代码上线之前彻底消除了虚假代码修改以及下游破坏性的数据库迁移。',
        'es': 'Los equipos eliminaron modificaciones alucinadas y migraciones de bases de datos rotas antes de llegar a producción.',
        'fr': 'Les équipes ont éliminé les modifications hallucinées et les migrations cassées avant la mise en production.',
        'de': 'Teams konnten halluzinierte Änderungen und fehlerhafte Datenbankmigrationen vor dem Rollout verhindern.',
        'hi': 'टीमों ने उत्पादन में जाने से पहले अप्रमाणित परिवर्तनों और टूटे हुए माइग्रेशन को समाप्त कर दिया।',
        'th': 'ทีมต่างๆ ขจัดโค้ดที่สร้างขึ้นเองโดยไม่มีหลักฐานและการไมเกรตฐานข้อมูลที่เสียหายก่อนขึ้นโปรดักชัน',
        'it': 'I team hanno eliminato modifiche allucinate e migrazioni di database errate prima del rilascio in produzione.',
        'ru': 'Команды устранили галлюцинации и поломки миграций базы данных до релиза в продакшн.'
    },
    'landing.testimonial_desc3': {
        'en': 'Are you ready too? Explore the interactive graph and see the blast radius firsthand.',
        'vi': 'Bạn đã sẵn sàng chưa? Trải nghiệm đồ thị tương tác để trực tiếp nhìn thấy bán kính ảnh hưởng.',
        'ja': '準備はできましたか？インタラクティブなグラフを探索し、影響範囲を直接確認してください。',
        'ko': '준비되셨나요? 대화형 그래프를 탐색하고 변경 영향 범위를 직접 확인해보세요.',
        'zh': '准备好了吗？立即探索交互式依赖图，亲身体验精准的影响半径分析。',
        'es': '¿Estás listo tú también? Explora el grafo interactivo y comprueba el radio de impacto de primera mano.',
        'fr': 'Êtes-vous prêt aussi ? Explorez le graphe interactif et observez directement le rayon d’impact.',
        'de': 'Sind Sie auch bereit? Erkunden Sie den interaktiven Graphen und erleben Sie den Explosionsradius live.',
        'hi': 'क्या आप भी तैयार हैं? इंटरैक्टिव ग्राफ़ देखें और प्रभाव का प्रत्यक्ष अनुभव करें।',
        'th': 'คุณพร้อมหรือยัง? สำรวจกราฟเชิงโต้ตอบและสัมผัสรัศมีผลกระทบด้วยตัวคุณเอง',
        'it': 'Sei pronto anche tu? Esplora il grafo interattivo e scopri di persona il raggio d’impatto.',
        'ru': 'Готовы начать? Изучите интерактивный граф и оцените радиус воздействия лично.'
    },
    'landing.testimonial_btn': {
        'en': 'Write your assessment', 'vi': 'Viết nhận xét của bạn', 'ja': 'レビューを書く', 'ko': '사용 후기 남기기', 'zh': '提交使用反馈',
        'es': 'Escribe tu valoración', 'fr': 'Donnez votre avis', 'de': 'Bewertung abgeben', 'hi': 'अपनी समीक्षा लिखें', 'th': 'เขียนการประเมินของคุณ', 'it': 'Scrivi la tua recensione', 'ru': 'Оставить отзыв'
    },
    'landing.news_title': {
        'en': 'Latest News and Resources', 'vi': 'Tin tức và Tài nguyên Mới nhất', 'ja': '最新ニュースとリソース', 'ko': '최신 뉴스 및 리소스', 'zh': '最新资讯与技术动态',
        'es': 'Últimas Noticias y Recursos', 'fr': 'Dernières Nouvelles & Ressources', 'de': 'Neueste Nachrichten & Ressourcen', 'hi': 'नवीनतम समाचार और संसाधन', 'th': 'ข่าวสารและแหล่งข้อมูลล่าสุด', 'it': 'Ultime Notizie e Risorse', 'ru': 'Новости и ресурсы'
    },
    'landing.news_desc': {
        'en': 'See the developments that have occurred to ScopeGraph and code intelligence',
        'vi': 'Khám phá những bước tiến mới trong công nghệ phân tích tác động mã nguồn và AI ScopeGraph',
        'ja': 'ScopeGraphとコードインテリジェンスの最新の進化をご覧ください',
        'ko': 'ScopeGraph와 코드 인텔리전스의 최신 발전 현황을 살펴보세요',
        'zh': '了解 ScopeGraph 与代码智能领域取得的最新突破与发展',
        'es': 'Descubre las novedades en ScopeGraph y el análisis inteligente de código',
        'fr': 'Découvrez les avancées récentes de ScopeGraph et de l’intelligence de code',
        'de': 'Erfahren Sie mehr über die neuesten Entwicklungen bei ScopeGraph und Code-Intelligence',
        'hi': 'ScopeGraph और कोड इंटेलिजेंस में हुए नवीनतम विकास देखें',
        'th': 'ดูความคืบหน้าที่เกิดขึ้นกับ ScopeGraph และระบบวิเคราะห์โค้ดอัจฉริยะ',
        'it': 'Scopri gli ultimi sviluppi di ScopeGraph e dell’analisi intelligente del codice',
        'ru': 'Следите за обновлениями ScopeGraph и технологиями интеллектуального анализа кода'
    },
    'landing.news_badge_news': {
        'en': 'NEWS', 'vi': 'TIN MỚI', 'ja': 'ニュース', 'ko': '뉴스', 'zh': '新闻',
        'es': 'NOTICIAS', 'fr': 'ACTUALITÉS', 'de': 'NEWS', 'hi': 'समाचार', 'th': 'ข่าว', 'it': 'NOTIZIE', 'ru': 'НОВОСТИ'
    },
    'landing.news_badge_press': {
        'en': 'PRESS RELEASE', 'vi': 'THÔNG CÁO BÁO CHÍ', 'ja': 'プレスリリース', 'ko': '보도자료', 'zh': '官方通告',
        'es': 'COMUNICADO DE PRENSA', 'fr': 'COMMUNIQUÉ DE PRESSE', 'de': 'PRESSEMITTEILUNG', 'hi': 'प्रेस विज्ञप्ति', 'th': 'ข่าวประชาสัมพันธ์', 'it': 'COMUNICATO STAMPA', 'ru': 'ПРЕСС-РЕЛИЗ'
    },
    'landing.news_card1_title': {
        'en': 'ScopeGraph achieves zero-hallucination blast radius verification in Meta Hackathon 2026',
        'vi': 'ScopeGraph đạt chuẩn xác minh bán kính ảnh hưởng không ảo giác tại Meta Hackathon 2026',
        'ja': 'ScopeGraphがMeta Hackathon 2026で幻覚ゼロの影響範囲検証を達成',
        'ko': 'ScopeGraph, Meta Hackathon 2026에서 환각 없는 영향 반경 검증 달성',
        'zh': 'ScopeGraph 在 Meta Hackathon 2026 中实现零幻觉影响范围验证',
        'es': 'ScopeGraph logra verificación de radio de impacto con cero alucinaciones en Meta Hackathon 2026',
        'fr': 'ScopeGraph réussit la vérification d’impact sans hallucination au Meta Hackathon 2026',
        'de': 'ScopeGraph erreicht null-Halluzinationen-Verifikation beim Meta Hackathon 2026',
        'hi': 'ScopeGraph ने Meta Hackathon 2026 में शून्य-भ्रांति प्रभाव सत्यापन हासिल किया',
        'th': 'ScopeGraph ประสบความสำเร็จในการตรวจสอบรัศมีผลกระทบแบบไร้ภาพหลอนใน Meta Hackathon 2026',
        'it': 'ScopeGraph ottiene la verifica del raggio d’impatto a zero allucinazioni al Meta Hackathon 2026',
        'ru': 'ScopeGraph достиг нулевого уровня галлюцинаций при анализе кода на Meta Hackathon 2026'
    },
    'landing.news_card1_desc': {
        'en': 'By combining deterministic AST parsing with the anti-hallucination evidence gate, ScopeGraph guarantees every claim is grounded in real code...',
        'vi': 'Bằng việc kết hợp phân tích AST tất định với cổng kiểm chứng bằng chứng, ScopeGraph đảm bảo mọi nhận định đều dựa trên mã nguồn thực tế...',
        'ja': '決定論的AST解析と証拠検証ゲートを組み合わせることで、すべての主張が実際のコードに基づいていることを保証します...',
        'ko': '결정론적 AST 파싱과 증거 검증 게이트를 결합하여 모든 분석 결과가 실제 코드에 기반함을 보장합니다...',
        'zh': '通过将确定性 AST 解析与防幻觉证据门控相结合，ScopeGraph 确保每一项判断均扎根于真实源码...',
        'es': 'Al combinar el análisis AST determinista con la puerta de validación, ScopeGraph garantiza que cada afirmación se basa en código real...',
        'fr': 'En combinant l’analyse AST déterministe avec la porte de preuves, ScopeGraph garantit que chaque assertion repose sur le code réel...',
        'de': 'Durch die Kombination von deterministischem AST-Parsing mit dem Evidenz-Gate stellt ScopeGraph sicher, dass jede Aussage auf echtem Code basiert...',
        'hi': 'सख्त साक्ष्य सत्यापन के साथ AST पार्सिंग को मिलाकर, ScopeGraph वास्तविक कोड पर आधारित विश्लेषण सुनिश्चित करता है...',
        'th': 'ด้วยการรวมการแยกวิเคราะห์ AST ที่แน่นอนเข้ากับเกตตรวจสอบหลักฐาน ScopeGraph รับประกันว่าข้ออ้างอิงทั้งหมดอิงตามโค้ดจริง...',
        'it': 'Combinando il parsing AST deterministico con il gateway di verifica, ScopeGraph garantisce che ogni asserzione si basi su codice reale...',
        'ru': 'Сочетая детерминированный AST-парсинг с гейтом проверки доказательств, ScopeGraph гарантирует опору на реальный код...'
    },
    'landing.news_card2_title': {
        'en': 'Multi-AI Orchestration: Routing between Meta Model API, Modal, and Baseten Vision',
        'vi': 'Điều phối Đa-AI: Định tuyến thông minh giữa Meta Model API, Modal và Baseten Vision',
        'ja': 'マルチAIオーケストレーション：Meta Model API、Modal、Baseten Visionの協調ルーティング',
        'ko': '멀티 AI 오케스트레이션: Meta Model API, Modal, Baseten Vision 간 스마트 라우팅',
        'zh': '多模型编排：Meta Model API、Modal 与 Baseten Vision 间的智能协同',
        'es': 'Orquestación Multi-IA: Enrutamiento entre Meta Model API, Modal y Baseten Vision',
        'fr': 'Orchestration Multi-IA : Routage entre Meta Model API, Modal et Baseten Vision',
        'de': 'Multi-KI-Orchestrierung: Routing zwischen Meta Model API, Modal und Baseten Vision',
        'hi': 'मल्टी-एआई ऑर्केस्ट्रेशन: Meta Model API, Modal और Baseten Vision के बीच स्मार्ट रूटिंग',
        'th': 'การประสานงานหลาย AI: การกำหนดเส้นทางระหว่าง Meta Model API, Modal และ Baseten Vision',
        'it': 'Orchestrazione Multi-AI: Routing tra Meta Model API, Modal e Baseten Vision',
        'ru': 'Мульти-ИИ оркестрация: маршрутизация между Meta Model API, Modal и Baseten Vision'
    },
    'landing.news_card2_desc': {
        'en': 'How tiered AI inference delivers sub-second blast radius reasoning without context bloating or hallucinated modifications...',
        'vi': 'Cách suy luận AI phân tầng mang lại khả năng phân tích bán kính ảnh hưởng dưới 1 giây mà không làm phình context hay sinh lỗi ảo giác...',
        'ja': '階層化された推論がコンテキストの肥大化やコード改変の幻覚を防ぎ、1秒未満の影響分析を実現する方法...',
        'ko': '계층화된 AI 추론을 통해 컨텍스트 낭비나 환각 수정 없이 1초 미만의 영향 분석을 제공하는 방법...',
        'zh': '分层 AI 推理如何在不膨胀上下文或产生代码幻觉的前提下提供亚秒级影响范围推断...',
        'es': 'Cómo la inferencia por capas ofrece razonamiento en menos de un segundo sin saturar el contexto...',
        'fr': 'Comment l’inférence IA par niveaux offre un raisonnement sous la seconde sans saturer le contexte...',
        'de': 'Wie gestaffelte KI-Inferenz sekundenschnelle Analysen ohne Kontextüberlastung ermöglicht...',
        'hi': 'कैसे स्तरित एआई अनुमान संदर्भ को बढ़ाए बिना त्वरित प्रभाव विश्लेषण प्रदान करता है...',
        'th': 'วิธีที่การอนุมาน AI แบบหลายระดับช่วยให้การวิเคราะห์ผลกระทบเร็วระดับเสี้ยววินาทีโดยไม่ทำให้บริบทบวม...',
        'it': 'Come l’inferenza a livelli fornisce ragionamenti rapidi senza sovraccaricare il contesto...',
        'ru': 'Как многоуровневый вывод ИИ обеспечивает мгновенный анализ без раздувания контекста...'
    },
    'landing.news_card3_title': {
        'en': 'Why AI Coding Agents Need Deterministic Code Graphs Instead of Full Codebase Dumps',
        'vi': 'Tại sao AI Coding Agent cần Đồ thị Mã nguồn Tất định thay vì nhồi nhét Toàn bộ Codebase',
        'ja': 'AIコーディングエージェントにコードベース全体のダンプではなく決定論的グラフが必要な理由',
        'ko': 'AI 코딩 에이전트에게 전체 코드베이스 덤프 대신 결정론적 코드 그래프가 필요한 이유',
        'zh': '为什么 AI 编码智能体需要确定性代码图谱而非囫囵吞入整个代码库',
        'es': 'Por qué los agentes de IA necesitan grafos de código deterministas en vez de volcados completos',
        'fr': 'Pourquoi les agents de code IA ont besoin de graphes de code plutôt que de dumps complets',
        'de': 'Warum KI-Coding-Agenten deterministische Code-Graphen statt vollständiger Codebase-Dumps benötigen',
        'hi': 'एआई कोडिंग एजेंटों को पूरे कोडबेस डंप के बजाय कोड ग्राफ़ की आवश्यकता क्यों है',
        'th': 'ทำไมเอเจนต์ AI โค้ดดิ้งถึงต้องการกราฟโค้ดที่แน่นอนแทนการดัมพ์โค้ดทั้งหมด',
        'it': 'Perché gli agenti IA hanno bisogno di grafi di codice deterministici anziché dump completi',
        'ru': 'Почему AI-агентам нужны детерминированные графы зависимостей, а не дампы всего репозитория'
    },
    'landing.news_card3_desc': {
        'en': 'Context windows are limited and expensive. ScopeGraph MCP tools provide exact call graphs and line snippets on demand...',
        'vi': 'Context window có giới hạn và tốn kém. Công cụ FastMCP của ScopeGraph cung cấp chính xác cây gọi hàm và dòng code theo yêu cầu...',
        'ja': 'コンテキストウィンドウは有限かつ高コストです。ScopeGraphのMCPツールは要求に応じて正確なコールグラフを提供します...',
        'ko': '컨텍스트 윈도우는 제한적이고 비용이 듭니다. ScopeGraph의 MCP 도구는 필요할 때 정확한 호출 그래프와 라인 정보를 제공합니다...',
        'zh': '上下文窗口受限且昂贵。ScopeGraph 的 MCP 工具按需提供精确的调用链路与行号代码片段...',
        'es': 'Las ventanas de contexto son limitadas y costosas. Las herramientas MCP de ScopeGraph ofrecen grafos exactos y líneas de código...',
        'fr': 'Les fenêtres de contexte sont limitées. Les outils MCP de ScopeGraph fournissent des graphes d’appels précis à la demande...',
        'de': 'Kontextfenster sind begrenzt. ScopeGraph MCP-Tools liefern exakte Aufruf-Graphen und Zeilenschnipsel nach Bedarf...',
        'hi': 'संदर्भ विंडो सीमित और महंगी हैं। ScopeGraph MCP उपकरण मांग पर सटीक कॉल ग्राफ़ प्रदान करते हैं...',
        'th': 'หน้าต่างบริบทมีจำกัดและมีค่าใช้จ่ายสูง เครื่องมือ MCP ของ ScopeGraph นำเสนอกราฟการเรียกใช้โค้ดที่แน่นอนตามต้องการ...',
        'it': 'Le finestre di contesto sono limitate. Gli strumenti MCP di ScopeGraph forniscono grafi di chiamata esatti e snippet...',
        'ru': 'Окна контекста ограничены. MCP-инструменты ScopeGraph по запросу отдают точные графы вызовов и сниппеты...'
    },
    'landing.news_card4_title': {
        'en': 'Alembic & SQLAlchemy Schema Impact Detection for Zero-Downtime Releases',
        'vi': 'Phát hiện Tác động Schema Alembic & SQLAlchemy cho các Bản phát hành Zero-Downtime',
        'ja': 'ダウンタイムゼロのリリースのためのAlembic＆SQLAlchemyスキーマ影響検知',
        'ko': '무중단 배포를 위한 Alembic 및 SQLAlchemy 스키마 영향 감지',
        'zh': '用于零停机发布的 Alembic 与 SQLAlchemy 架构变更影响检测',
        'es': 'Detección de impacto en esquemas Alembic y SQLAlchemy para despliegues sin tiempo de inactividad',
        'fr': 'Détection d’impact de schéma Alembic & SQLAlchemy pour des déploiements sans interruption',
        'de': 'Alembic & SQLAlchemy Schema-Impact-Erkennung für Ausfallzeit-freie Releases',
        'hi': 'शून्य-डाउनटाइम रिलीज़ के लिए Alembic और SQLAlchemy स्कीमा प्रभाव का पता लगाना',
        'th': 'การตรวจจับผลกระทบสคีมา Alembic & SQLAlchemy สำหรับการเปิดตัวโดยไม่มีดาวน์ไทม์',
        'it': 'Rilevamento dell’impatto dello schema Alembic e SQLAlchemy per rilasci senza downtime',
        'ru': 'Обнаружение изменений схемы Alembic и SQLAlchemy для релизов без простоя'
    },
    'landing.news_card4_desc': {
        'en': 'Catch missing migrations and downstream model alterations before committing to production databases...',
        'vi': 'Phát hiện thiếu sót migration và các thay đổi model dây chuyền trước khi commit vào cơ sở dữ liệu production...',
        'ja': '本番データベースにコミットする前に、不足しているマイグレーションと影響を受けるモデルを捕捉します...',
        'ko': '프로덕션 데이터베이스에 적용하기 전에 누락된 마이그레이션과 하위 모델 변경 사항을 미리 감지합니다...',
        'zh': '在提交至生产环境数据库之前，提前发现遗漏的迁移脚本和下游关联模型的意外变动...',
        'es': 'Detecta migraciones faltantes y alteraciones de modelos derivados antes de confirmar en bases de datos de producción...',
        'fr': 'Détectez les migrations manquantes et les altérations de modèles en aval avant de valider en production...',
        'de': 'Erkennen Sie fehlende Migrationen und nachgelagerte Modelländerungen vor dem Einspielen in Produktionsdatenbanken...',
        'hi': 'उत्पादन डेटाबेस में कमिट करने से पहले छूटे हुए माइग्रेशन और मॉडल परिवर्तनों को पकड़ें...',
        'th': 'ตรวจจับการไมเกรตที่ขาดหายไปและการเปลี่ยนแปลงโมเดลปลายน้ำก่อนคอมมิตลงฐานข้อมูลโปรดักชัน...',
        'it': 'Individua migrazioni mancanti e modifiche ai modelli correlati prima di applicarli ai database di produzione...',
        'ru': 'Выявляйте пропущенные миграции и изменения моделей до их применения в продакшн...'
    },
    'landing.news_read_more': {
        'en': 'Read more', 'vi': 'Đọc thêm', 'ja': '続きを読む', 'ko': '더 읽어보기', 'zh': '阅读全文',
        'es': 'Leer más', 'fr': 'Lire la suite', 'de': 'Weiterlesen', 'hi': 'और पढ़ें', 'th': 'อ่านต่อ', 'it': 'Leggi di più', 'ru': 'Читать далее'
    },
    'landing.footer_tagline': {
        'en': 'Virtual Code Intelligence & Blast Radius Platform',
        'vi': 'Nền tảng Trí tuệ Mã nguồn & Phân tích Bán kính Ảnh hưởng Trực quan',
        'ja': 'コードインテリジェンスと影響範囲分析の仮想プラットフォーム',
        'ko': '가상 코드 인텔리전스 및 변경 영향 분석 플랫폼',
        'zh': '代码智能与变更爆炸半径分析平台',
        'es': 'Plataforma de Inteligencia de Código y Radio de Impacto',
        'fr': 'Plateforme d’Intelligence de Code et de Rayon d’Impact',
        'de': 'Plattform für Code-Intelligence und Explosionsradius-Analyse',
        'hi': 'कोड इंटेलिजेंस और ब्लास्ट रेडियस प्लेटफ़ॉर्म',
        'th': 'แพลตฟอร์มอัจฉริยะด้านโค้ดและการวิเคราะห์รัศมีผลกระทบ',
        'it': 'Piattaforma di Intelligenza del Codice e Raggio d’Impatto',
        'ru': 'Платформа анализа кода и оценки радиуса воздействия'
    },
    'landing.footer_subscribe_label': {
        'en': 'Subscribe to get our Architecture Newsletter',
        'vi': 'Đăng ký nhận Bản tin Kiến trúc & Kỹ thuật',
        'ja': 'アーキテクチャニュースレターの受信登録',
        'ko': '아키텍처 뉴스레터 구독하기',
        'zh': '订阅我们的系统架构资讯简报',
        'es': 'Suscríbete a nuestro boletín de arquitectura',
        'fr': 'Abonnez-vous à notre lettre d’information technique',
        'de': 'Abonnieren Sie unseren Architektur-Newsletter',
        'hi': 'हमारे आर्किटेक्चर न्यूज़लेटर की सदस्यता लें',
        'th': 'สมัครรับจดหมายข่าวสถาปัตยกรรมของเรา',
        'it': 'Iscriviti alla nostra newsletter sull’architettura',
        'ru': 'Подпишитесь на нашу рассылку по архитектуре ПО'
    },
    'landing.footer_email_placeholder': {
        'en': 'Your Email', 'vi': 'Email của bạn', 'ja': 'メールアドレス', 'ko': '이메일 주소', 'zh': '输入您的电子邮箱',
        'es': 'Tu correo electrónico', 'fr': 'Votre adresse e-mail', 'de': 'Ihre E-Mail-Adresse', 'hi': 'आपका ईमेल', 'th': 'อีเมลของคุณ', 'it': 'La tua email', 'ru': 'Ваш Email'
    },
    'landing.footer_subscribe_btn': {
        'en': 'Subscribe', 'vi': 'Đăng ký', 'ja': '購読する', 'ko': '구독', 'zh': '订阅',
        'es': 'Suscribirse', 'fr': "S'abonner", 'de': 'Abonnieren', 'hi': 'सब्सक्राइब', 'th': 'ติดตาม', 'it': 'Iscriviti', 'ru': 'Подписаться'
    },
    'landing.footer_careers': {
        'en': 'Documentation', 'vi': 'Tài liệu', 'ja': 'ドキュメント', 'ko': '문서', 'zh': '技术文档',
        'es': 'Documentación', 'fr': 'Documentation', 'de': 'Dokumentation', 'hi': 'दस्तावेज़ीकरण', 'th': 'เอกสาร', 'it': 'Documentazione', 'ru': 'Документация'
    },
    'landing.footer_privacy': {
        'en': 'Privacy', 'vi': 'Bảo mật', 'ja': 'プライバシー', 'ko': '개인정보처리방침', 'zh': '隐私政策',
        'es': 'Privacidad', 'fr': 'Confidentialité', 'de': 'Datenschutz', 'hi': 'गोपनीयता', 'th': 'ความเป็นส่วนตัว', 'it': 'Privacy', 'ru': 'Конфиденциальность'
    },
    'landing.footer_terms': {
        'en': 'Terms & Conditions', 'vi': 'Điều khoản & Điều kiện', 'ja': '利用規約', 'ko': '이용 약관', 'zh': '服务条款',
        'es': 'Términos y condiciones', 'fr': 'Conditions générales', 'de': 'AGB', 'hi': 'नियम और शर्तें', 'th': 'ข้อกำหนดและเงื่อนไข', 'it': 'Termini e condizioni', 'ru': 'Условия использования'
    },
    'landing.footer_copyright': {
        'en': '© 2026 ScopeGraph Inc. Built for Meta Hackathon 2026',
        'vi': '© 2026 ScopeGraph Inc. Xây dựng cho Meta Hackathon 2026',
        'ja': '© 2026 ScopeGraph Inc. Meta Hackathon 2026向けに開発',
        'ko': '© 2026 ScopeGraph Inc. Meta Hackathon 2026을 위해 개발됨',
        'zh': '© 2026 ScopeGraph Inc. 专为 Meta Hackathon 2026 打造',
        'es': '© 2026 ScopeGraph Inc. Desarrollado para Meta Hackathon 2026',
        'fr': '© 2026 ScopeGraph Inc. Conçu pour le Meta Hackathon 2026',
        'de': '© 2026 ScopeGraph Inc. Entwickelt für den Meta Hackathon 2026',
        'hi': '© 2026 ScopeGraph Inc. Meta Hackathon 2026 के लिए निर्मित',
        'th': '© 2026 ScopeGraph Inc. สร้างขึ้นสำหรับ Meta Hackathon 2026',
        'it': '© 2026 ScopeGraph Inc. Realizzato per Meta Hackathon 2026',
        'ru': '© 2026 ScopeGraph Inc. Разработано для Meta Hackathon 2026'
    },
    'landing.footer_code_by': {
        'en': 'Code By', 'vi': 'Phát triển bởi', 'ja': '開発：', 'ko': '개발자:', 'zh': '代码开发：',
        'es': 'Desarrollado por', 'fr': 'Développé par', 'de': 'Entwickelt von', 'hi': 'कोड द्वारा', 'th': 'พัฒนาโดย', 'it': 'Sviluppato da', 'ru': 'Разработка:'
    },
    'landing.footer_code_author': {
        'en': 'ScopeGraph Team', 'vi': 'Đội ngũ ScopeGraph', 'ja': 'ScopeGraph チーム', 'ko': 'ScopeGraph 팀', 'zh': 'ScopeGraph 团队',
        'es': 'Equipo ScopeGraph', 'fr': 'Équipe ScopeGraph', 'de': 'ScopeGraph-Team', 'hi': 'ScopeGraph टीम', 'th': 'ทีม ScopeGraph', 'it': 'Team ScopeGraph', 'ru': 'Команда ScopeGraph'
    },
    'landing.footer_ui_by': {
        'en': 'UI/UX By', 'vi': 'Thiết kế UI/UX bởi', 'ja': 'UI/UXデザイン：', 'ko': 'UI/UX 디자인:', 'zh': 'UI/UX 设计：',
        'es': 'UI/UX por', 'fr': 'UI/UX par', 'de': 'UI/UX von', 'hi': 'UI/UX द्वारा', 'th': 'ออกแบบ UI/UX โดย', 'it': 'UI/UX di', 'ru': 'UI/UX дизайн:'
    },
    'landing.footer_ui_author': {
        'en': 'Irvan Moses & Skilline Theme', 'vi': 'Irvan Moses & Bộ giao diện Skilline', 'ja': 'Irvan Moses & Skilline テーマ', 'ko': 'Irvan Moses & Skilline 테마', 'zh': 'Irvan Moses 与 Skilline 主题',
        'es': 'Irvan Moses y Tema Skilline', 'fr': 'Irvan Moses & Thème Skilline', 'de': 'Irvan Moses & Skilline Theme', 'hi': 'Irvan Moses और Skilline थीम', 'th': 'Irvan Moses และ ธีม Skilline', 'it': 'Irvan Moses & Tema Skilline', 'ru': 'Irvan Moses и тема Skilline'
    }
}

target_file = 'apps/web/src/context/LanguageContext.tsx'
with open(target_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Insert for each language dict in DICTIONARY
for lang in LANGUAGES:
    dict_pattern = rf'(^\s*{lang}:\s*\{{)([\s\S]*?)(^\s*\}},)'
    match = re.search(dict_pattern, content, re.MULTILINE)
    if not match:
        print(f"Failed to find dict for {lang}")
        continue
    
    dict_start = match.group(1)
    dict_body = match.group(2)
    dict_end = match.group(3)
    
    lines_to_add = []
    for key, trans in NEW_KEYS.items():
        if f"'{key}':" not in dict_body and f'"{key}":' not in dict_body:
            escaped_val = trans[lang].replace("'", "\\'")
            lines_to_add.append(f"    '{key}': '{escaped_val}',")
    
    if lines_to_add:
        new_dict_body = dict_body + "\n" + "\n".join(lines_to_add)
        new_block = dict_start + new_dict_body + "\n" + dict_end
        content = content[:match.start()] + new_block + content[match.end():]
        print(f"Added {len(lines_to_add)} keys to {lang}")
    else:
        print(f"All keys already present in {lang}")

with open(target_file, 'w', encoding='utf-8') as f:
    f.write(content)

print("Finished updating LanguageContext.tsx!")
