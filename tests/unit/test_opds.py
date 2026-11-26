"""Regression coverage for distinct OPDS original and thumbnail resources."""
from pathlib import Path
from unittest.mock import patch
import pytest
from flask import Flask, url_for
from cps import constants
from cps.opds import opds, feed_get_cover, feed_get_thumbnail

pytestmark = pytest.mark.unit


@patch("cps.opds.get_book_cover")
def test_full_cover_is_original(get_cover):
    get_cover.return_value = "original"
    assert feed_get_cover.__wrapped__("42") == "original"
    get_cover.assert_called_once_with("42", constants.COVER_THUMBNAIL_ORIGINAL)


@patch("cps.opds.get_book_cover")
def test_thumbnail_is_optimized(get_cover):
    get_cover.return_value = "thumbnail"
    assert feed_get_thumbnail.__wrapped__("42") == "thumbnail"
    get_cover.assert_called_once_with("42", 12)
    assert constants.OPTIMIZED_COVER_WIDTHS[12] == 320


def test_distinct_urls_and_legacy_aliases():
    app = Flask(__name__)
    app.register_blueprint(opds)
    with app.test_request_context():
        assert url_for("opds.feed_get_cover", book_id=42) == "/opds/cover/42"
        assert url_for("opds.feed_get_thumbnail", book_id=42) == "/opds/thumb_240_240/42"
    adapter = app.url_map.bind("localhost")
    for path in ("/opds/thumb_240_240/42", "/opds/cover_240_240/42", "/opds/cover_90_90/42"):
        assert adapter.match(path)[0] == "opds.feed_get_thumbnail"


def test_both_catalog_templates_advertise_distinct_resources():
    root = Path(__file__).resolve().parents[2] / "cps/templates"
    xml = (root / "feed.xml").read_text()
    metadata = (root / "json.txt").read_text()
    assert "opds.feed_get_cover" in xml and "opds.feed_get_thumbnail" in xml
    assert '"cover": {{ url_for(\'opds.feed_get_cover\'' in metadata
    assert '"thumbnail": {{ url_for(\'opds.feed_get_thumbnail\'' in metadata
