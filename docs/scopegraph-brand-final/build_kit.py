#!/usr/bin/env python3
"""ScopeGraph v2 brand kit — real, editable SVGs built from one geometry system.
Palette: Ink #151923, Warm White #F7F8F5, Lime #C7F36B, Blue #526BEE,
Gray #8B929E, Border #E4E7E1. Scout: white hood, black visor, sky-blue eyes,
lime tuft + lime ears, ink legs. Logo Concept 1 (recommended): focus brackets
+ branching graph, lime = trigger node, blue = affected nodes.
"""
import os
INK="#151923"; WHITE="#F7F8F5"; LIME="#C7F36B"; BLUE="#526BEE"
GRAY="#8B929E"; BORDER="#E4E7E1"; SKY="#7CC7FF"; AMBER="#F5A623"; RED="#E5484D"
ROOT=os.path.dirname(os.path.abspath(__file__))

def svg(body, w, h, bg=None):
    b = f'<rect width="{w}" height="{h}" fill="{bg}"/>' if bg else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" '
            f'width="{w}" height="{h}">{b}{body}</svg>\n')

def write(rel, content):
    p=os.path.join(ROOT, rel); os.makedirs(os.path.dirname(p), exist_ok=True)
    open(p,"w").write(content); print(rel)

# ---------- LOGO MARK ----------
def mark(bracket=INK, line=BLUE, lime=LIME, blue=BLUE, sw=9):
    return (f'<g fill="none" stroke="{bracket}" stroke-width="{sw}" stroke-linecap="square">'
            f'<path d="M22 46V22h24"/><path d="M74 22h24v24"/>'
            f'<path d="M22 74v24h24"/><path d="M74 98h24V74"/></g>'
            f'<g stroke="{line}" stroke-width="5" stroke-linecap="round">'
            f'<line x1="40" y1="76" x2="58" y2="62"/><line x1="62" y1="58" x2="80" y2="40"/>'
            f'<line x1="62" y1="62" x2="80" y2="80"/></g>'
            f'<circle cx="38" cy="78" r="9" fill="{blue}"/><circle cx="60" cy="60" r="13" fill="{lime}"/>'
            f'<circle cx="82" cy="38" r="9" fill="{blue}"/><circle cx="82" cy="82" r="9" fill="{blue}"/>')

def wordmark(x, y, size, color, anchor="start", weight=800):
    return (f'<text x="{x}" y="{y}" font-family="Inter, system-ui, -apple-system, sans-serif" '
            f'font-size="{size}" font-weight="{weight}" fill="{color}" text-anchor="{anchor}" '
            f'letter-spacing="-0.5">ScopeGraph</text>')

def logo_files():
    write("logo/scopegraph-mark.svg", svg(mark(), 120, 120))
    write("logo/scopegraph-mark-mono-dark.svg", svg(mark(bracket=INK, line=INK, lime=INK, blue=INK), 120, 120))
    write("logo/scopegraph-mark-mono-light.svg", svg(mark(bracket="#FFFFFF", line="#FFFFFF", lime="#FFFFFF", blue="#FFFFFF"), 120, 120))
    write("logo/scopegraph-favicon.svg", svg(mark(sw=11), 120, 120))
    # horizontal: mark scaled into 120 box + wordmark
    h = f'<g transform="translate(0,4) scale(0.92)">{mark()}</g>' + wordmark(132, 76, 44, INK)
    write("logo/scopegraph-logo-horizontal.svg", svg(h, 420, 120))
    hd = f'<g transform="translate(0,4) scale(0.92)">{mark(bracket="#FFFFFF", line=BLUE)}</g>' + wordmark(132, 76, 44, "#FFFFFF")
    write("logo/scopegraph-logo-horizontal-dark.svg", svg(hd, 420, 120))
    # stacked
    s = f'<g transform="translate(90,0)">{mark()}</g>' + wordmark(150, 172, 40, INK, anchor="middle")
    write("logo/scopegraph-logo-stacked.svg", svg(s, 300, 190))
    # app icon: ink rounded square, mark in white/lime/blue
    app = (f'<rect x="4" y="4" width="232" height="232" rx="52" fill="{INK}"/>'
           f'<g transform="translate(60,60) scale(1.0)">{mark(bracket="#FFFFFF", line=BLUE)}</g>')
    write("logo/scopegraph-app-icon.svg", svg(app, 240, 240))

# ---------- SCOUT ----------
def scout(pose="default"):
    """One construction, only expression / accessory changes per pose."""
    eyes, mouth, extra, arms_up = {
        "default": ('<ellipse cx="102" cy="106" rx="7" ry="13" fill="'+SKY+'"/><ellipse cx="138" cy="106" rx="7" ry="13" fill="'+SKY+'"/>',
                    '<path d="M112 122Q120 128 128 122" fill="none" stroke="'+SKY+'" stroke-width="4" stroke-linecap="round"/>', "", False),
        "exploring": ('<ellipse cx="106" cy="106" rx="7" ry="13" fill="'+SKY+'"/><ellipse cx="142" cy="106" rx="7" ry="13" fill="'+SKY+'"/>',
                    '<path d="M114 122Q122 126 130 122" fill="none" stroke="'+SKY+'" stroke-width="4" stroke-linecap="round"/>',
                    '<g><circle cx="168" cy="108" r="20" fill="'+INK+'"/><circle cx="168" cy="108" r="12" fill="'+SKY+'" opacity="0.9"/>'
                    '<rect x="184" y="102" width="22" height="12" rx="6" fill="'+INK+'"/></g>', False),
        "success": ('<path d="M94 108Q102 98 110 108" fill="none" stroke="'+SKY+'" stroke-width="5" stroke-linecap="round"/>'
                    '<path d="M130 108Q138 98 146 108" fill="none" stroke="'+SKY+'" stroke-width="5" stroke-linecap="round"/>',
                    '<path d="M110 120Q120 130 130 120" fill="none" stroke="'+SKY+'" stroke-width="4" stroke-linecap="round"/>',
                    '<g><circle cx="186" cy="52" r="20" fill="'+LIME+'" stroke="'+INK+'" stroke-width="4"/>'
                    '<path d="M176 52l7 7 13-14" fill="none" stroke="'+INK+'" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>'
                    '<path d="M52 60l4 4M188 92l3 5" stroke="'+BLUE+'" stroke-width="4" stroke-linecap="round"/></g>', True),
        "confused": ('<ellipse cx="100" cy="104" rx="6" ry="12" fill="'+SKY+'"/><ellipse cx="140" cy="108" rx="9" ry="9" fill="'+SKY+'"/>',
                    '<path d="M110 124Q118 120 126 124" fill="none" stroke="'+SKY+'" stroke-width="4" stroke-linecap="round"/>',
                    '<text x="186" y="58" font-family="Inter, sans-serif" font-size="34" font-weight="800" fill="'+BLUE+'">?</text>', False),
        "warning": ('<ellipse cx="102" cy="106" rx="7" ry="13" fill="'+SKY+'"/><ellipse cx="138" cy="106" rx="7" ry="13" fill="'+SKY+'"/>',
                    '<circle cx="120" cy="124" r="4" fill="'+SKY+'"/>',
                    '<g><path d="M186 30l18 32H168z" fill="'+AMBER+'" stroke="'+INK+'" stroke-width="4" stroke-linejoin="round"/>'
                    '<text x="186" y="56" font-family="Inter, sans-serif" font-size="22" font-weight="800" fill="'+INK+'" text-anchor="middle">!</text></g>', False),
        "sleeping": ('<path d="M94 106h16" stroke="'+SKY+'" stroke-width="5" stroke-linecap="round"/>'
                     '<path d="M130 106h16" stroke="'+SKY+'" stroke-width="5" stroke-linecap="round"/>',
                    '<path d="M114 122Q120 126 126 122" fill="none" stroke="'+SKY+'" stroke-width="4" stroke-linecap="round"/>',
                    '<text x="180" y="52" font-family="Inter, sans-serif" font-size="26" font-weight="800" fill="'+BLUE+'">z</text>'
                    '<text x="196" y="34" font-family="Inter, sans-serif" font-size="32" font-weight="800" fill="'+BLUE+'">z</text>'
                    '<text x="172" y="72" font-family="Inter, sans-serif" font-size="20" font-weight="800" fill="'+BLUE+'">z</text>', False),
        "celebration": ('<path d="M94 108Q102 98 110 108" fill="none" stroke="'+SKY+'" stroke-width="5" stroke-linecap="round"/>'
                        '<path d="M130 108Q138 98 146 108" fill="none" stroke="'+SKY+'" stroke-width="5" stroke-linecap="round"/>',
                        '<path d="M108 120Q120 132 132 120" fill="none" stroke="'+SKY+'" stroke-width="4" stroke-linecap="round"/>',
                        '<g fill="'+BLUE+'"><circle cx="44" cy="52" r="5"/><circle cx="196" cy="88" r="5"/></g>'
                        '<g fill="'+LIME+'" stroke="'+INK+'" stroke-width="3"><circle cx="56" cy="36" r="5"/><circle cx="188" cy="36" r="5"/></g>'
                        '<path d="M40 84l10-6M200 60l-10-4" stroke="'+AMBER+'" stroke-width="4" stroke-linecap="round"/>', True),
    }[pose]
    arms = ('<g><path d="M66 158Q44 140 48 118" fill="none" stroke="'+INK+'" stroke-width="5" stroke-linecap="round"/>'
            '<path d="M174 158Q196 140 192 118" fill="none" stroke="'+INK+'" stroke-width="5" stroke-linecap="round"/></g>' if arms_up else
            '<g><rect x="62" y="150" width="22" height="34" rx="11" fill="white" stroke="'+INK+'" stroke-width="5" transform="rotate(-18 73 167)"/>'
            '<rect x="156" y="150" width="22" height="34" rx="11" fill="white" stroke="'+INK+'" stroke-width="5" transform="rotate(18 167 167)"/>'
            '<circle cx="172" cy="168" r="11" fill="'+LIME+'" stroke="'+INK+'" stroke-width="4"/></g>')
    body = (f'<ellipse cx="120" cy="212" rx="62" ry="10" fill="{INK}" opacity="0.08"/>'
            f'<rect x="78" y="152" width="84" height="56" rx="28" fill="white" stroke="{INK}" stroke-width="5"/>'
            f'{arms}'
            f'<ellipse cx="120" cy="106" rx="68" ry="62" fill="white" stroke="{INK}" stroke-width="5"/>'
            f'<circle cx="56" cy="112" r="16" fill="{LIME}" stroke="{INK}" stroke-width="5"/>'
            f'<circle cx="184" cy="112" r="16" fill="{LIME}" stroke="{INK}" stroke-width="5"/>'
            f'<path d="M96 50Q120 16 140 46Q122 56 96 50Z" fill="{LIME}" stroke="{INK}" stroke-width="4" stroke-linejoin="round"/>'
            f'<ellipse cx="154" cy="52" rx="22" ry="15" fill="{INK}" transform="rotate(-18 154 52)"/>'
            f'<rect x="78" y="78" width="84" height="56" rx="26" fill="{INK}"/>'
            f'{eyes}{mouth}'
            f'<rect x="104" y="200" width="14" height="16" rx="6" fill="{INK}"/><rect x="124" y="200" width="14" height="16" rx="6" fill="{INK}"/>'
            f'{extra}')
    return svg(body, 240, 240)

def scout_files():
    for p in ["default","exploring","success","confused","warning","sleeping","celebration"]:
        write(f"scout/scout-{p}.svg", scout(p))

# ---------- SCOUT ANIMATION FRAMES ----------
# Rule from Thiên's earlier mascot work: idle animation should keep the body
# pixel-fixed and change only the eyes (blink). Bounce is a tiny hover
# (max 12px up) and wave moves only the right hand — no big pose changes.
def scout_anim(eye="open", dy=0, wave_step=0):
    eyes = {
        "open": '<ellipse cx="102" cy="106" rx="7" ry="13" fill="'+SKY+'"/><ellipse cx="138" cy="106" rx="7" ry="13" fill="'+SKY+'"/>',
        "half": '<ellipse cx="102" cy="108" rx="7" ry="6" fill="'+SKY+'"/><ellipse cx="138" cy="108" rx="7" ry="6" fill="'+SKY+'"/>',
        "closed": '<path d="M94 106h16" stroke="'+SKY+'" stroke-width="5" stroke-linecap="round"/><path d="M130 106h16" stroke="'+SKY+'" stroke-width="5" stroke-linecap="round"/>',
    }[eye]
    if wave_step == 0:
        right_arm = ('<rect x="156" y="150" width="22" height="34" rx="11" fill="white" stroke="'+INK+'" stroke-width="5" transform="rotate(18 167 167)"/>'
                     '<circle cx="172" cy="168" r="11" fill="'+LIME+'" stroke="'+INK+'" stroke-width="4"/>')
        extra = ""
    else:
        hx, hy = {1: (194, 166), 2: (202, 148)}[wave_step]
        right_arm = (f'<line x1="164" y1="158" x2="{hx}" y2="{hy}" stroke="{INK}" stroke-width="26" stroke-linecap="round"/>'
                     f'<line x1="164" y1="158" x2="{hx}" y2="{hy}" stroke="white" stroke-width="18" stroke-linecap="round"/>'
                     f'<circle cx="{hx}" cy="{hy}" r="11" fill="{LIME}" stroke="{INK}" stroke-width="4"/>')
        extra = f'<path d="M{hx+16} {hy-14}q6-4 10 0M{hx+20} {hy+2}q6-2 10 4" fill="none" stroke="{BLUE}" stroke-width="3" stroke-linecap="round"/>'
    body = (f'<ellipse cx="120" cy="212" rx="62" ry="10" fill="{INK}" opacity="0.08"/>'
            f'<g transform="translate(0 {dy})">'
            f'<rect x="78" y="152" width="84" height="56" rx="28" fill="white" stroke="{INK}" stroke-width="5"/>'
            f'<rect x="62" y="150" width="22" height="34" rx="11" fill="white" stroke="{INK}" stroke-width="5" transform="rotate(-18 73 167)"/>'
            f'{right_arm}'
            f'<ellipse cx="120" cy="106" rx="68" ry="62" fill="white" stroke="{INK}" stroke-width="5"/>'
            f'<circle cx="56" cy="112" r="16" fill="{LIME}" stroke="{INK}" stroke-width="5"/>'
            f'<circle cx="184" cy="112" r="16" fill="{LIME}" stroke="{INK}" stroke-width="5"/>'
            f'<path d="M96 50Q120 16 140 46Q122 56 96 50Z" fill="{LIME}" stroke="{INK}" stroke-width="4" stroke-linejoin="round"/>'
            f'<ellipse cx="154" cy="52" rx="22" ry="15" fill="{INK}" transform="rotate(-18 154 52)"/>'
            f'<rect x="78" y="78" width="84" height="56" rx="26" fill="{INK}"/>'
            f'{eyes}<path d="M112 122Q120 128 128 122" fill="none" stroke="{SKY}" stroke-width="4" stroke-linecap="round"/>'
            f'<rect x="104" y="200" width="14" height="16" rx="6" fill="{INK}"/><rect x="124" y="200" width="14" height="16" rx="6" fill="{INK}"/>'
            f'{extra}</g>')
    return svg(body, 240, 240)

def scout_frame_files():
    for i, eye in enumerate(["open", "half", "closed", "half", "open"], 1):
        write(f"scout/frames/blink/scout-blink-{i:02d}-{eye}.svg", scout_anim(eye=eye))
    for i, dy in enumerate([0, -6, -12, -6], 1):
        write(f"scout/frames/bounce/scout-bounce-{i:02d}.svg", scout_anim(eye="open", dy=dy))
    for i, step in enumerate([0, 1, 2, 1], 1):
        write(f"scout/frames/wave/scout-wave-{i:02d}.svg", scout_anim(eye="open", wave_step=step))

# ---------- SCOUT STATE ANIMATION FRAMES ----------
# One 4-frame loop per pose. The pose stays recognisable in every frame:
# only its signature accessory / expression moves, and only a few pixels.
def scout_pose_frame(pose, frame):
    base = {
        "exploring": ('<ellipse cx="106" cy="106" rx="7" ry="13" fill="'+SKY+'"/><ellipse cx="142" cy="106" rx="7" ry="13" fill="'+SKY+'"/>',
            '<path d="M114 122Q122 126 130 122" fill="none" stroke="'+SKY+'" stroke-width="4" stroke-linecap="round"/>',
            '<g><circle cx="168" cy="108" r="20" fill="'+INK+'"/><circle cx="168" cy="108" r="12" fill="'+SKY+'" opacity="0.9"/>'
            '<rect x="184" y="102" width="22" height="12" rx="6" fill="'+INK+'"/></g>', False),
        "success": ('<path d="M94 108Q102 98 110 108" fill="none" stroke="'+SKY+'" stroke-width="5" stroke-linecap="round"/>'
            '<path d="M130 108Q138 98 146 108" fill="none" stroke="'+SKY+'" stroke-width="5" stroke-linecap="round"/>',
            '<path d="M110 120Q120 130 130 120" fill="none" stroke="'+SKY+'" stroke-width="4" stroke-linecap="round"/>',
            '<g><circle cx="186" cy="52" r="20" fill="'+LIME+'" stroke="'+INK+'" stroke-width="4"/>'
            '<path d="M176 52l7 7 13-14" fill="none" stroke="'+INK+'" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>'
            '<path d="M52 60l4 4M188 92l3 5" stroke="'+BLUE+'" stroke-width="4" stroke-linecap="round"/></g>', True),
        "confused": ('<ellipse cx="100" cy="104" rx="6" ry="12" fill="'+SKY+'"/><ellipse cx="140" cy="108" rx="9" ry="9" fill="'+SKY+'"/>',
            '<path d="M110 124Q118 120 126 124" fill="none" stroke="'+SKY+'" stroke-width="4" stroke-linecap="round"/>',
            '<text x="186" y="58" font-family="Inter, sans-serif" font-size="34" font-weight="800" fill="'+BLUE+'">?</text>', False),
        "warning": ('<ellipse cx="102" cy="106" rx="7" ry="13" fill="'+SKY+'"/><ellipse cx="138" cy="106" rx="7" ry="13" fill="'+SKY+'"/>',
            '<circle cx="120" cy="124" r="4" fill="'+SKY+'"/>',
            '<g><path d="M186 30l18 32H168z" fill="'+AMBER+'" stroke="'+INK+'" stroke-width="4" stroke-linejoin="round"/>'
            '<text x="186" y="56" font-family="Inter, sans-serif" font-size="22" font-weight="800" fill="'+INK+'" text-anchor="middle">!</text></g>', False),
        "sleeping": ('<path d="M94 106h16" stroke="'+SKY+'" stroke-width="5" stroke-linecap="round"/>'
            '<path d="M130 106h16" stroke="'+SKY+'" stroke-width="5" stroke-linecap="round"/>',
            '<path d="M114 122Q120 126 126 122" fill="none" stroke="'+SKY+'" stroke-width="4" stroke-linecap="round"/>',
            '<text x="180" y="52" font-family="Inter, sans-serif" font-size="26" font-weight="800" fill="'+BLUE+'">z</text>'
            '<text x="196" y="34" font-family="Inter, sans-serif" font-size="32" font-weight="800" fill="'+BLUE+'">z</text>'
            '<text x="172" y="72" font-family="Inter, sans-serif" font-size="20" font-weight="800" fill="'+BLUE+'">z</text>', False),
        "celebration": ('<path d="M94 108Q102 98 110 108" fill="none" stroke="'+SKY+'" stroke-width="5" stroke-linecap="round"/>'
            '<path d="M130 108Q138 98 146 108" fill="none" stroke="'+SKY+'" stroke-width="5" stroke-linecap="round"/>',
            '<path d="M108 120Q120 132 132 120" fill="none" stroke="'+SKY+'" stroke-width="4" stroke-linecap="round"/>',
            '<g fill="'+BLUE+'"><circle cx="44" cy="52" r="5"/><circle cx="196" cy="88" r="5"/></g>'
            '<g fill="'+LIME+'" stroke="'+INK+'" stroke-width="3"><circle cx="56" cy="36" r="5"/><circle cx="188" cy="36" r="5"/></g>'
            '<path d="M40 84l10-6M200 60l-10-4" stroke="'+AMBER+'" stroke-width="4" stroke-linecap="round"/>', True),
    }[pose]
    eyes, mouth, extra_raw, arms_up = base
    dy_body, eye_shift, extra = 0, 0, extra_raw
    # Eye animation per state — the fix for stiff eyes. Accessory/body motion
    # from v2.2 stays; eyes now move in every frame too (eyes are drawn with
    # their frame position already baked in, so eye_shift stays 0).
    if pose == "exploring":
        dx, dym = [-8, 0, 8, 0][frame], [0, -4, 0, -4][frame]
        shift, ry = [-5, 0, 5, 0][frame], [13, 13, 13, 6][frame]
        eyes = (f'<ellipse cx="{106+shift}" cy="106" rx="7" ry="{ry}" fill="{SKY}"/>'
                f'<ellipse cx="{142+shift}" cy="106" rx="7" ry="{ry}" fill="{SKY}"/>')
        extra = f'<g transform="translate({dx} {dym})">{extra_raw}</g>'
    elif pose == "success":
        dy_body = [0, -4, -8, -4][frame]; s = [1.0, 1.15, 1.0, 0.9][frame]
        c = [98, 92, 98, 104][frame]
        eyes = (f'<path d="M94 108Q102 {c} 110 108" fill="none" stroke="{SKY}" stroke-width="5" stroke-linecap="round"/>'
                f'<path d="M130 108Q138 {c} 146 108" fill="none" stroke="{SKY}" stroke-width="5" stroke-linecap="round"/>')
        extra = f'<g transform="translate(186 52) scale({s}) translate(-186 -52)">{extra_raw}</g>'
    elif pose == "confused":
        shift = [-3, 0, 3, 0][frame]; lry, rry = [(12, 9), (13, 13), (9, 12), (6, 6)][frame]
        qdy = [0, -6, 0, 6][frame]
        eyes = (f'<ellipse cx="{100+shift}" cy="104" rx="6" ry="{lry}" fill="{SKY}"/>'
                f'<ellipse cx="{140+shift}" cy="108" rx="9" ry="{rry}" fill="{SKY}"/>')
        extra = f'<g transform="translate(0 {qdy})">{extra_raw}</g>'
    elif pose == "warning":
        ry = [13, 17, 13, 7][frame]
        s = [1.0, 1.12, 1.0, 0.92][frame]
        eyes = (f'<ellipse cx="102" cy="106" rx="7" ry="{ry}" fill="{SKY}"/>'
                f'<ellipse cx="138" cy="106" rx="7" ry="{ry}" fill="{SKY}"/>')
        extra = f'<g transform="translate(186 46) scale({s}) translate(-186 -46)">{extra_raw}</g>'
    elif pose == "sleeping":
        dy_body = [0, 1, 0, -1][frame]; zdy = [0, -6, -12, -6][frame]
        y = [106, 103, 106, 109][frame]; rlen = [16, 16, 12, 16][frame]
        eyes = (f'<path d="M94 {y}h16" stroke="{SKY}" stroke-width="5" stroke-linecap="round"/>'
                f'<path d="M130 {y}h{rlen}" stroke="{SKY}" stroke-width="5" stroke-linecap="round"/>')
        extra = f'<g transform="translate(0 {zdy})">{extra_raw}</g>'
    elif pose == "celebration":
        dy_body = [0, -6, -12, -6][frame]; cdy = [0, 6, 12, 6][frame]
        c = [98, 90, 98, 106][frame]
        eyes = (f'<path d="M94 108Q102 {c} 110 108" fill="none" stroke="{SKY}" stroke-width="5" stroke-linecap="round"/>'
                f'<path d="M130 108Q138 {c} 146 108" fill="none" stroke="{SKY}" stroke-width="5" stroke-linecap="round"/>')
        extra = f'<g transform="translate(0 {cdy})">{extra_raw}</g>'
    arms = ('<g><path d="M66 158Q44 140 48 118" fill="none" stroke="'+INK+'" stroke-width="5" stroke-linecap="round"/>'
            '<path d="M174 158Q196 140 192 118" fill="none" stroke="'+INK+'" stroke-width="5" stroke-linecap="round"/></g>' if arms_up else
            '<g><rect x="62" y="150" width="22" height="34" rx="11" fill="white" stroke="'+INK+'" stroke-width="5" transform="rotate(-18 73 167)"/>'
            '<rect x="156" y="150" width="22" height="34" rx="11" fill="white" stroke="'+INK+'" stroke-width="5" transform="rotate(18 167 167)"/>'
            '<circle cx="172" cy="168" r="11" fill="'+LIME+'" stroke="'+INK+'" stroke-width="4"/></g>')
    body = (f'<ellipse cx="120" cy="212" rx="62" ry="10" fill="{INK}" opacity="0.08"/>'
            f'<g transform="translate(0 {dy_body})">'
            f'<rect x="78" y="152" width="84" height="56" rx="28" fill="white" stroke="{INK}" stroke-width="5"/>'
            f'{arms}'
            f'<ellipse cx="120" cy="106" rx="68" ry="62" fill="white" stroke="{INK}" stroke-width="5"/>'
            f'<circle cx="56" cy="112" r="16" fill="{LIME}" stroke="{INK}" stroke-width="5"/>'
            f'<circle cx="184" cy="112" r="16" fill="{LIME}" stroke="{INK}" stroke-width="5"/>'
            f'<path d="M96 50Q120 16 140 46Q122 56 96 50Z" fill="{LIME}" stroke="{INK}" stroke-width="4" stroke-linejoin="round"/>'
            f'<ellipse cx="154" cy="52" rx="22" ry="15" fill="{INK}" transform="rotate(-18 154 52)"/>'
            f'<rect x="78" y="78" width="84" height="56" rx="26" fill="{INK}"/>'
            f'<g transform="translate({eye_shift} 0)">{eyes}{mouth}</g>'
            f'<rect x="104" y="200" width="14" height="16" rx="6" fill="{INK}"/><rect x="124" y="200" width="14" height="16" rx="6" fill="{INK}"/>'
            f'{extra}</g>')
    return svg(body, 240, 240)

def scout_state_frame_files():
    for pose in ["exploring", "success", "confused", "warning", "sleeping", "celebration"]:
        for i in range(4):
            write(f"scout/frames/{pose}/scout-{pose}-{i+1:02d}.svg", scout_pose_frame(pose, i))

# ---------- ROLE ICONS ----------
def role(name, glyph):
    body = (f'<rect x="8" y="8" width="104" height="104" rx="26" fill="{INK}"/>'
            f'<circle cx="96" cy="26" r="6" fill="{LIME}"/>{glyph}')
    return svg(body, 120, 120)

def role_files():
    roles = {
        "developer": '<g fill="none" stroke="white" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"><path d="M38 44l-14 16 14 16"/><path d="M82 44l14 16-14 16"/><path d="M66 40l-12 40" stroke="'+LIME+'"/></g>',
        "ai-agent": '<g><line x1="60" y1="30" x2="60" y2="20" stroke="white" stroke-width="4" stroke-linecap="round"/><circle cx="60" cy="15" r="5" fill="'+LIME+'"/><circle cx="60" cy="60" r="34" fill="white"/><path d="M46 34Q60 18 76 32Q62 40 46 34Z" fill="'+LIME+'"/><circle cx="28" cy="60" r="9" fill="'+LIME+'"/><circle cx="92" cy="60" r="9" fill="'+LIME+'"/><rect x="38" y="46" width="44" height="30" rx="15" fill="'+INK+'"/><ellipse cx="52" cy="61" rx="5" ry="7" fill="'+SKY+'"/><ellipse cx="68" cy="61" rx="5" ry="7" fill="'+SKY+'"/><path d="M56 69Q60 72 64 69" fill="none" stroke="'+SKY+'" stroke-width="2.5" stroke-linecap="round"/></g>',
        "reviewer": '<g><path d="M60 30l24 10v20c0 16-11 26-24 32C47 86 36 76 36 60V40z" fill="none" stroke="white" stroke-width="6" stroke-linejoin="round"/><path d="M50 60l7 7 14-15" fill="none" stroke="'+LIME+'" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></g>',
        "maintainer": '<g fill="none" stroke="white" stroke-width="6"><circle cx="60" cy="60" r="16"/><circle cx="60" cy="60" r="6" fill="white" stroke="none"/><path d="M60 32v10M60 78v10M32 60h10M78 60h10M40 40l7 7M73 73l7 7M80 40l-7 7M47 73l-7 7" stroke-linecap="round"/></g>',
        "project-owner": '<g><path d="M32 80V44l14 14 14-20 14 20 14-14v36z" fill="white"/><rect x="32" y="84" width="56" height="6" rx="3" fill="'+LIME+'"/><circle cx="32" cy="40" r="5" fill="'+LIME+'"/><circle cx="60" cy="34" r="5" fill="'+LIME+'"/><circle cx="88" cy="40" r="5" fill="'+LIME+'"/></g>',
        "tester": '<g><path d="M50 32h20l-4 24 14 22a6 6 0 01-5 10H45a6 6 0 01-5-10l14-22z" fill="none" stroke="white" stroke-width="6" stroke-linejoin="round"/><path d="M44 68h32" stroke="'+LIME+'" stroke-width="6" stroke-linecap="round"/></g>',
        "observer": '<g><g fill="none" stroke="'+LIME+'" stroke-width="4" stroke-linecap="square"><path d="M32 42V32h10"/><path d="M78 32h10v10"/><path d="M32 78V88h10"/><path d="M78 88h10V78"/></g><path d="M28 60Q60 38 92 60Q60 82 28 60Z" fill="white"/><circle cx="60" cy="60" r="12" fill="'+BLUE+'"/><circle cx="60" cy="60" r="5" fill="'+INK+'"/><circle cx="62" cy="58" r="1.8" fill="white"/></g>',
    }
    for n, g in roles.items():
        write(f"roles/role-{n}.svg", role(n, g))

# ---------- STATUS ILLUSTRATIONS ----------
def graph_nodes(nodes, edges, dashed=False):
    dash = ' stroke-dasharray="6 6"' if dashed else ""
    e = "".join(f'<line x1="{a[0]}" y1="{a[1]}" x2="{b[0]}" y2="{b[1]}" stroke="{BLUE}" stroke-width="3"{dash}/>' for a, b in edges)
    n = "".join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{c}" stroke="white" stroke-width="3"/>' for x, y, r, c in nodes)
    return e + n

def badge(cx, cy, color, mark):
    inner = ('<path d="M-9 1l6 6 12-13" fill="none" stroke="'+INK+'" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" transform="translate('+str(cx)+' '+str(cy)+')"/>' if mark == "✓" else
             '<path d="M-8 -8l16 16M8 -8l-16 16" stroke="'+INK+'" stroke-width="5" stroke-linecap="round" transform="translate('+str(cx)+' '+str(cy)+')"/>')
    return (f'<circle cx="{cx}" cy="{cy}" r="22" fill="{color}" stroke="{INK}" stroke-width="4"/>{inner}')

LIGHT="#EDF0F7"
def status(name, inner):
    # Centered composition: soft halo + corner dots, motif fills the card instead
    # of floating in a corner. Badge always overlaps the motif, bottom-right.
    frame = (f'<rect x="4" y="4" width="312" height="192" rx="24" fill="{WHITE}" stroke="{BORDER}" stroke-width="2"/>'
             f'<circle cx="160" cy="98" r="74" fill="{LIGHT}"/>'
             f'<circle cx="28" cy="28" r="4" fill="{LIME}"/><circle cx="292" cy="28" r="4" fill="{BLUE}"/>'
             f'<circle cx="28" cy="172" r="4" fill="{BLUE}"/><circle cx="292" cy="172" r="4" fill="{GRAY}"/>')
    return svg(frame + inner, 320, 200)

def big_graph(nodes, edges, dashed=False, edge_color=BLUE):
    dash = ' stroke-dasharray="7 7"' if dashed else ""
    e = "".join(f'<line x1="{a[0]}" y1="{a[1]}" x2="{b[0]}" y2="{b[1]}" stroke="{edge_color}" stroke-width="4" stroke-linecap="round"{dash}/>' for a, b in edges)
    n = "".join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{c}" stroke="white" stroke-width="4"/>' for x, y, r, c in nodes)
    return e + n

def scout_head(cx, cy, r):
    # Simplified Scout head only, scaled to fit a status card.
    s = r / 52.0
    return (f'<g transform="translate({cx} {cy}) scale({s}) translate(-120 -106)">'
            f'<circle cx="120" cy="106" r="52" fill="white" stroke="{INK}" stroke-width="4"/>'
            f'<circle cx="72" cy="106" r="13" fill="{LIME}" stroke="{INK}" stroke-width="4"/>'
            f'<circle cx="168" cy="106" r="13" fill="{LIME}" stroke="{INK}" stroke-width="4"/>'
            f'<path d="M100 58Q120 36 138 56Q122 64 100 58Z" fill="{LIME}" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>'
            f'<rect x="82" y="82" width="76" height="48" rx="22" fill="{INK}"/>'
            f'<ellipse cx="104" cy="106" rx="6" ry="11" fill="{SKY}"/><ellipse cx="136" cy="106" rx="6" ry="11" fill="{SKY}"/>'
            f'<path d="M112 122Q120 127 128 122" fill="none" stroke="{SKY}" stroke-width="3" stroke-linecap="round"/></g>')

def status_files():
    # Diamond graph, centred on the halo: left / top / right(lime) / bottom.
    nodes = [(92,98,18,BLUE),(160,54,16,BLUE),(228,98,18,LIME),(160,142,16,BLUE)]
    edges = [((92,98),(160,54)),((160,54),(228,98)),((160,54),(160,142))]
    items = {
        "empty-graph": big_graph([(92,98,18,GRAY),(160,54,16,GRAY),(228,98,18,WHITE),(160,142,16,GRAY)], [((92,98),(160,54)),((160,54),(160,142))], dashed=True, edge_color=GRAY)
            + '<circle cx="228" cy="98" r="18" fill="none" stroke="'+GRAY+'" stroke-width="3" stroke-dasharray="5 5"/>',
        "no-impact": big_graph(nodes, edges) + badge(248, 152, LIME, "✓"),
        "analysis-progress": big_graph(nodes, edges)
            + '<circle cx="248" cy="152" r="24" fill="white" stroke="'+INK+'" stroke-width="4"/>'
            + '<circle cx="248" cy="152" r="24" fill="none" stroke="'+BLUE+'" stroke-width="5" stroke-dasharray="48 103" stroke-linecap="round" transform="rotate(-90 248 152)"/>',
        "potentially-affected": big_graph([(92,98,18,BLUE),(160,54,16,BLUE),(228,98,19,AMBER),(160,142,16,BLUE)], edges)
            + '<path d="M248 128l24 40h-48z" fill="'+AMBER+'" stroke="'+INK+'" stroke-width="4" stroke-linejoin="round"/>'
            + '<rect x="246" y="142" width="4" height="12" rx="2" fill="'+INK+'"/><circle cx="248" cy="162" r="3" fill="'+INK+'"/>',
        "missing-references": '<rect x="86" y="34" width="108" height="132" rx="12" fill="white" stroke="'+INK+'" stroke-width="4"/>'
            + '<line x1="106" y1="64" x2="174" y2="64" stroke="'+GRAY+'" stroke-width="5" stroke-linecap="round"/>'
            + '<line x1="106" y1="86" x2="174" y2="86" stroke="'+GRAY+'" stroke-width="5" stroke-linecap="round"/>'
            + '<line x1="106" y1="108" x2="150" y2="108" stroke="'+GRAY+'" stroke-width="5" stroke-linecap="round"/>'
            + '<line x1="106" y1="130" x2="174" y2="130" stroke="'+BORDER+'" stroke-width="5" stroke-linecap="round"/>'
            + badge(222, 142, RED, "×"),
        "analysis-completed": big_graph(nodes, edges) + badge(248, 152, LIME, "✓")
            + '<path d="M52 44l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="'+BLUE+'"/>'
            + '<path d="M262 36l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" fill="'+LIME+'" stroke="'+INK+'" stroke-width="1.5"/>',
        "disconnected-repo": '<g><ellipse cx="128" cy="58" rx="52" ry="17" fill="white" stroke="'+INK+'" stroke-width="4"/>'
            + '<path d="M76 58v56c0 10 23 17 52 17s52-7 52-17V58" fill="white" stroke="'+INK+'" stroke-width="4"/>'
            + '<path d="M76 86c0 10 23 17 52 17s52-7 52-17" fill="none" stroke="'+INK+'" stroke-width="4"/></g>'
            + '<line x1="196" y1="96" x2="226" y2="96" stroke="'+RED+'" stroke-width="4" stroke-dasharray="8 6" stroke-linecap="round"/>'
            + badge(254, 96, RED, "×"),
        "agent-working": scout_head(128, 98, 52)
            + '<rect x="196" y="118" width="88" height="52" rx="10" fill="'+INK+'"/>'
            + '<text x="212" y="150" font-family="monospace" font-size="18" fill="'+LIME+'">&gt;_</text>'
            + '<circle cx="262" cy="143" r="4" fill="'+BLUE+'"/><circle cx="274" cy="143" r="4" fill="'+GRAY+'"/>',
        "agent-awaiting-review": scout_head(128, 98, 52)
            + '<circle cx="236" cy="142" r="30" fill="white" stroke="'+INK+'" stroke-width="4"/>'
            + '<path d="M236 142v-18l14 8" fill="none" stroke="'+BLUE+'" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>',
        "integration-failure": '<path d="M84 124a36 36 0 0170-14 30 30 0 01-4 60H84a32 32 0 010-46z" fill="white" stroke="'+INK+'" stroke-width="4" stroke-linejoin="round"/>'
            + '<line x1="182" y1="118" x2="210" y2="118" stroke="'+RED+'" stroke-width="4" stroke-dasharray="7 6" stroke-linecap="round"/>'
            + badge(240, 118, RED, "×"),
    }
    for n, inner in items.items():
        write(f"status/status-{n}.svg", status(n, inner))

# ---------- 404 ----------
def illustration_404():
    s = scout("confused")
    inner = s[s.find("<ellipse"):s.rfind("</svg>")]
    g = (f'<g transform="translate(20,70) scale(1.25)">{inner}</g>'
         f'<g stroke="{BLUE}" stroke-width="4" stroke-linecap="round">'
         f'<line x1="360" y1="180" x2="450" y2="140"/><line x1="450" y1="140" x2="540" y2="180"/></g>'
         f'<line x1="540" y1="180" x2="600" y2="200" stroke="{RED}" stroke-width="4" stroke-dasharray="8 6" stroke-linecap="round"/>'
         f'<circle cx="360" cy="180" r="14" fill="{BLUE}" stroke="white" stroke-width="3"/>'
         f'<circle cx="450" cy="140" r="14" fill="{BLUE}" stroke="white" stroke-width="3"/>'
         f'<circle cx="540" cy="180" r="14" fill="{LIME}" stroke="white" stroke-width="3"/>'
         f'<circle cx="622" cy="212" r="30" fill="{RED}" stroke="white" stroke-width="4"/>'
         f'<text x="622" y="224" font-family="Inter, sans-serif" font-size="36" font-weight="800" fill="white" text-anchor="middle">?</text>')
    return svg(g, 700, 420)

def dashboard():
    def nav(y, label, active=False):
        f = f'fill="{BLUE}"' if active else ""
        return f'<rect x="16" y="{y}" width="188" height="34" rx="8" {f}/><text x="30" y="{y+22}" font-family="Inter, sans-serif" font-size="14" fill="{"white" if active else GRAY}">{label}</text>'
    body = (f'<rect x="0" y="0" width="1200" height="760" fill="{INK}"/>'
            f'<rect x="220" y="0" width="980" height="760" fill="{WHITE}"/>'
            f'<g transform="translate(20,14) scale(0.42)">{mark(bracket="#FFFFFF", line=BLUE)}</g>'
            f'<text x="76" y="46" font-family="Inter, sans-serif" font-size="20" font-weight="800" fill="white">ScopeGraph</text>'
            + "".join(nav(y, l, i == 1) for i, (y, l) in enumerate([(80, "Home"), (124, "Repositories"), (168, "Graph"), (212, "Impact Analysis"), (256, "Code References"), (300, "AI Agent"), (344, "Settings")]))
            + f'<text x="240" y="44" font-family="Inter, sans-serif" font-size="16" fill="{GRAY}">acme / api-service  •  main</text>'
            f'<rect x="240" y="64" width="940" height="52" rx="12" fill="white" stroke="{BORDER}" stroke-width="2"/>'
            f'<text x="260" y="96" font-family="Inter, sans-serif" font-size="15" fill="{INK}">Change: Add email verification on signup</text>'
            f'<rect x="1020" y="76" width="140" height="28" rx="14" fill="{LIME}"/><text x="1090" y="95" font-family="Inter, sans-serif" font-size="13" font-weight="700" fill="{INK}" text-anchor="middle">Analysis completed</text>'
            f'<rect x="240" y="132" width="300" height="96" rx="14" fill="white" stroke="{BORDER}" stroke-width="2"/><text x="260" y="162" font-size="13" fill="{GRAY}" font-family="Inter, sans-serif">Directly affected</text><text x="260" y="202" font-size="32" font-weight="800" fill="{INK}" font-family="Inter, sans-serif">2</text>'
            f'<rect x="556" y="132" width="300" height="96" rx="14" fill="white" stroke="{BORDER}" stroke-width="2"/><text x="576" y="162" font-size="13" fill="{GRAY}" font-family="Inter, sans-serif">Indirectly affected</text><text x="576" y="202" font-size="32" font-weight="800" fill="{INK}" font-family="Inter, sans-serif">1</text>'
            f'<rect x="872" y="132" width="308" height="96" rx="14" fill="white" stroke="{BORDER}" stroke-width="2"/><text x="892" y="162" font-size="13" fill="{GRAY}" font-family="Inter, sans-serif">No impact</text><text x="892" y="202" font-size="32" font-weight="800" fill="{INK}" font-family="Inter, sans-serif">0</text>'
            f'<rect x="240" y="244" width="560" height="330" rx="14" fill="white" stroke="{BORDER}" stroke-width="2"/><text x="260" y="272" font-size="15" font-weight="700" fill="{INK}" font-family="Inter, sans-serif">Dependency Graph</text>'
            f'<g stroke="{BLUE}" stroke-width="3"><line x1="430" y1="360" x2="520" y2="400"/><line x1="520" y1="400" x2="640" y2="350"/><line x1="520" y1="400" x2="640" y2="470"/><line x1="520" y1="400" x2="420" y2="480"/></g>'
            f'<g font-family="Inter, sans-serif" font-size="12" text-anchor="middle"><circle cx="420" cy="350" r="34" fill="white" stroke="{INK}" stroke-width="2"/><text x="420" y="354">frontend</text><circle cx="520" cy="400" r="38" fill="{LIME}" stroke="{INK}" stroke-width="3"/><text x="520" y="404" font-weight="700">api-service</text><circle cx="650" cy="340" r="30" fill="white" stroke="{INK}" stroke-width="2"/><text x="650" y="344">database</text><circle cx="650" cy="480" r="34" fill="white" stroke="{INK}" stroke-width="2"/><text x="650" y="478">auth-</text><text x="650" y="492">service</text><circle cx="410" cy="490" r="28" fill="white" stroke="{INK}" stroke-width="2"/><text x="410" y="494">tests</text></g>'
            f'<rect x="816" y="244" width="364" height="330" rx="14" fill="white" stroke="{BORDER}" stroke-width="2"/><text x="836" y="272" font-size="15" font-weight="700" fill="{INK}" font-family="Inter, sans-serif">AI Agent</text>'
            f'<text x="836" y="302" font-size="13" fill="{GRAY}" font-family="Inter, sans-serif">Analyzing impact… mapping the</text><text x="836" y="322" font-size="13" fill="{GRAY}" font-family="Inter, sans-serif">changes across your codebase.</text>'
            f'<g font-size="13" font-family="Inter, sans-serif" fill="{INK}">'
            f'<circle cx="846" cy="354" r="9" fill="{LIME}"/><path d="M842 354l3 3 6-6" fill="none" stroke="{INK}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><text x="862" y="359">Scanning code changes</text>'
            f'<circle cx="846" cy="380" r="9" fill="{LIME}"/><path d="M842 380l3 3 6-6" fill="none" stroke="{INK}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><text x="862" y="385">Analyzing dependencies</text>'
            f'<circle cx="846" cy="406" r="9" fill="{LIME}"/><path d="M842 406l3 3 6-6" fill="none" stroke="{INK}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><text x="862" y="411">Finding related tests</text>'
            f'<circle cx="846" cy="432" r="9" fill="none" stroke="{GRAY}" stroke-width="2"/><text x="862" y="437">Generating summary</text></g>'
            f'<rect x="240" y="590" width="940" height="140" rx="14" fill="white" stroke="{BORDER}" stroke-width="2"/><text x="260" y="618" font-size="15" font-weight="700" fill="{INK}" font-family="Inter, sans-serif">Affected Components</text><text x="260" y="648" font-family="monospace" font-size="13" fill="{INK}">api/user.service.ts  —  Direct  •  2 references</text><text x="260" y="674" font-family="monospace" font-size="13" fill="{INK}">models/user.model.ts  —  Direct  •  1 reference</text><text x="260" y="700" font-family="monospace" font-size="13" fill="{INK}">tests/user.service.test.ts  —  Indirect  •  1 reference</text>')
    return svg(body, 1200, 760)

if __name__ == "__main__":
    logo_files(); scout_files(); scout_frame_files(); scout_state_frame_files(); role_files(); status_files()
    write("illustrations/scopegraph-404-illustration.svg", illustration_404())
    write("illustrations/scopegraph-dashboard.svg", dashboard())
    print("done")
