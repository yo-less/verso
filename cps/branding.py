"""Persistent, instance-specific branding. GPL-3.0-or-later."""
import io
import json
import os
from pathlib import Path
import re
import tempfile
import xml.etree.ElementTree as ET
import zipfile

from flask import Response, current_app
from . import cli_param, config

ASSETS = {kind: kind for kind in ("favicon", "wordmark", "wordmark-dark", "login", "login-dark", "background")}
OLD_DEFAULT = {"name": "Verso", "background": "#f4e9d6", "accent": "#1b3a2e", "decoration": "watermark", "assets": {}}
DEFAULT = {"name": "Verso", "background": "#f8f1e5", "accent": "#a23e2a", "decoration": "watermark", "assets": {}}
MAX_SVG = 128 * 1024
COLOR = re.compile(r"#[0-9a-fA-F]{6}\Z")
NS = "{http://www.w3.org/2000/svg}"
ELEMENTS = {"svg", "g", "path", "rect", "circle", "ellipse", "line", "polyline", "polygon", "text", "tspan", "title", "desc", "style"}
ATTRIBUTES = {"width", "height", "viewBox", "role", "aria-label", "class", "id", "d", "fill", "fill-rule", "fill-opacity", "opacity", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "stroke-opacity", "transform", "x", "y", "x1", "x2", "y1", "y2", "rx", "ry", "cx", "cy", "r", "points", "font-family", "font-size", "font-weight", "text-anchor", "preserveAspectRatio"}

def settings_path():
    return Path(cli_param.settings_path).resolve().parent / "verso-branding.json"

def load():
    try:
        data = json.loads(settings_path().read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            return dict(DEFAULT)
        result = {**DEFAULT, **{key: data[key] for key in DEFAULT if key in data}}
        # Migrate untouched stock settings, never a customized installation.
        if result == OLD_DEFAULT:
            return dict(DEFAULT)
        return result
    except (OSError, ValueError):
        return dict(DEFAULT)

def site_name():
    return load()["name"]

def safe_svg(data):
    if len(data) > MAX_SVG:
        raise ValueError("SVG files must be smaller than 128 KiB.")
    text = data.decode("utf-8-sig")
    if re.search(r"<!|<\?(?!xml\s)|\\|url\s*\(|@import|javascript:|https?:(?!//www\.w3\.org/2000/svg)", text, re.I):
        raise ValueError("SVG contains unsupported or external content.")
    root = ET.fromstring(text)
    if root.tag != NS + "svg":
        raise ValueError("A valid SVG root is required.")
    for el in root.iter():
        if not el.tag.startswith(NS) or el.tag[len(NS):] not in ELEMENTS:
            raise ValueError("Unsupported SVG element.")
        for key, value in el.attrib.items():
            if (key not in ATTRIBUTES or any(x in value for x in ("<", ">", "&", "\\"))
                    or re.search(r"url\s*\(|javascript:|@import", value, re.I)):
                raise ValueError("Unsupported SVG attribute.")
        if el.tag == NS + "style":
            css = el.text or ""
            if (re.search(r"[^a-zA-Z0-9\s#.,:;(){}_%@\-]", css)
                    or re.search(r"@(?!media\b)|url\s*\(|javascript:", css, re.I)):
                raise ValueError("Only simple SVG styles are supported.")
    return text

def update(form, files):
    action = form.get("action", "save")
    if action == "verso":
        state = dict(DEFAULT)
    else:
        state = load()
        name = form.get("name", "").strip()
        if not name or len(name) > 60 or any(ord(c) < 32 or ord(c) == 127 for c in name):
            raise ValueError("Enter a site name of 1–60 characters without control characters.")
        background, accent = form.get("background", ""), form.get("accent", "")
        if not COLOR.fullmatch(background) or not COLOR.fullmatch(accent):
            raise ValueError("Use six-digit hex colours.")
        decoration = form.get("decoration", "")
        if decoration not in ("watermark", "ribbon", "none"):
            raise ValueError("Unknown decoration.")
        assets = dict(state.get("assets", {}))
        for kind in ASSETS:
            if form.get("reset_" + kind):
                assets.pop(kind, None)
            upload = files.get(kind)
            if upload and upload.filename:
                try:
                    assets[kind] = safe_svg(upload.stream.read(MAX_SVG + 1))
                except (ET.ParseError, UnicodeError) as exc:
                    raise ValueError("Invalid SVG: " + kind) from exc
        if decoration == "ribbon" and "background" not in assets:
            raise ValueError("Upload a decoration SVG to use the hanging bookmark layout.")
        state = {**state, "name": name, "background": background, "accent": accent,
                 "decoration": decoration, "assets": assets}
    save_state(state)

def save_state(state):
    path = settings_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temp = tempfile.mkstemp(dir=path.parent, prefix=".branding-")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as file:
            json.dump(state, file, ensure_ascii=False)
        os.replace(temp, path)
    finally:
        if os.path.exists(temp):
            os.unlink(temp)
    config.config_calibre_web_title = state["name"]
    config.save()

def initialize():
    """Initialize the default identity once; preserve saved custom branding."""
    if not settings_path().exists():
        save_state(load())

def svg_asset(kind):
    state = load()
    if kind not in ASSETS:
        return None
    if kind in state["assets"]:
        return state["assets"][kind]
    if kind.endswith("-dark") and kind[:-5] in state["assets"]:
        return state["assets"][kind[:-5]]
    filename = "verso-" + kind + ".svg"
    return (Path(current_app.static_folder) / filename).read_text(encoding="utf-8")

def asset_response(kind):
    content = svg_asset(kind)
    if content is None:
        from flask import abort
        abort(404)
    response = Response(content, mimetype="image/svg+xml")
    response.headers["Content-Security-Policy"] = "default-src 'none'; style-src 'unsafe-inline'; sandbox"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Cache-Control"] = "no-store"
    return response

def stylesheet():
    state = load()
    bg = state["background"]
    accent = state["accent"]
    if not COLOR.fullmatch(bg) or not COLOR.fullmatch(accent):
        bg, accent = DEFAULT["background"], DEFAULT["accent"]
    # Choose legible foreground independently of the user's normal library theme.
    def lum(hexcolor):
        c = [int(hexcolor[i:i+2], 16) / 255 for i in (1, 3, 5)]
        c = [x/12.92 if x <= .04045 else ((x+.055)/1.055)**2.4 for x in c]
        return sum(x*y for x,y in zip(c, (.2126,.7152,.0722)))
    ink = "#000000" if lum(bg) > .179 else "#ffffff"
    button_ink = "#000000" if lum(accent) > .179 else "#ffffff"
    contrast = (max(lum(bg),lum(accent))+.05)/(min(lum(bg),lum(accent))+.05)
    detail = accent if contrast >= 4.5 else ink
    dark_logo = ".instance-login .login-logo-light{display:none}.instance-login .login-logo-dark{display:block}" if lum(bg) <= .179 else ""
    response = Response(dark_logo + ".auth:has(.instance-login){--brand-bg:"+bg+";--brand-accent:"+accent+";--brand-ink:"+ink+";--brand-button-ink:"+button_ink+";--brand-detail:"+detail+";color-scheme:"+("light" if lum(bg) > .179 else "dark")+";}", mimetype="text/css")
    response.headers["Cache-Control"] = "no-store"
    return response

def plugin_zip(source, name):
    """Substitute only the original literal token; escape bytes for Lua strings."""
    def lua_escape(raw):
        return b"".join(("\\%03d" % b).encode("ascii") for b in raw)

    raw_name = name.encode("utf-8")
    escaped = lua_escape(raw_name)
    # Long-bracket Lua strings do not interpret backslash escapes. Convert
    # branded long strings to quoted strings before replacing ordinary literals.
    def replace_long(match):
        body = match.group(1)
        if b"Verso" not in body:
            return match.group(0)
        if body.startswith(b"\n"):
            body = body[1:]
        return b'"' + lua_escape(body.replace(b"Verso", raw_name)) + b'"'

    result = io.BytesIO()
    with zipfile.ZipFile(source) as original, zipfile.ZipFile(result, "w", zipfile.ZIP_DEFLATED) as output:
        for entry in original.infolist():
            data = original.read(entry)
            if entry.filename.rsplit("/", 1)[-1] in ("main.lua", "_meta.lua"):
                data = re.sub(rb"\[\[(.*?)\]\]", replace_long, data, flags=re.S)
                data = data.replace(b"Verso", escaped)
            output.writestr(entry, data)
    result.seek(0)
    return result
