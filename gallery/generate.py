#!/usr/bin/env python3
from PIL import Image, ImageDraw, ImageFont
import os

W, H = 1080, 1920
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

def wrap_text(text, fnt, draw, max_w):
    words = text.split()
    lines, cur = [], ""
    for w in words:
        test = (cur + " " + w).strip()
        bbox = draw.textbbox((0, 0), test, font=fnt)
        if bbox[2] - bbox[0] > max_w and cur:
            lines.append(cur)
            cur = w
        else:
            cur = test
    if cur:
        lines.append(cur)
    return lines

def text_w(draw, text, f):
    bbox = draw.textbbox((0, 0), text, font=f)
    return bbox[2] - bbox[0]

def footer(draw):
    f = font(32)
    txt = "Hephaestus"
    tw = text_w(draw, txt, f)
    draw.text(((W - tw) // 2, H - 100), txt, fill=WHITE, font=f)
    lx = (W - tw) // 2 - 30
    draw.rectangle((lx, H - 96, lx + 18, H - 78), fill=ACCENT)
    draw.rectangle((lx, H - 84, lx + 18, H - 74), fill=ACCENT)


# ── SLIDE 1: HERO ──
def slide1():
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)
    y = 200

    bf = font(24)
    badge_text = "Open Source  ·  MIT  ·  v3.8.0"
    bw = text_w(draw, badge_text, bf)
    bx = (W - bw - 40) // 2
    rr(draw, (bx, y, bx + bw + 40, y + 48), fill=BADGE_BG, r=24)
    draw.text((bx + 20, y + 12), badge_text, fill=ACCENT, font=bf)
    y += 100

    tf = font(72)
    draw.text((80, y), "API Testing,", fill=WHITE, font=tf)
    y += 90
    draw.text((80, y), "Engineered.", fill=ACCENT, font=tf)
    y += 130

    sf = font(32)
    for line in wrap_text(
        "Модульный zero-dependency движок для Postman & Newman. Напиши тесты один раз — получи assertions, snapshots, отчёты и CI автоматически.",
        sf, draw, W - 160
    ):
        draw.text((80, y), line, fill=GRAY, font=sf)
        y += 46
    y += 50

    stats = [("20+", "assertion\nоператоров"), ("12", "pipeline\nмодулей"), ("10+", "CLI\nинструм."), ("30", "авто-\nтестов")]
    sx = 80
    nf = font(52)
    lf = font(22)
    for num, label in stats:
        draw.text((sx, y), num, fill=WHITE, font=nf)
        for i, ll in enumerate(label.split("\n")):
            draw.text((sx, y + 65 + i * 28), ll, fill=GRAY, font=lf)
        sx += 240
    y += 170

    # Code card
    rr(draw, (60, y, W - 60, y + 640), fill=CODE_BG, r=20)
    for i, c in enumerate([(255, 95, 87), (255, 189, 46), (39, 201, 63)]):
        draw.ellipse((90 + i * 28, y + 20, 106 + i * 28, y + 36), fill=c)
    draw.text((200, y + 17), "method.post-request.js", fill=GRAY, font=font(20, mono=True))

    cf = font(24, mono=True)
    code = [
        [("const ", (200, 200, 255)), ("override = {", GRAY)],
        [],
        [("  expectedStatus: ", GRAY), ("200", GREEN), (",", GRAY)],
        [("  maxResponseTime: ", GRAY), ("1500", GREEN), (",", GRAY)],
        [],
        [("  assertShape: {", GRAY)],
        [('    "data.id":    ', GRAY), ('"number"', GREEN), (",", GRAY)],
        [('    "data.name":  ', GRAY), ('"string"', GREEN), (",", GRAY)],
        [('    "data.items": ', GRAY), ('"array"', GREEN), (",", GRAY)],
        [('    "error":      ', GRAY), ('"absent"', RED), (",", GRAY)],
        [("  },", GRAY)],
        [],
        [("  assertions: {", GRAY)],
        [('    "data.status": ', GRAY), ('{ eq: "active" }', (150, 200, 255)), (",", GRAY)],
        [('    "data.score":  ', GRAY), ("{ gte: 0, lte: 100 }", (150, 200, 255)), (",", GRAY)],
        [("  },", GRAY)],
        [],
        [("  snapshot: { enabled: ", GRAY), ("true", ACCENT), (" }", GRAY)],
        [("};", GRAY)],
    ]
    cy = y + 55
    for tokens in code:
        if not tokens:
            cy += 30
            continue
        cx = 90
        for text, color in tokens:
            draw.text((cx, cy), text, fill=color, font=cf)
            cx += text_w(draw, text, cf)
        cy += 30

    footer(draw)
    img.save(os.path.join(OUT, "slide-1-hero.png"), "PNG")
    print("slide-1-hero.png")


# ── SLIDE 2: PROBLEM → SOLUTION ──
def slide2():
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)
    y = 140

    draw.text((80, y), "WHY HEPHAESTUS", fill=ACCENT, font=font(24))
    y += 50
    draw.text((80, y), "Beyond vanilla", fill=WHITE, font=font(60))
    y += 75
    draw.text((80, y), "Postman", fill=WHITE, font=font(60))
    y += 100

    sf = font(28)
    for line in wrap_text(
        "Postman знаком всем. Hephaestus не заменяет его — а превращает в полноценный тестовый фреймворк.",
        sf, draw, W - 160
    ):
        draw.text((80, y), line, fill=GRAY, font=sf)
        y += 40
    y += 50

    # Before
    rr(draw, (60, y, W - 60, y + 470), fill=BEFORE_BG, r=20)
    draw.ellipse((85, y + 22, 105, y + 42), fill=RED)
    draw.text((120, y + 22), "Vanilla Postman", fill=WHITE, font=font(28))

    problems = [
        "Copy-paste скриптов в каждом запросе",
        "Нет единой структуры между тестами",
        "Auth дублируется per-request",
        "Нет snapshot-регрессии",
        "Нет HTML-отчётов без сторонних тулов",
        "Секреты видны в console.log",
        "Нет валидации массивов",
        "CI требует ручного скриптинга",
    ]
    py = y + 70
    pf = font(25)
    for p in problems:
        draw.text((100, py), "X", fill=RED, font=font(24))
        draw.text((130, py), p, fill=(200, 200, 200), font=pf)
        py += 47
    y += 510

    # After
    rr(draw, (60, y, W - 60, y + 470), fill=AFTER_BG, r=20)
    draw.ellipse((85, y + 22, 105, y + 42), fill=GREEN)
    draw.text((120, y + 22), "C Hephaestus", fill=WHITE, font=font(28))

    solutions = [
        "Один движок, все запросы, ноль дублей",
        "Декларативный override-паттерн",
        "Auth настраивается один раз в defaults",
        "Snapshot baseline + visual diff",
        "HTML-отчёт одной командой",
        "Авто-маскирование токенов и паролей",
        "assertEach, assertShape, assertUnique",
        "JUnit XML, GitHub Actions, Docker",
    ]
    sy = y + 70
    for s in solutions:
        draw.text((100, sy), ">", fill=GREEN, font=font(24))
        draw.text((130, sy), s, fill=(200, 200, 200), font=pf)
        sy += 47

    footer(draw)
    img.save(os.path.join(OUT, "slide-2-why.png"), "PNG")
    print("slide-2-why.png")


# ── SLIDE 3: FEATURES GRID ──
def slide3():
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)
    y = 120

    draw.text((80, y), "ВОЗМОЖНОСТИ", fill=ACCENT, font=font(24))
    y += 50
    draw.text((80, y), "Everything in", fill=WHITE, font=font(56))
    y += 70
    draw.text((80, y), "one engine", fill=WHITE, font=font(56))
    y += 100

    features = [
        ("Assertions", "20+ операторов: exists, eq, gt,\ntype, matches, soft, when.\nassertions + assertShape"),
        ("Snapshot", "Автосохранение baseline.\nStrict / non-strict. Visual diff\nв консоли и Snapshot Viewer."),
        ("Auth", "Basic, Bearer, headers, variables,\nOAuth2 client_credentials.\nАвто-обновление токенов."),
        ("Array Validation", "assertEach проверяет каждый\nэлемент. assertOrder — сорт.\nassertUnique — уникальность."),
        ("Retry & Resilience", "retryOnStatus повторяет запрос\nпри 503/429. Assertions только\nна финальной попытке."),
        ("Schema & Logs", "JSON Schema через tv4.\nСтруктурированные логи с\nмаскированием секретов."),
    ]

    card_w = 460
    card_h = 200
    gap_x = 20
    gap_y = 20
    start_x = (W - 2 * card_w - gap_x) // 2

    for i, (title, desc) in enumerate(features):
        col = i % 2
        row = i // 2
        cx = start_x + col * (card_w + gap_x)
        cy = y + row * (card_h + gap_y)

        rr(draw, (cx, cy, cx + card_w, cy + card_h), fill=DARK_CARD, r=16)

        # icon substitute
        icon_colors = [ACCENT, GREEN, (100, 160, 255), (200, 150, 255), (255, 200, 50), (100, 220, 200)]
        draw.rounded_rectangle((cx + 18, cy + 15, cx + 48, cy + 45), radius=8, fill=icon_colors[i])

        draw.text((cx + 60, cy + 17), title, fill=WHITE, font=font(26))

        df = font(21)
        for j, dl in enumerate(desc.split("\n")):
            draw.text((cx + 20, cy + 60 + j * 28), dl, fill=GRAY, font=df)

    y += 3 * (card_h + gap_y) + 40

    # Pipeline architecture diagram
    rr(draw, (60, y, W - 60, y + 380), fill=DARK_CARD, r=20)
    draw.text((90, y + 20), "PIPELINE ARCHITECTURE", fill=ACCENT, font=font(22))

    draw.text((90, y + 65), "PRE-REQUEST", fill=WHITE, font=font(26))
    pre_modules = ["configMerge", "urlBuilder", "auth", "dateUtils", "logger"]
    mx = 90
    mf = font(18, mono=True)
    for m in pre_modules:
        mw = text_w(draw, m, mf) + 20
        rr(draw, (mx, y + 100, mx + mw, y + 128), fill=CODE_BG, r=8)
        draw.text((mx + 10, y + 104), m, fill=ACCENT, font=mf)
        mx += mw + 8
        if mx + 80 > W - 80:
            mx = 90

    draw.text((W // 2 - 20, y + 145), ">>>  HTTP  >>>", fill=GRAY, font=font(22, mono=True))

    draw.text((90, y + 190), "POST-REQUEST", fill=WHITE, font=font(26))
    post_modules = ["normalize", "metrics", "extractor", "assertions",
                     "assertHeaders", "snapshot", "schema", "plugins", "logger"]
    mx = 90
    for m in post_modules:
        mw = text_w(draw, m, mf) + 20
        if mx + mw > W - 80:
            mx = 90
        rr(draw, (mx, y + 230, mx + mw, y + 258), fill=CODE_BG, r=8)
        draw.text((mx + 10, y + 234), m, fill=GREEN, font=mf)
        mx += mw + 8

    mx = 90
    post2 = ["assertEach", "assertShape", "assertOrder", "assertUnique", "retryOnStatus"]
    for m in post2:
        mw = text_w(draw, m, mf) + 20
        if mx + mw > W - 80:
            mx = 90
        rr(draw, (mx, y + 275, mx + mw, y + 303), fill=CODE_BG, r=8)
        draw.text((mx + 10, y + 279), m, fill=GREEN, font=mf)
        mx += mw + 8

    draw.text((90, y + 330), "ctx = { config, request, response, api }", fill=GRAY, font=font(20, mono=True))

    footer(draw)
    img.save(os.path.join(OUT, "slide-3-features.png"), "PNG")
    print("slide-3-features.png")


# ── SLIDE 4: USE CASES ──
def slide4():
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)
    y = 120

    draw.text((80, y), "USE CASES", fill=ACCENT, font=font(24))
    y += 50
    draw.text((80, y), "Что делают", fill=WHITE, font=font(52))
    y += 65
    draw.text((80, y), "c Hephaestus", fill=WHITE, font=font(52))
    y += 100

    cases = [
        ("01", "Регрессия на каждый деплой",
         "Snapshot ответа API на staging. Newman в CI\nпосле деплоя. Структура изменилась — падает."),
        ("02", "Контрактное тестирование",
         "assertShape задаёт контракт по полям.\nФронтенд знает что ожидать. Строка на поле."),
        ("03", "Data-driven сценарии",
         "CSV с 10 000 юзеров через Newman.\nctx.iteration даёт данные строки в скриптах."),
        ("04", "OAuth2 Auth Flow",
         "Настрой oauth2cc один раз в defaults.\nТокен кэшируется, обновляется за 60 сек."),
        ("05", "Flaky API Handling",
         "API отдаёт 503 периодически?\nretryOnStatus повторяет. Тесты — на финале."),
    ]

    for i, (num, title, desc) in enumerate(cases):
        cy = y + i * 260
        rr(draw, (60, cy, W - 60, cy + 240), fill=DARK_CARD, r=16)
        draw.text((90, cy + 20), f"USE CASE {num}", fill=ACCENT, font=font(20))
        draw.text((90, cy + 55), title, fill=WHITE, font=font(30))

        df = font(24)
        for j, dl in enumerate(desc.split("\n")):
            draw.text((90, cy + 100 + j * 36), dl, fill=GRAY, font=df)

    footer(draw)
    img.save(os.path.join(OUT, "slide-4-usecases.png"), "PNG")
    print("slide-4-usecases.png")


# ── SLIDE 5: CLI TOOLS ──
def slide5():
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)
    y = 120

    draw.text((80, y), "ЭКОСИСТЕМА", fill=ACCENT, font=font(24))
    y += 50
    draw.text((80, y), "CLI tools for", fill=WHITE, font=font(56))
    y += 70
    draw.text((80, y), "every workflow", fill=WHITE, font=font(56))
    y += 90

    draw.text((80, y), "npm run <command>  — без установок", fill=GRAY, font=font(26))
    y += 70

    tools = [
        ("API Docs", "npm run docs", "Markdown из коллекции.\nТесты = документация."),
        ("Summary", "npm run summary", "Pass rate, top-5\nмедленных, падения."),
        ("Compare", "npm run compare", "Diff двух прогонов:\nновые падения."),
        ("Watch", "npm run watch", "Авто-перезапуск\nNewman при правках."),
        ("HTML Report", "npm run report", "SVG-датчик, тайминги,\nassertions, поиск."),
        ("JUnit XML", "npm run ci-to-junit", "Newman JSON в XML\nдля Jenkins/GitLab."),
        ("Migration", "npm run migrate", "Сканирует коллекцию,\nстатус миграции."),
        ("Init Wizard", "npm run init", "Настройка defaults\nи environment."),
        ("Docker", "docker-run.sh", "Newman в контейнере.\nNode.js не нужен."),
    ]

    card_w = 310
    card_h = 190
    gap_x = 15
    gap_y = 15
    start_x = (W - 3 * card_w - 2 * gap_x) // 2

    for i, (title, cmd, desc) in enumerate(tools):
        col = i % 3
        row = i // 3
        cx = start_x + col * (card_w + gap_x)
        cy = y + row * (card_h + gap_y)

        rr(draw, (cx, cy, cx + card_w, cy + card_h), fill=DARK_CARD, r=14)
        draw.text((cx + 16, cy + 14), title, fill=WHITE, font=font(24))

        cf = font(17, mono=True)
        cmd_w = text_w(draw, cmd, cf) + 20
        rr(draw, (cx + 16, cy + 48, cx + 16 + cmd_w, cy + 74), fill=CODE_BG, r=8)
        draw.text((cx + 26, cy + 52), cmd, fill=ACCENT, font=cf)

        df = font(20)
        for j, dl in enumerate(desc.split("\n")):
            draw.text((cx + 16, cy + 88 + j * 28), dl, fill=GRAY, font=df)

    y += 3 * (card_h + gap_y) + 30

    # npm test bar
    rr(draw, (60, y, W - 60, y + 90), fill=DARK_CARD, r=16)
    draw.text((90, y + 12), "npm test", fill=ACCENT, font=font(24, mono=True))
    draw.text((90, y + 48), "30 автотестов для всех скриптов. В CI на каждый push.", fill=GRAY, font=font(22))

    y += 130

    # Quick start
    rr(draw, (60, y, W - 60, y + 200), fill=CODE_BG, r=16)
    draw.text((90, y + 20), "Quick Start", fill=WHITE, font=font(28))
    steps = [
        ("1.", "Import collection в Postman"),
        ("2.", "Настрой defaults (baseUrl, auth)"),
        ("3.", "Send engine-update"),
        ("4.", "Пиши override-конфиги — готово!"),
    ]
    qf = font(22)
    for i, (n, s) in enumerate(steps):
        draw.text((90, y + 65 + i * 32), n, fill=ACCENT, font=qf)
        draw.text((120, y + 65 + i * 32), s, fill=GRAY, font=qf)

    footer(draw)
    img.save(os.path.join(OUT, "slide-5-cli.png"), "PNG")
    print("slide-5-cli.png")


if __name__ == "__main__":
    slide1()
    slide2()
    slide3()
    slide4()
    slide5()

    for f_name in sorted(os.listdir(OUT)):
        if f_name.endswith(".png"):
            size = os.path.getsize(os.path.join(OUT, f_name))
            print(f"  {f_name}: {size // 1024}KB")
