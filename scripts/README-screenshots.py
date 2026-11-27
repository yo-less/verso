#!/usr/bin/env python3
"""Capture actual Verso pages on a disposable loopback instance."""
import json
import os
import sys
from pathlib import Path
from urllib.parse import urlparse

from PIL import Image, ImageDraw, ImageFont
from playwright.sync_api import sync_playwright, expect

BASE = os.environ["DEMO_URL"].rstrip("/")
OUT = Path(os.environ["DEMO_OUT"])
USER = "Jonas"
# Deliberately disposable and never usable on a production server.
PASSWORD = "Demo-only-Read!2026"
assert urlparse(BASE).hostname in ("127.0.0.1", "localhost"), "Loopback only"
OUT.mkdir(parents=True, exist_ok=True)


def open_page(page, path):
    response = page.goto(BASE + path, wait_until="domcontentloaded")
    if not response or not response.ok:
        raise RuntimeError(f"Navigation failed: {path} ({response.status if response else 'no response'})")
    page.evaluate("document.fonts.ready.then(() => true)")
    page.wait_for_timeout(400)
    for dialog, action in [("#welcome-dialog[open]", "[data-welcome-skip]"),
                           ("#whats-new-dialog[open]", "[data-dialog-close]")]:
        target = page.locator(dialog)
        if target.count():
            target.locator(action).first.click()
            expect(target).not_to_be_visible()
    # Dismiss only the known demo setup notice, not unexpected warnings.
    notice = page.locator('[data-dismiss-url*="duplicate"]')
    if notice.count():
        notice.first.click()
        expect(notice.first).not_to_be_visible()
    page.wait_for_timeout(200)


def login(page):
    open_page(page, "/login")
    page.locator("#username").fill(USER)
    page.locator("#password").fill(PASSWORD)
    page.locator("button[name=submit]").click()
    expect(page.locator('.brand img[alt="Verso"]:visible').first).to_be_visible(timeout=30000)
    open_page(page, "/")


def setup(browser):
    page = browser.new_page(viewport={"width": 1440, "height": 900}, locale="en-US")
    open_page(page, "/setup")
    page.locator("#name").fill(USER)
    page.locator("#password").fill(PASSWORD)
    page.locator("[data-setup-submit]").click()
    expect(page.locator('.brand img[alt="Verso"]:visible').first).to_be_visible(timeout=30000)
    page.close()


def set_theme(page, theme):
    page.emulate_media(color_scheme=theme, reduced_motion="reduce")
    page.evaluate("(theme) => localStorage.setItem('cwa-theme', theme)", theme)


def shot(page, filename, selector=None, full=False):
    page.evaluate("document.fonts.ready.then(() => true)")
    page.evaluate("""async () => {
        await Promise.all([...document.images].filter(i => i.getBoundingClientRect().top < innerHeight)
            .map(i => i.decode().catch(() => {})));
    }""")
    page.wait_for_timeout(250)
    if selector:
        expect(page.locator(selector).first).to_be_visible(timeout=15000)
    path = OUT / filename
    page.screenshot(path=str(path), full_page=full, animations="disabled")
    print(f"Captured {filename}", flush=True)
    return path


def preset(page, name):
    open_page(page, "/me/appearance")
    page.locator("[data-ap-preset='"+name+"']").click()
    save = page.locator("[data-ap-savebar] button[type=submit]")
    if save.is_visible():
        save.click()
        page.wait_for_load_state("domcontentloaded")
    open_page(page, "/me/appearance")


def compose(name, paths, widths, background="#e8dfd0", gap=30):
    images = []
    for path, width in zip(paths, widths):
        with Image.open(path) as src:
            image = src.convert("RGB")
            image = image.resize((width, round(image.height*width/image.width)), Image.Resampling.LANCZOS)
            images.append(image)
    canvas = Image.new("RGB", (sum(widths)+gap*(len(widths)+1), max(i.height for i in images)+2*gap), background)
    x = gap
    for image in images:
        canvas.paste(image, (x, (canvas.height-image.height)//2))
        x += image.width + gap
    canvas.save(OUT / name, optimize=True)


def capture(browser):
    ctx = browser.new_context(viewport={"width":1440,"height":900}, device_scale_factor=4/3,
                              locale="en-US", color_scheme="light", reduced_motion="reduce",
                              service_workers="block")
    page = ctx.new_page()
    open_page(page, "/login")
    controls = [page.locator(sel).bounding_box() for sel in ("#username", "#password", "button[name=submit]")]
    assert max(c["height"] for c in controls) - min(c["height"] for c in controls) <= 1, controls
    assert max(c["width"] for c in controls) - min(c["width"] for c in controls) <= 1, controls
    shot(page, "login.png", "#username")
    login(page)
    for theme in ("light", "dark"):
        set_theme(page, theme)
        open_page(page, "/")
        expect(page.locator(".continue-card").first).to_be_visible()
        shot(page, f"library-{theme}.png", ".book-card")
        if theme == "light":
            page.evaluate("window.scrollTo(0, document.getElementById('books-heading').getBoundingClientRect().top + scrollY - 88)")
            shot(page, "hero-library.png", "#books-heading")
            page.evaluate("window.scrollTo(0, 0)")
        href = page.locator(".continue-card").filter(has_text="Moby-Dick").first.get_attribute("href")
        assert href, "Missing Moby-Dick detail link"
        open_page(page, href)
        shot(page, f"book-{theme}.png", "h1")
        open_page(page, "/me")
        # Discover the profile URL from the actual navigation if the route differs.
        if not page.locator("#kobo").count():
            href = page.locator('a[href$="#devices"]').first.get_attribute("href")
            if href:
                page.goto(BASE + href)
        expect(page.locator("#kobo")).to_be_visible()
        page.locator("#kobo").scroll_into_view_if_needed()
        page.evaluate("document.getElementById('kobo').scrollIntoView({block:'start'})")
        # Capture before a token is generated; nothing private is included.
        shot(page, f"kobo-{theme}.png", "#kobo")
        open_page(page, "/highlights")
        expect(page.get_by_text("Call me Ishmael.", exact=False).first).to_be_visible()
        shot(page, f"highlights-{theme}.png", "h1")
    open_page(page, "/admin/branding")
    expect(page.locator("#name")).to_have_value("Verso")
    shot(page, "branding.png", "#name", full=True)
    open_page(page, "/me/appearance")
    page.locator("[data-ap-preset='aurora']").click()
    shot(page, "customize-dark.png", "#ap-form")
    # Revert preview before navigating, avoiding the unsaved-changes dialog.
    page.locator("[data-ap-revert]").click()
    set_theme(page, "light")
    preset(page, "sunset")
    open_page(page, "/")
    shot(page, "styled-sunset-light.png", ".book-card")
    preset(page, "stock")
    open_page(page, "/year")
    expect(page.locator(".yr-brand img")).to_have_attribute("src", __import__("re").compile(r"wordmark-dark\.svg$"))
    expect(page.locator(".yr-poster-wordmark")).to_have_attribute("src", __import__("re").compile(r"wordmark\.svg$"))
    expect(page.locator(".yr-slide.is-active")).to_be_visible()
    page.locator("[data-yr-pause]").click()
    targets = ["intro", "finished", "authors", "rhythm", "summary"]
    found = {}
    count = page.locator(".yr-slide").count()
    for _ in range(count):
        active = page.locator(".yr-slide.is-active")
        classes = active.get_attribute("class") or ""
        for target in targets:
            if f"yr-s-{target}" in classes:
                found[target] = shot(page, f"year-{target}.png", ".yr-slide.is-active")
        page.keyboard.press("ArrowRight")
        page.wait_for_timeout(450)
    if set(found) != set(targets):
        raise RuntimeError("Missing year slides: " + str(set(targets)-set(found)))
    # Four readable story panels, rather than five tiny screenshots in one row.
    selected = ["intro", "finished", "rhythm", "summary"]
    gap, width = 22, 900
    panels = []
    for target in selected:
        with Image.open(found[target]) as src:
            img = src.convert("RGB")
            panels.append(img.resize((width, round(img.height*width/img.width)), Image.Resampling.LANCZOS))
    height = max(img.height for img in panels)
    canvas = Image.new("RGB", (2*width+3*gap, 2*height+3*gap), "#102e20")
    for i,img in enumerate(panels):
        canvas.paste(img, (gap+(i%2)*(width+gap), gap+(i//2)*(height+gap)))
    canvas.save(OUT/"year.png", optimize=True)
    mobile = browser.new_context(viewport={"width":390,"height":844}, device_scale_factor=2,
                                 is_mobile=True, has_touch=True, locale="en-US",
                                 color_scheme="light", reduced_motion="reduce", service_workers="block")
    phone = mobile.new_page()
    open_page(phone, "/login")
    mobile_login = shot(phone, "mobile-login.png", "#username")
    login(phone)
    home = shot(phone, "mobile-home.png", ".book-card")
    set_theme(phone, "dark")
    open_page(phone, "/")
    href = phone.locator(".continue-card").filter(has_text="Moby-Dick").first.get_attribute("href")
    assert href, "Missing mobile Moby-Dick detail link"
    open_page(phone, href)
    book = shot(phone, "mobile-book.png", "h1")
    open_page(phone, "/highlights")
    highlights = shot(phone, "mobile-highlights.png", "h1")
    compose("mobile.png", [home,book,highlights], [440]*3, gap=24)
    compose("hero.png", [mobile_login, OUT/"hero-library.png"], [390,1500], background="#e8dfd0", gap=25)
    mobile.close()
    ctx.close()


def contact_sheet():
    names = ["hero.png", "login.png", "library-light.png", "library-dark.png", "book-light.png",
             "book-dark.png", "kobo-light.png", "kobo-dark.png", "customize-dark.png",
             "styled-sunset-light.png", "year.png", "highlights-light.png", "highlights-dark.png",
             "mobile.png", "branding.png"]
    images = []
    for name in names:
        path = OUT / name
        if path.exists():
            with Image.open(path) as source:
                thumb = source.convert("RGB")
                thumb.thumbnail((620, 390))
                images.append((name, thumb))
    sheet = Image.new("RGB", (1320, max(440, 440*((len(images)+1)//2))), "#e8dfd0")
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 18)
    for i,(name,image) in enumerate(images):
        x, y = (i%2)*660+20, (i//2)*440+20
        draw.text((x,y),name,fill="#1b3a2e",font=font)
        sheet.paste(image,(x,y+32))
    sheet.save(OUT/"contact-sheet.png")
    (OUT/"manifest.json").write_text(json.dumps({"commit":os.getenv("GITHUB_SHA"), "source":"actual local browser captures", "screenshots":[name for name,_ in images]},indent=2))


if __name__ == "__main__":
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        try:
            if sys.argv[1] == "setup":
                setup(browser)
            else:
                capture(browser)
        finally:
            browser.close()
            if sys.argv[1] != "setup":
                contact_sheet()
