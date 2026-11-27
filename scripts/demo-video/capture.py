#!/usr/bin/env python3
"""Additional real UI captures for the feature-led demo."""
import importlib.util
import io
import json
import os
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("capture_base", ROOT / "scripts/README-screenshots.py")
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)

def seed_stats(root):
    # Run only against a disposable, seeded demo while the container is stopped.
    assert (root / ".verso-screenshot-demo").is_file()
    with sqlite3.connect(root / "config/app.db") as db:
        uid = db.execute("SELECT id FROM user WHERE name='Alex'").fetchone()[0]
    target = root / "config/reading_stats" / f"{uid}-web.sqlite3"
    target.parent.mkdir(exist_ok=True)
    assert not target.exists()
    now = datetime.now().replace(hour=20, minute=0, second=0, microsecond=0)
    start = max(now.replace(month=1, day=1), now - timedelta(days=200))
    days = (now - start).days
    dates = sorted({start + timedelta(days=int(days*i/39)) for i in range(40)} |
                   {now - timedelta(days=i) for i in range(min(7,days+1))})
    with sqlite3.connect(target) as db:
        db.executescript("""CREATE TABLE book(id integer primary key,title text,authors text,md5 text,pages integer);
        CREATE TABLE page_stat_data(id_book integer,page integer,start_time integer,duration integer,total_pages integer);""")
        titles = [("Pride and Prejudice","Jane Austen"),("Jane Eyre","Charlotte Brontë"),
                  ("The Time Machine","H. G. Wells"),("Frankenstein","Mary Shelley")]
        db.executemany("INSERT INTO book VALUES(?,?,?,?,?)", [(i+1,t,a,"demo-"+str(i),320) for i,(t,a) in enumerate(titles)])
        for i,day in enumerate(dates):
            for page in range(16+i%15):
                db.execute("INSERT INTO page_stat_data VALUES(?,?,?,?,?)",
                           (i%4+1, (i*19+page)%320+1, int(day.timestamp())+page*75, 60+i%15,320))
    # The reading history is fictional, like the rest of the demo seed.

def scroll_strip(page, prefix, destination, frames=25):
    """Capture actual browser scrolling, not a dissolve between unrelated pages."""
    start = page.evaluate("window.scrollY")
    for i in range(frames):
        progress = i / (frames - 1)
        progress = progress * progress * (3 - 2 * progress)
        page.evaluate("(y) => window.scrollTo(0,y)", start + (destination-start)*progress)
        page.evaluate("() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))")
        page.screenshot(path=str(base.OUT / f"{prefix}-{i}.png"), animations="disabled")

def additional():
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        ctx = browser.new_context(viewport={"width":1440,"height":900}, device_scale_factor=1,
                                  locale="en-US",color_scheme="light",reduced_motion="reduce",service_workers="block")
        page = ctx.new_page()
        base.login(page)
        base.set_theme(page,"light")
        base.open_page(page,"/")
        card = page.locator(".book-card").filter(has_text="Moby-Dick").first
        expect(card).to_be_visible()
        cover = card.locator(".cover img")
        expect(cover).to_be_visible()
        cover.evaluate("img => img.decode()")
        # Fetch actual image bytes, never a clipped viewport screenshot: sticky
        # headers and browser overlays can otherwise contaminate cover art.
        cover_url = cover.evaluate("img => img.currentSrc || img.src")
        response = page.request.get(cover_url)
        assert response.ok, (cover_url, response.status)
        with Image.open(io.BytesIO(response.body())) as source:
            source.convert("RGB").save(base.OUT / "moby-cover.png")
        # Center the actual target card, not the books heading, which may
        # appear after it depending on the seeded shelf layout.
        card.evaluate("el => el.scrollIntoView({block:'center', inline:'nearest', behavior:'instant'})")
        page.evaluate("() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))")
        base.shot(page,"import-library.png",".book-card")
        import_card = card.bounding_box()
        import_cover = cover.bounding_box()
        assert import_card and import_card["y"] >= 0 and import_card["y"] + import_card["height"] <= 900, import_card
        assert import_cover and import_cover["y"] >= 0 and import_cover["y"] + import_cover["height"] <= 900, import_cover
        try:
            card.evaluate("el => el.style.visibility = 'hidden'")
            page.screenshot(path=str(base.OUT/"import-empty.png"), animations="disabled")
        finally:
            card.evaluate("el => el.style.visibility = ''")
        for title, filename in (("Pride and Prejudice","pride-cover.png"),("Frankenstein","frankenstein-cover.png")):
            cover = page.locator(".book-card").filter(has_text=title).first.locator(".cover img")
            expect(cover).to_be_visible()
            cover.evaluate("img => img.decode()")
            cover.screenshot(path=str(base.OUT/filename), animations="disabled")
        page.evaluate("window.scrollTo(0,0)")
        base.shot(page,"theme-light.png",".book-card")
        destination = page.evaluate("Math.max(0,document.getElementById('books-heading').getBoundingClientRect().top + scrollY - 88)")
        scroll_strip(page,"browse-scroll",destination,frames=49)
        query = page.locator("#query")
        query.click()
        search_box = query.bounding_box()
        assert search_box and search_box["width"] > 100 and 0 <= search_box["y"] < 900, search_box
        # Preserve the scrolled shelf; the sticky search bar remains available.
        for i in range(len("Jane Austen") + 1):
            query.fill("Jane Austen"[:i])
            page.screenshot(path=str(base.OUT / f"browse-type-{i}.png"), animations="disabled")
        base.shot(page,"browse-typed.png","#query")
        # Capture the real search control at 4x device resolution, so the
        # emphasis shot never enlarges low-resolution raster text.
        sharp = browser.new_context(viewport={"width":1440,"height":900},device_scale_factor=4,
                                    storage_state=ctx.storage_state(),locale="en-US",
                                    color_scheme="light",reduced_motion="reduce",service_workers="block")
        sharp_page = sharp.new_page()
        base.open_page(sharp_page,"/")
        sharp_page.evaluate("(y) => window.scrollTo(0,y)", destination)
        sharp_query = sharp_page.locator("#query")
        sharp_query.click()
        for i in range(len("Jane Austen") + 1):
            sharp_query.fill("Jane Austen"[:i])
            sharp_query.screenshot(path=str(base.OUT / f"search-sharp-{i}.png"),animations="disabled")
        sharp.close()
        page.locator("#query").press("Enter")
        page.wait_for_load_state("domcontentloaded")
        expect(page.locator(".book-card").first).to_be_visible()
        base.shot(page,"search.png",".book-card")
        base.shot(page,"browse-results.png",".book-card")
        base.open_page(page,"/")
        href = page.locator(".continue-card").filter(has_text="Moby-Dick").first.get_attribute("href")
        base.open_page(page,href)
        related = page.locator(".similar-books")
        expect(related).to_be_visible()
        page.evaluate("window.scrollTo(0,0)")
        base.shot(page,"detail-scroll-0.png","h1")
        # Extract the real related-title section; no simulated scroll in the edit.
        related.evaluate("el => el.scrollIntoView({block:'center', behavior:'instant'})")
        page.wait_for_timeout(400)
        related.screenshot(path=str(base.OUT/"related.png"),animations="disabled")
        section_box = related.bounding_box()
        related_cards = related.locator(".book-card")
        assert section_box and related_cards.count() > 0
        card_boxes = [related_cards.nth(i).bounding_box() for i in range(related_cards.count())]
        assert all(card_boxes), card_boxes
        # Trim unused trailing grid columns without removing any book or header.
        header_box = related.locator(".section-header").bounding_box()
        header_text = related.locator(".section-header p").bounding_box()
        right = max([b["x"]+b["width"] for b in card_boxes] +
                    [header_text["x"]+header_text["width"]])
        with Image.open(base.OUT/"related.png") as im:
            crop_right = min(im.width, max(1, round(right - section_box["x"] + 16)))
            # If the header spans the section, leave the entire real section.
            im.crop((0,0,crop_right,im.height)).save(base.OUT/"related-focus.png")
        # The Moby-Dick artwork was already extracted from its image URL.
        base.open_page(page,"/reading-stats")
        expect(page.locator(".rs-heatmap")).to_be_visible()
        base.shot(page,"stats.png",".rs-heatmap")
        stats = page.locator(".rs-tile-value").all_text_contents()
        page.locator("#rs-30-h").scroll_into_view_if_needed()
        page.evaluate("document.getElementById('rs-30-h').scrollIntoView({block:'start'})")
        base.shot(page,"stats-detail.png","#rs-30-h")
        base.open_page(page,"/admin/branding")
        base.shot(page,"branding-viewport.png","#name")
        branding_focus = []
        for i, selectors in enumerate((("#name",),("#asset-wordmark",),("#background","#accent"),
                                       ("#asset-favicon",),("#asset-login",))):
            fields = [page.locator(sel).locator("xpath=ancestor::div[contains(concat(' ', normalize-space(@class), ' '), ' field ')][1]") for sel in selectors]
            fields[0].evaluate("el => el.scrollIntoView({block:'center', behavior:'instant'})")
            page.evaluate("() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))")
            boxes = [f.bounding_box() for f in fields]
            assert all(b and b["y"] >= 0 and b["y"] + b["height"] <= 900 for b in boxes), (selectors,boxes)
            base.shot(page,f"branding-focus-{i}.png",selectors[0])
            branding_focus.append(boxes)
        base.set_theme(page,"dark")
        base.open_page(page,"/")
        base.shot(page,"theme-dark.png",".book-card")
        base.set_theme(page,"light")
        base.preset(page,"sunset")
        base.open_page(page,"/")
        base.shot(page,"theme-sunset.png",".book-card")
        base.preset(page,"ocean")
        base.open_page(page,"/")
        base.shot(page,"styled-ocean.png",".book-card")
        base.shot(page,"theme-ocean.png",".book-card")
        base.preset(page,"stock")
        # Capture actual portrait story layouts, including complete headers.
        portrait = browser.new_context(viewport={"width":420,"height":840},device_scale_factor=2,
                                       locale="en-US",color_scheme="dark",reduced_motion="reduce",service_workers="block")
        story = portrait.new_page()
        base.login(story)
        base.open_page(story,"/year")
        expect(story.locator(".yr-brand img")).to_be_visible()
        story.locator("[data-yr-pause]").click()
        targets = {"intro","finished","authors","rhythm","summary"}
        found = set()
        for _ in range(story.locator(".yr-slide").count()):
            active = story.locator(".yr-slide.is-active")
            classes = active.get_attribute("class") or ""
            for name in targets:
                if f"yr-s-{name}" in classes:
                    base.shot(story,f"story-{name}.png",".yr-slide.is-active")
                    found.add(name)
            story.keyboard.press("ArrowRight")
            story.wait_for_timeout(450)
        assert found == targets, (found, targets)
        portrait.close()
        (base.OUT/"video-data.json").write_text(json.dumps({"stats":stats,"importCard":import_card,"importCover":import_cover,"searchBox":search_box,"brandingFocus":branding_focus}))
        ctx.close()
        browser.close()

if __name__ == "__main__":
    import sys
    if sys.argv[1] == "seed":
        seed_stats(Path(os.environ["DEMO_ROOT"]))
    else:
        additional()
