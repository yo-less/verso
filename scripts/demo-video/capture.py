#!/usr/bin/env python3
"""Additional real UI captures for the feature-led demo."""
import importlib.util
import io
import json
import math
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
    with sqlite3.connect(root / "library" / "metadata.db") as library:
        moby_id = library.execute("SELECT id FROM books WHERE title='Moby-Dick'").fetchone()[0]
    with sqlite3.connect(root / "config/app.db") as db:
        uid = db.execute("SELECT id FROM user WHERE name='Jonas'").fetchone()[0]
        # The real detail view identifies KOReader by its stored book-id
        # record; keep the existing 38% Kobo bookmark consistent.
        db.execute("""INSERT INTO kosync_progress
                    (user_id,document,progress,percentage,device,device_id,timestamp)
                    VALUES(?,?,?,?,?,?,?)""",
                   (uid,str(moby_id),"/body/DocFragment[1]/body/p[1]",38,"Kindle Colorsoft","demo-koreader",
                    datetime.utcnow().replace(microsecond=0).isoformat(" ")))
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
        # Use the real library IDs with the same fallback key the web reader writes.
        # Fictional reading events, but genuine associations with local books.
        with sqlite3.connect(root / "library" / "metadata.db") as library:
            library_ids = dict(library.execute("SELECT title, id FROM books"))
        db.executemany("INSERT INTO book VALUES(?,?,?,?,?)",
                       [(i+1,t,a,f"scriptorium-{library_ids[t]}",320) for i,(t,a) in enumerate(titles)])
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

def capture_branding(page):
    base.open_page(page,"/admin/branding")
    # Check the real, styled input; the screenshot is never retouched.
    file_input = page.locator("#asset-wordmark")
    assert file_input.evaluate("""el => {
        const button = getComputedStyle(el, '::file-selector-button');
        return parseFloat(button.borderRadius) > 0 && parseFloat(button.minHeight) >= 34;
    }""")
    base.shot(page,"branding-viewport.png","#name")
    branding_focus = []
    for i, selectors in enumerate((("#name",),("#asset-wordmark",),("#background","#accent"),
                                   ("#asset-favicon",),("#asset-login",))):
        fields = [page.locator(sel).locator("xpath=ancestor::div[contains(concat(' ', normalize-space(@class), ' '), ' field ')][1]") for sel in selectors]
        fields[0].evaluate("el => el.scrollIntoView({block:'center', behavior:'instant'})")
        page.evaluate("() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))")
        boxes = [f.bounding_box() for f in fields]
        assert all(b and b["y"] >= 0 and b["y"] + b["height"] <= 900 for b in boxes), (selectors,boxes)
        expect(fields[0]).to_be_visible()
        base.shot(page,f"branding-focus-{i}.png")
        branding_focus.append(boxes)
    return branding_focus

def capture_year(browser):
    with browser.new_context(viewport={"width":420,"height":840}, device_scale_factor=2,
                             locale="en-US", reduced_motion="no-preference",
                             is_mobile=True, has_touch=True, service_workers="block") as context:
        story = context.new_page()
        base.login(story)
        base.open_page(story,"/year")
        expect(story.locator(".yr-landscape img")).to_be_visible()
        story.locator(".yr-landscape img").evaluate("image => image.decode()")
        story.locator("[data-yr-pause]").tap()
        brand = story.locator(".yr-brand img").bounding_box()
        progress = story.locator(".yr-progress").bounding_box()
        assert brand and progress and brand["y"] >= progress["y"] + progress["height"] + 8, (brand, progress)
        review = Path(os.environ.get("VIDEO_OUT", str(base.OUT))) / "year-review"
        review.mkdir(parents=True, exist_ok=True)
        targets = {"intro","finished","authors","rhythm","summary"}
        captured = set()
        for _ in range(story.locator(".yr-slide").count()):
            active = story.locator(".yr-slide.is-active")
            classes = set(active.get_attribute("class").split())
            story.wait_for_timeout(1550)
            # Global dark-theme heading rules must never override the
            # mobile story palette (including on the intro and rhythm).
            assert active.evaluate("""el => [...el.querySelectorAll('h1,h2,h3')].every(
                heading => getComputedStyle(heading).color === 'rgb(16, 46, 32)')""")
            name = next((cls.removeprefix("yr-s-") for cls in classes if cls.startswith("yr-s-")), "unknown")
            if name in targets:
                base.shot(story,f"year-mobile-{name}.png",".yr-slide.is-active")
                captured.add(name)
            story.screenshot(path=str(review / f"mobile-{name}.png"), animations="disabled")
            if captured == targets:
                break
            story.locator(".yr-tap--next").tap()
        assert captured == targets, captured


def additional():
    with sync_playwright() as pw:
        browser = pw.chromium.launch(args=["--lang=en-US"])
        ctx = browser.new_context(viewport={"width":1440,"height":900}, device_scale_factor=1,
                                  locale="en-US",color_scheme="light",reduced_motion="reduce",service_workers="block")
        # Both closing plates use precisely the same browser viewport, CSS
        # object-position, background image and colour scheme.
        closing = browser.new_context(viewport={"width":1440,"height":900},
                                      device_scale_factor=4/3,locale="en-US",
                                      color_scheme="light",reduced_motion="reduce",service_workers="block")
        login_page = closing.new_page()
        base.open_page(login_page,"/login")
        base.shot(login_page,"login.png","#username")
        login_page.locator(".instance-login").evaluate("el => el.style.visibility = 'hidden'")
        base.shot(login_page,"login-background.png",".login-landscape-background")
        closing.close()
        page = ctx.new_page()
        base.login(page)
        base.set_theme(page,"light")
        base.open_page(page,"/")
        import_shelves = page.add_style_tag(content="""
            [aria-labelledby="continue-heading"], [aria-labelledby="discover-heading"] { display: none; }
        """)
        card = page.locator('[aria-labelledby="books-heading"] .book-card').filter(has_text="Moby-Dick")
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
        base.shot(page,"import-library.png",'[aria-labelledby="books-heading"] .book-card')
        import_card = card.bounding_box()
        import_cover = cover.bounding_box()
        assert import_card and import_card["y"] >= 0 and import_card["y"] + import_card["height"] <= 900, import_card
        assert import_cover and import_cover["y"] >= 0 and import_cover["y"] + import_cover["height"] <= 900, import_cover
        count = page.locator('[aria-labelledby="books-heading"] .page-subtitle')
        expect(count).to_have_text("20 books")
        import_count = count.bounding_box()
        assert import_count and import_count["y"] >= 0
        card.evaluate("""el => {
            const grid = el.parentElement;
            const others = [...grid.querySelectorAll('.book-card')].filter(c => c !== el);
            const after = others.map(c => c.getBoundingClientRect().toJSON());
            grid.style.minHeight = grid.getBoundingClientRect().height + 'px';
            el.style.display = 'none';
            const count = document.querySelector('[aria-labelledby="books-heading"] .page-subtitle');
            count.textContent = '19 books';
            const before = others.map(c => c.getBoundingClientRect().toJSON());
            window.importReflow = {el,grid,others,before,after,count};
        }""")
        expect(count).to_have_text("19 books")
        page.screenshot(path=str(base.OUT/"import-empty.png"), animations="disabled")
        try:
            page.evaluate("""() => {
                const state = window.importReflow;
                const {el,grid,others,before,after} = state;
                el.style.display = '';
                el.style.visibility = 'hidden';
                grid.style.position = 'relative';
                // The same horizontal movement is applied to every row.
                // At a row boundary two clipped copies wrap through the
                // edges of the grid; no fading, diagonal jumps or overlaps.
                grid.style.clipPath = 'inset(-16px 0 -16px 0)';
                const origin=grid.getBoundingClientRect();
                state.clones=[];
                for (let i=0;i<others.length;i++) {
                    const c=others[i], a=before[i], b=after[i];
                    c.style.transition='none';
                    if (Math.abs(b.y-a.y)>a.height*.5 && Math.abs(b.x-a.x)>a.width) {
                        const clone=c.cloneNode(true);
                        clone.removeAttribute('id');
                        clone.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));
                        clone.setAttribute('aria-hidden','true');
                        clone.inert=true;
                        Object.assign(clone.style,{position:'absolute',left:(a.x-origin.x)+'px',
                            top:(a.y-origin.y)+'px',width:a.width+'px',height:a.height+'px',
                            margin:'0',pointerEvents:'none',transition:'none'});
                        grid.appendChild(clone);
                        const stride=after.find((r,j)=>j>0 && Math.abs(r.y-b.y)<2 && r.x>b.x);
                        const step=stride?stride.x-b.x:a.width+20;
                        state.clones.push({i,clone,step});
                    }
                }
            }""")
            for i in range(31):
                page.evaluate("""p => {
                    const {others,before,after,clones} = window.importReflow;
                    const t=p*p*(3-2*p);
                    const wrapped=new Map(clones.map(r=>[r.i,r]));
                    others.forEach((c,i) => {
                        const a=before[i], b=after[i], wrap=wrapped.get(i);
                        if(wrap){
                            wrap.clone.style.transform='translateX('+(wrap.step*t)+'px)';
                            c.style.transform='translateX('+(-wrap.step*(1-t))+'px)';
                        }else{
                            c.style.transform='translate('+((a.x-b.x)*(1-t))+'px,'+((a.y-b.y)*(1-t))+'px)';
                        }
                    });
                }""", i/30)
                page.screenshot(path=str(base.OUT / f"import-space-{i}.png"), animations="disabled")
        finally:
            page.evaluate("""() => {
                const {el,grid,others,count,clones} = window.importReflow;
                for (const r of clones || []) r.clone.remove();
                grid.style.position = '';
                grid.style.clipPath = '';
                el.style.visibility = '';
                for (const c of others) {
                    c.style.transform = ''; c.style.opacity = ''; c.style.transition = '';
                }
                count.textContent = '20 books';
                grid.style.minHeight = '';
                delete window.importReflow;
            }""")
            expect(count).to_have_text("20 books")
            import_shelves.evaluate("el => el.remove()")
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
        page.locator("#query").press("Enter")
        page.wait_for_load_state("domcontentloaded")
        expect(page.locator(".book-card").first).to_be_visible()
        base.shot(page,"search.png",".book-card")
        base.shot(page,"browse-results.png",".book-card")
        expect(page.locator("#sidebar .nav-link[aria-current='page']").filter(has_text="Books")).to_have_count(1)
        results_box = page.locator("#main").bounding_box()
        assert results_box and 0 <= results_box["y"] < 900, results_box
        base.open_page(page,"/")
        href = page.locator(".continue-card").filter(has_text="Moby-Dick").first.get_attribute("href")
        base.open_page(page,href)
        related = page.locator(".similar-books")
        expect(related).to_be_visible()
        page.evaluate("window.scrollTo(0,0)")
        base.shot(page,"detail-scroll-0.png","h1")
        # Use the same actual scroll capture method as the library scene.
        detail_end = related.evaluate("el => Math.min(document.scrollingElement.scrollHeight-innerHeight, Math.max(0,el.getBoundingClientRect().top+scrollY-100))")
        scroll_strip(page,"detail-scroll",detail_end,frames=61)
        # Give newly visible cover images time to decode for the held frame.
        base.shot(page,"detail-scroll-60.png",".similar-books")
        detail_sidebar = page.locator("#sidebar").bounding_box()
        detail_topbar = page.locator("header.topbar").bounding_box()
        assert detail_sidebar and detail_topbar
        section_box = related.bounding_box()
        related_cards = related.locator(".book-card")
        assert section_box and related_cards.count() > 0
        card_boxes = [related_cards.nth(i).bounding_box() for i in range(related_cards.count())]
        assert all(card_boxes), card_boxes
        # Trim unused trailing grid columns without removing any book or header.
        header_text = related.locator(".section-header p").bounding_box()
        assert header_text
        right = min(section_box["x"] + section_box["width"],
                    max(b["x"] + b["width"] for b in [*card_boxes, header_text]) + 16)
        # Record the final viewport geometry in CSS pixels.
        with Image.open(base.OUT/"detail-scroll-60.png") as im:
            x = max(math.ceil(detail_sidebar["x"] + detail_sidebar["width"]), math.floor(section_box["x"]))
            y = max(math.ceil(detail_topbar["y"] + detail_topbar["height"]), math.floor(section_box["y"]))
            end_x = min(im.width, math.ceil(right))
            end_y = min(im.height, math.ceil(section_box["y"] + section_box["height"]))
            assert end_x > x and end_y > y, section_box
            related_focus = {"x":x,"y":y,"width":end_x-x,"height":end_y-y}
        # Repeat that viewport at 4x and crop the same rectangle. Capturing
        # by locator can scroll the section and change its visible edges.
        base.open_page(sharp_page,href)
        final_y = page.evaluate("window.scrollY")
        sharp_page.evaluate("(y) => window.scrollTo(0,y)", final_y)
        sharp_section = sharp_page.locator(".similar-books")
        expect(sharp_section).to_be_visible()
        sharp_box = sharp_section.bounding_box()
        assert sharp_box and all(abs(sharp_box[k] - section_box[k]) < 1 for k in section_box), sharp_box
        base.shot(sharp_page,"related-sharp-viewport.png",".similar-books")
        with Image.open(base.OUT/"related-sharp-viewport.png") as im:
            im.crop((4*x,4*y,4*end_x,4*end_y)).save(base.OUT/"related-focus.png")
        (base.OUT/"related-sharp-viewport.png").unlink()
        sharp.close()
        # Return from the recommendations to the real progress component.
        progress_card = page.locator(".kobo-card").filter(has=page.locator("#progress-heading"))
        expect(progress_card).to_contain_text("KOReader on Kindle Colorsoft")
        expect(progress_card).to_contain_text("38%")
        progress_y = progress_card.evaluate("""el => Math.max(0, Math.min(
            document.scrollingElement.scrollHeight-innerHeight,
            el.getBoundingClientRect().top+scrollY-innerHeight*.40))""")
        scroll_strip(page,"sync-scroll",progress_y,frames=49)
        sync_box = progress_card.bounding_box()
        assert sync_box and sync_box["y"] >= 0 and sync_box["y"] + sync_box["height"] <= 900, sync_box
        # Capture the authentic component at each percentage. Only its
        # progress value is simulated, not the visual design of the card.
        for percent in range(38,48):
            progress_card.evaluate("""(el, n) => {
                el.querySelector(".progress > span").style.width = n + "%";
                const label = el.querySelector(".progress").nextElementSibling;
                for (const child of label.childNodes) {
                    if (child.nodeType === Node.TEXT_NODE && /\d+%/.test(child.textContent)) {
                        child.textContent = child.textContent.replace(/\d+%/, n + "%");
                        break;
                    }
                }
            }""", percent)
            expect(progress_card).to_contain_text(f"{percent}%")
            page.screenshot(path=str(base.OUT / f"sync-progress-{percent}.png"), animations="disabled")
        # The Moby-Dick artwork was already extracted from its image URL.
        base.open_page(page,"/reading-stats")
        expect(page.locator(".rs-heatmap")).to_be_visible()
        covers = page.locator(".rs-books .rs-book .cover img")
        expect(covers).to_have_count(4)
        # Decode real covers before the scroll, not after its last frame.
        assert covers.evaluate_all("""async imgs => {
            await Promise.all(imgs.map(async img => { img.loading = "eager"; await img.decode(); }));
            return imgs.every(img => img.naturalWidth > 0);
        }""")
        base.shot(page,"stats.png",".rs-heatmap")
        stats = page.locator(".rs-tile-value").all_text_contents()
        page.evaluate("window.scrollTo(0,0)")
        stats_end = page.evaluate("Math.max(0,document.scrollingElement.scrollHeight-innerHeight)")
        assert stats_end > 0, stats_end
        scroll_strip(page,"stats-scroll",stats_end,frames=97)
        sidebar = page.locator("#sidebar").bounding_box()
        topbar = page.locator("header.topbar").bounding_box()
        assert sidebar and topbar
        stats_content = {"x":sidebar["x"] + sidebar["width"],"y":topbar["y"] + topbar["height"]}
        base.shot(page,"stats-detail.png")
        branding_focus = capture_branding(page)
        # Film the genuine Verso palette slider at 2x resolution. The
        # layout stays fixed while its colours move to Smoky Aubergine.
        base.set_theme(page,"light")
        base.preset(page,"stock")
        palette_ctx = browser.new_context(viewport={"width":1440,"height":900},
            device_scale_factor=2,storage_state=ctx.storage_state(),
            locale="en-US",color_scheme="light",reduced_motion="reduce",service_workers="block")
        palette_page = palette_ctx.new_page()
        base.open_page(palette_page,"/me/appearance")
        base.set_theme(palette_page,"light")
        base.open_page(palette_page,"/me/appearance")
        palette = palette_page.locator("#ap-palette-mix")
        colours = palette_page.locator("section[aria-labelledby='ap-colours-h']")
        colours.evaluate("el => window.scrollTo(0,Math.max(0,el.getBoundingClientRect().top+scrollY-100))")
        expect(palette).to_have_value("0")
        expect(palette).to_be_visible()
        expect(palette_page.locator("#ap-stage")).to_be_visible()
        assert not palette_page.locator("html").evaluate("el => el.hasAttribute('data-ap')")
        palette_page.evaluate("""async () => {
            await document.fonts.ready;
            await Promise.all([...document.images].filter(i=>i.getBoundingClientRect().top<innerHeight).map(i=>i.decode().catch(()=>{})));
        }""")
        palette_controls = [palette.bounding_box()]
        assert all(b and 0 <= b["y"] < 900 for b in palette_controls), palette_controls
        # CSS color-mix/relative colors may serialize differently from
        # equivalent rgb() values. Compare their resolved sRGB pixels.
        palette_page.evaluate("""() => {
            const canvas = document.createElement("canvas");
            canvas.width = canvas.height = 1;
            const ctx = canvas.getContext("2d");
            const rgb = value => {
                ctx.clearRect(0, 0, 1, 1);
                ctx.fillStyle = "#000";
                ctx.fillStyle = value;
                ctx.fillRect(0, 0, 1, 1);
                return [...ctx.getImageData(0, 0, 1, 1).data];
            };
            window.demoPaletteColors = () => [
                rgb(getComputedStyle(document.querySelector("#sidebar")).backgroundColor),
                rgb(getComputedStyle(document.body).backgroundColor),
                rgb(getComputedStyle(document.documentElement).getPropertyValue("--primary"))
            ];
            window.demoPaletteMatches = expected => window.demoPaletteColors().every(
                (row, i) => row.every((v, j) => Math.abs(v - expected[i][j]) <= 1));
        }""")
        stock_colors = palette_page.evaluate("window.demoPaletteColors()")
        assert palette_page.evaluate("window.demoPaletteMatches([[16,46,32,255],[248,241,229,255],[146,54,34,255]])"), stock_colors
        for i in range(61):
            p=i/60
            eased=p*p*(3-2*p)
            palette.fill(str(round(100*eased)))
            palette_page.evaluate("() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))")
            palette_page.screenshot(path=str(base.OUT / f"custom-colour-{i}.png"), animations="disabled")
        expect(palette).to_have_value("100")
        expect(palette_page.locator("html")).to_have_attribute("data-ap-surface","verso")
        assert palette_page.locator("#ap-hue").input_value() == "155"
        assert palette_page.locator("#ap-hue2").input_value() == "35"
        aubergine = [[57,49,63,255],[244,238,231,255],[137,83,79,255]]
        palette_page.wait_for_function("expected => window.demoPaletteMatches(expected)", arg=aubergine, timeout=3000)
        print("Smoky Aubergine resolved colors:", palette_page.evaluate("window.demoPaletteColors()"), flush=True)
        palette.fill("0")
        expect(palette).to_have_value("0")
        expect(palette_page.locator("[data-ap-savebar]")).to_be_hidden()
        assert not palette_page.locator("html").evaluate("el => el.hasAttribute('data-ap')")
        # Wait for the restored appearance to settle before reading styles.
        # Retain the exact RGB endpoint assertion, not just the slider value.
        palette_page.evaluate("() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))")
        print("Restored Classic colors:", palette_page.evaluate("window.demoPaletteColors()"),
              "expected:", stock_colors, flush=True)
        palette_page.wait_for_function("expected => window.demoPaletteMatches(expected)", arg=stock_colors, timeout=3000)
        # Capture the real restored state as the return strip's final frame.
        # The existing compositor reverses this strip, ensuring a stable
        # Classic frame before branding.
        palette_page.screenshot(path=str(base.OUT / "custom-colour-0.png"), animations="disabled")
        palette_ctx.close()
        capture_year(browser)
        (base.OUT/"video-data.json").write_text(json.dumps({"stats":stats,"statsContent":stats_content,"importCard":import_card,"importCover":import_cover,"importCount":import_count,"searchBox":search_box,"resultsBox":results_box,"brandingFocus":branding_focus,"paletteControls":palette_controls,"relatedFocus":related_focus,"detailSidebar":detail_sidebar,"syncBox":sync_box}))
        ctx.close()
        browser.close()

if __name__ == "__main__":
    import sys
    if sys.argv[1] == "seed":
        seed_stats(Path(os.environ["DEMO_ROOT"]))
    else:
        additional()
