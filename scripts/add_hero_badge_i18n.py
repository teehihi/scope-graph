import re

LANGUAGES = ['en', 'vi', 'ja', 'ko', 'zh', 'es', 'fr', 'de', 'hi', 'th', 'it', 'ru']

HERO_BADGE_KEYS = {
    'landing.hero_badge_files': {
        'en': '14 Files Indexed', 'vi': '14 Tệp đã đánh chỉ mục', 'ja': '14ファイルをインデックス済', 'ko': '14개 파일 인덱싱 완료', 'zh': '已索引 14 个文件',
        'es': '14 Archivos Indexados', 'fr': '14 Fichiers Indexés', 'de': '14 Dateien Indexiert', 'hi': '14 फ़ाइलें अनुक्रमित', 'th': 'จัดทำดัชนีแล้ว 14 ไฟล์', 'it': '14 File Indicizzati', 'ru': '14 файлов проиндексировано'
    },
    'landing.hero_badge_files_sub': {
        'en': 'AST Dependency Graph', 'vi': 'Đồ thị Phụ thuộc AST', 'ja': 'AST依存関係グラフ', 'ko': 'AST 종속성 그래프', 'zh': 'AST 依赖关系图谱',
        'es': 'Grafo de Dependencias AST', 'fr': 'Graphe de Dépendances AST', 'de': 'AST-Abhängigkeitsgraph', 'hi': 'AST निर्भरता ग्राफ़', 'th': 'กราฟการพึ่งพา AST', 'it': 'Grafo di Dipendenze AST', 'ru': 'AST граф зависимостей'
    },
    'landing.hero_badge_scout': {
        'en': 'Scout AI Active', 'vi': 'Scout AI Hoạt động', 'ja': 'Scout AI 稼働中', 'ko': 'Scout AI 활성화', 'zh': 'Scout AI 运行中',
        'es': 'Scout IA Activo', 'fr': 'Scout IA Actif', 'de': 'Scout KI Aktiv', 'hi': 'Scout AI सक्रिय', 'th': 'Scout AI ใช้งานอยู่', 'it': 'Scout AI Attivo', 'ru': 'Scout AI активен'
    },
    'landing.hero_badge_scout_sub': {
        'en': 'Anti-Hallucination Gate', 'vi': 'Cổng Chống Ảo giác', 'ja': '幻覚防止ゲート', 'ko': '환각 방지 게이트', 'zh': '防幻觉校验门控',
        'es': 'Puerta Antialucinación', 'fr': 'Porte Anti-Hallucination', 'de': 'Anti-Halluzinations-Gate', 'hi': 'भ्रांति-रोधी गेट', 'th': 'เกตป้องกันภาพหลอน', 'it': 'Gate Anti-Allucinazione', 'ru': 'Гейт защиты от галлюцинаций'
    },
    'landing.hero_badge_blast': {
        'en': 'Blast Radius Analysis', 'vi': 'Phân tích Bán kính Ảnh hưởng', 'ja': '影響範囲（ブラスト半径）分析', 'ko': '영향 반경(Blast Radius) 분석', 'zh': '爆炸半径影响分析',
        'es': 'Análisis de Radio de Impacto', 'fr': 'Analyse du Rayon d’Impact', 'de': 'Explosionsradius-Analyse', 'hi': 'ब्लास्ट रेडियस विश्लेषण', 'th': 'การวิเคราะห์รัศมีผลกระทบ', 'it': 'Analisi del Raggio d’Impatto', 'ru': 'Анализ радиуса воздействия'
    },
    'landing.hero_badge_blast_detail': {
        'en': '2 Direct • 1 Indirect', 'vi': '2 Trực tiếp • 1 Gián tiếp', 'ja': '直接影響 2件 • 間接影響 1件', 'ko': '직접 영향 2개 • 간접 영향 1개', 'zh': '2 个直接影响 • 1 个间接关联',
        'es': '2 Directos • 1 Indirecto', 'fr': '2 Directs • 1 Indirect', 'de': '2 Direkt • 1 Indirekt', 'hi': '2 प्रत्यक्ष • 1 अप्रत्यक्ष', 'th': 'ตรง 2 รายการ • ทางอ้อม 1 รายการ', 'it': '2 Diretti • 1 Indiretto', 'ru': '2 прямых • 1 косвенное'
    },
    'landing.hero_badge_blast_action': {
        'en': 'Inspect Graph', 'vi': 'Khám phá Đồ thị', 'ja': 'グラフを確認', 'ko': '그래프 확인', 'zh': '查看图谱',
        'es': 'Inspeccionar Grafo', 'fr': 'Inspecter le Graphe', 'de': 'Graph Prüfen', 'hi': 'ग्राफ़ देखें', 'th': 'ตรวจสอบกราฟ', 'it': 'Ispeziona Grafo', 'ru': 'Открыть граф'
    },
    'landing.hero_badge_evidence': {
        'en': 'Zero Hallucinations', 'vi': 'Không Ảo giác Mã nguồn', 'ja': 'コード幻覚ゼロ保証', 'ko': '코드 환각 0% 검증', 'zh': '零代码幻觉保障',
        'es': 'Cero Alucinaciones', 'fr': 'Zéro Hallucination', 'de': 'Null Halluzinationen', 'hi': 'शून्य कोड भ्रांति', 'th': 'ไร้ภาพหลอนของโค้ด', 'it': 'Zero Allucinazioni', 'ru': 'Ноль галлюцинаций'
    },
    'landing.hero_badge_evidence_sub': {
        'en': '100% Grounded in AST Database', 'vi': '100% Xác thực từ Cơ sở dữ liệu AST', 'ja': 'ASTデータベースで100%検証済', 'ko': 'AST 데이터베이스에 100% 기반', 'zh': '100% 扎根于 AST 数据库',
        'es': '100% Basado en Base de Datos AST', 'fr': '100% Fondé sur la Base AST', 'de': '100% Verifiziert in AST-Datenbank', 'hi': 'AST डेटाबेस में 100% सत्यापित', 'th': 'อิงตามฐานข้อมูล AST 100%', 'it': '100% Verificato nel Database AST', 'ru': '100% подтверждено в базе данных AST'
    }
}

target_file = 'apps/web/src/context/LanguageContext.tsx'
with open(target_file, 'r', encoding='utf-8') as f:
    content = f.read()

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
    for key, trans in HERO_BADGE_KEYS.items():
        if f"'{key}':" not in dict_body and f'"{key}":' not in dict_body:
            escaped_val = trans[lang].replace("'", "\\'")
            lines_to_add.append(f"    '{key}': '{escaped_val}',")
    
    if lines_to_add:
        new_dict_body = dict_body + "\n" + "\n".join(lines_to_add)
        new_block = dict_start + new_dict_body + "\n" + dict_end
        content = content[:match.start()] + new_block + content[match.end():]
        print(f"Added {len(lines_to_add)} badge keys to {lang}")
    else:
        print(f"All badge keys already present in {lang}")

with open(target_file, 'w', encoding='utf-8') as f:
    f.write(content)

print("Finished updating badge keys in LanguageContext.tsx!")
