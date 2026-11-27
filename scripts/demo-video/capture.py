#!/usr/bin/env python3
"""Additional real UI captures for the feature-led demo."""
import importlib.util
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

def additional():
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        ctx = browser.new_context(viewport={"width":1440,"height":900}, device_scale_factor=1,
                                  locale="en-US",color_scheme="light",reduced_motion="reduce",service_workers="block")
        page = ctx.new_page()
        base.login(page)
        base.set_theme(page,"light")
        base.open_page(page,"/")
        page.locator("#query").fill("Jane Austen")
        page.locator("#query").press("Enter")
        page.wait_for_load_state("domcontentloaded")
        expect(page.locator(".book-card").first).to_be_visible()
        base.shot(page,"search.png",".book-card")
        base.open_page(page,"/")
        href = page.locator(".continue-card").filter(has_text="Moby-Dick").first.get_attribute("href")
        base.open_page(page,href)
        related = page.locator(".similar-books")
        expect(related).to_be_visible()
        related.scroll_into_view_if_needed()
        page.wait_for_timeout(400)
        related.screenshot(path=str(base.OUT/"related.png"),animations="disabled")
        cover = page.locator(".detail-aside .cover img").first
        expect(cover).to_be_visible()
        cover.screenshot(path=str(base.OUT/"moby-cover.png"),animations="disabled")
        base.open_page(page,"/reading-stats")
        expect(page.locator(".rs-heatmap")).to_be_visible()
        base.shot(page,"stats.png",".rs-heatmap")
        stats = page.locator(".rs-tile-value").all_text_contents()
        base.open_page(page,"/admin/branding")
        base.shot(page,"branding-viewport.png","#name")
        base.preset(page,"ocean")
        base.open_page(page,"/")
        base.shot(page,"styled-ocean.png",".book-card")
        base.preset(page,"stock")
        # Portrait story panels crop out the desktop letterbox; no simulated UI.
        for name in ("intro","finished","authors","rhythm","summary"):
            path = base.OUT/f"year-{name}.png"
            with Image.open(path) as im:
                w,h = im.size
                sw = round(w*520/1440)
                im.crop(((w-sw)//2,0,(w+sw)//2,h)).save(base.OUT/f"story-{name}.png")
        (base.OUT/"video-data.json").write_text(json.dumps({"stats":stats}))
        ctx.close()
        browser.close()

if __name__ == "__main__":
    import sys
    if sys.argv[1] == "seed":
        seed_stats(Path(os.environ["DEMO_ROOT"]))
    else:
        additional()
