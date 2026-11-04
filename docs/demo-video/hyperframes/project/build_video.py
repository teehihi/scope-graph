"""Build the editable, deterministic HyperFrames scenes and timed text.

Run from this directory with Python 3.13. No API or network request is made.
The genuine product screenshots in assets/ are copied from this repository's
README captures; this script never edits their pixels.
"""

from __future__ import annotations

from html import escape
from pathlib import Path


ROOT = Path(__file__).resolve().parent
DOCS = ROOT.parent.parent
WIDTH = 1920
HEIGHT = 1080

SCENES = [
    ("scene01", 0, 15, "A small change", "can touch an entire system", "ILLUSTRATIVE DEPENDENCY CHAIN"),
    ("scene02", 15, 20, "Meet ScopeGraph", "Understand the blast radius before editing", "REAL PRODUCT CAPTURE"),
    ("scene03", 35, 25, "Index the repository", "Explore the dependency graph", "SAMPLE AUTH & USER SERVICE"),
    ("scene04", 60, 35, "From request to evidence", "An offline demonstration of a source-grounded report", "OFFLINE DEMO • NOT LIVE META INFERENCE"),
    ("scene05", 95, 20, "A screenshot adds context", "Visual observations stay separate from code evidence", "VISION SMOKE TEST • ONE META REQUEST"),
    ("scene06", 115, 20, "Propose a UI change", "Review an inert before-and-after concept", "OFFLINE PROTOTYPE • CONCEPTUAL PREVIEW"),
    ("scene07", 135, 25, "Reason over real code", "Model suggestions meet graph and evidence checks", "META-ONLY DEFAULT • OPTIONAL ROUTING UNVERIFIED"),
    ("scene08", 160, 20, "Change with context", "Understand the impact before you change the code", "GITHUB.COM/TEEHIHI/SCOPE-GRAPH"),
]

NARRATION = [
    [
        "A small code change can reach far beyond one file.",
        "A route calls a service. A service touches a model. Tests may need a new contract.",
        "Before editing, you need a map of what might move.",
    ],
    [
        "ScopeGraph turns a change request into a reviewable impact plan.",
        "It connects the request to an indexed repository and shows why each cited source location matters.",
        "The developer remains responsible for deciding which edits are needed.",
    ],
    [
        "Here is the bundled, public authentication sample.",
        "ScopeGraph scans Python files, extracts symbols and relationships, and builds a dependency graph.",
        "You can move from an API route to related services, models and tests before making a change.",
    ],
    [
        "Our request is to verify a new email address before changing a user's active email.",
        "This recorded report uses ScopeGraph's deterministic offline provider, not a live model call.",
        "The report separates proposed direct edits, downstream concerns and potential risks.",
        "Opening an item reveals a real indexed path and numbered source lines. That verifies the reference exists; it does not prove every suggested edit is necessary.",
    ],
    [
        "You can also attach a screenshot to explain the visible interface.",
        "A separately authorized Meta Muse Spark vision smoke test recognized this synthetic email-settings screen.",
        "It did not run the full live impact pipeline. Visual observations alone cannot identify the exact files to edit.",
    ],
    [
        "An experimental UI Proposal workspace turns a description into an inert before-and-after preview.",
        "The current local example uses an offline, deterministic generator and is labeled conceptual.",
        "Developers can refine the proposal and separately request source-backed impact analysis; the preview never edits repository code.",
    ],
    [
        "In the configured Meta path, Muse Spark interprets requirements and proposes impact relationships.",
        "Local retrieval, graph traversal and an evidence gate check those claims against indexed code before the brief is shown.",
        "MCP tools expose grounded context to coding agents. Optional partner routing exists, but its live behavior remains unverified.",
    ],
    [
        "ScopeGraph is a planning aid, not an automatic proof of every dependency.",
        "It gives developers a traceable starting point, with uncertainty visible and source evidence close at hand.",
        "ScopeGraph. Understand the impact before you change the code.",
    ],
]


COMMON_CSS = """
*{box-sizing:border-box}#root{position:absolute;inset:0;overflow:hidden;font-family:Inter,Arial,sans-serif;color:#151923}
.bg-light{position:absolute;inset:0;background:#F7F8F5}.bg-dark{position:absolute;inset:0;background:#151923}
.headline{position:absolute;left:108px;top:92px;max-width:1400px;font-size:90px;font-weight:700;line-height:1.02;letter-spacing:-.055em}
.dek{position:absolute;left:112px;top:195px;max-width:1250px;font-size:42px;line-height:1.22;letter-spacing:-.025em}
.eyebrow{position:absolute;left:112px;top:50px;font:700 29px 'JetBrains Mono',monospace;letter-spacing:.04em;color:#526BEE}
.film-shot{position:absolute;left:100px;top:292px;width:1720px;height:620px;overflow:hidden;border:2px solid #E4E7E1;border-radius:25px;background:white;box-shadow:0 22px 52px rgba(21,25,35,.12)}
.film-shot img{display:block;width:100%;height:100%;object-fit:cover;object-position:top left}
.callout{position:absolute;padding:17px 24px;border-radius:14px;font-size:30px;font-weight:700;background:#151923;color:#fff;box-shadow:0 12px 24px rgba(21,25,35,.2)}
.source{position:absolute;left:110px;bottom:158px;font:500 25px 'JetBrains Mono',monospace;color:#56606E}
.clip{position:absolute}.dark-ink{color:#F7F8F5}.lime{color:#C7F36B}
.page-number{position:absolute;right:105px;top:55px;color:#56606E;font:500 29px 'JetBrains Mono',monospace}
"""


_TRACK = 0


def clip(name: str, start: float, duration: float, inner: str, style: str = "", track: int | None = None) -> str:
    global _TRACK
    _TRACK += 1
    track = track if track is not None else _TRACK
    return (f'<div id="{name}" class="clip" data-start="{start:g}" '
            f'data-duration="{duration:g}" data-track-index="{track}" style="{style}">{inner}</div>')


def shot(name: str, src: str, start: float, duration: float, alt: str, style: str = "") -> str:
    return clip(name, start, duration,
                f'<div class="film-shot" style="{style}"><img src="assets/{src}" alt="{escape(alt, quote=True)}" /></div>')


def build_body(number: int, duration: int) -> tuple[str, list[tuple[str, float, str]]]:
    """Return scene markup and (selector, time, motion) for its paused timeline."""
    key, _, _, title, dek, eyebrow = SCENES[number - 1]
    dark = number in {1, 7, 8}
    bg = '<div class="bg-dark"></div>' if dark else '<div class="bg-light"></div>'
    ink = ' dark-ink' if dark else ''
    markup = bg
    markup += clip(f'{key}-eyebrow', 0, duration, f'<span class="eyebrow">{escape(eyebrow)}</span>')
    markup += clip(f'{key}-headline', 0, duration, f'<h1 class="headline{ink}">{escape(title)}</h1>')
    markup += clip(f'{key}-dek', 0, duration, f'<p class="dek{ink}">{escape(dek)}</p>')
    page_color = '#A6ADB8' if dark else '#56606E'
    markup += f'<span class="page-number" style="color:{page_color}">{number:02d} / 08</span>'
    motions = [(f'#{key}-headline > *', .15, 'enter'), (f'#{key}-dek > *', 1.5, 'enter')]
    if number == 1:
        markup += clip('s1-graph', 0, 15, '''
        <div class="graph-stage">
          <svg viewBox="0 0 1700 600" aria-label="Illustrative dependency chain">
            <path id="s1-path-a" d="M270 300 C450 300 470 165 630 165 H850"/>
            <path id="s1-path-b" d="M270 300 C450 300 470 435 630 435 H850"/>
            <path id="s1-path-c" d="M1000 165 C1210 165 1200 300 1390 300"/>
            <path id="s1-path-d" d="M1000 435 C1210 435 1200 300 1390 300"/>
          </svg>
          <div class="node node-start" id="s1-node-source">app/api/users.py</div>
          <div class="node node-service" id="s1-node-service">user_service.py</div>
          <div class="node node-test" id="s1-node-test">test_users.py</div>
          <div class="node node-result" id="s1-node-result">review impact</div>
        </div>''')
        motions.extend([(f'#s1-node-{x}', t, 'enter') for x, t in [('source', .8), ('service', 4), ('test', 6.7), ('result', 10)]])
        for x, t in [('a', 3), ('b', 6), ('c', 9), ('d', 9.4)]:
            motions.append((f'#s1-path-{x}', t, 'draw'))
    elif number == 2:
        markup += shot('s2-product', 'graph-explorer.png', 3, 17, 'Actual ScopeGraph dependency graph on bundled sample repository')
        markup += clip('s2-label', 5, 15, '<div class="callout" style="left:1260px;top:632px">Actual local app capture</div>')
        motions += [('#s2-product .film-shot', 3.2, 'enter'), ('#s2-label .callout', 5, 'enter')]
    elif number == 3:
        markup += shot('s3-graph', 'graph-explorer.png', 2, 23, 'Indexed sample repository graph')
        markup += clip('s3-route', 7, 18, '<div class="callout" style="left:265px;top:500px;background:#526BEE">API route</div>')
        markup += clip('s3-service', 12, 13, '<div class="callout" style="left:660px;top:500px;background:#526BEE">Service</div>')
        markup += clip('s3-tests', 17, 8, '<div class="callout" style="left:1420px;top:500px;background:#526BEE">Tests</div>')
        motions += [('#s3-graph .film-shot', 2.1, 'enter')]
        motions += [(f'#s3-{x} .callout', t, 'enter') for x, t in [('route', 7), ('service', 12), ('tests', 17)]]
    elif number == 4:
        markup += shot('s4-report', 'impact-evidence.png', 2, 14, 'Actual offline impact report for bundled sample')
        markup += shot('s4-evidence', 'source-evidence.png', 16, 19, 'Actual offline report with source evidence drawer')
        markup += clip('s4-direct', 5, 11, '<div class="callout" style="left:200px;top:810px;background:#E5484D">Direct proposal</div>')
        markup += clip('s4-indirect', 9, 7, '<div class="callout" style="left:520px;top:810px;background:#F5A623;color:#151923">Indirect / potential</div>')
        markup += clip('s4-evidence-label', 19, 16, '<div class="callout" style="left:1300px;top:810px;background:#526BEE">Indexed source lines</div>')
        motions += [('#s4-report .film-shot', 2.2, 'enter'), ('#s4-evidence .film-shot', 16.2, 'enter')]
        motions += [(f'#s4-{x} .callout', t, 'enter') for x, t in [('direct', 5), ('indirect', 9), ('evidence-label', 19)]]
    elif number == 5:
        markup += shot('s5-upload', 'screenshot-upload.png', 2, 18, 'Real local screenshot attachment state')
        markup += clip('s5-image', 5, 15, '<div class="account-image"><img src="assets/account_email.png" alt="Owned synthetic email settings screenshot" /></div>')
        markup += clip('s5-fact', 12, 8, '<div class="callout" style="left:975px;top:790px;background:#526BEE">Vision observed screen type; no live code impact run</div>')
        motions += [('#s5-upload .film-shot', 2.1, 'enter'), ('#s5-image .account-image', 5.2, 'enter'), ('#s5-fact .callout', 12, 'enter')]
    elif number == 6:
        markup += clip('s6-concept', 3, 17, '''<div class="concept">
            <div class="concept-before"><span>BEFORE</span><button>Analyze Impact</button></div>
            <div class="concept-arrow">→</div>
            <div class="concept-after"><span>AFTER • CONCEPTUAL</span><button>Analyze Impact</button></div>
          </div>''')
        markup += clip('s6-fact', 11, 9, '<div class="callout" style="left:500px;top:770px">Offline deterministic preview • no source edit</div>')
        motions += [('#s6-concept .concept-before', 3.2, 'enter'), ('#s6-concept .concept-after', 7, 'enter'), ('#s6-fact .callout', 11, 'enter')]
    elif number == 7:
        markup += clip('s7-flow', 3, 22, '''<div class="flow">
          <div class="flow-box" id="s7-input">Requirement<br/><small>and optional image</small></div>
          <div class="flow-arrow">→</div><div class="flow-box" id="s7-meta">Meta interpret<br/><small>Muse Spark</small></div>
          <div class="flow-arrow">→</div><div class="flow-box" id="s7-retrieve">Local retrieval<br/><small>index + graph</small></div>
          <div class="flow-arrow">→</div><div class="flow-box" id="s7-reason">Meta reason<br/><small>and review</small></div>
          <div class="flow-arrow">→</div><div class="flow-box" id="s7-ground">Evidence gate<br/><small>local validation</small></div>
          <div class="flow-arrow">→</div><div class="flow-box" id="s7-brief">Brief + MCP<br/><small>grounded context</small></div>
        </div>''')
        markup += clip('s7-note', 20, 5, '<div class="flow-note">Optional Baseten / Modal routing: partner behavior not live verified</div>')
        motions += [(f'#s7-{x}', t, 'enter') for x, t in [('input', 3), ('meta', 6), ('retrieve', 9), ('reason', 12), ('ground', 15), ('brief', 18)]]
        motions += [('#s7-note .flow-note', 20, 'enter')]
    else:
        markup += shot('s8-proof', 'source-evidence.png', 1, 12, 'Real source evidence view from offline demo', 'opacity:.58')
        markup += clip('s8-logo', 11, 9, '<img class="end-logo" src="assets/scopegraph-logo-horizontal.svg" alt="ScopeGraph" />')
        markup += clip('s8-url', 14, 6, '<div class="end-url">github.com/teehihi/scope-graph</div>')
        motions += [('#s8-proof .film-shot', 1.1, 'enter'), ('#s8-logo .end-logo', 11, 'enter'), ('#s8-url .end-url', 14, 'enter')]
    return markup, motions


EXTRA_CSS = """
.graph-stage{position:absolute;left:110px;top:300px;width:1700px;height:600px;background:#242A36;border:1px solid #4C5563;border-radius:30px}
.graph-stage svg{position:absolute;inset:0;width:100%;height:100%}.graph-stage path{fill:none;stroke:#526BEE;stroke-width:7;stroke-dasharray:1000;stroke-dashoffset:1000}
.node{position:absolute;padding:30px 36px;border:2px solid #718091;border-radius:18px;background:#F7F8F5;color:#151923;font:700 32px 'JetBrains Mono',monospace}
.node-start{left:56px;top:244px;border-color:#C7F36B}.node-service{left:690px;top:110px}.node-test{left:690px;top:378px}.node-result{left:1380px;top:244px;border-color:#526BEE}
.account-image{position:absolute;left:110px;top:330px;width:730px;padding:14px;background:white;border:2px solid #E4E7E1;border-radius:20px;box-shadow:0 18px 38px rgba(21,25,35,.17)}
.account-image img{display:block;width:100%;border-radius:10px}
.concept{position:absolute;left:105px;top:350px;width:1710px;display:flex;align-items:center;justify-content:space-between}
.concept-before,.concept-after{height:350px;width:720px;background:#fff;border:2px solid #E4E7E1;border-radius:28px;padding:50px;box-shadow:0 18px 38px rgba(21,25,35,.08)}
.concept-before span,.concept-after span{display:block;color:#56606E;font:700 28px 'JetBrains Mono',monospace;margin-bottom:85px}
.concept button{font:700 40px Inter,sans-serif;padding:24px 36px;border:0;border-radius:20px;background:#C7F36B;color:#151923}.concept-after button{background:#E5484D;border-radius:3px;color:white}
.concept-arrow{font-size:110px;color:#526BEE}.flow{position:absolute;left:105px;top:370px;width:1710px;display:flex;align-items:center;justify-content:space-between}
.flow-box{width:250px;height:240px;padding:45px 22px;border:2px solid #596473;border-radius:22px;background:#F7F8F5;color:#151923;font-size:29px;font-weight:700;line-height:1.22}
.flow-box small{font-size:28px;font-weight:400;color:#46505D}.flow-arrow{color:#C7F36B;font-size:45px}.flow-note{position:absolute;left:260px;top:770px;font-size:31px;color:#F7F8F5}
.end-logo{position:absolute;left:580px;top:410px;width:760px;height:200px;object-fit:contain;background:#F7F8F5;padding:22px;border-radius:22px}
.end-url{position:absolute;left:550px;top:715px;font:700 36px 'JetBrains Mono',monospace;color:#C7F36B}
"""


def write_scenes() -> None:
    out = ROOT / "compositions"
    out.mkdir(exist_ok=True)
    for number, (key, _, duration, _, _, _) in enumerate(SCENES, 1):
        markup, motions = build_body(number, duration)
        tweens = []
        for selector, at, kind in motions:
            if kind == "draw":
                tweens.append(f'tl.fromTo("{selector}", {{strokeDashoffset:1000}}, {{strokeDashoffset:0,duration:1.2,ease:"power2.inOut"}}, {at});')
            else:
                tweens.append(f'tl.fromTo("{selector}", {{opacity:0,y:26}}, {{opacity:1,y:0,duration:.65,ease:"power2.out"}}, {at});')
        scene = f'''<template>
<style>{COMMON_CSS}{EXTRA_CSS}</style>
<div id="root" data-composition-id="{key}" data-width="{WIDTH}" data-height="{HEIGHT}">{markup}</div>
<script>window.__timelines=window.__timelines||{{}};const tl=gsap.timeline({{paused:true}});{''.join(tweens)}window.__timelines["{key}"]=tl;</script>
</template>'''
        (out / f"{key}.html").write_text(scene, encoding="utf-8")


def cues() -> list[tuple[float, float, str]]:
    result = []
    for (_, start, duration, _, _, _), lines in zip(SCENES, NARRATION, strict=True):
        weights = [len(line.split()) for line in lines]
        total = sum(weights)
        usable = duration - 1.1
        cursor = start + .45
        for line, weight in zip(lines, weights, strict=True):
            length = usable * weight / total
            result.append((round(cursor, 2), round(cursor + length, 2), line))
            cursor += length
    return result


def srt_time(seconds: float) -> str:
    millis = round(seconds * 1000)
    hours, millis = divmod(millis, 3600000)
    minutes, millis = divmod(millis, 60000)
    sec, millis = divmod(millis, 1000)
    return f"{hours:02d}:{minutes:02d}:{sec:02d},{millis:03d}"


def write_captions() -> None:
    subtitle_lines = []
    divs = []
    for i, (start, end, line) in enumerate(cues(), 1):
        subtitle_lines.append(f"{i}\n{srt_time(start)} --> {srt_time(end)}\n{line}\n")
        divs.append(clip(f"caption-{i:02d}", start, end - start,
                         f'<div class="caption-text">{escape(line)}</div>',
                         'left:165px;top:924px;width:1590px;min-height:95px', 90 + i))
    (DOCS / "VIDEO_SUBTITLES_EN.srt").write_text("\n".join(subtitle_lines), encoding="utf-8")
    content = '''<template><style>
    #root{position:absolute;inset:0;pointer-events:none;font-family:Inter,Arial,sans-serif}
    .caption-text{display:inline-block;max-width:1590px;padding:13px 22px;background:rgba(21,25,35,.93);color:#fff;
    font-size:31px;line-height:1.18;font-weight:700;border-radius:9px;box-shadow:0 6px 20px rgba(0,0,0,.18)}
    </style><div id="root" data-composition-id="captions" data-width="1920" data-height="1080">'''
    content += ''.join(divs)
    content += '''</div><script>window.__timelines=window.__timelines||{};
    window.__timelines["captions"]=gsap.timeline({paused:true});</script></template>'''
    (ROOT / "compositions" / "captions.html").write_text(content, encoding="utf-8")


def write_root() -> None:
    hosts = []
    for key, start, duration, _, _, _ in SCENES:
        hosts.append(f'<div id="{key}" class="clip" data-composition-id="{key}" '
                     f'data-composition-src="compositions/{key}.html" data-start="{start}" '
                     f'data-duration="{duration}" data-track-index="1" data-track-kind="graphics" '
                     'data-width="1920" data-height="1080"></div>')
    hosts.append('<div id="captions" class="clip" data-composition-id="captions" '
                 'data-composition-src="compositions/captions.html" data-start="0" '
                 'data-duration="180" data-track-index="90" data-track-kind="captions" '
                 'data-width="1920" data-height="1080"></div>')
    html = '''<!doctype html><html lang="en"><head><meta charset="UTF-8"/>
    <meta name="viewport" content="width=1920,height=1080"/>
    <script src="assets/gsap.min.js"></script><style>
    *{box-sizing:border-box}html,body{margin:0;width:1920px;height:1080px;overflow:hidden;background:#151923}
    #root{position:relative;width:1920px;height:1080px;font-family:Inter,Arial,sans-serif}
    .clip{position:absolute;inset:0}
    </style></head><body><div id="root" data-composition-id="main" data-start="0" data-duration="180"
    data-width="1920" data-height="1080" data-fps="30">'''
    html += ''.join(hosts)
    html += '''</div><script>window.__timelines=window.__timelines||{};
    window.__timelines.main=gsap.timeline({paused:true});</script></body></html>'''
    (ROOT / "index.html").write_text(html, encoding="utf-8")


def write_script() -> None:
    sections = ["# ScopeGraph — English narration for three-minute film", "", "Recorded narration is pending. Read at approximately 110 words per minute, with a pause between scenes. Pronounce ScopeGraph as ‘Scope Graph’, MCP as individual letters, and Muse Spark as written.", ""]
    for number, ((_, start, duration, _, _, _), lines) in enumerate(zip(SCENES, NARRATION, strict=True), 1):
        sections += [f"## Scene {number} — {int(start//60):02d}:{int(start%60):02d}–{int((start+duration)//60):02d}:{int((start+duration)%60):02d}", "", " ".join(lines), ""]
    sections += [f"Word count: {sum(len(line.split()) for scene in NARRATION for line in scene)}. The timed SRT is a planning alignment until narration is recorded; audio sync has not been verified.", ""]
    (DOCS / "VIDEO_SCRIPT_3MIN_EN.md").write_text("\n".join(sections), encoding="utf-8")


if __name__ == "__main__":
    write_scenes()
    write_captions()
    write_root()
    write_script()
    print(f"Built {len(SCENES)} scenes, {len(cues())} subtitle cues, 180 seconds")
