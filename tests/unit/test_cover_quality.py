"""Browser covers must have independent high-resolution width candidates."""
from datetime import datetime, timezone
from types import SimpleNamespace
from pathlib import Path
import pytest
from flask import Flask
from cps import constants, jinjia
from cps.tasks import thumbnail

pytestmark = pytest.mark.unit


@pytest.mark.parametrize("resolution,width,height,expected", [
    (1, 1200, 1800, (240, 360)),
    (2, 1200, 1800, (480, 720)),
    (4, 1200, 1800, (960, 1440)),
    (2, 1600, 800, (480, 240)),
    (4, 130, 200, (130, 200)),
])
def test_web_dimensions(resolution, width, height, expected):
    assert thumbnail.book_thumbnail_dimensions(resolution, width, height, "webp") == expected


def test_device_dimensions_unchanged():
    assert thumbnail.book_thumbnail_dimensions(1, 1200, 1800, "jpg") == (170, 255)
    assert thumbnail.book_thumbnail_dimensions(2, 1200, 1800, "jpg") == (340, 510)


def test_srcset_width_candidates_and_cache_version():
    app = Flask(__name__)
    app.add_url_rule("/cover/<int:book_id>/<resolution>", endpoint="web.get_cover",
                     view_func=lambda **kwargs: "")
    with app.test_request_context():
        book = SimpleNamespace(id=7, last_modified=datetime.now(timezone.utc))
        candidates = jinjia.get_cover_srcset(book).split(", ")
        assert [item.rsplit(" ", 1)[1] for item in candidates] == ["240w", "480w", "960w"]
        assert all("v=" + str(constants.WEB_COVER_CACHE_VERSION) in item for item in candidates)


def test_cache_filename_invalidates_legacy_webp():
    assert constants.web_cover_filename(7, 1) != "book_7_r1.webp"


@pytest.mark.skipif(not thumbnail.use_IM, reason="ImageMagick not installed")
def test_real_webp_generation(tmp_path):
    dest = tmp_path / "cover.webp"
    with thumbnail.Image(width=1200, height=1800) as image:
        thumbnail.write_book_thumbnail(image, str(dest), 2, "webp")
    with thumbnail.Image(filename=str(dest)) as result:
        assert (result.width, result.height) == (480, 720)
        assert result.format.lower() == "webp"
    assert list(tmp_path.iterdir()) == [dest]
