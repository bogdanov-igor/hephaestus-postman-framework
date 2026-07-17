#!/usr/bin/env python3
from PIL import Image, ImageDraw, ImageFont
import os

W, H = 1270, 760
BG = (17, 17, 22)
ACCENT = (232, 121, 36)
WHITE = (255, 255, 255)
GRAY = (160, 165, 175)
DARK_CARD = (28, 30, 38)
GREEN = (74, 222, 128)
RED = (239, 68, 68)
CODE_BG = (22, 24, 30)
BADGE_BG = (50, 35, 20)
BEFORE_BG = (45, 22, 22)
AFTER_BG = (22, 42, 28)
BLUE = (130, 170, 255)

OUT = os.path.dirname(os.path.abspath(__file__))

def font(size, mono=False):
    if mono:
        return ImageFont.truetype("/System/Library/Fonts/SFNSMono.ttf", size)
    try:
        return ImageFont.truetype("/System/Library/Fonts/SFNS.ttf", size)
    except:
        return ImageFont.truetype("/System/Library/Fonts/HelveticaNeue.ttc", size)

def rr(draw, xy, fill, r=24):
    draw.rounded_rectangle(xy, radius=r, fill=fill)

def tw(draw, text, f):
    bbox = draw.textbbox((0, 0), text, font=f)
    return bbox[2] - bbox[0]

def wrap(text, fnt, draw, max_w):
    words = text.split()
    lines, cur = [], ""
    for w in words:
        test = (cur + " " + w).strip()
        if tw(draw, test, fnt) > max_w and cur:
            lines.append(cur)
            cur = w
        else:
            cur = test
    if cur:
        lines.append(cur)
    return lines

def footer(draw):
    f = font(24)
    txt = "Hephaestus"
    x = W - tw(draw, txt, f) - 60
    draw.text((x, H - 50), txt, fill=GRAY, font=f)
    rr(draw, (x - 28, H - 47, x - 10, H - 32), fill=ACCENT, r=4)


# ── SLIDE 1: HERO (social preview) ──
def slide1():
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)

    # Left side
    lx = 70
    y = 80

    bf = font(20)
    badge = "Open Source  ·  MIT  ·  v3.8.0"
    bw = tw(draw, badge, bf)
    rr(draw, (lx, y, lx + bw + 30, y + 38), fill=BADGE_BG, r=19)
    draw.text((lx + 15, y + 9), badge, fill=ACCENT, font=bf)
    y += 70

    draw.text((lx, y), "API Testing,", fill=WHITE, font=font(58))
    y += 68
    draw.text((lx, y), "Engineered.", fill=ACCENT, font=font(58))
    y += 100

    sf = font(24)
    for line in wrap(
        "A modular, zero-dependency engine for Postman & Newman. Write tests once — get assertions, snapshots, reports, and CI integration automatically.",
        sf, draw, 480
    ):
        draw.text((lx, y), line, fill=GRAY, font=sf)
        y += 34
    y += 40

    stats = [("20+", "operators"), ("12", "modules"), ("10+", "CLI tools"), ("30", "tests")]
    sx = lx
    for num, label in stats:
        draw.text((sx, y), num, fill=WHITE, font=font(40))
        draw.text((sx, y + 48), label, fill=GRAY, font=font(18))
        sx += 130

    # Right side — code card
    cx = 600
    rr(draw, (cx, 60, W - 40, H - 50), fill=CODE_BG, r=16)
    for i, c in enumerate([(255, 95, 87), (255, 189, 46), (39, 201, 63)]):
        draw.ellipse((cx + 20 + i * 22, 78, cx + 34 + i * 22, 92), fill=c)
    draw.text((cx + 100, 76), "method.post-request.js", fill=GRAY, font=font(16, mono=True))

    cf = font(19, mono=True)
    code = [
        [("const ", BLUE), ("override = {", GRAY)],
        [],
        [("  expectedStatus: ", GRAY), ("200", GREEN), (",", GRAY)],
        [("  maxResponseTime: ", GRAY), ("1500", GREEN), (",", GRAY)],
        [],
        [("  assertShape: {", GRAY)],
        [('    "data.id":     ', GRAY), ('"number"', GREEN), (",", GRAY)],
        [('    "data.name":   ', GRAY), ('"string"', GREEN), (",", GRAY)],
        [('    "data.items":  ', GRAY), ('"array"', GREEN), (",", GRAY)],
        [('    "error":       ', GRAY), ('"absent"', RED), (",", GRAY)],
        [("  },", GRAY)],
        [],
        [("  assertions: {", GRAY)],
        [('    "data.status": ', GRAY), ('{ eq: "active" }', BLUE), (",", GRAY)],
        [('    "data.score":  ', GRAY), ("{ gte: 0, lte: 100 }", BLUE), (",", GRAY)],
        [('    "data.email":  ', GRAY), ('{ matches: "@" }', BLUE), (",", GRAY)],
        [("  },", GRAY)],
        [],
        [("  snapshot: { enabled: ", GRAY), ("true", ACCENT), (" }", GRAY)],
        [("};", GRAY)],
    ]
    cy = 110
    for tokens in code:
        if not tokens:
            cy += 24
            continue
        tx = cx + 25
        for text, color in tokens:
            draw.text((tx, cy), text, fill=color, font=cf)
            tx += tw(draw, text, cf)
        cy += 25

    footer(draw)
    img.save(os.path.join(OUT, "ph-1-hero.png"), "PNG")
    print("ph-1-hero.png")


# ── SLIDE 2: BEFORE / AFTER ──
def slide2():
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)

    draw.text((70, 50), "WHY HEPHAESTUS", fill=ACCENT, font=font(20))
    draw.text((70, 82), "Beyond vanilla Postman", fill=WHITE, font=font(44))
    draw.text((70, 135), "You already know Postman. Hephaestus doesn't replace it — it supercharges it.", fill=GRAY, font=font(22))

    # Before card — left
    bx, by = 50, 200
    cw = 560
    rr(draw, (bx, by, bx + cw, H - 50), fill=BEFORE_BG, r=16)
    draw.ellipse((bx + 22, by + 18, bx + 40, by + 36), fill=RED)
    draw.text((bx + 50, by + 18), "Vanilla Postman scripts", fill=WHITE, font=font(24))

    problems = [
        "Assertion boilerplate copy-pasted in every request",
        "No consistent structure between team members",
        "Auth logic duplicated per-request",
        "No snapshot regression testing",
        "No HTML reports without external tools",
        "Secrets visible in console logs",
        "No array item validation",
        "CI integration requires custom scripting",
    ]
    py = by + 65
    pf = font(21)
    for p in problems:
        draw.text((bx + 30, py), "X", fill=RED, font=font(20))
        draw.text((bx + 55, py), p, fill=(200, 200, 200), font=pf)
        py += 48

    # After card — right
    ax = bx + cw + 30
    rr(draw, (ax, by, ax + cw, H - 50), fill=AFTER_BG, r=16)
    draw.ellipse((ax + 22, by + 18, ax + 40, by + 36), fill=GREEN)
    draw.text((ax + 50, by + 18), "With Hephaestus", fill=WHITE, font=font(24))

    solutions = [
        "One engine, all requests — zero duplication",
        'Consistent declarative "override" pattern',
        "Auth configured once in defaults, overrideable",
        "Snapshot baselines auto-saved, visual diffs",
        "Beautiful HTML report with npm run report",
        "Auto-masking for token, password, secret, key",
        "assertEach, assertShape, assertOrder, assertUnique",
        "JUnit XML, GitHub Actions, Docker — ready to go",
    ]
    sy = by + 65
    for s in solutions:
        draw.text((ax + 30, sy), ">", fill=GREEN, font=font(20))
        draw.text((ax + 55, sy), s, fill=(200, 200, 200), font=pf)
        sy += 48

    footer(draw)
    img.save(os.path.join(OUT, "ph-2-comparison.png"), "PNG")
    print("ph-2-comparison.png")


# ── SLIDE 3: FEATURES GRID ──
def slide3():
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)

    draw.text((70, 45), "FEATURES", fill=ACCENT, font=font(20))
    draw.text((70, 75), "Everything in one engine", fill=WHITE, font=font(44))
    draw.text((70, 130), "No more copy-pasting across hundreds of requests. One engine, every request, zero duplication.", fill=GRAY, font=font(20))

    features = [
        ("20+ Assertion Operators", "exists, eq, gt, type, matches,\nsoft, when — per field or as\na structural shape check."),
        ("Snapshot Regression", "Save response baselines auto.\nStrict or non-strict mode.\nVisual diff in console & viewer."),
        ("Auth — All Patterns", "Basic, Bearer, headers, variables,\nOAuth2 client_credentials.\nAuto-refresh & token cache."),
        ("Array Validation", "assertEach validates every item.\nassertUnique detects duplicates.\nassertOrder verifies sort."),
        ("Retry & Resilience", "retryOnStatus auto-retries on\n503/429. Assertions skipped on\nintermediate attempts."),
        ("Schema & Secret Masking", "JSON Schema via built-in tv4.\nTokens, passwords auto-masked\nin all log output."),
    ]

    card_w = 370
    card_h = 200
    gap_x = 20
    gap_y = 18
    start_x = (W - 3 * card_w - 2 * gap_x) // 2
    start_y = 175

    colors = [ACCENT, GREEN, BLUE, (200, 150, 255), (255, 200, 50), (100, 220, 200)]

    for i, (title, desc) in enumerate(features):
        col = i % 3
        row = i // 3
        cx = start_x + col * (card_w + gap_x)
        cy = start_y + row * (card_h + gap_y)

        rr(draw, (cx, cy, cx + card_w, cy + card_h), fill=DARK_CARD, r=14)
        rr(draw, (cx + 18, cy + 16, cx + 44, cy + 42), fill=colors[i], r=8)
        draw.text((cx + 55, cy + 18), title, fill=WHITE, font=font(22))

        df = font(18)
        for j, dl in enumerate(desc.split("\n")):
            draw.text((cx + 20, cy + 58 + j * 25), dl, fill=GRAY, font=df)

    footer(draw)
    img.save(os.path.join(OUT, "ph-3-features.png"), "PNG")
    print("ph-3-features.png")


# ── SLIDE 4: PIPELINE ARCHITECTURE ──
def slide4():
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)

    draw.text((70, 45), "ARCHITECTURE", fill=ACCENT, font=font(20))
    draw.text((70, 75), "Pipeline-driven engine", fill=WHITE, font=font(44))
    draw.text((70, 130), "Orchestrator drives a module chain through a shared ctx object. Extend with plugins.", fill=GRAY, font=font(20))

    # PRE-REQUEST box
    bx, by = 50, 190
    bw = W - 100
    rr(draw, (bx, by, bx + bw, by + 170), fill=DARK_CARD, r=16)
    draw.text((bx + 25, by + 15), "PRE-REQUEST PIPELINE", fill=ACCENT, font=font(20))

    pre = ["configMerge", "envRequired", "iterationData", "random", "urlBuilder", "auth", "dateUtils", "logger"]
    mx = bx + 25
    mf = font(16, mono=True)
    for m in pre:
        mw = tw(draw, m, mf) + 18
        rr(draw, (mx, by + 55, mx + mw, by + 80), fill=CODE_BG, r=8)
        draw.text((mx + 9, by + 58), m, fill=ACCENT, font=mf)
        mx += mw + 8

    desc_f = font(18)
    draw.text((bx + 25, by + 100), "Merges defaults + override  |  Sets baseUrl  |  Applies auth  |  Computes dates  |  Logs config", fill=GRAY, font=desc_f)
    draw.text((bx + 25, by + 128), "All secrets auto-masked in log output", fill=GRAY, font=desc_f)

    # Arrow
    arrow_y = by + 190
    draw.text((W // 2 - 80, arrow_y), ">>>  HTTP Request  >>>", fill=GRAY, font=font(20, mono=True))

    # POST-REQUEST box
    py = arrow_y + 50
    rr(draw, (bx, py, bx + bw, py + 280), fill=DARK_CARD, r=16)
    draw.text((bx + 25, py + 15), "POST-REQUEST PIPELINE", fill=GREEN, font=font(20))

    post1 = ["configMerge", "normalizeResponse", "retryOnStatus", "metrics", "extractor"]
    mx = bx + 25
    for m in post1:
        mw = tw(draw, m, mf) + 18
        rr(draw, (mx, py + 55, mx + mw, py + 80), fill=CODE_BG, r=8)
        draw.text((mx + 9, py + 58), m, fill=GREEN, font=mf)
        mx += mw + 8

    post2 = ["assertions", "assertEach", "assertShape", "assertOrder", "assertUnique", "assertHeaders"]
    mx = bx + 25
    for m in post2:
        mw = tw(draw, m, mf) + 18
        rr(draw, (mx, py + 95, mx + mw, py + 120), fill=CODE_BG, r=8)
        draw.text((mx + 9, py + 98), m, fill=GREEN, font=mf)
        mx += mw + 8

    post3 = ["snapshot", "schema", "plugins", "logger"]
    mx = bx + 25
    for m in post3:
        mw = tw(draw, m, mf) + 18
        rr(draw, (mx, py + 135, mx + mw, py + 160), fill=CODE_BG, r=8)
        draw.text((mx + 9, py + 138), m, fill=GREEN, font=mf)
        mx += mw + 8

    draw.text((bx + 25, py + 185), "Parses response  |  Runs all assertions  |  Compares snapshots  |  Validates JSON Schema", fill=GRAY, font=desc_f)
    draw.text((bx + 25, py + 213), "Executes custom plugins  |  Outputs structured, masked log", fill=GRAY, font=desc_f)

    # ctx object
    rr(draw, (bx + 25, py + 245, bx + bw - 25, py + 272), fill=CODE_BG, r=8)
    draw.text((bx + 40, py + 249), "ctx = { config, request, response, api: { get(), find(), all(), count(), save() } }", fill=BLUE, font=font(16, mono=True))

    footer(draw)
    img.save(os.path.join(OUT, "ph-4-architecture.png"), "PNG")
    print("ph-4-architecture.png")


# ── SLIDE 5: CLI ECOSYSTEM ──
def slide5():
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)

    draw.text((70, 45), "ECOSYSTEM", fill=ACCENT, font=font(20))
    draw.text((70, 75), "CLI tools for every workflow", fill=WHITE, font=font(44))
    draw.text((70, 130), "Everything runs with  npm run <command> . No special setup, no global installs.", fill=GRAY, font=font(20))

    tools = [
        ("API Docs Generator", "npm run docs", "Markdown docs from your\ncollection. Tests = docs."),
        ("Run Summary", "npm run summary", "Pass rates, top-5 slowest,\nmost-failed assertions."),
        ("Run Comparator", "npm run compare", "Diff two Newman runs.\nNew failures, regressions."),
        ("Watch Mode", "npm run watch", "Auto re-run Newman on\nfile change. Press R to force."),
        ("HTML Report", "npm run report", "SVG gauge, timing bars,\nassertions, search, filter."),
        ("JUnit XML", "npm run ci-to-junit", "Newman JSON to JUnit XML\nfor Jenkins, GitHub, GitLab."),
        ("Migration Tool", "npm run migrate", "Scan Postman collection,\nclassify migration status."),
        ("Init Wizard", "npm run init", "Interactive setup: defaults\nand environment template."),
        ("Docker Runner", "docker-run.sh", "Run Newman in Docker.\nNo local Node.js needed."),
    ]

    card_w = 370
    card_h = 155
    gap_x = 20
    gap_y = 15
    start_x = (W - 3 * card_w - 2 * gap_x) // 2
    start_y = 175

    for i, (title, cmd, desc) in enumerate(tools):
        col = i % 3
        row = i // 3
        cx = start_x + col * (card_w + gap_x)
        cy = start_y + row * (card_h + gap_y)

        rr(draw, (cx, cy, cx + card_w, cy + card_h), fill=DARK_CARD, r=14)
        draw.text((cx + 18, cy + 14), title, fill=WHITE, font=font(20))

        cf = font(15, mono=True)
        cmd_w = tw(draw, cmd, cf) + 18
        rr(draw, (cx + 18, cy + 44, cx + 18 + cmd_w, cy + 67), fill=CODE_BG, r=8)
        draw.text((cx + 27, cy + 47), cmd, fill=ACCENT, font=cf)

        df = font(17)
        for j, dl in enumerate(desc.split("\n")):
            draw.text((cx + 18, cy + 80 + j * 24), dl, fill=GRAY, font=df)

    footer(draw)
    img.save(os.path.join(OUT, "ph-5-cli.png"), "PNG")
    print("ph-5-cli.png")


if __name__ == "__main__":
    slide1()
    slide2()
    slide3()
    slide4()
    slide5()
    print()
    for f_name in sorted(os.listdir(OUT)):
        if f_name.startswith("ph-") and f_name.endswith(".png"):
            size = os.path.getsize(os.path.join(OUT, f_name))
            print(f"  {f_name}: {size // 1024}KB  ({W}x{H})")
