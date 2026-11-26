import io
import zipfile
import pytest
from cps.branding import safe_svg, plugin_zip
from cps import branding

pytestmark = pytest.mark.unit

def test_safe_svg():
    assert "path" in safe_svg(b'<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0L10 10"/></svg>')

@pytest.mark.parametrize("bad", [
    b'<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>',
    b'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    b'<svg xmlns="http://www.w3.org/2000/svg"><foreignObject/></svg>',
    b'<svg xmlns="http://www.w3.org/2000/svg"><path fill="url(https://example.org)"/></svg>',
    b'<svg xmlns="http://www.w3.org/2000/svg"><path fill="&#117;rl(#x)"/></svg>',
    b'<!DOCTYPE svg><svg xmlns="http://www.w3.org/2000/svg"/>',
])
def test_unsafe_svg(bad):
    with pytest.raises(ValueError):
        safe_svg(bad)

def test_plugin_zip_escapes_name():
    source = io.BytesIO()
    with zipfile.ZipFile(source, "w") as archive:
        archive.writestr("cwasync.koplugin/main.lua", 'title = _("Verso Sync")')
        archive.writestr("cwasync.koplugin/_meta.lua", 'name = "cwasync"')
    source.seek(0)
    with zipfile.ZipFile(plugin_zip(source, 'A"B')) as archive:
        assert archive.read("cwasync.koplugin/main.lua") == b'title = _("\\065\\034\\066 Sync")'
        assert archive.read("cwasync.koplugin/_meta.lua") == b'name = "cwasync"'


def test_persisted_defaults_and_custom_upload(tmp_path, monkeypatch):
    from werkzeug.datastructures import FileStorage
    from types import SimpleNamespace
    path = tmp_path / "verso-branding.json"
    monkeypatch.setattr(branding, "settings_path", lambda: path)
    config = SimpleNamespace(config_calibre_web_title="Scriptorium", save=lambda: None)
    monkeypatch.setattr(branding, "config", config)
    branding.initialize()
    assert branding.load()["name"] == "Verso"
    assert config.config_calibre_web_title == "Verso"
    branding.update({"action": "verso"}, {})
    assert branding.load()["name"] == "Verso"
    svg = b'<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0L10 10"/></svg>'
    branding.update({"name": "My books", "background": "#123456", "accent": "#abcdef", "decoration": "none"},
                    {"favicon": FileStorage(stream=io.BytesIO(svg), filename="my.svg")})
    assert branding.load()["name"] == "My books"
    assert branding.load()["assets"]["favicon"] == svg.decode()
    assert config.config_calibre_web_title == "My books"
    with pytest.raises(ValueError):
        branding.update({"name": "Oops", "background": "red", "accent": "#abcdef", "decoration": "none"}, {})
    assert branding.load()["name"] == "My books"

def test_lua_long_string_and_unicode():
    source = io.BytesIO()
    with zipfile.ZipFile(source, "w") as archive:
        archive.writestr("cwasync.koplugin/_meta.lua", 'description = _([[Verso library]])')
    source.seek(0)
    name = 'Bücher ]] "'
    with zipfile.ZipFile(plugin_zip(source, name)) as archive:
        expected = b'description = _("' + b"".join(("\\%03d" % b).encode() for b in (name+" library").encode()) + b'")'
        assert archive.read("cwasync.koplugin/_meta.lua") == expected

def test_default_svg_assets_are_accepted():
    from pathlib import Path
    static = Path(branding.__file__).parent / "static"
    for file in static.glob("verso-*.svg"):
        assert safe_svg(file.read_bytes()).startswith("<svg")

def test_asset_response_is_image_only_and_not_cached(monkeypatch):
    from flask import Flask
    app = Flask(__name__)
    monkeypatch.setattr(branding, "svg_asset", lambda kind: '<svg xmlns="http://www.w3.org/2000/svg"/>')
    with app.app_context():
        response = branding.asset_response("favicon")
    assert response.mimetype == "image/svg+xml"
    assert "sandbox" in response.headers["Content-Security-Policy"]
    assert response.headers["Cache-Control"] == "no-store"
    assert response.headers["X-Content-Type-Options"] == "nosniff"

def test_custom_bookmark_requires_an_uploaded_decoration(tmp_path, monkeypatch):
    monkeypatch.setattr(branding, "settings_path", lambda: tmp_path / "branding.json")
    with pytest.raises(ValueError, match="decoration SVG"):
        branding.update({"name": "My library", "background": "#ffffff", "accent": "#123456", "decoration": "ribbon"}, {})

def test_logo_layouts_and_no_embedded_raster():
    import xml.etree.ElementTree as ET
    from pathlib import Path
    static = Path(branding.__file__).parent / "static"
    ns = "{http://www.w3.org/2000/svg}"
    for name, direction in (("wordmark", "wide"), ("login", "tall"), ("favicon", "square"), ("background", "square")):
        root = ET.parse(static / ("verso-" + name + ".svg")).getroot()
        _, _, width, height = map(float, root.attrib["viewBox"].split())
        assert (width > height if direction == "wide" else height > width if direction == "tall" else width == height)
        assert not list(root.iter(ns + "image"))
        assert not list(root.iter(ns + "text"))
